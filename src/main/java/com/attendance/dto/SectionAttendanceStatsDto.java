package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SectionAttendanceStatsDto {
    private String section;
    private String courseCodeShort;
    private String courseName;
    private Integer completedSessions;
    private Integer totalRosteredStudents;
    private Integer totalEligibleMarks;
    private Integer totalPresentMarks;
    private Double averagePercentage;
}
