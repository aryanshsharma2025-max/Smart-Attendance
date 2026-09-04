package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimetableDto {
    private Long id;
    private String timetableCode;
    private String section;
    private String day;
    private Integer dayIndex;
    private String period;
    private Integer periodStart;
    private Integer periodEnd;
    private String startTime;
    private String endTime;
    private String timeDisplay;
    private String subjectCodeShort;
    private String subjectName;
    private String facultyId;
    private String facultyName;
    private String type;
    private String room;
    private String effectiveDate;
}
