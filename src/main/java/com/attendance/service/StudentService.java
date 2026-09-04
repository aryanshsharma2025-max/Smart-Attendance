package com.attendance.service;

import com.attendance.dto.StudentDto;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.model.Student;
import com.attendance.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepo;

    @Transactional(readOnly = true)
    public List<StudentDto> getAllStudents(String sectionName) {
        List<Student> list = (sectionName != null && !sectionName.isBlank()) 
            ? studentRepo.findBySectionSectionName(sectionName.trim().toUpperCase())
            : studentRepo.findAll();

        return list.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StudentDto getStudentById(Long id) {
        return studentRepo.findById(id).map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));
    }

    @Transactional(readOnly = true)
    public StudentDto getStudentByRoll(String roll) {
        return studentRepo.findByRollNumber(roll).map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found with Roll: " + roll));
    }

    private StudentDto toDto(Student s) {
        return StudentDto.builder()
            .id(s.getStudentId())
            .rollNumber(s.getRollNumber())
            .name(s.getName())
            .section(s.getSection() != null ? s.getSection().getSectionName() : null)
            .department(s.getDepartment() != null ? s.getDepartment().getDeptCode() : "CSE")
            .semester(s.getSemester())
            .enrollmentNumber(s.getEnrollmentNumber())
            .enrollmentStatus(s.getEnrollmentStatus())
            .admissionType(s.getAdmissionType())
            .status(s.getStatus())
            .attendance(new StudentDto.AttendanceSummary(0, 0, null, "No attendance recorded yet"))
            .build();
    }
}
