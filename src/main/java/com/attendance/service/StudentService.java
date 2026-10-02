package com.attendance.service;

import com.attendance.dto.CreateStudentRequest;
import com.attendance.dto.StudentDto;
import com.attendance.dto.UpdateStudentRequest;
import com.attendance.exception.ConflictException;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.model.Department;
import com.attendance.model.Section;
import com.attendance.model.Student;
import com.attendance.model.CourseAllocation;
import com.attendance.repository.CourseAllocationRepository;
import com.attendance.repository.DepartmentRepository;
import com.attendance.repository.SectionRepository;
import com.attendance.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepo;
    private final SectionRepository sectionRepo;
    private final DepartmentRepository departmentRepo;
    private final CourseAllocationRepository allocationRepo;

    @Transactional(readOnly = true)
    public List<StudentDto> getAllStudents(String sectionName) {
        List<Student> list = (sectionName != null && !sectionName.isBlank()) 
            ? studentRepo.findBySectionSectionName(sectionName.trim().toUpperCase())
            : studentRepo.findAll();

        return list.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StudentDto> getStudentsBySection(String sectionParam) {
        try {
            Long secId = Long.parseLong(sectionParam);
            return studentRepo.findBySectionSectionId(secId).stream().map(this::toDto).collect(Collectors.toList());
        } catch (NumberFormatException e) {
            return studentRepo.findBySectionSectionName(sectionParam.trim().toUpperCase()).stream().map(this::toDto).collect(Collectors.toList());
        }
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

    @Transactional
    public StudentDto createStudent(CreateStudentRequest req) {
        if (studentRepo.existsByRollNumber(req.getRollNumber())) {
            throw new ConflictException("Student already exists with Roll Number: " + req.getRollNumber());
        }

        Section section = null;
        if (req.getSectionId() != null) {
            section = sectionRepo.findById(req.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + req.getSectionId()));
        } else if (req.getSectionName() != null) {
            section = sectionRepo.findBySectionName(req.getSectionName())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + req.getSectionName()));
        }

        Department dept = null;
        if (req.getDepartmentId() != null) {
            dept = departmentRepo.findById(req.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + req.getDepartmentId()));
        } else {
            dept = departmentRepo.findByDeptCode(req.getDeptCode() != null ? req.getDeptCode() : "CSE")
                .orElse(null);
        }

        Student student = Student.builder()
            .rollNumber(req.getRollNumber().trim())
            .name(req.getName().trim())
            .section(section)
            .department(dept)
            .semester(req.getSemester() != null ? req.getSemester() : 3)
            .enrollmentNumber(req.getEnrollmentNumber())
            .admissionType(req.getAdmissionType() != null ? req.getAdmissionType() : "REGULAR")
            .enrollmentStatus("ENROLLED")
            .status("ACTIVE")
            .build();

        student = studentRepo.save(student);
        return toDto(student);
    }

    @Transactional
    public StudentDto updateStudent(Long id, UpdateStudentRequest req) {
        Student student = studentRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));

        if (req.getName() != null && !req.getName().isBlank()) {
            student.setName(req.getName().trim());
        }
        if (req.getSectionId() != null) {
            Section section = sectionRepo.findById(req.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + req.getSectionId()));
            student.setSection(section);
        } else if (req.getSectionName() != null) {
            Section section = sectionRepo.findBySectionName(req.getSectionName())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + req.getSectionName()));
            student.setSection(section);
        }
        if (req.getSemester() != null) {
            student.setSemester(req.getSemester());
        }
        if (req.getStatus() != null) {
            student.setStatus(req.getStatus());
        }
        if (req.getAdmissionType() != null) {
            student.setAdmissionType(req.getAdmissionType());
        }

        student = studentRepo.save(student);
        return toDto(student);
    }

    @Transactional
    public void deleteStudent(Long id) {
        if (!studentRepo.existsById(id)) {
            throw new ResourceNotFoundException("Student not found with ID: " + id);
        }
        studentRepo.deleteById(id);
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
