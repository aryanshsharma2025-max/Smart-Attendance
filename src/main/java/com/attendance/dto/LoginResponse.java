package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {
    @Builder.Default
    private String tokenType = "Bearer";
    private String token;
    private Long userId;
    private String username;
    private String displayName;
    private String role;
    private Long facultyId;
    private String facultyCode;
    private Long studentId;
    private String rollNumber;
}
