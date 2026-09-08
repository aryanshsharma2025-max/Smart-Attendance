package com.attendance.service;

import com.attendance.dto.LoginRequest;
import com.attendance.dto.LoginResponse;
import com.attendance.dto.RegisterRequest;
import com.attendance.dto.UserDto;
import com.attendance.exception.ConflictException;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.exception.UnauthorizedActionException;
import com.attendance.model.Faculty;
import com.attendance.model.Student;
import com.attendance.model.User;
import com.attendance.repository.FacultyRepository;
import com.attendance.repository.StudentRepository;
import com.attendance.repository.UserRepository;
import com.attendance.security.JwtTokenProvider;
import com.attendance.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final FacultyRepository facultyRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername().trim())
            .orElseThrow(() -> new UnauthorizedActionException("Invalid username or password"));

        if (!user.getIsActive()) {
            throw new UnauthorizedActionException("User account is deactivated");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedActionException("Invalid username or password");
        }

        UserPrincipal principal = UserPrincipal.create(user);
        String token = tokenProvider.generateToken(principal);

        return LoginResponse.builder()
            .tokenType("Bearer")
            .token(token)
            .userId(user.getUserId())
            .username(user.getUsername())
            .displayName(user.getDisplayName())
            .role(user.getRole().name())
            .facultyId(user.getFaculty() != null ? user.getFaculty().getFacultyId() : null)
            .facultyCode(user.getFaculty() != null ? user.getFaculty().getFacultyCode() : null)
            .studentId(user.getStudent() != null ? user.getStudent().getStudentId() : null)
            .rollNumber(user.getStudent() != null ? user.getStudent().getRollNumber() : null)
            .build();
    }

    @Transactional
    public UserDto register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ConflictException("Username already exists: " + request.getUsername());
        }

        User.UserRole role;
        try {
            role = User.UserRole.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role: " + request.getRole());
        }

        Faculty faculty = null;
        if (request.getFacultyId() != null) {
            faculty = facultyRepository.findById(request.getFacultyId())
                .orElseThrow(() -> new ResourceNotFoundException("Faculty not found: " + request.getFacultyId()));
        }

        Student student = null;
        if (request.getStudentId() != null) {
            student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + request.getStudentId()));
        }

        User user = User.builder()
            .username(request.getUsername().trim())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .displayName(request.getDisplayName())
            .role(role)
            .faculty(faculty)
            .student(student)
            .isActive(true)
            .build();

        user = userRepository.save(user);

        return UserDto.builder()
            .userId(user.getUserId())
            .username(user.getUsername())
            .displayName(user.getDisplayName())
            .role(user.getRole().name())
            .facultyId(faculty != null ? faculty.getFacultyId() : null)
            .studentId(student != null ? student.getStudentId() : null)
            .isActive(user.getIsActive())
            .build();
    }

    @Transactional(readOnly = true)
    public UserDto getMe(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        return UserDto.builder()
            .userId(user.getUserId())
            .username(user.getUsername())
            .displayName(user.getDisplayName())
            .role(user.getRole().name())
            .facultyId(user.getFaculty() != null ? user.getFaculty().getFacultyId() : null)
            .studentId(user.getStudent() != null ? user.getStudent().getStudentId() : null)
            .isActive(user.getIsActive())
            .build();
    }
}
