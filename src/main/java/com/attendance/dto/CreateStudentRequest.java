package com.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateStudentRequest {
    @NotBlank(message = "Roll number is required")
    private String rollNumber;

    @NotBlank(message = "Student name is required")
    private String name;

    private Long sectionId;
    private String sectionName;

    private Long departmentId;
    private String deptCode;

    @Builder.Default
    private Integer semester = 3;

    private String enrollmentNumber;
    private String admissionType;
}
