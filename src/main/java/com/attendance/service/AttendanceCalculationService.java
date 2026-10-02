package com.attendance.service;

import com.attendance.dto.SectionAttendanceStatsDto;
import com.attendance.dto.StudentAttendanceHistoryDto;
import com.attendance.dto.StudentAttendanceSummaryDto;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.model.*;
import com.attendance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceCalculationService {

    private final StudentRepository studentRepo;
    private final CourseRepository courseRepo;
    private final SectionRepository sectionRepo;
    private final AttendanceSessionRepository sessionRepo;
    private final AttendanceRecordRepository attendanceRecordRepo;

    /**
     * Calculate live attendance summary for a student.
     * ONLY completed sessions count.
     * RECORDING, CANCELLED, historical snapshot, future slots excluded.
     */
    @Transactional(readOnly = true)
    public StudentAttendanceSummaryDto getStudentSummary(Long studentId) {
        Student student = studentRepo.findById(studentId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId));

        List<AttendanceSession> completedSessions = sessionRepo
            .findBySectionSectionIdAndStatus(student.getSection().getSectionId(), AttendanceSession.SessionStatus.COMPLETED);

        List<AttendanceRecord> records = attendanceRecordRepo.findCompletedByStudentId(studentId);
        long presentCount = records.stream().filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.PRESENT).count();

        Double overallPct = completedSessions.isEmpty() ? null : Math.round(((double) presentCount * 100.0 / completedSessions.size()) * 100.0) / 100.0;

        List<Course> primaryCourses = courseRepo.findByIsPrimaryTrue();
        List<StudentAttendanceSummaryDto.CourseBreakdown> breakdowns = new ArrayList<>();

        for (Course c : primaryCourses) {
            List<AttendanceSession> courseCompleted = sessionRepo
                .findByCourseCourseIdAndSectionSectionIdAndStatus(c.getCourseId(), student.getSection().getSectionId(), AttendanceSession.SessionStatus.COMPLETED);
            List<AttendanceRecord> cRecords = attendanceRecordRepo.findCompletedByStudentAndCourse(studentId, c.getCourseId());
            long cPres = cRecords.stream().filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.PRESENT).count();
            Double cPct = courseCompleted.isEmpty() ? null : Math.round(((double) cPres * 100.0 / courseCompleted.size()) * 100.0) / 100.0;

            breakdowns.add(StudentAttendanceSummaryDto.CourseBreakdown.builder()
                .courseId(c.getCourseId())
                .courseCodeShort(c.getCourseCodeShort())
                .courseName(c.getCourseName())
                .totalCompleted(courseCompleted.size())
                .attended((int) cPres)
                .percentage(cPct)
                .build());
        }

        return StudentAttendanceSummaryDto.builder()
            .studentId(studentId)
            .rollNumber(student.getRollNumber())
            .studentName(student.getName())
            .section(student.getSection().getSectionName())
            .completedEligibleSessions(completedSessions.size())
            .attendedSessions((int) presentCount)
            .overallPercentage(overallPct)
            .courses(breakdowns)
            .build();
    }

    /**
     * Detailed lecture-by-lecture attendance history for a student.
     * ONLY completed sessions count.
     */
    @Transactional(readOnly = true)
    public List<StudentAttendanceHistoryDto> getStudentHistory(Long studentId) {
        Student student = studentRepo.findById(studentId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId));

        List<AttendanceRecord> records = attendanceRecordRepo.findCompletedByStudentId(studentId);
        return records.stream().map(r -> {
            AttendanceSession s = r.getSession();
            String room = (s.getTimetableEntry() != null && s.getTimetableEntry().getRoom() != null) 
                ? s.getTimetableEntry().getRoom() 
                : "Classroom 301";
            String period = (s.getTimetableEntry() != null && s.getTimetableEntry().getPeriod() != null) 
                ? s.getTimetableEntry().getPeriod() 
                : "I";
            String timeStr = s.getStartedAt() != null 
                ? s.getStartedAt().toLocalTime().toString() 
                : "09:00";

            return StudentAttendanceHistoryDto.builder()
                .recordId(r.getRecordId())
                .sessionId(s.getSessionId())
                .date(s.getSessionDate())
                .time(timeStr)
                .lectureNumber(s.getLectureNumber())
                .courseId(s.getCourse().getCourseId())
                .courseName(s.getCourse().getCourseName())
                .courseCodeShort(s.getCourse().getCourseCodeShort())
                .facultyName(s.getFaculty().getName())
                .section(s.getSection().getSectionName())
                .room(room)
                .period(period)
                .status(r.getStatus().name())
                .markedAt(r.getMarkedAt())
                .build();
        }).collect(Collectors.toList());
    }

    /**
     * Section attendance statistics.
     * Section average = total present marks / total eligible attendance marks (completed sessions only).
     */
    @Transactional(readOnly = true)
    public SectionAttendanceStatsDto getSectionSubjectStats(Long courseId, String sectionParam) {
        Section section;
        try {
            Long secId = Long.parseLong(sectionParam);
            section = sectionRepo.findById(secId)
                .orElseGet(() -> sectionRepo.findBySectionName(sectionParam).orElse(null));
        } catch (NumberFormatException e) {
            section = sectionRepo.findBySectionName(sectionParam).orElse(null);
        }
        if (section == null) {
            throw new ResourceNotFoundException("Section not found: " + sectionParam);
        }

        long rosterCount = studentRepo.countBySectionSectionName(section.getSectionName());

        List<Course> primaryCourses = courseRepo.findByIsPrimaryTrue();
        List<SectionAttendanceStatsDto.CourseStats> courseStatsList = new ArrayList<>();

        for (Course c : primaryCourses) {
            List<AttendanceSession> cCompleted = sessionRepo
                .findByCourseCourseIdAndSectionSectionIdAndStatus(c.getCourseId(), section.getSectionId(), AttendanceSession.SessionStatus.COMPLETED);
            long cEligible = cCompleted.size() * rosterCount;
            long cPresent = attendanceRecordRepo.countPresentMarksForSectionAndCourse(section.getSectionId(), c.getCourseId());
            Double cPct = cEligible == 0 ? null : Math.round(((double) cPresent * 100.0 / cEligible) * 100.0) / 100.0;

            courseStatsList.add(SectionAttendanceStatsDto.CourseStats.builder()
                .courseId(c.getCourseId())
                .courseCodeShort(c.getCourseCodeShort())
                .courseName(c.getCourseName())
                .completedSessions(cCompleted.size())
                .totalEligibleMarks((int) cEligible)
                .totalPresentMarks((int) cPresent)
                .averagePercentage(cPct)
                .build());
        }

        if (courseId != null) {
            Course course = courseRepo.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
            List<AttendanceSession> completed = sessionRepo
                .findByCourseCourseIdAndSectionSectionIdAndStatus(courseId, section.getSectionId(), AttendanceSession.SessionStatus.COMPLETED);

            long totalEligibleMarks = completed.size() * rosterCount;
            long presentMarks = attendanceRecordRepo.countPresentMarksForSectionAndCourse(section.getSectionId(), courseId);
            Double avgPct = totalEligibleMarks == 0 ? null : Math.round(((double) presentMarks * 100.0 / totalEligibleMarks) * 100.0) / 100.0;

            return SectionAttendanceStatsDto.builder()
                .sectionId(section.getSectionId())
                .section(section.getSectionName())
                .courseId(course.getCourseId())
                .courseCodeShort(course.getCourseCodeShort())
                .courseName(course.getCourseName())
                .completedSessions(completed.size())
                .totalRosteredStudents((int) rosterCount)
                .totalEligibleMarks((int) totalEligibleMarks)
                .totalPresentMarks((int) presentMarks)
                .averagePercentage(avgPct)
                .courses(courseStatsList)
                .build();
        } else {
            // Aggregate across all completed sessions in this section
            List<AttendanceSession> completed = sessionRepo
                .findBySectionSectionIdAndStatus(section.getSectionId(), AttendanceSession.SessionStatus.COMPLETED);
            long totalEligibleMarks = completed.size() * rosterCount;
            long totalPresentMarks = courseStatsList.stream().mapToLong(cs -> cs.getTotalPresentMarks() != null ? cs.getTotalPresentMarks() : 0).sum();
            Double avgPct = totalEligibleMarks == 0 ? null : Math.round(((double) totalPresentMarks * 100.0 / totalEligibleMarks) * 100.0) / 100.0;

            return SectionAttendanceStatsDto.builder()
                .sectionId(section.getSectionId())
                .section(section.getSectionName())
                .courseId(null)
                .courseCodeShort("ALL")
                .courseName("All Core Subjects")
                .completedSessions(completed.size())
                .totalRosteredStudents((int) rosterCount)
                .totalEligibleMarks((int) totalEligibleMarks)
                .totalPresentMarks((int) totalPresentMarks)
                .averagePercentage(avgPct)
                .courses(courseStatsList)
                .build();
        }
    }
}
