package com.attendance.controller;

import com.attendance.dto.CourseDto;
import com.attendance.service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    @GetMapping("/{id}")
    public ResponseEntity<CourseDto> getSubjectById(@PathVariable String id) {
        try {
            Long numId = Long.parseLong(id);
            return ResponseEntity.ok(courseService.getSubjectById(numId));
        } catch (NumberFormatException e) {
            return ResponseEntity.ok(courseService.getSubjectByCode(id));
        }
    }

    @GetMapping("/scheme/{schemeId}")
    public ResponseEntity<Map<String, Object>> getSchemeDetails(@PathVariable String schemeId) {
        return ResponseEntity.ok(courseService.getScheme(schemeId));
    }
}
