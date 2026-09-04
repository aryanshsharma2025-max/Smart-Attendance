package com.attendance.service;

import com.attendance.dto.CourseDto;
import com.attendance.model.Course;
import com.attendance.model.CourseAllocation;
import com.attendance.repository.CourseAllocationRepository;
import com.attendance.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepo;
    private final CourseAllocationRepository allocationRepo;

    @Transactional(readOnly = true)
    public List<CourseDto> getPrimarySubjects() {
        return courseRepo.findByIsPrimaryTrue().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CourseDto> getAllSubjects() {
        return courseRepo.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    private CourseDto toDto(Course c) {
        List<CourseAllocation> allocs = allocationRepo.findByCourseCourseId(c.getCourseId());
        String facName = allocs.isEmpty() ? "Unassigned" : allocs.get(0).getFaculty().getName();

        return CourseDto.builder()
            .id(c.getCourseId())
            .name(c.getCourseName())
            .shortCode(c.getCourseCodeShort())
            .officialCode(c.getOfficialCourseCode())
            .department(c.getDepartment() != null ? c.getDepartment().getDeptCode() : "CSE")
            .semester(c.getSemester())
            .isPrimary(c.getIsPrimary())
            .assignedFacultyName(facName)
            .build();
    }
}
