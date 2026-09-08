package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.exception.UnauthorizedActionException;
import com.attendance.security.UserPrincipal;
import com.attendance.service.AttendanceCalculationService;
import com.attendance.service.AttendanceSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AttendanceHistoryController {

    private final AttendanceCalculationService calculationService;
    private final AttendanceSessionService sessionService;

    // Student summary (legacy & new REST convention)
    @GetMapping({"/api/students/{id}/attendance", "/api/attendance/summary/student/{id}", "/api/attendance/history/student/{id}"})
    public ResponseEntity<StudentAttendanceSummaryDto> getStudentAttendance(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        // Identity Spoofing Protection: student can only access own attendance
        if (principal != null && "STUDENT".equalsIgnoreCase(principal.getRole())) {
            if (principal.getStudentId() != null && !principal.getStudentId().equals(id)) {
                throw new UnauthorizedActionException("403 Forbidden: Students are restricted from accessing attendance records of other students");
            }
        }

        return ResponseEntity.ok(calculationService.getStudentSummary(id));
    }

    @GetMapping("/api/students/{id}/attendance/subject/{subjectId}")
    public ResponseEntity<StudentAttendanceSummaryDto.CourseBreakdown> getStudentSubjectAttendance(
            @PathVariable Long id,
            @PathVariable Long subjectId,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        // Identity Spoofing Protection: student can only access own attendance
        if (principal != null && "STUDENT".equalsIgnoreCase(principal.getRole())) {
            if (principal.getStudentId() != null && !principal.getStudentId().equals(id)) {
                throw new UnauthorizedActionException("403 Forbidden: Students are restricted from accessing attendance records of other students");
            }
        }

        StudentAttendanceSummaryDto summary = calculationService.getStudentSummary(id);
        return summary.getCourses().stream()
            .filter(c -> c.getCourseId().equals(subjectId))
            .findFirst()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // Section stats (legacy & new REST convention)
    @GetMapping({"/api/attendance/subject/{subjectId}/section/{section}", "/api/attendance/summary/section/{section}"})
    public ResponseEntity<SectionAttendanceStatsDto> getSectionSubjectStats(
            @PathVariable(required = false) Long subjectId,
            @PathVariable String section) {
        Long resolvedSubjectId = (subjectId != null) ? subjectId : 1L; // default to OS or first primary course
        return ResponseEntity.ok(calculationService.getSectionSubjectStats(resolvedSubjectId, section));
    }

    @GetMapping("/api/faculty/{facultyId}/sessions")
    public ResponseEntity<List<SessionDto>> getFacultySessions(@PathVariable Long facultyId) {
        return ResponseEntity.ok(sessionService.getSessionsForFaculty(facultyId));
    }
}
