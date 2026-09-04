package com.attendance.service;

import com.attendance.dto.TimetableDto;
import com.attendance.model.TimetableEntry;
import com.attendance.repository.TimetableEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableEntryRepository timetableRepo;

    @Transactional(readOnly = true)
    public List<TimetableDto> getTimetable(String section) {
        List<TimetableEntry> entries = (section != null && !section.isBlank())
            ? timetableRepo.findBySectionSectionName(section.trim().toUpperCase())
            : timetableRepo.findAll();
        return entries.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TimetableDto> getTimetableByFaculty(Long facultyId) {
        return timetableRepo.findByFacultyFacultyId(facultyId).stream().map(this::toDto).collect(Collectors.toList());
    }

    private TimetableDto toDto(TimetableEntry t) {
        return TimetableDto.builder()
            .id(t.getEntryId())
            .timetableCode(t.getTimetableCode())
            .section(t.getSection().getSectionName())
            .day(t.getDayOfWeek())
            .dayIndex(t.getDayIndex())
            .period(t.getPeriod())
            .periodStart(t.getPeriodStart())
            .periodEnd(t.getPeriodEnd())
            .startTime(t.getStartTime().toString())
            .endTime(t.getEndTime().toString())
            .timeDisplay(t.getStartTime() + " – " + t.getEndTime())
            .subjectCodeShort(t.getCourse().getCourseCodeShort())
            .subjectName(t.getCourse().getCourseName())
            .facultyId(t.getFaculty().getFacultyCode())
            .facultyName(t.getFaculty().getName())
            .type(t.getSlotType())
            .room(t.getRoom())
            .effectiveDate(t.getEffectiveDate())
            .build();
    }
}
