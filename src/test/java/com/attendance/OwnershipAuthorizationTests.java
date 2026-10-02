package com.attendance;

import com.attendance.model.*;
import com.attendance.repository.*;
import com.attendance.security.JwtTokenProvider;
import com.attendance.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class OwnershipAuthorizationTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private FacultyRepository facultyRepo;
    @Autowired private CourseRepository courseRepo;
    @Autowired private SectionRepository sectionRepo;
    @Autowired private AttendanceSessionRepository sessionRepo;
    @Autowired private JwtTokenProvider tokenProvider;

    private String facultyToken;       // faculty_os (Devbrat Sahu - assigned to OS in Sec A and Sec B)
    private String otherFacultyToken;  // faculty_dm (Pranjali Sharma - assigned to DM in Sec A and Sec B)
    private String studentToken;       // 303302225048 (Aryansh Sharma, studentId = 46, Section A)
    private String hodToken;           // hod_cse (Dr. Anand Tamrakar)
    private String nullStudentToken;   // Student principal with null studentId

    @BeforeEach
    void setUp() {
        User facUser = userRepository.findByUsername("faculty_os").orElseThrow();
        facultyToken = tokenProvider.generateToken(UserPrincipal.create(facUser));

        User otherFacUser = userRepository.findByUsername("faculty_dm").orElseThrow();
        otherFacultyToken = tokenProvider.generateToken(UserPrincipal.create(otherFacUser));

        User stuUser = userRepository.findByUsername("303302225048").orElseThrow();
        studentToken = tokenProvider.generateToken(UserPrincipal.create(stuUser));

        User hodUser = userRepository.findByUsername("hod_cse").orElseThrow();
        hodToken = tokenProvider.generateToken(UserPrincipal.create(hodUser));

        User nullStudentUser = userRepository.findByUsername("test_null_student").orElseGet(() ->
            userRepository.save(User.builder()
                .username("test_null_student")
                .passwordHash("$2a$10$PTuTjhLreHw4vcq3ofAeHuf25E0g1ZkTLYbRwLqlrU1ND.bdF5grG")
                .role(User.UserRole.STUDENT)
                .student(null)
                .isActive(true)
                .build())
        );
        nullStudentToken = tokenProvider.generateToken(UserPrincipal.create(nullStudentUser));
    }

    // ── 1. ANONYMOUS ACCESS REJECTIONS (Must return 401) ──

    @Test
    @DisplayName("01. Anonymous -> GET /api/students -> 401")
    void test01_anonStudents() throws Exception {
        mockMvc.perform(get("/api/students")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("02. Anonymous -> GET /api/students/1 -> 401")
    void test02_anonStudentById() throws Exception {
        mockMvc.perform(get("/api/students/1")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("03. Anonymous -> GET /api/students/section/A -> 401")
    void test03_anonSectionRoster() throws Exception {
        mockMvc.perform(get("/api/students/section/A")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("04. Anonymous -> GET /api/attendance/summary/student/46 -> 401")
    void test04_anonStudentSummary() throws Exception {
        mockMvc.perform(get("/api/attendance/summary/student/46")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("05. Anonymous -> GET /api/attendance/history/student/46 -> 401")
    void test05_anonStudentHistory() throws Exception {
        mockMvc.perform(get("/api/attendance/history/student/46")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("06. Anonymous -> GET /api/attendance/summary/section/A -> 401")
    void test06_anonSectionSummary() throws Exception {
        mockMvc.perform(get("/api/attendance/summary/section/A")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("07. Anonymous -> GET /api/sessions/1/attendance -> 401")
    void test07_anonSessionAttendance() throws Exception {
        mockMvc.perform(get("/api/sessions/1/attendance")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("08. Anonymous -> GET /api/sessions/1/records -> 401")
    void test08_anonSessionRecords() throws Exception {
        mockMvc.perform(get("/api/sessions/1/records")).andExpect(status().isUnauthorized());
    }

    // ── 2. STUDENT BOUNDARY & OWNERSHIP (Self = 200, Peer/Section/Session = 403) ──

    @Test
    @DisplayName("09. Student reads own student record by ID -> 200")
    void test09_studentReadsOwnRecord() throws Exception {
        mockMvc.perform(get("/api/students/46")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(46))
            .andExpect(jsonPath("$.rollNumber").value("303302225048"));
    }

    @Test
    @DisplayName("09b. Student reads own student record by Roll -> 200")
    void test09b_studentReadsOwnRecordByRoll() throws Exception {
        mockMvc.perform(get("/api/students/303302225048")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(46));
    }

    @Test
    @DisplayName("10. Student reads own attendance summary -> 200")
    void test10_studentReadsOwnSummary() throws Exception {
        mockMvc.perform(get("/api/attendance/summary/student/46")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.studentId").value(46));
    }

    @Test
    @DisplayName("11. Student reads own attendance history -> 200")
    void test11_studentReadsOwnHistory() throws Exception {
        mockMvc.perform(get("/api/attendance/history/student/46")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("12. Student reads another student's record -> 403")
    void test12_studentReadsOtherStudent() throws Exception {
        mockMvc.perform(get("/api/students/1")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("12b. Student reads another student's record by Roll -> 403")
    void test12b_studentReadsOtherStudentByRoll() throws Exception {
        mockMvc.perform(get("/api/students/303302225001")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("13. Student reads another student's summary -> 403")
    void test13_studentReadsOtherSummary() throws Exception {
        mockMvc.perform(get("/api/attendance/summary/student/1")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("14. Student reads another student's history -> 403")
    void test14_studentReadsOtherHistory() throws Exception {
        mockMvc.perform(get("/api/attendance/history/student/1")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("15. Student attempts section roster -> 403")
    void test15_studentAttemptsSectionRoster() throws Exception {
        mockMvc.perform(get("/api/students/section/A")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("15b. Student attempts all students list -> 403")
    void test15b_studentAttemptsAllStudents() throws Exception {
        mockMvc.perform(get("/api/students")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("16. Student attempts arbitrary session attendance -> 403")
    void test16_studentAttemptsSessionAttendance() throws Exception {
        mockMvc.perform(get("/api/sessions/1/attendance")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden());
    }

    // ── 3. FACULTY OWNERSHIP & ALLOCATION SCOPING ──

    @Test
    @DisplayName("17. Faculty reads assigned section roster (Sec A) -> 200")
    void test17_facultyReadsAssignedSectionRoster() throws Exception {
        mockMvc.perform(get("/api/students/section/A")
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("18. Faculty reads assigned section attendance (Sec A) -> 200")
    void test18_facultyReadsAssignedSectionAttendance() throws Exception {
        mockMvc.perform(get("/api/attendance/summary/section/A")
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.section").value("A"));
    }

    @Test
    @DisplayName("19. Faculty reads assigned student attendance (Sec A student 46) -> 200")
    void test19_facultyReadsAssignedStudentAttendance() throws Exception {
        mockMvc.perform(get("/api/attendance/summary/student/46")
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.studentId").value(46));
    }

    @Test
    @DisplayName("20. Faculty requests student from unassigned section (Sec C student 120) -> 403")
    void test20_facultyRequestsUnassignedStudent() throws Exception {
        mockMvc.perform(get("/api/students/120")
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("21. Faculty requests unassigned section roster (Sec C) -> 403")
    void test21_facultyRequestsUnassignedSectionRoster() throws Exception {
        mockMvc.perform(get("/api/students/section/C")
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("21b. Faculty requests unassigned section attendance (Sec C) -> 403")
    void test21b_facultyRequestsUnassignedSectionAttendance() throws Exception {
        mockMvc.perform(get("/api/attendance/summary/section/C")
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("22. Faculty requests another faculty's session (unallocated) -> 403")
    void test22_facultyRequestsOtherFacultySession() throws Exception {
        // Create a test session belonging to faculty_dm for Course DM (courseId 2) in Section A (1)
        Faculty dmFaculty = facultyRepo.findByFacultyCode("faculty_dm").orElseThrow();
        Course dmCourse = courseRepo.findByCourseCodeShort("DM").orElseThrow();
        Section secA = sectionRepo.findBySectionName("A").orElseThrow();

        AttendanceSession sess = sessionRepo.save(AttendanceSession.builder()
            .faculty(dmFaculty)
            .course(dmCourse)
            .section(secA)
            .semester(3)
            .sessionDate(LocalDate.now())
            .lectureNumber(99)
            .status(AttendanceSession.SessionStatus.COMPLETED)
            .startedAt(LocalDateTime.now().minusMinutes(50))
            .completedAt(LocalDateTime.now())
            .build());

        // Faculty_os (Devbrat) is NOT allocated to DM course -> must receive 403
        mockMvc.perform(get("/api/sessions/" + sess.getSessionId() + "/attendance")
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("23. Faculty requests student attendance in unassigned section (Sec C student 120) -> 403")
    void test23_facultyRequestsUnassignedStudentAttendance() throws Exception {
        mockMvc.perform(get("/api/attendance/summary/student/120")
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/attendance/history/student/120")
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("24. Faculty changes path IDs to bypass ownership -> 403")
    void test24_facultyPathIdTamperingBypass() throws Exception {
        // Faculty Devbrat attempting Section D
        mockMvc.perform(get("/api/students/section/D")
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isForbidden());

        // Faculty Devbrat attempting to query another faculty's session list
        Faculty dmFaculty = facultyRepo.findByFacultyCode("faculty_dm").orElseThrow();
        mockMvc.perform(get("/api/sessions/faculty/" + dmFaculty.getFacultyId())
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isForbidden());
    }

    // ── 4. HOD REPORTING ACCESS PRESERVATION ──

    @Test
    @DisplayName("25. HOD legitimate access across all sections and students -> 200")
    void test25_hodGlobalAccess() throws Exception {
        // HOD can read Section A, C, all students
        mockMvc.perform(get("/api/students/section/A")
                .header("Authorization", "Bearer " + hodToken))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/students/section/C")
                .header("Authorization", "Bearer " + hodToken))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/students")
                .header("Authorization", "Bearer " + hodToken))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/attendance/summary/student/120")
                .header("Authorization", "Bearer " + hodToken))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/attendance/summary/section/C")
                .header("Authorization", "Bearer " + hodToken))
            .andExpect(status().isOk());
    }

    // ── 5. NULL-ID BYPASS & TAMPERING FAIL-CLOSED TESTS ──

    @Test
    @DisplayName("27. Principal with null studentId cannot bypass student ownership -> 403")
    void test27_nullStudentIdBypassRejected() throws Exception {
        mockMvc.perform(get("/api/attendance/summary/student/46")
                .header("Authorization", "Bearer " + nullStudentToken))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/attendance/history/student/46")
                .header("Authorization", "Bearer " + nullStudentToken))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/students/46")
                .header("Authorization", "Bearer " + nullStudentToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("28. Student querying arbitrary non-existent IDs -> 403 (Fail closed)")
    void test28_arbitraryIdTampering() throws Exception {
        mockMvc.perform(get("/api/attendance/summary/student/999999")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/students/999999")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden());
    }
}
