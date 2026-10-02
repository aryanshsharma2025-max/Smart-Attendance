package com.attendance.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StartSessionRequest {
    private String facultyCode;
    private Long facultyId;
    private String subjectCodeShort;
    private Long subjectId;
    private String section; // "A", "B", etc.
    private Long sectionId;
    private String timetableCode;
    private Long timetableEntryId;
    private LocalDate sessionDate;
    private String startTime;
    private String endTime;
}
