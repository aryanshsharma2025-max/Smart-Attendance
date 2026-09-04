package com.attendance.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRecordDto {
    private Long recordId;
    private Long sessionId;
    private Long studentId;
    private String rollNumber;
    private String studentName;
    private String status;
    private LocalDateTime markedAt;
}
