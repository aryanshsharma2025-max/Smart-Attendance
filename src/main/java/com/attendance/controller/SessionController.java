package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.service.AttendanceSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SessionController {

    private final AttendanceSessionService sessionService;

    @PostMapping
    public ResponseEntity<SessionDto> startSession(@RequestBody StartSessionRequest request) {
        SessionDto session = sessionService.startSession(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(session);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SessionDto> getSession(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSessionById(id));
    }

    @PostMapping("/{id}/attendance")
    public ResponseEntity<AttendanceSubmissionResponse> saveAttendance(
            @PathVariable Long id,
            @RequestBody MarkAttendanceRequest request) {
        return ResponseEntity.ok(sessionService.saveAttendance(id, request));
    }

    @GetMapping("/{id}/attendance")
    public ResponseEntity<List<AttendanceRecordDto>> getSessionAttendance(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSessionAttendance(id));
    }

    @GetMapping("/faculty/{facultyId}")
    public ResponseEntity<List<SessionDto>> getFacultySessions(@PathVariable Long facultyId) {
        return ResponseEntity.ok(sessionService.getSessionsForFaculty(facultyId));
    }
}
