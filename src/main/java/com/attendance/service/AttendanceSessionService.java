package com.attendance.service;

import com.attendance.dto.*;
import com.attendance.exception.*;
import com.attendance.model.*;
import com.attendance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceSessionService {

    private final AttendanceSessionRepository sessionRepo;
    private final AttendanceRecordRepository attendanceRecordRepo;
    private final FacultyRepository facultyRepo;
    private final CourseRepository courseRepo;
    private final SectionRepository sectionRepo;
    private final TimetableEntryRepository timetableRepo;
    private final StudentRepository studentRepo;
    private final CourseAllocationRepository allocationRepo;

    /**
     * Start a new Attendance Session.
     * Enforces:
     *  1. Faculty authentication & authorization (HOD rejected from teaching sessions).
     *  2. Confirmed faculty-course-section allocation (Sections C/D and unauthorized combinations rejected with 403).
     *  3. Automatic scoped lecture numbering: (course + section).
     *  4. State initialized strictly to RECORDING.
     */
    @Transactional
    public SessionDto startSession(StartSessionRequest req) {
        // 1. Resolve Faculty
        Faculty faculty;
        if (req.getFacultyId() != null) {
            faculty = facultyRepo.findById(req.getFacultyId())
                .orElseThrow(() -> new ResourceNotFoundException("Faculty not found: " + req.getFacultyId()));
        } else if (req.getFacultyCode() != null) {
            faculty = facultyRepo.findByFacultyCode(req.getFacultyCode())
                .orElseThrow(() -> new ResourceNotFoundException("Faculty not found with code: " + req.getFacultyCode()));
        } else {
            throw new ValidationException("Faculty ID or code is required");
        }

        // Enforce HOD restriction (Dr. Anand Tamrakar has 0 allocations and cannot teach)
        if (faculty.getRole() == Faculty.FacultyRole.hod) {
            throw new UnauthorizedActionException("403 Forbidden: HOD Dr. Anand Tamrakar is not teaching faculty and cannot start attendance sessions");
        }

        // 2. Resolve Course
        Course course;
        if (req.getSubjectId() != null) {
            course = courseRepo.findById(req.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found: " + req.getSubjectId()));
        } else if (req.getSubjectCodeShort() != null) {
            course = courseRepo.findByCourseCodeShort(req.getSubjectCodeShort())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found: " + req.getSubjectCodeShort()));
        } else {
            throw new ValidationException("Subject ID or code is required");
        }

        // 3. Resolve Section
        Section section;
        if (req.getSectionId() != null) {
            section = sectionRepo.findById(req.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + req.getSectionId()));
        } else if (req.getSection() != null) {
            section = sectionRepo.findBySectionName(req.getSection())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + req.getSection()));
        } else {
            throw new ValidationException("Section is required");
        }

        // 4. Validate Server-side Course Allocation
        Optional<CourseAllocation> allocationOpt = allocationRepo
            .findByFacultyFacultyIdAndCourseCourseIdAndSectionSectionId(faculty.getFacultyId(), course.getCourseId(), section.getSectionId());

        if (allocationOpt.isEmpty()) {
            throw new UnauthorizedActionException("403 Forbidden: Faculty " + faculty.getName() + " is not authorized for " + course.getCourseCodeShort() + " in Section " + section.getSectionName());
        }

        CourseAllocation alloc = allocationOpt.get();
        if (alloc.getStatus() != CourseAllocation.AllocationStatus.CONFIRMED) {
            throw new UnauthorizedActionException("403 Forbidden: Allocation for " + course.getCourseCodeShort() + " in Section " + section.getSectionName() + " is pending confirmation");
        }

        // 5. Optional timetable entry
        TimetableEntry ttEntry = null;
        if (req.getTimetableEntryId() != null) {
            ttEntry = timetableRepo.findById(req.getTimetableEntryId()).orElse(null);
        } else if (req.getTimetableCode() != null) {
            ttEntry = timetableRepo.findByTimetableCode(req.getTimetableCode()).orElse(null);
        }

        // 6. Calculate Next Lecture Number scoped by (course + section)
        Integer maxLec = sessionRepo.findMaxLectureNumber(course.getCourseId(), section.getSectionId());
        int nextLectureNumber = (maxLec == null ? 0 : maxLec) + 1;

        // 7. Persist session in RECORDING state
        AttendanceSession session = AttendanceSession.builder()
            .course(course)
            .faculty(faculty)
            .section(section)
            .timetableEntry(ttEntry)
            .semester(course.getSemester())
            .sessionDate(req.getSessionDate() != null ? req.getSessionDate() : LocalDate.now())
            .lectureNumber(nextLectureNumber)
            .status(AttendanceSession.SessionStatus.RECORDING)
            .startedAt(LocalDateTime.now())
            .build();

        session = sessionRepo.save(session);

        long rosterCount = studentRepo.countBySectionSectionName(section.getSectionName());

        return SessionDto.builder()
            .id(session.getSessionId())
            .subjectId(course.getCourseId())
            .subjectName(course.getCourseName())
            .subjectCode(course.getCourseCodeShort())
            .facultyId(faculty.getFacultyId())
            .facultyCode(faculty.getFacultyCode())
            .facultyName(faculty.getName())
            .section(section.getSectionName())
            .semester(session.getSemester())
            .date(session.getSessionDate())
            .lectureNumber(session.getLectureNumber())
            .status(session.getStatus().name())
            .startedAt(session.getStartedAt())
            .totalRostered((int) rosterCount)
            .presentCount(0)
            .absentCount(0)
            .build();
    }

    /**
     * Transactional attendance saving.
     * Guaranteed atomic: validates session, ownership, section boundaries, completeness, no duplicates,
     * persists records and marks session COMPLETED in a single atomic transaction.
     */
    @Transactional(rollbackFor = Exception.class)
    public AttendanceSubmissionResponse saveAttendance(Long sessionId, MarkAttendanceRequest request) {
        AttendanceSession session = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        if (session.getStatus() != AttendanceSession.SessionStatus.RECORDING) {
            throw new ConflictException("Session is not in RECORDING state. Current status: " + session.getStatus());
        }

        // Validate faculty ownership
        if (request.getFacultyId() != null && !session.getFaculty().getFacultyId().equals(request.getFacultyId())) {
            throw new UnauthorizedActionException("Faculty is not the owner of this session.");
        }
        if (request.getFacultyCode() != null && !session.getFaculty().getFacultyCode().equalsIgnoreCase(request.getFacultyCode())) {
            throw new UnauthorizedActionException("Faculty is not the owner of this session.");
        }

        List<Student> roster = studentRepo.findBySectionSectionId(session.getSection().getSectionId());
        Map<Long, Student> rosterById = roster.stream().collect(Collectors.toMap(Student::getStudentId, s -> s));
        Map<String, Student> rosterByRoll = roster.stream().collect(Collectors.toMap(Student::getRollNumber, s -> s));

        List<StudentAttendanceMark> marks = request.getRecords();
        if (marks == null || marks.isEmpty()) {
            throw new ValidationException("Attendance records list cannot be empty.");
        }

        Set<Long> seenStudentIds = new HashSet<>();
        List<AttendanceRecord> recordsToSave = new ArrayList<>();
        int presentCount = 0;
        int absentCount = 0;

        for (StudentAttendanceMark mark : marks) {
            Student student = null;
            if (mark.getStudentId() != null) {
                student = rosterById.get(mark.getStudentId());
            } else if (mark.getRollNumber() != null) {
                student = rosterByRoll.get(mark.getRollNumber());
            }

            if (student == null) {
                throw new ValidationException("Student " + (mark.getRollNumber() != null ? mark.getRollNumber() : mark.getStudentId()) 
                    + " does not belong to session section " + session.getSection().getSectionName());
            }

            if (!seenStudentIds.add(student.getStudentId())) {
                throw new ValidationException("Duplicate student attendance record in request: " + student.getRollNumber());
            }

            String st = mark.getStatus() != null ? mark.getStatus().trim().toUpperCase() : "";
            if (!st.equals("PRESENT") && !st.equals("ABSENT")) {
                throw new ValidationException("Invalid status: '" + mark.getStatus() + "'. Must be PRESENT or ABSENT.");
            }

            AttendanceRecord.AttendanceStatus statusEnum = AttendanceRecord.AttendanceStatus.valueOf(st);
            AttendanceRecord rec = AttendanceRecord.builder()
                .session(session)
                .student(student)
                .status(statusEnum)
                .markedAt(LocalDateTime.now())
                .build();

            recordsToSave.add(rec);
            if (statusEnum == AttendanceRecord.AttendanceStatus.PRESENT) presentCount++;
            else absentCount++;
        }

        if (seenStudentIds.size() != roster.size()) {
            throw new ValidationException("Incomplete attendance roster. Section " + session.getSection().getSectionName() 
                + " has " + roster.size() + " students, but received " + seenStudentIds.size());
        }

        // Persist records
        attendanceRecordRepo.saveAll(recordsToSave);

        // Mark session COMPLETED
        session.setStatus(AttendanceSession.SessionStatus.COMPLETED);
        session.setCompletedAt(LocalDateTime.now());
        sessionRepo.save(session);

        return AttendanceSubmissionResponse.builder()
            .status("SUCCESS")
            .message("Attendance saved successfully")
            .sessionId(sessionId)
            .lectureNumber(session.getLectureNumber())
            .presentCount(presentCount)
            .absentCount(absentCount)
            .totalRecorded(recordsToSave.size())
            .build();
    }

    @Transactional(readOnly = true)
    public SessionDto getSessionById(Long sessionId) {
        AttendanceSession s = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
        List<AttendanceRecord> recs = attendanceRecordRepo.findBySessionSessionId(sessionId);
        int pres = (int) recs.stream().filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.PRESENT).count();
        int abs = recs.size() - pres;

        return SessionDto.builder()
            .id(s.getSessionId())
            .subjectId(s.getCourse().getCourseId())
            .subjectName(s.getCourse().getCourseName())
            .subjectCode(s.getCourse().getCourseCodeShort())
            .facultyId(s.getFaculty().getFacultyId())
            .facultyCode(s.getFaculty().getFacultyCode())
            .facultyName(s.getFaculty().getName())
            .section(s.getSection().getSectionName())
            .semester(s.getSemester())
            .date(s.getSessionDate())
            .lectureNumber(s.getLectureNumber())
            .status(s.getStatus().name())
            .startedAt(s.getStartedAt())
            .completedAt(s.getCompletedAt())
            .totalRostered(recs.size())
            .presentCount(pres)
            .absentCount(abs)
            .build();
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecordDto> getSessionAttendance(Long sessionId) {
        if (!sessionRepo.existsById(sessionId)) {
            throw new ResourceNotFoundException("Session not found: " + sessionId);
        }
        return attendanceRecordRepo.findBySessionSessionId(sessionId).stream()
            .map(r -> AttendanceRecordDto.builder()
                .recordId(r.getRecordId())
                .sessionId(sessionId)
                .studentId(r.getStudent().getStudentId())
                .rollNumber(r.getStudent().getRollNumber())
                .studentName(r.getStudent().getName())
                .status(r.getStatus().name())
                .markedAt(r.getMarkedAt())
                .build())
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SessionDto> getSessionsForFaculty(Long facultyId) {
        return sessionRepo.findByFacultyFacultyIdOrderBySessionDateDesc(facultyId).stream()
            .map(s -> SessionDto.builder()
                .id(s.getSessionId())
                .subjectId(s.getCourse().getCourseId())
                .subjectName(s.getCourse().getCourseName())
                .subjectCode(s.getCourse().getCourseCodeShort())
                .facultyId(s.getFaculty().getFacultyId())
                .facultyCode(s.getFaculty().getFacultyCode())
                .facultyName(s.getFaculty().getName())
                .section(s.getSection().getSectionName())
                .semester(s.getSemester())
                .date(s.getSessionDate())
                .lectureNumber(s.getLectureNumber())
                .status(s.getStatus().name())
                .startedAt(s.getStartedAt())
                .completedAt(s.getCompletedAt())
                .build())
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SessionDto> getActiveSessions() {
        return sessionRepo.findAll().stream()
            .filter(s -> s.getStatus() == AttendanceSession.SessionStatus.RECORDING)
            .map(s -> SessionDto.builder()
                .id(s.getSessionId())
                .subjectId(s.getCourse().getCourseId())
                .subjectName(s.getCourse().getCourseName())
                .subjectCode(s.getCourse().getCourseCodeShort())
                .facultyId(s.getFaculty().getFacultyId())
                .facultyCode(s.getFaculty().getFacultyCode())
                .facultyName(s.getFaculty().getName())
                .section(s.getSection().getSectionName())
                .semester(s.getSemester())
                .date(s.getSessionDate())
                .lectureNumber(s.getLectureNumber())
                .status(s.getStatus().name())
                .startedAt(s.getStartedAt())
                .build())
            .collect(Collectors.toList());
    }
}
