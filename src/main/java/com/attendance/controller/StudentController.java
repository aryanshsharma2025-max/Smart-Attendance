package com.attendance.controller;

import com.attendance.dto.StudentDto;
import com.attendance.service.StudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
        // Supports numeric ID or University Roll Number lookup
        try {
            Long numId = Long.parseLong(id);
            return ResponseEntity.ok(studentService.getStudentById(numId));
        } catch (NumberFormatException e) {
            return ResponseEntity.ok(studentService.getStudentByRoll(id));
        }
    }
}
