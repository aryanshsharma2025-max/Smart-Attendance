package com.attendance.service;

import com.attendance.dto.SectionAttendanceStatsDto;
import com.attendance.dto.StudentAttendanceSummaryDto;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.model.*;
import com.attendance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

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
     * Section attendance statistics for a subject.
     * Section average = total present marks / total eligible attendance marks (completed sessions only).
     */
    @Transactional(readOnly = true)
    public SectionAttendanceStatsDto getSectionSubjectStats(Long courseId, String sectionName) {
        Course course = courseRepo.findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
        Section section = sectionRepo.findBySectionName(sectionName)
            .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionName));

        List<AttendanceSession> completed = sessionRepo
            .findByCourseCourseIdAndSectionSectionIdAndStatus(courseId, section.getSectionId(), AttendanceSession.SessionStatus.COMPLETED);

        long rosterCount = studentRepo.countBySectionSectionName(sectionName);
        long totalEligibleMarks = completed.size() * rosterCount;
        long presentMarks = attendanceRecordRepo.countPresentMarksForSectionAndCourse(section.getSectionId(), courseId);

        Double avgPct = totalEligibleMarks == 0 ? null : Math.round(((double) presentMarks * 100.0 / totalEligibleMarks) * 100.0) / 100.0;

        return SectionAttendanceStatsDto.builder()
            .section(sectionName)
            .courseCodeShort(course.getCourseCodeShort())
            .courseName(course.getCourseName())
            .completedSessions(completed.size())
            .totalRosteredStudents((int) rosterCount)
            .totalEligibleMarks((int) totalEligibleMarks)
            .totalPresentMarks((int) presentMarks)
            .averagePercentage(avgPct)
            .build();
    }
}
