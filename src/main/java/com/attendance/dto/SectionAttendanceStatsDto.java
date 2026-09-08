package com.attendance.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SectionAttendanceStatsDto {
    private Long sectionId;
    private String section;
    private Long courseId;
    private String courseCodeShort;
    private String courseName;
    private Integer completedSessions;
    private Integer totalRosteredStudents;
    private Integer totalEligibleMarks;
    private Integer totalPresentMarks;
    private Double averagePercentage;
    private List<CourseStats> courses;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CourseStats {
        private Long courseId;
        private String courseCodeShort;
        private String courseName;
        private Integer completedSessions;
        private Integer totalEligibleMarks;
        private Integer totalPresentMarks;
        private Double averagePercentage;
    }
}
