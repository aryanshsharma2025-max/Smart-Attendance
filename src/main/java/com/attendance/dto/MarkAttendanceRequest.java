package com.attendance.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarkAttendanceRequest {
    private String facultyCode;
    private Long facultyId;
    private List<StudentAttendanceMark> records;
}
