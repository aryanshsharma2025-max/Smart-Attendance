package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseDto {
    private Long id;
    private String name;
    private String shortCode;
    private String officialCode;
    private String department;
    private Integer semester;
    private Boolean isPrimary;
    private String assignedFacultyName;
}
