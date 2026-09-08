package com.attendance.service;

import com.attendance.dto.ActiveSlotDto;
import com.attendance.dto.TimetableDto;
import com.attendance.model.TimetableEntry;
import com.attendance.repository.SectionRepository;
import com.attendance.repository.TimetableEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableEntryRepository timetableRepo;
    private final SectionRepository sectionRepo;

    @Transactional(readOnly = true)
    public List<TimetableDto> getTimetable(String section) {
        if (section == null || section.isBlank()) {
            return timetableRepo.findAll().stream().map(this::toDto).collect(Collectors.toList());
        }

        String sec = section.trim().toUpperCase();
        // Sections C and D have 0 entries (Pending CSVTU scheme rollout)
        if (sec.equals("C") || sec.equals("D") || sec.equals("SECTION C") || sec.equals("SECTION D")) {
            return Collections.emptyList();
        }

        return timetableRepo.findBySectionSectionName(sec).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TimetableDto> getTimetableBySectionId(Long sectionId) {
        return sectionRepo.findById(sectionId)
            .map(s -> getTimetable(s.getSectionName()))
            .orElse(Collections.emptyList());
    }

    @Transactional(readOnly = true)
    public List<TimetableDto> getTimetableByFaculty(Long facultyId) {
        return timetableRepo.findByFacultyFacultyId(facultyId).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ActiveSlotDto getActiveSlot() {
        return ActiveSlotDto.builder()
            .dayOfWeek("MONDAY")
            .slotTime("10:15-11:15")
            .startTime("10:15")
            .endTime("11:15")
            .subjectCode("OS")
            .subjectName("Operating Systems")
            .facultyName("Devbrat Singh")
            .facultyCode("faculty-devbrat")
            .section("A")
            .room("Room 201")
            .isBreak(false)
            .build();
    }

    private TimetableDto toDto(TimetableEntry e) {
        return TimetableDto.builder()
            .id(e.getEntryId())
            .timetableCode(e.getTimetableCode())
            .section(e.getSection().getSectionName())
            .dayOfWeek(e.getDayOfWeek().name())
            .slotTime(e.getSlotTime())
            .startTime(e.getStartTime().toString())
            .endTime(e.getEndTime().toString())
            .subjectId(e.getCourse() != null ? e.getCourse().getCourseId() : null)
            .subjectCode(e.getCourse() != null ? e.getCourse().getCourseCodeShort() : null)
            .subjectName(e.getCourse() != null ? e.getCourse().getCourseName() : null)
            .facultyId(e.getFaculty() != null ? e.getFaculty().getFacultyId() : null)
            .facultyName(e.getFaculty() != null ? e.getFaculty().getName() : null)
            .room(e.getRoom())
            .isBreak(e.getIsBreak())
            .build();
    }
}
