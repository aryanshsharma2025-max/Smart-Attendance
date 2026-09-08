package com.attendance.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAttendanceHistoryDto {
    private Long recordId;
    private Long sessionId;
    private LocalDate date;
    private String time;
    private Integer lectureNumber;
    private Long courseId;
    private String courseName;
    private String courseCodeShort;
    private String facultyName;
    private String section;
    private String room;
    private String period;
    private String status;
    private LocalDateTime markedAt;
}
