package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentDto {
    private Long id;
    private String rollNumber;
    private String name;
    private String section;
    private String department;
    private Integer semester;
    private String enrollmentNumber;
    private String enrollmentStatus;
    private String admissionType;
    private String status;
    private AttendanceSummary attendance;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceSummary {
        private Integer totalLectures;
        private Integer attendedLectures;
        private Double percentage;
        private String statusText;
    }
}
