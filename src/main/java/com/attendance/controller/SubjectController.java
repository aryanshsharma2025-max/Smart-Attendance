package com.attendance.controller;

import com.attendance.dto.CourseDto;
import com.attendance.service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subjects")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SubjectController {

    private final CourseService courseService;

    @GetMapping
    public ResponseEntity<List<CourseDto>> getSubjects(@RequestParam(defaultValue = "true") boolean primaryOnly) {
        if (primaryOnly) {
            return ResponseEntity.ok(courseService.getPrimarySubjects());
        }
        return ResponseEntity.ok(courseService.getAllSubjects());
    }
}
