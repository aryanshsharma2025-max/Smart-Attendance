package com.attendance.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAttendanceSummaryDto {
    private Long studentId;
    private String rollNumber;
    private String studentName;
    private String section;
    private Integer completedEligibleSessions;
    private Integer attendedSessions;
    private Double overallPercentage;
    private List<CourseBreakdown> courses;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CourseBreakdown {
        private Long courseId;
        private String courseCodeShort;
        private String courseName;
        private Integer totalCompleted;
        private Integer attended;
        private Double percentage;
    }
}
