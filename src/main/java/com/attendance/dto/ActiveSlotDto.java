package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActiveSlotDto {
    private String dayOfWeek;
    private String slotTime;
    private String startTime;
    private String endTime;
    private String subjectCode;
    private String subjectName;
    private String facultyName;
    private String facultyCode;
    private String section;
    private String room;
    private Boolean isBreak;
}
