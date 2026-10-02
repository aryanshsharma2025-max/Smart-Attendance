package com.attendance.controller;

import com.attendance.dto.CreateStudentRequest;
import com.attendance.dto.StudentDto;
import com.attendance.dto.UpdateStudentRequest;
import com.attendance.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;

    @GetMapping
    public ResponseEntity<List<StudentDto>> getAllStudents(@RequestParam(required = false) String section) {
        return ResponseEntity.ok(studentService.getAllStudents(section));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudentDto> getStudentById(@PathVariable String id) {
        try {
            Long numId = Long.parseLong(id);
            return ResponseEntity.ok(studentService.getStudentById(numId));
        } catch (NumberFormatException e) {
            return ResponseEntity.ok(studentService.getStudentByRoll(id));
        }
    }

    @GetMapping("/section/{sectionId}")
    public ResponseEntity<List<StudentDto>> getStudentsBySection(@PathVariable String sectionId) {
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
