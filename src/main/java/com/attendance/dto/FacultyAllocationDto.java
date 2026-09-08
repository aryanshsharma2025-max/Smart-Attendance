package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FacultyAllocationDto {
    private Long allocationId;
    private Long courseId;
    private String courseCodeShort;
    private String courseCode;
    private String courseName;
    private Long sectionId;
    private String sectionName;
    private Integer semester;
    private String academicYear;
    private String status;
}
