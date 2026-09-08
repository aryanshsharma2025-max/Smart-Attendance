package com.attendance.service;

import com.attendance.dto.FacultyAllocationDto;
import com.attendance.dto.FacultyDto;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.model.CourseAllocation;
import com.attendance.model.Faculty;
import com.attendance.repository.CourseAllocationRepository;
import com.attendance.repository.FacultyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FacultyService {

    private final FacultyRepository facultyRepo;
    private final CourseAllocationRepository allocationRepo;

    @Transactional(readOnly = true)
    public List<FacultyDto> getAllFaculty() {
        return facultyRepo.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FacultyDto getFacultyById(Long id) {
        return facultyRepo.findById(id).map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Faculty not found: " + id));
    }

    @Transactional(readOnly = true)
    public FacultyDto getFacultyByCode(String code) {
        return facultyRepo.findByFacultyCode(code).map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Faculty not found: " + code));
    }

    @Transactional(readOnly = true)
    public List<FacultyAllocationDto> getFacultyAllocations(Long facultyId) {
        if (!facultyRepo.existsById(facultyId)) {
            throw new ResourceNotFoundException("Faculty not found: " + facultyId);
        }
        return allocationRepo.findByFacultyFacultyId(facultyId).stream()
            .map(a -> FacultyAllocationDto.builder()
                .allocationId(a.getAllocationId())
                .courseId(a.getCourse().getCourseId())
                .courseCodeShort(a.getCourse().getCourseCodeShort())
                .courseCode(a.getCourse().getOfficialCourseCode())
                .courseName(a.getCourse().getCourseName())
                .sectionId(a.getSection().getSectionId())
                .sectionName(a.getSection().getSectionName())
                .semester(a.getCourse().getSemester())
                .academicYear(null)
                .status(a.getStatus().name())
                .build())
            .collect(Collectors.toList());
    }

    private FacultyDto toDto(Faculty f) {
        List<CourseAllocation> allocs = allocationRepo.findByFacultyFacultyId(f.getFacultyId());
        List<String> subjects = allocs.stream().map(a -> a.getCourse().getCourseName()).distinct().collect(Collectors.toList());
        List<String> sections = allocs.stream().map(a -> a.getSection().getSectionName()).distinct().collect(Collectors.toList());

        return FacultyDto.builder()
            .id(f.getFacultyId())
            .facultyCode(f.getFacultyCode())
            .name(f.getName())
            .email(f.getEmail())
            .role(f.getRole().name())
            .designation(f.getDesignation())
            .department(f.getDepartment() != null ? f.getDepartment().getDeptCode() : "CSE")
            .assignedSubjects(subjects)
            .assignedSections(sections)
            .build();
    }
}
