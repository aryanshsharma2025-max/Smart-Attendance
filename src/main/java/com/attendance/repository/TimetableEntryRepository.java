package com.attendance.repository;

import com.attendance.model.TimetableEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface TimetableEntryRepository extends JpaRepository<TimetableEntry, Long> {
    Optional<TimetableEntry> findByTimetableCode(String timetableCode);
    List<TimetableEntry> findBySectionSectionName(String sectionName);
    List<TimetableEntry> findByFacultyFacultyId(Long facultyId);
    List<TimetableEntry> findByFacultyFacultyCode(String facultyCode);
}
