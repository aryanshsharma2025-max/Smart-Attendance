package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {
    private Long userId;
    private String username;
    private String displayName;
    private String role;
    private Long facultyId;
    private Long studentId;
    private Boolean isActive;
}
