package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateStudentRequest {
    private String name;
    private Long sectionId;
    private String sectionName;
    private Integer semester;
    private String status;
    private String admissionType;
}
