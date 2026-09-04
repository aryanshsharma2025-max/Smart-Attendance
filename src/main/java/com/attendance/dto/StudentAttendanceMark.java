package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentAttendanceMark {
    private Long studentId;
    private String rollNumber;
    private String status; // "PRESENT" or "ABSENT"
}
