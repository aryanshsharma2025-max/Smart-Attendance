package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.exception.UnauthorizedActionException;
import com.attendance.security.UserPrincipal;
import com.attendance.service.AcademicAuthorizationService;
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
    private final AcademicAuthorizationService authService;

    // Student summary (canonical & aliases)
    @GetMapping({"/api/students/{id}/attendance", "/api/attendance/summary/student/{id}"})
    public ResponseEntity<StudentAttendanceSummaryDto> getStudentAttendance(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        authService.checkStudentAccess(principal, id);
        return ResponseEntity.ok(calculationService.getStudentSummary(id));
    }

    // Student detailed history (lecture-by-lecture)
    @GetMapping("/api/attendance/history/student/{id}")
    public ResponseEntity<List<StudentAttendanceHistoryDto>> getStudentHistory(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        authService.checkStudentAccess(principal, id);
        return ResponseEntity.ok(calculationService.getStudentHistory(id));
    }

    @GetMapping("/api/students/{id}/attendance/subject/{subjectId}")
    public ResponseEntity<StudentAttendanceSummaryDto.CourseBreakdown> getStudentSubjectAttendance(
            @PathVariable Long id,
            @PathVariable Long subjectId,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        authService.checkStudentAccess(principal, id);

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
            @RequestParam(required = false) Long courseId,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        authService.checkSectionAccess(principal, section);

        Long resolvedCourseId = (courseId != null) ? courseId : subjectId;
        return ResponseEntity.ok(calculationService.getSectionSubjectStats(resolvedCourseId, section));
    }

    @GetMapping("/api/faculty/{facultyId}/sessions")
    public ResponseEntity<List<SessionDto>> getFacultySessions(
            @PathVariable Long facultyId,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        authService.checkFacultySessionsAccess(principal, facultyId);
        return ResponseEntity.ok(sessionService.getSessionsForFaculty(facultyId));
    }
}
