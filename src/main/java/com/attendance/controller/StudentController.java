package com.attendance.controller;

import com.attendance.dto.CreateStudentRequest;
import com.attendance.dto.StudentDto;
import com.attendance.dto.UpdateStudentRequest;
import com.attendance.security.UserPrincipal;
import com.attendance.service.AcademicAuthorizationService;
import com.attendance.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;
    private final AcademicAuthorizationService authService;

    @GetMapping
    public ResponseEntity<List<StudentDto>> getAllStudents(
            @RequestParam(required = false) String section,
            @AuthenticationPrincipal UserPrincipal principal) {
        authService.checkAllStudentsAccess(principal, section);
        if (principal != null && "FACULTY".equalsIgnoreCase(principal.getRole()) && (section == null || section.isBlank())) {
            return ResponseEntity.ok(studentService.getStudentsForFaculty(principal.getFacultyId()));
        }
        return ResponseEntity.ok(studentService.getAllStudents(section));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudentDto> getStudentById(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal != null && "STUDENT".equalsIgnoreCase(principal.getRole())) {
            boolean matchesId = false;
            try {
                Long numId = Long.parseLong(id);
                matchesId = principal.getStudentId() != null && principal.getStudentId().equals(numId);
            } catch (NumberFormatException ignored) {}

            boolean matchesRoll = principal.getUsername() != null && principal.getUsername().equalsIgnoreCase(id.trim());
            if (!matchesId && !matchesRoll) {
                throw new org.springframework.security.access.AccessDeniedException("403 Forbidden: Students are restricted from accessing records of other students");
            }
        }

        Long studentId = studentService.resolveStudentId(id);
        authService.checkStudentAccess(principal, studentId);
        return ResponseEntity.ok(studentService.getStudentById(studentId));
    }

    @GetMapping("/section/{sectionId}")
    public ResponseEntity<List<StudentDto>> getStudentsBySection(
            @PathVariable String sectionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        authService.checkSectionAccess(principal, sectionId);
        return ResponseEntity.ok(studentService.getStudentsBySection(sectionId));
    }

    @PostMapping
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<StudentDto> createStudent(@Valid @RequestBody CreateStudentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(studentService.createStudent(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<StudentDto> updateStudent(@PathVariable Long id, @RequestBody UpdateStudentRequest request) {
        return ResponseEntity.ok(studentService.updateStudent(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<Void> deleteStudent(@PathVariable Long id) {
        studentService.deleteStudent(id);
        return ResponseEntity.noContent().build();
    }
}
