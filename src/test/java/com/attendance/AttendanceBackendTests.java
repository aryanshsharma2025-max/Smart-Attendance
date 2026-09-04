package com.attendance;

import com.attendance.dto.*;
import com.attendance.model.*;
import com.attendance.repository.*;
import com.attendance.service.AttendanceSessionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class AttendanceBackendTests {

    @Autowired private StudentRepository studentRepo;
    @Autowired private FacultyRepository facultyRepo;
    @Autowired private CourseRepository courseRepo;
    @Autowired private TimetableEntryRepository timetableRepo;
    @Autowired private CourseAllocationRepository allocationRepo;
    @Autowired private AttendanceSessionRepository sessionRepo;
    @Autowired private AttendanceSessionService sessionService;

    @Test
    @DisplayName("Test 01 & 02: 252 Authoritative Students and A/B/C/D Section Counts")
    void testStudentRosterCounts() {
        assertEquals(252, studentRepo.count(), "Total student count must be 252");
        assertEquals(60, studentRepo.countBySectionSectionName("A"), "Section A must have 60 students");
        assertEquals(59, studentRepo.countBySectionSectionName("B"), "Section B must have 59 students");
        assertEquals(66, studentRepo.countBySectionSectionName("C"), "Section C must have 66 students");
        assertEquals(67, studentRepo.countBySectionSectionName("D"), "Section D must have 67 students");
    }

    @Test
    @DisplayName("Test 03: Five Primary Subjects Exist")
    void testPrimarySubjects() {
        List<Course> courses = courseRepo.findByIsPrimaryTrue();
        assertEquals(5, courses.size());
        assertTrue(courses.stream().anyMatch(c -> c.getCourseCodeShort().equals("OS")));
        assertTrue(courses.stream().anyMatch(c -> c.getCourseCodeShort().equals("DM")));
        assertTrue(courses.stream().anyMatch(c -> c.getCourseCodeShort().equals("OOPS")));
        assertTrue(courses.stream().anyMatch(c -> c.getCourseCodeShort().equals("WT")));
        assertTrue(courses.stream().anyMatch(c -> c.getCourseCodeShort().equals("DELD")));
    }

    @Test
    @DisplayName("Test 04 & 05: Primary Faculty and Anand Sir HOD Restriction")
    void testFacultyAndHodRole() {
        Faculty devbrat = facultyRepo.findByFacultyCode("faculty_os").orElseThrow();
        assertEquals("Devbrat Sahu", devbrat.getName());
        assertEquals(Faculty.FacultyRole.faculty, devbrat.getRole());

        Faculty anand = facultyRepo.findByFacultyCode("hod_cse").orElseThrow();
        assertEquals("Dr. Anand Tamrakar", anand.getName());
        assertEquals(Faculty.FacultyRole.hod, anand.getRole());
        assertTrue(allocationRepo.findByFacultyFacultyId(anand.getFacultyId()).isEmpty(), "HOD must have 0 teaching allocations");
    }

    @Test
    @DisplayName("Test 06: Timetable Contains 80 Blocks")
    void testTimetableCounts() {
        assertEquals(80, timetableRepo.count(), "Timetable must contain 80 authoritative blocks");
        assertEquals(39, timetableRepo.findBySectionSectionName("A").size(), "Section A must have 39 blocks");
        assertEquals(41, timetableRepo.findBySectionSectionName("B").size(), "Section B must have 41 blocks");
    }

    @Test
    @DisplayName("Test 07, 08, 09, 10: Faculty Authorization Enforcement")
    void testAuthorizationMatrix() {
        // Devbrat can create OS-A
        StartSessionRequest req1 = new StartSessionRequest();
        req1.setFacultyCode("faculty_os");
        req1.setSubjectCodeShort("OS");
        req1.setSection("A");
        SessionDto sess1 = sessionService.startSession(req1);
        assertNotNull(sess1);
        assertEquals(1, sess1.getLectureNumber());

        // Devbrat can create OS-B
        StartSessionRequest req2 = new StartSessionRequest();
        req2.setFacultyCode("faculty_os");
        req2.setSubjectCodeShort("OS");
        req2.setSection("B");
        SessionDto sess2 = sessionService.startSession(req2);
        assertNotNull(sess2);
        assertEquals(1, sess2.getLectureNumber());

        // Devbrat cannot create DM-A
        StartSessionRequest req3 = new StartSessionRequest();
        req3.setFacultyCode("faculty_os");
        req3.setSubjectCodeShort("DM");
        req3.setSection("A");
        assertThrows(RuntimeException.class, () -> sessionService.startSession(req3));

        // Devbrat cannot create OS-C (allocation pending)
        StartSessionRequest req4 = new StartSessionRequest();
        req4.setFacultyCode("faculty_os");
        req4.setSubjectCodeShort("OS");
        req4.setSection("C");
        assertThrows(RuntimeException.class, () -> sessionService.startSession(req4));

        // Anand Sir cannot start teaching session
        StartSessionRequest req5 = new StartSessionRequest();
        req5.setFacultyCode("hod_cse");
        req5.setSubjectCodeShort("OS");
        req5.setSection("A");
        assertThrows(RuntimeException.class, () -> sessionService.startSession(req5));
    }
}
