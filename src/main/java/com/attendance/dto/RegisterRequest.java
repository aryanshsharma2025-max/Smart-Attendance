package com.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {
    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;

    @NotBlank(message = "Display name is required")
    private String displayName;

    @NotBlank(message = "Role is required (HOD, FACULTY, STUDENT)")
    private String role;

    private Long facultyId;
    private Long studentId;
}
