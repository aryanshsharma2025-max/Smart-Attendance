package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.service.AttendanceSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    public ResponseEntity<SessionDto> startSession(@RequestBody StartSessionRequest request) {
        SessionDto session = sessionService.startSession(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(session);
    }

    @PostMapping("/start")
    @PreAuthorize("hasAnyRole('FACULTY', 'HOD')")
    public ResponseEntity<SessionDto> startSessionAlias(@RequestBody StartSessionRequest request) {
        return startSession(request);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SessionDto> getSession(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSessionById(id));
    }

    @PostMapping("/{id}/attendance")
    @PreAuthorize("hasAnyRole('FACULTY', 'HOD')")
    public ResponseEntity<AttendanceSubmissionResponse> saveAttendance(
            @PathVariable Long id,
            @RequestBody MarkAttendanceRequest request) {
        return ResponseEntity.ok(sessionService.saveAttendance(id, request));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('FACULTY', 'HOD')")
    public ResponseEntity<AttendanceSubmissionResponse> submitAttendanceAlias(
            @PathVariable Long id,
            @RequestBody MarkAttendanceRequest request) {
        return saveAttendance(id, request);
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
