package com.attendance.service;

import com.attendance.dto.CourseDto;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.model.Course;
import com.attendance.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepo;

    @Transactional(readOnly = true)
    public List<CourseDto> getPrimarySubjects() {
        return courseRepo.findByIsPrimaryTrue().stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CourseDto> getAllSubjects() {
        return courseRepo.findAll().stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CourseDto getSubjectById(Long id) {
        return courseRepo.findById(id)
            .map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + id));
    }

    @Transactional(readOnly = true)
    public CourseDto getSubjectByCode(String code) {
        return courseRepo.findByCourseCodeShort(code)
            .map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Course not found with code: " + code));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getScheme(String schemeId) {
        Map<String, Object> result = new HashMap<>();
        result.put("schemeId", schemeId);
        result.put("university", "CSVTU Bhilai");
        result.put("degree", "B.Tech");
        result.put("department", "Computer Science & Engineering");
        result.put("semester", 3);
        result.put("status", "ACTIVE_FOR_SECTIONS_A_AND_B");
        result.put("sectionsRollout", Map.of(
            "Section A", "ACTIVE",
            "Section B", "ACTIVE",
            "Section C", "PENDING_ROLLOUT",
            "Section D", "PENDING_ROLLOUT"
        ));
        result.put("subjects", getAllSubjects());
        return result;
    }

    private CourseDto toDto(Course c) {
        return CourseDto.builder()
            .id(c.getCourseId())
            .courseCode(c.getCourseCode())
            .courseCodeShort(c.getCourseCodeShort())
            .name(c.getCourseName())
            .type(c.getCourseType().name())
            .credits(c.getCredits())
            .semester(c.getSemester())
            .isPrimary(c.getIsPrimary())
            .build();
    }
}
