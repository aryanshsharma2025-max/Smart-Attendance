package com.attendance;

import com.attendance.model.User;
import com.attendance.repository.UserRepository;
import com.attendance.security.JwtTokenProvider;
import com.attendance.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class SecurityBoundaryTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider tokenProvider;

    private String facultyToken;

    @BeforeEach
    void setUp() {
        User facultyUser = userRepository.findByUsername("faculty_os")
            .orElseThrow(() -> new IllegalStateException("Test faculty user faculty_os must exist in test database"));
        facultyToken = tokenProvider.generateToken(UserPrincipal.create(facultyUser));
    }

    // ── 1. ANONYMOUS ACCESS REJECTION TESTS (Must return HTTP 401) ──

    @Test
    @DisplayName("Security 01: Anonymous GET /api/students must be rejected with 401")
    void testAnonymousGetStudentsRejected() throws Exception {
        mockMvc.perform(get("/api/students")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401))
            .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    @DisplayName("Security 02: Anonymous GET /api/students/{id} must be rejected with 401")
    void testAnonymousGetStudentByIdRejected() throws Exception {
        mockMvc.perform(get("/api/students/1")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Security 03: Anonymous GET /api/students/section/{section} must be rejected with 401")
    void testAnonymousGetStudentsBySectionRejected() throws Exception {
        mockMvc.perform(get("/api/students/section/A")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Security 04: Anonymous GET /api/sessions/{id}/attendance must be rejected with 401")
    void testAnonymousGetSessionAttendanceRejected() throws Exception {
        mockMvc.perform(get("/api/sessions/1/attendance")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Security 05: Anonymous GET /api/sessions/{id}/records must be rejected with 401")
    void testAnonymousGetSessionRecordsRejected() throws Exception {
        mockMvc.perform(get("/api/sessions/1/records")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Security 06: Anonymous GET /api/attendance/summary/section/{section} must be rejected with 401")
    void testAnonymousGetSectionAttendanceSummaryRejected() throws Exception {
        mockMvc.perform(get("/api/attendance/summary/section/A")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Security 07: Anonymous GET /api/attendance/summary/student/{id} must be rejected with 401")
    void testAnonymousGetStudentAttendanceSummaryRejected() throws Exception {
        mockMvc.perform(get("/api/attendance/summary/student/46")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Security 08: Anonymous GET /api/attendance/history/student/{id} must be rejected with 401")
    void testAnonymousGetStudentAttendanceHistoryRejected() throws Exception {
        mockMvc.perform(get("/api/attendance/history/student/46")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401));
    }

    // ── 2. AUTHENTICATED ACCESS PRESERVATION TESTS (Faculty JWT reaches endpoints) ──

    @Test
    @DisplayName("Security 09: Authenticated faculty can access GET /api/students/section/A (HTTP 200)")
    void testAuthenticatedFacultyCanAccessStudentsBySection() throws Exception {
        mockMvc.perform(get("/api/students/section/A")
                .header("Authorization", "Bearer " + facultyToken)
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("Security 10: Authenticated faculty can access GET /api/attendance/summary/section/A (HTTP 200)")
    void testAuthenticatedFacultyCanAccessSectionSummary() throws Exception {
        mockMvc.perform(get("/api/attendance/summary/section/A")
                .header("Authorization", "Bearer " + facultyToken)
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.section").value("A"));
    }

    // ── 3. PUBLIC ROUTE PRESERVATION TESTS ──

    @Test
    @DisplayName("Security 11: Public academic discovery routes remain accessible anonymously (HTTP 200)")
    void testPublicAcademicDiscoveryRemainsOpen() throws Exception {
        // Subjects
        mockMvc.perform(get("/api/subjects"))
            .andExpect(status().isOk());

        // Timetable
        mockMvc.perform(get("/api/timetable?section=A"))
            .andExpect(status().isOk());

        // Faculty Directory
        mockMvc.perform(get("/api/faculty"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Security 12: Public authentication endpoint /api/auth/login remains accessible anonymously")
    void testPublicLoginRemainsOpen() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"faculty_os\",\"password\":\"demo123\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty());
    }
}
