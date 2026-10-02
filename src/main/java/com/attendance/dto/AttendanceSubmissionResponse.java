package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceSubmissionResponse {
    private String status;
    private String message;
    private Long sessionId;
    private Integer lectureNumber;
    private Integer presentCount;
    private Integer absentCount;
    private Integer totalRecorded;
}
