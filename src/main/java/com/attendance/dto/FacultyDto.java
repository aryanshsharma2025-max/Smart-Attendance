package com.attendance.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FacultyDto {
    private Long id;
    private String facultyCode;
    private String name;
    private String email;
    private String role;
    private String designation;
    private String department;
    private List<String> assignedSubjects;
    private List<String> assignedSections;
}
