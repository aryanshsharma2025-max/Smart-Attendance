package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.exception.UnauthorizedActionException;
import com.attendance.security.UserPrincipal;
import com.attendance.service.AttendanceCalculationService;
import com.attendance.service.AttendanceSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AttendanceHistoryController {

    private final AttendanceCalculationService calculationService;
    private final AttendanceSessionService sessionService;

    // Student summary (canonical & aliases)
    @GetMapping({"/api/students/{id}/attendance", "/api/attendance/summary/student/{id}"})
    public ResponseEntity<StudentAttendanceSummaryDto> getStudentAttendance(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        // Authorization & Identity Spoofing Protection:
        if (principal == null) {
            throw new UnauthorizedActionException("401 Unauthorized: Authentication required to access student attendance summary");
        }
        if ("STUDENT".equalsIgnoreCase(principal.getRole())) {
            if (principal.getStudentId() != null && !principal.getStudentId().equals(id)) {
                throw new AccessDeniedException("403 Forbidden: Students are restricted from accessing attendance records of other students");
            }
        }

        return ResponseEntity.ok(calculationService.getStudentSummary(id));
    }

    // Student detailed history (lecture-by-lecture)
    @GetMapping("/api/attendance/history/student/{id}")
    public ResponseEntity<List<StudentAttendanceHistoryDto>> getStudentHistory(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        // Authorization & Identity Spoofing Protection:
        if (principal == null) {
            throw new UnauthorizedActionException("401 Unauthorized: Authentication required to access student attendance history");
        }
        if ("STUDENT".equalsIgnoreCase(principal.getRole())) {
            if (principal.getStudentId() != null && !principal.getStudentId().equals(id)) {
                throw new AccessDeniedException("403 Forbidden: Students are restricted from accessing attendance records of other students");
            }
        }

        return ResponseEntity.ok(calculationService.getStudentHistory(id));
    }

    @GetMapping("/api/students/{id}/attendance/subject/{subjectId}")
    public ResponseEntity<StudentAttendanceSummaryDto.CourseBreakdown> getStudentSubjectAttendance(
            @PathVariable Long id,
            @PathVariable Long subjectId,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        if (principal == null) {
            throw new UnauthorizedActionException("401 Unauthorized: Authentication required to access student attendance summary");
        }
        if ("STUDENT".equalsIgnoreCase(principal.getRole())) {
            if (principal.getStudentId() != null && !principal.getStudentId().equals(id)) {
                throw new AccessDeniedException("403 Forbidden: Students are restricted from accessing attendance records of other students");
            }
        }

        StudentAttendanceSummaryDto summary = calculationService.getStudentSummary(id);
        return summary.getCourses().stream()
            .filter(c -> c.getCourseId().equals(subjectId))
            .findFirst()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // Section stats (canonical & aliases)
    @GetMapping({"/api/attendance/subject/{subjectId}/section/{section}", "/api/attendance/summary/section/{section}"})
    public ResponseEntity<SectionAttendanceStatsDto> getSectionSubjectStats(
            @PathVariable(required = false) Long subjectId,
            @PathVariable String section,
            @RequestParam(required = false) Long courseId) {
        Long resolvedCourseId = (courseId != null) ? courseId : subjectId;
        return ResponseEntity.ok(calculationService.getSectionSubjectStats(resolvedCourseId, section));
    }

    @GetMapping("/api/faculty/{facultyId}/sessions")
    public ResponseEntity<List<SessionDto>> getFacultySessions(@PathVariable Long facultyId) {
        return ResponseEntity.ok(sessionService.getSessionsForFaculty(facultyId));
    }
}
