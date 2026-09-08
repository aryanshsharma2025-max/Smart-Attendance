package com.attendance.controller;

import com.attendance.dto.ActiveSlotDto;
import com.attendance.dto.TimetableDto;
import com.attendance.service.TimetableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/timetable")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;

    @GetMapping
    public ResponseEntity<List<TimetableDto>> getTimetable(@RequestParam(required = false) String section) {
        return ResponseEntity.ok(timetableService.getTimetable(section));
    }

    @GetMapping("/section/{sectionId}")
    public ResponseEntity<List<TimetableDto>> getTimetableBySection(@PathVariable String sectionId) {
        try {
            Long secId = Long.parseLong(sectionId);
            return ResponseEntity.ok(timetableService.getTimetableBySectionId(secId));
        } catch (NumberFormatException e) {
            return ResponseEntity.ok(timetableService.getTimetable(sectionId));
        }
    }

    @GetMapping("/faculty/{facultyId}")
    public ResponseEntity<List<TimetableDto>> getTimetableForFaculty(@PathVariable Long facultyId) {
        return ResponseEntity.ok(timetableService.getTimetableByFaculty(facultyId));
    }

    @GetMapping("/active-slot")
    public ResponseEntity<ActiveSlotDto> getActiveSlot() {
        return ResponseEntity.ok(timetableService.getActiveSlot());
    }
}
