package com.attendance.controller;

import com.attendance.dto.FacultyAllocationDto;
import com.attendance.dto.FacultyDto;
import com.attendance.service.FacultyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/faculty")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class FacultyController {

    private final FacultyService facultyService;

    @GetMapping
    public ResponseEntity<List<FacultyDto>> getAllFaculty() {
        return ResponseEntity.ok(facultyService.getAllFaculty());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FacultyDto> getFacultyById(@PathVariable String id) {
        try {
            Long numId = Long.parseLong(id);
            return ResponseEntity.ok(facultyService.getFacultyById(numId));
        } catch (NumberFormatException e) {
            return ResponseEntity.ok(facultyService.getFacultyByCode(id));
        }
    }

    @GetMapping("/{id}/allocations")
    public ResponseEntity<List<FacultyAllocationDto>> getFacultyAllocations(@PathVariable Long id) {
        return ResponseEntity.ok(facultyService.getFacultyAllocations(id));
    }
}
