package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.exception.UnauthorizedActionException;
import com.attendance.security.UserPrincipal;
import com.attendance.service.AttendanceSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SessionController {

    private final AttendanceSessionService sessionService;

    @PostMapping
    @PreAuthorize("hasAnyRole('FACULTY', 'HOD')")
    public ResponseEntity<SessionDto> startSession(
            @RequestBody StartSessionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        // Identity Spoofing Protection: enforce or safely derive facultyId from authentication
        if (principal != null) {
            if ("FACULTY".equalsIgnoreCase(principal.getRole())) {
                if (request.getFacultyId() != null && !request.getFacultyId().equals(principal.getFacultyId())) {
                    throw new UnauthorizedActionException("403 Forbidden: Identity spoofing detected - authenticated faculty ID (" 
                        + principal.getFacultyId() + ") does not match requested facultyId (" + request.getFacultyId() + ")");
                }
                if (request.getFacultyId() == null) {
                    request.setFacultyId(principal.getFacultyId());
                }
            } else if ("HOD".equalsIgnoreCase(principal.getRole())) {
                if (request.getFacultyId() == null && request.getFacultyCode() == null) {
                    request.setFacultyId(principal.getFacultyId());
                }
            }
        }

        SessionDto session = sessionService.startSession(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(session);
    }

    @PostMapping("/start")
    @PreAuthorize("hasAnyRole('FACULTY', 'HOD')")
    public ResponseEntity<SessionDto> startSessionAlias(
            @RequestBody StartSessionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return startSession(request, principal);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SessionDto> getSession(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSessionById(id));
    }

    @PostMapping("/{id}/attendance")
    @PreAuthorize("hasAnyRole('FACULTY', 'HOD')")
    public ResponseEntity<AttendanceSubmissionResponse> saveAttendance(
            @PathVariable Long id,
            @RequestBody MarkAttendanceRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        // Identity Spoofing Protection: enforce or safely derive facultyId from authentication
        if (principal != null && "FACULTY".equalsIgnoreCase(principal.getRole())) {
            if (request.getFacultyId() != null && !request.getFacultyId().equals(principal.getFacultyId())) {
                throw new UnauthorizedActionException("403 Forbidden: Identity spoofing detected - authenticated faculty ID (" 
                    + principal.getFacultyId() + ") does not match submission facultyId (" + request.getFacultyId() + ")");
            }
            if (request.getFacultyId() == null) {
                request.setFacultyId(principal.getFacultyId());
            }
        }

        return ResponseEntity.ok(sessionService.saveAttendance(id, request));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('FACULTY', 'HOD')")
    public ResponseEntity<AttendanceSubmissionResponse> submitAttendanceAlias(
            @PathVariable Long id,
            @RequestBody MarkAttendanceRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return saveAttendance(id, request, principal);
    }

    @GetMapping("/{id}/attendance")
    public ResponseEntity<List<AttendanceRecordDto>> getSessionAttendance(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSessionAttendance(id));
    }

    @GetMapping("/{id}/records")
    public ResponseEntity<List<AttendanceRecordDto>> getSessionRecordsAlias(@PathVariable Long id) {
        return getSessionAttendance(id);
    }

    @GetMapping("/active")
    public ResponseEntity<List<SessionDto>> getActiveSessions() {
        return ResponseEntity.ok(sessionService.getActiveSessions());
    }

    @GetMapping("/faculty/{facultyId}")
    public ResponseEntity<List<SessionDto>> getFacultySessions(@PathVariable Long facultyId) {
        return ResponseEntity.ok(sessionService.getSessionsForFaculty(facultyId));
    }
}
