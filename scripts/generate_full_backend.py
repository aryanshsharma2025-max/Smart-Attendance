import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def build_all():
    print("Writing Spring Boot source files...")

    # We will build a generator that writes all individual files into src/main/java and also aggregates into AttendanceBackend.java
    modules = {}

    # 1. Main Application
    modules["AttendanceApplication.java"] = """package com.attendance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableTransactionManagement
public class AttendanceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AttendanceApplication.class, args);
    }
}
"""

    # 2. Models
    modules["model/Department.java"] = """package com.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "departments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Department {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dept_id")
    private Long deptId;

    @Column(name = "dept_name", nullable = false)
    private String deptName;

    @Column(name = "dept_code", nullable = false, unique = true)
    private String deptCode;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
"""

    modules["model/Section.java"] = """package com.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sections", uniqueConstraints = @UniqueConstraint(name = "uq_dept_section", columnNames = {"dept_id", "section_name"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Section {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "section_id")
    private Long sectionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dept_id", nullable = false)
    private Department department;

    @Column(name = "section_name", nullable = false)
    private String sectionName;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
"""

    modules["model/Faculty.java"] = """package com.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "faculty")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Faculty {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "faculty_id")
    private Long facultyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dept_id", nullable = false)
    private Department department;

    @Column(name = "faculty_code", nullable = false, unique = true)
    private String facultyCode;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash = "$2a$10$placeholder_hash";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FacultyRole role = FacultyRole.faculty;

    @Column(nullable = false)
    private String designation = "Assistant Professor";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum FacultyRole { faculty, hod, admin, staff }
}
"""

    modules["model/Course.java"] = """package com.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "courses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "course_id")
    private Long courseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dept_id", nullable = false)
    private Department department;

    @Column(name = "course_name", nullable = false)
    private String courseName;

    @Column(name = "course_code_short", nullable = false, unique = true)
    private String courseCodeShort;

    @Column(name = "official_course_code", nullable = false)
    private String officialCourseCode = "Pending CSVTU Code";

    @Column(nullable = false)
    private Integer semester = 3;

    @Column(name = "is_primary", nullable = false)
    private Boolean isPrimary = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
"""

    modules["model/CourseAllocation.java"] = """package com.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "course_allocations", uniqueConstraints = @UniqueConstraint(name = "uq_fac_course_sec", columnNames = {"faculty_id", "course_id", "section_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseAllocation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "allocation_id")
    private Long allocationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "faculty_id", nullable = false)
    private Faculty faculty;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    private Section section;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AllocationStatus status = AllocationStatus.CONFIRMED;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum AllocationStatus { CONFIRMED, PENDING }
}
"""

    modules["model/Student.java"] = """package com.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "students")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "student_id")
    private Long studentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dept_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    private Section section;

    @Column(name = "roll_number", nullable = false, unique = true)
    private String rollNumber;

    @Column(nullable = false)
    private String name;

    @Column(name = "enrollment_number")
    private String enrollmentNumber;

    @Column(name = "enrollment_status", nullable = false)
    private String enrollmentStatus = "verified";

    @Column(name = "admission_type", nullable = false)
    private String admissionType = "regular";

    @Column(nullable = false)
    private Integer semester = 3;

    @Column(nullable = false)
    private String status = "Active";

    @Column(name = "rfid_uid", unique = true)
    private String rfidUid;

    @Column(unique = true)
    private String email;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
"""

    modules["model/TimetableEntry.java"] = """package com.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "timetable_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimetableEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "entry_id")
    private Long entryId;

    @Column(name = "timetable_code", nullable = false, unique = true)
    private String timetableCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    private Section section;

    @Column(name = "day_of_week", nullable = false)
    private String dayOfWeek;

    @Column(name = "day_index", nullable = false)
    private Integer dayIndex;

    @Column(nullable = false)
    private String period;

    @Column(name = "period_start")
    private Integer periodStart;

    @Column(name = "period_end")
    private Integer periodEnd;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "faculty_id", nullable = false)
    private Faculty faculty;

    @Column(name = "slot_type", nullable = false)
    private String slotType = "lecture";

    private String room;

    @Column(name = "effective_date", nullable = false)
    private String effectiveDate = "17/08/2026";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
"""

    modules["model/AttendanceSession.java"] = """package com.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_sessions", uniqueConstraints = @UniqueConstraint(name = "uq_session_lecture", columnNames = {"course_id", "section_id", "lecture_number"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id")
    private Long sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "faculty_id", nullable = false)
    private Faculty faculty;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    private Section section;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timetable_entry_id")
    private TimetableEntry timetableEntry;

    @Column(nullable = false)
    private Integer semester = 3;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "period_start")
    private Integer periodStart;

    @Column(name = "period_end")
    private Integer periodEnd;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "lecture_number", nullable = false)
    private Integer lectureNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status = SessionStatus.RECORDING;

    @Column(name = "started_at")
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public enum SessionStatus { RECORDING, COMPLETED, CANCELLED }
}
"""

    modules["model/AttendanceRecord.java"] = """package com.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_records", uniqueConstraints = @UniqueConstraint(name = "uq_session_student", columnNames = {"session_id", "student_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "record_id")
    private Long recordId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private AttendanceSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStatus status = AttendanceStatus.PRESENT;

    @Column(name = "marked_at")
    private LocalDateTime markedAt = LocalDateTime.now();

    public enum AttendanceStatus { PRESENT, ABSENT }
}
"""

    # 3. DTOs
    modules["dto/StudentDto.java"] = """package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentDto {
    private Long id;
    private String rollNumber;
    private String name;
    private String section;
    private String department;
    private Integer semester;
    private String enrollmentNumber;
    private String enrollmentStatus;
    private String admissionType;
    private String status;
    private AttendanceSummary attendance;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceSummary {
        private Integer totalLectures;
        private Integer attendedLectures;
        private Double percentage;
        private String statusText;
    }
}
"""

    modules["dto/FacultyDto.java"] = """package com.attendance.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FacultyDto {
    private Long id;
    private String facultyCode;
    private String name;
    private String email;
    private String role;
    private String designation;
    private String department;
    private List<String> assignedSubjects;
    private List<String> assignedSections;
}
"""

    modules["dto/CourseDto.java"] = """package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseDto {
    private Long id;
    private String name;
    private String shortCode;
    private String officialCode;
    private String department;
    private Integer semester;
    private Boolean isPrimary;
    private String assignedFacultyName;
}
"""

    modules["dto/TimetableDto.java"] = """package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimetableDto {
    private Long id;
    private String timetableCode;
    private String section;
    private String day;
    private Integer dayIndex;
    private String period;
    private Integer periodStart;
    private Integer periodEnd;
    private String startTime;
    private String endTime;
    private String timeDisplay;
    private String subjectCodeShort;
    private String subjectName;
    private String facultyId;
    private String facultyName;
    private String type;
    private String room;
    private String effectiveDate;
}
"""

    modules["dto/StartSessionRequest.java"] = """package com.attendance.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StartSessionRequest {
    private String facultyCode;
    private Long facultyId;
    private String subjectCodeShort;
    private Long subjectId;
    private String section; // "A", "B", etc.
    private Long sectionId;
    private String timetableCode;
    private Long timetableEntryId;
    private LocalDate sessionDate;
    private String startTime;
    private String endTime;
}
"""

    modules["dto/SessionDto.java"] = """package com.attendance.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionDto {
    private Long id;
    private Long subjectId;
    private String subjectName;
    private String subjectCode;
    private Long facultyId;
    private String facultyCode;
    private String facultyName;
    private String section;
    private Integer semester;
    private LocalDate date;
    private Integer lectureNumber;
    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Integer totalRostered;
    private Integer presentCount;
    private Integer absentCount;
}
"""

    modules["dto/StudentAttendanceMark.java"] = """package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentAttendanceMark {
    private Long studentId;
    private String rollNumber;
    private String status; // "PRESENT" or "ABSENT"
}
"""

    modules["dto/MarkAttendanceRequest.java"] = """package com.attendance.dto;

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
"""

    modules["dto/AttendanceRecordDto.java"] = """package com.attendance.dto;

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
"""

    modules["dto/AttendanceSubmissionResponse.java"] = """package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceSubmissionResponse {
    private String status;
    private String message;
    private Long sessionId;
    private Integer lectureNumber;
    private Integer presentCount;
    private Integer absentCount;
    private Integer totalRecorded;
}
"""

    modules["dto/StudentAttendanceSummaryDto.java"] = """package com.attendance.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAttendanceSummaryDto {
    private Long studentId;
    private String rollNumber;
    private String studentName;
    private String section;
    private Integer completedEligibleSessions;
    private Integer attendedSessions;
    private Double overallPercentage;
    private List<CourseBreakdown> courses;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CourseBreakdown {
        private Long courseId;
        private String courseCodeShort;
        private String courseName;
        private Integer totalCompleted;
        private Integer attended;
        private Double percentage;
    }
}
"""

    modules["dto/SectionAttendanceStatsDto.java"] = """package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SectionAttendanceStatsDto {
    private String section;
    private String courseCodeShort;
    private String courseName;
    private Integer completedSessions;
    private Integer totalRosteredStudents;
    private Integer totalEligibleMarks;
    private Integer totalPresentMarks;
    private Double averagePercentage;
}
"""

    # 4. Exceptions
    modules["exception/ResourceNotFoundException.java"] = """package com.attendance.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) { super(message); }
}
"""

    modules["exception/UnauthorizedActionException.java"] = """package com.attendance.exception;

public class UnauthorizedActionException extends RuntimeException {
    public UnauthorizedActionException(String message) { super(message); }
}
"""

    modules["exception/ValidationException.java"] = """package com.attendance.exception;

public class ValidationException extends RuntimeException {
    public ValidationException(String message) { super(message); }
}
"""

    modules["exception/ConflictException.java"] = """package com.attendance.exception;

public class ConflictException extends RuntimeException {
    public ConflictException(String message) { super(message); }
}
"""

    modules["exception/GlobalExceptionHandler.java"] = """package com.attendance.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
            "timestamp", LocalDateTime.now(),
            "status", 404,
            "error", "Not Found",
            "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(UnauthorizedActionException.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorized(UnauthorizedActionException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
            "timestamp", LocalDateTime.now(),
            "status", 403,
            "error", "Forbidden",
            "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(ValidationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
            "timestamp", LocalDateTime.now(),
            "status", 400,
            "error", "Bad Request",
            "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(ConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
            "timestamp", LocalDateTime.now(),
            "status", 409,
            "error", "Conflict",
            "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
            "timestamp", LocalDateTime.now(),
            "status", 400,
            "error", "Bad Request",
            "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
            "timestamp", LocalDateTime.now(),
            "status", 409,
            "error", "Conflict",
            "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
            "timestamp", LocalDateTime.now(),
            "status", 500,
            "error", "Internal Server Error",
            "message", ex.getMessage()
        ));
    }
}
"""

    # 5. Repositories
    modules["repository/DepartmentRepository.java"] = """package com.attendance.repository;

import com.attendance.model.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    Optional<Department> findByDeptCode(String deptCode);
}
"""

    modules["repository/SectionRepository.java"] = """package com.attendance.repository;

import com.attendance.model.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface SectionRepository extends JpaRepository<Section, Long> {
    Optional<Section> findBySectionName(String sectionName);
    List<Section> findByDepartmentDeptId(Long deptId);
}
"""

    modules["repository/FacultyRepository.java"] = """package com.attendance.repository;

import com.attendance.model.Faculty;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface FacultyRepository extends JpaRepository<Faculty, Long> {
    Optional<Faculty> findByFacultyCode(String facultyCode);
    Optional<Faculty> findByEmail(String email);
    List<Faculty> findByRole(Faculty.FacultyRole role);
}
"""

    modules["repository/CourseRepository.java"] = """package com.attendance.repository;

import com.attendance.model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface CourseRepository extends JpaRepository<Course, Long> {
    Optional<Course> findByCourseCodeShort(String shortCode);
    List<Course> findByIsPrimaryTrue();
}
"""

    modules["repository/CourseAllocationRepository.java"] = """package com.attendance.repository;

import com.attendance.model.CourseAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;

public interface CourseAllocationRepository extends JpaRepository<CourseAllocation, Long> {
    Optional<CourseAllocation> findByFacultyFacultyIdAndCourseCourseIdAndSectionSectionId(Long facultyId, Long courseId, Long sectionId);

    List<CourseAllocation> findByFacultyFacultyId(Long facultyId);

    List<CourseAllocation> findByCourseCourseId(Long courseId);

    @Query("SELECT ca FROM CourseAllocation ca WHERE ca.faculty.facultyCode = :code AND ca.course.courseCodeShort = :courseShort AND ca.section.sectionName = :sectionName")
    Optional<CourseAllocation> findByCodes(
        @Param("code") String facultyCode,
        @Param("courseShort") String courseShort,
        @Param("sectionName") String sectionName
    );
}
"""

    modules["repository/StudentRepository.java"] = """package com.attendance.repository;

import com.attendance.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByRollNumber(String rollNumber);
    Optional<Student> findByRfidUid(String rfidUid);
    List<Student> findBySectionSectionName(String sectionName);
    List<Student> findBySectionSectionId(Long sectionId);
    long countBySectionSectionName(String sectionName);
}
"""

    modules["repository/TimetableEntryRepository.java"] = """package com.attendance.repository;

import com.attendance.model.TimetableEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface TimetableEntryRepository extends JpaRepository<TimetableEntry, Long> {
    Optional<TimetableEntry> findByTimetableCode(String timetableCode);
    List<TimetableEntry> findBySectionSectionName(String sectionName);
    List<TimetableEntry> findByFacultyFacultyId(Long facultyId);
    List<TimetableEntry> findByFacultyFacultyCode(String facultyCode);
}
"""

    modules["repository/AttendanceSessionRepository.java"] = """package com.attendance.repository;

import com.attendance.model.AttendanceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;

public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {
    @Query("SELECT MAX(s.lectureNumber) FROM AttendanceSession s WHERE s.course.courseId = :courseId AND s.section.sectionId = :sectionId AND s.status != 'CANCELLED'")
    Integer findMaxLectureNumber(@Param("courseId") Long courseId, @Param("sectionId") Long sectionId);

    Optional<AttendanceSession> findByCourseCourseIdAndSectionSectionIdAndLectureNumber(Long courseId, Long sectionId, Integer lectureNumber);

    List<AttendanceSession> findByFacultyFacultyIdOrderBySessionDateDesc(Long facultyId);

    List<AttendanceSession> findBySectionSectionIdAndStatus(Long sectionId, AttendanceSession.SessionStatus status);

    List<AttendanceSession> findByCourseCourseIdAndSectionSectionIdAndStatus(Long courseId, Long sectionId, AttendanceSession.SessionStatus status);

    long countByStatus(AttendanceSession.SessionStatus status);
}
"""

    modules["repository/AttendanceRecordRepository.java"] = """package com.attendance.repository;

import com.attendance.model.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    Optional<AttendanceRecord> findBySessionSessionIdAndStudentStudentId(Long sessionId, Long studentId);

    List<AttendanceRecord> findBySessionSessionId(Long sessionId);

    @Query("SELECT ar FROM AttendanceRecord ar WHERE ar.student.studentId = :studentId AND ar.session.status = 'COMPLETED'")
    List<AttendanceRecord> findCompletedByStudentId(@Param("studentId") Long studentId);

    @Query("SELECT ar FROM AttendanceRecord ar WHERE ar.student.studentId = :studentId AND ar.session.course.courseId = :courseId AND ar.session.status = 'COMPLETED'")
    List<AttendanceRecord> findCompletedByStudentAndCourse(@Param("studentId") Long studentId, @Param("courseId") Long courseId);

    @Query("SELECT COUNT(ar) FROM AttendanceRecord ar WHERE ar.session.section.sectionId = :sectionId AND ar.session.course.courseId = :courseId AND ar.session.status = 'COMPLETED' AND ar.status = 'PRESENT'")
    long countPresentMarksForSectionAndCourse(@Param("sectionId") Long sectionId, @Param("courseId") Long courseId);
}
"""

    # 6. Services
    modules["service/AttendanceSessionService.java"] = """package com.attendance.service;

import com.attendance.dto.*;
import com.attendance.exception.*;
import com.attendance.model.*;
import com.attendance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceSessionService {

    private final AttendanceSessionRepository sessionRepo;
    private final AttendanceRecordRepository attendanceRecordRepo;
    private final FacultyRepository facultyRepo;
    private final CourseRepository courseRepo;
    private final SectionRepository sectionRepo;
    private final TimetableEntryRepository timetableRepo;
    private final StudentRepository studentRepo;
    private final CourseAllocationRepository allocationRepo;

    /**
     * Start a new Attendance Session.
     * Enforces:
     *  1. Faculty authentication & authorization (HOD rejected from teaching sessions).
     *  2. Confirmed faculty-course-section allocation (Sections C/D and unauthorized combinations rejected with 403).
     *  3. Automatic scoped lecture numbering: (course + section).
     *  4. State initialized strictly to RECORDING.
     */
    @Transactional
    public SessionDto startSession(StartSessionRequest req) {
        // 1. Resolve Faculty
        Faculty faculty;
        if (req.getFacultyId() != null) {
            faculty = facultyRepo.findById(req.getFacultyId())
                .orElseThrow(() -> new ResourceNotFoundException("Faculty not found: " + req.getFacultyId()));
        } else if (req.getFacultyCode() != null) {
            faculty = facultyRepo.findByFacultyCode(req.getFacultyCode())
                .orElseThrow(() -> new ResourceNotFoundException("Faculty not found with code: " + req.getFacultyCode()));
        } else {
            throw new ValidationException("Faculty ID or code is required");
        }

        // Enforce HOD restriction
        if (faculty.getRole() == Faculty.FacultyRole.hod) {
            throw new UnauthorizedActionException("403 Forbidden: HOD Dr. Anand Tamrakar is not teaching faculty and cannot start attendance sessions");
        }

        // 2. Resolve Course
        Course course;
        if (req.getSubjectId() != null) {
            course = courseRepo.findById(req.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found: " + req.getSubjectId()));
        } else if (req.getSubjectCodeShort() != null) {
            course = courseRepo.findByCourseCodeShort(req.getSubjectCodeShort())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found: " + req.getSubjectCodeShort()));
        } else {
            throw new ValidationException("Subject ID or code is required");
        }

        // 3. Resolve Section
        Section section;
        if (req.getSectionId() != null) {
            section = sectionRepo.findById(req.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + req.getSectionId()));
        } else if (req.getSection() != null) {
            section = sectionRepo.findBySectionName(req.getSection())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + req.getSection()));
        } else {
            throw new ValidationException("Section is required");
        }

        // 4. Validate Server-side Course Allocation
        Optional<CourseAllocation> allocationOpt = allocationRepo
            .findByFacultyFacultyIdAndCourseCourseIdAndSectionSectionId(faculty.getFacultyId(), course.getCourseId(), section.getSectionId());

        if (allocationOpt.isEmpty()) {
            throw new UnauthorizedActionException("403 Forbidden: Faculty " + faculty.getName() + " is not authorized for " + course.getCourseCodeShort() + " in Section " + section.getSectionName());
        }

        CourseAllocation alloc = allocationOpt.get();
        if (alloc.getStatus() != CourseAllocation.AllocationStatus.CONFIRMED) {
            throw new UnauthorizedActionException("403 Forbidden: Allocation for " + course.getCourseCodeShort() + " in Section " + section.getSectionName() + " is pending confirmation");
        }

        // 5. Optional timetable entry
        TimetableEntry ttEntry = null;
        if (req.getTimetableEntryId() != null) {
            ttEntry = timetableRepo.findById(req.getTimetableEntryId()).orElse(null);
        } else if (req.getTimetableCode() != null) {
            ttEntry = timetableRepo.findByTimetableCode(req.getTimetableCode()).orElse(null);
        }

        // 6. Calculate Next Lecture Number scoped by (course + section)
        Integer maxLec = sessionRepo.findMaxLectureNumber(course.getCourseId(), section.getSectionId());
        int nextLectureNumber = (maxLec == null ? 0 : maxLec) + 1;

        // 7. Persist session in RECORDING state
        AttendanceSession session = AttendanceSession.builder()
            .course(course)
            .faculty(faculty)
            .section(section)
            .timetableEntry(ttEntry)
            .semester(course.getSemester())
            .sessionDate(req.getSessionDate() != null ? req.getSessionDate() : LocalDate.now())
            .lectureNumber(nextLectureNumber)
            .status(AttendanceSession.SessionStatus.RECORDING)
            .startedAt(LocalDateTime.now())
            .build();

        session = sessionRepo.save(session);

        long rosterCount = studentRepo.countBySectionSectionName(section.getSectionName());

        return SessionDto.builder()
            .id(session.getSessionId())
            .subjectId(course.getCourseId())
            .subjectName(course.getCourseName())
            .subjectCode(course.getCourseCodeShort())
            .facultyId(faculty.getFacultyId())
            .facultyCode(faculty.getFacultyCode())
            .facultyName(faculty.getName())
            .section(section.getSectionName())
            .semester(session.getSemester())
            .date(session.getSessionDate())
            .lectureNumber(session.getLectureNumber())
            .status(session.getStatus().name())
            .startedAt(session.getStartedAt())
            .totalRostered((int) rosterCount)
            .presentCount(0)
            .absentCount(0)
            .build();
    }

    /**
     * Transactional attendance saving.
     * Guaranteed atomic: validates session, ownership, section boundaries, completeness, no duplicates,
     * persists records and marks session COMPLETED in a single atomic transaction.
     */
    @Transactional(rollbackFor = Exception.class)
    public AttendanceSubmissionResponse saveAttendance(Long sessionId, MarkAttendanceRequest request) {
        AttendanceSession session = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        if (session.getStatus() != AttendanceSession.SessionStatus.RECORDING) {
            throw new ConflictException("Session is not in RECORDING state. Current status: " + session.getStatus());
        }

        // Validate faculty ownership
        if (request.getFacultyId() != null && !session.getFaculty().getFacultyId().equals(request.getFacultyId())) {
            throw new UnauthorizedActionException("Faculty is not the owner of this session.");
        }
        if (request.getFacultyCode() != null && !session.getFaculty().getFacultyCode().equalsIgnoreCase(request.getFacultyCode())) {
            throw new UnauthorizedActionException("Faculty is not the owner of this session.");
        }

        List<Student> roster = studentRepo.findBySectionSectionId(session.getSection().getSectionId());
        Map<Long, Student> rosterById = roster.stream().collect(Collectors.toMap(Student::getStudentId, s -> s));
        Map<String, Student> rosterByRoll = roster.stream().collect(Collectors.toMap(Student::getRollNumber, s -> s));

        List<StudentAttendanceMark> marks = request.getRecords();
        if (marks == null || marks.isEmpty()) {
            throw new ValidationException("Attendance records list cannot be empty.");
        }

        Set<Long> seenStudentIds = new HashSet<>();
        List<AttendanceRecord> recordsToSave = new ArrayList<>();
        int presentCount = 0;
        int absentCount = 0;

        for (StudentAttendanceMark mark : marks) {
            Student student = null;
            if (mark.getStudentId() != null) {
                student = rosterById.get(mark.getStudentId());
            } else if (mark.getRollNumber() != null) {
                student = rosterByRoll.get(mark.getRollNumber());
            }

            if (student == null) {
                throw new ValidationException("Student " + (mark.getRollNumber() != null ? mark.getRollNumber() : mark.getStudentId()) 
                    + " does not belong to session section " + session.getSection().getSectionName());
            }

            if (!seenStudentIds.add(student.getStudentId())) {
                throw new ValidationException("Duplicate student attendance record in request: " + student.getRollNumber());
            }

            String st = mark.getStatus() != null ? mark.getStatus().trim().toUpperCase() : "";
            if (!st.equals("PRESENT") && !st.equals("ABSENT")) {
                throw new ValidationException("Invalid status: '" + mark.getStatus() + "'. Must be PRESENT or ABSENT.");
            }

            AttendanceRecord.AttendanceStatus statusEnum = AttendanceRecord.AttendanceStatus.valueOf(st);
            AttendanceRecord rec = AttendanceRecord.builder()
                .session(session)
                .student(student)
                .status(statusEnum)
                .markedAt(LocalDateTime.now())
                .build();

            recordsToSave.add(rec);
            if (statusEnum == AttendanceRecord.AttendanceStatus.PRESENT) presentCount++;
            else absentCount++;
        }

        if (seenStudentIds.size() != roster.size()) {
            throw new ValidationException("Incomplete attendance roster. Section " + session.getSection().getSectionName() 
                + " has " + roster.size() + " students, but received " + seenStudentIds.size());
        }

        // Persist records
        attendanceRecordRepo.saveAll(recordsToSave);

        // Mark session COMPLETED
        session.setStatus(AttendanceSession.SessionStatus.COMPLETED);
        session.setCompletedAt(LocalDateTime.now());
        sessionRepo.save(session);

        return AttendanceSubmissionResponse.builder()
            .status("SUCCESS")
            .message("Attendance saved successfully")
            .sessionId(sessionId)
            .lectureNumber(session.getLectureNumber())
            .presentCount(presentCount)
            .absentCount(absentCount)
            .totalRecorded(recordsToSave.size())
            .build();
    }

    @Transactional(readOnly = true)
    public SessionDto getSessionById(Long sessionId) {
        AttendanceSession s = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
        List<AttendanceRecord> recs = attendanceRecordRepo.findBySessionSessionId(sessionId);
        int pres = (int) recs.stream().filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.PRESENT).count();
        int abs = recs.size() - pres;

        return SessionDto.builder()
            .id(s.getSessionId())
            .subjectId(s.getCourse().getCourseId())
            .subjectName(s.getCourse().getCourseName())
            .subjectCode(s.getCourse().getCourseCodeShort())
            .facultyId(s.getFaculty().getFacultyId())
            .facultyCode(s.getFaculty().getFacultyCode())
            .facultyName(s.getFaculty().getName())
            .section(s.getSection().getSectionName())
            .semester(s.getSemester())
            .date(s.getSessionDate())
            .lectureNumber(s.getLectureNumber())
            .status(s.getStatus().name())
            .startedAt(s.getStartedAt())
            .completedAt(s.getCompletedAt())
            .totalRostered(recs.size())
            .presentCount(pres)
            .absentCount(abs)
            .build();
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecordDto> getSessionAttendance(Long sessionId) {
        if (!sessionRepo.existsById(sessionId)) {
            throw new ResourceNotFoundException("Session not found: " + sessionId);
        }
        return attendanceRecordRepo.findBySessionSessionId(sessionId).stream()
            .map(r -> AttendanceRecordDto.builder()
                .recordId(r.getRecordId())
                .sessionId(sessionId)
                .studentId(r.getStudent().getStudentId())
                .rollNumber(r.getStudent().getRollNumber())
                .studentName(r.getStudent().getName())
                .status(r.getStatus().name())
                .markedAt(r.getMarkedAt())
                .build())
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SessionDto> getSessionsForFaculty(Long facultyId) {
        return sessionRepo.findByFacultyFacultyIdOrderBySessionDateDesc(facultyId).stream()
            .map(s -> SessionDto.builder()
                .id(s.getSessionId())
                .subjectId(s.getCourse().getCourseId())
                .subjectName(s.getCourse().getCourseName())
                .subjectCode(s.getCourse().getCourseCodeShort())
                .facultyId(s.getFaculty().getFacultyId())
                .facultyCode(s.getFaculty().getFacultyCode())
                .facultyName(s.getFaculty().getName())
                .section(s.getSection().getSectionName())
                .semester(s.getSemester())
                .date(s.getSessionDate())
                .lectureNumber(s.getLectureNumber())
                .status(s.getStatus().name())
                .startedAt(s.getStartedAt())
                .completedAt(s.getCompletedAt())
                .build())
            .collect(Collectors.toList());
    }
}
"""

    modules["service/StudentService.java"] = """package com.attendance.service;

import com.attendance.dto.StudentDto;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.model.Student;
import com.attendance.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepo;

    @Transactional(readOnly = true)
    public List<StudentDto> getAllStudents(String sectionName) {
        List<Student> list = (sectionName != null && !sectionName.isBlank()) 
            ? studentRepo.findBySectionSectionName(sectionName.trim().toUpperCase())
            : studentRepo.findAll();

        return list.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StudentDto getStudentById(Long id) {
        return studentRepo.findById(id).map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));
    }

    @Transactional(readOnly = true)
    public StudentDto getStudentByRoll(String roll) {
        return studentRepo.findByRollNumber(roll).map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found with Roll: " + roll));
    }

    private StudentDto toDto(Student s) {
        return StudentDto.builder()
            .id(s.getStudentId())
            .rollNumber(s.getRollNumber())
            .name(s.getName())
            .section(s.getSection() != null ? s.getSection().getSectionName() : null)
            .department(s.getDepartment() != null ? s.getDepartment().getDeptCode() : "CSE")
            .semester(s.getSemester())
            .enrollmentNumber(s.getEnrollmentNumber())
            .enrollmentStatus(s.getEnrollmentStatus())
            .admissionType(s.getAdmissionType())
            .status(s.getStatus())
            .attendance(new StudentDto.AttendanceSummary(0, 0, null, "No attendance recorded yet"))
            .build();
    }
}
"""

    modules["service/FacultyService.java"] = """package com.attendance.service;

import com.attendance.dto.FacultyDto;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.model.CourseAllocation;
import com.attendance.model.Faculty;
import com.attendance.repository.CourseAllocationRepository;
import com.attendance.repository.FacultyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FacultyService {

    private final FacultyRepository facultyRepo;
    private final CourseAllocationRepository allocationRepo;

    @Transactional(readOnly = true)
    public List<FacultyDto> getAllFaculty() {
        return facultyRepo.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FacultyDto getFacultyById(Long id) {
        return facultyRepo.findById(id).map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Faculty not found: " + id));
    }

    @Transactional(readOnly = true)
    public FacultyDto getFacultyByCode(String code) {
        return facultyRepo.findByFacultyCode(code).map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Faculty not found: " + code));
    }

    private FacultyDto toDto(Faculty f) {
        List<CourseAllocation> allocs = allocationRepo.findByFacultyFacultyId(f.getFacultyId());
        List<String> subjects = allocs.stream().map(a -> a.getCourse().getCourseName()).distinct().collect(Collectors.toList());
        List<String> sections = allocs.stream().map(a -> a.getSection().getSectionName()).distinct().collect(Collectors.toList());

        return FacultyDto.builder()
            .id(f.getFacultyId())
            .facultyCode(f.getFacultyCode())
            .name(f.getName())
            .email(f.getEmail())
            .role(f.getRole().name())
            .designation(f.getDesignation())
            .department(f.getDepartment() != null ? f.getDepartment().getDeptCode() : "CSE")
            .assignedSubjects(subjects)
            .assignedSections(sections)
            .build();
    }
}
"""

    modules["service/CourseService.java"] = """package com.attendance.service;

import com.attendance.dto.CourseDto;
import com.attendance.model.Course;
import com.attendance.model.CourseAllocation;
import com.attendance.repository.CourseAllocationRepository;
import com.attendance.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepo;
    private final CourseAllocationRepository allocationRepo;

    @Transactional(readOnly = true)
    public List<CourseDto> getPrimarySubjects() {
        return courseRepo.findByIsPrimaryTrue().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CourseDto> getAllSubjects() {
        return courseRepo.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    private CourseDto toDto(Course c) {
        List<CourseAllocation> allocs = allocationRepo.findByCourseCourseId(c.getCourseId());
        String facName = allocs.isEmpty() ? "Unassigned" : allocs.get(0).getFaculty().getName();

        return CourseDto.builder()
            .id(c.getCourseId())
            .name(c.getCourseName())
            .shortCode(c.getCourseCodeShort())
            .officialCode(c.getOfficialCourseCode())
            .department(c.getDepartment() != null ? c.getDepartment().getDeptCode() : "CSE")
            .semester(c.getSemester())
            .isPrimary(c.getIsPrimary())
            .assignedFacultyName(facName)
            .build();
    }
}
"""

    modules["service/TimetableService.java"] = """package com.attendance.service;

import com.attendance.dto.TimetableDto;
import com.attendance.model.TimetableEntry;
import com.attendance.repository.TimetableEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableEntryRepository timetableRepo;

    @Transactional(readOnly = true)
    public List<TimetableDto> getTimetable(String section) {
        List<TimetableEntry> entries = (section != null && !section.isBlank())
            ? timetableRepo.findBySectionSectionName(section.trim().toUpperCase())
            : timetableRepo.findAll();
        return entries.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TimetableDto> getTimetableByFaculty(Long facultyId) {
        return timetableRepo.findByFacultyFacultyId(facultyId).stream().map(this::toDto).collect(Collectors.toList());
    }

    private TimetableDto toDto(TimetableEntry t) {
        return TimetableDto.builder()
            .id(t.getEntryId())
            .timetableCode(t.getTimetableCode())
            .section(t.getSection().getSectionName())
            .day(t.getDayOfWeek())
            .dayIndex(t.getDayIndex())
            .period(t.getPeriod())
            .periodStart(t.getPeriodStart())
            .periodEnd(t.getPeriodEnd())
            .startTime(t.getStartTime().toString())
            .endTime(t.getEndTime().toString())
            .timeDisplay(t.getStartTime() + " – " + t.getEndTime())
            .subjectCodeShort(t.getCourse().getCourseCodeShort())
            .subjectName(t.getCourse().getCourseName())
            .facultyId(t.getFaculty().getFacultyCode())
            .facultyName(t.getFaculty().getName())
            .type(t.getSlotType())
            .room(t.getRoom())
            .effectiveDate(t.getEffectiveDate())
            .build();
    }
}
"""

    modules["service/AttendanceCalculationService.java"] = """package com.attendance.service;

import com.attendance.dto.SectionAttendanceStatsDto;
import com.attendance.dto.StudentAttendanceSummaryDto;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.model.*;
import com.attendance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceCalculationService {

    private final StudentRepository studentRepo;
    private final CourseRepository courseRepo;
    private final SectionRepository sectionRepo;
    private final AttendanceSessionRepository sessionRepo;
    private final AttendanceRecordRepository attendanceRecordRepo;

    /**
     * Calculate live attendance summary for a student.
     * ONLY completed sessions count.
     * RECORDING, CANCELLED, historical snapshot, future slots excluded.
     */
    @Transactional(readOnly = true)
    public StudentAttendanceSummaryDto getStudentSummary(Long studentId) {
        Student student = studentRepo.findById(studentId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId));

        List<AttendanceSession> completedSessions = sessionRepo
            .findBySectionSectionIdAndStatus(student.getSection().getSectionId(), AttendanceSession.SessionStatus.COMPLETED);

        List<AttendanceRecord> records = attendanceRecordRepo.findCompletedByStudentId(studentId);
        long presentCount = records.stream().filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.PRESENT).count();

        Double overallPct = completedSessions.isEmpty() ? null : Math.round(((double) presentCount * 100.0 / completedSessions.size()) * 100.0) / 100.0;

        List<Course> primaryCourses = courseRepo.findByIsPrimaryTrue();
        List<StudentAttendanceSummaryDto.CourseBreakdown> breakdowns = new ArrayList<>();

        for (Course c : primaryCourses) {
            List<AttendanceSession> courseCompleted = sessionRepo
                .findByCourseCourseIdAndSectionSectionIdAndStatus(c.getCourseId(), student.getSection().getSectionId(), AttendanceSession.SessionStatus.COMPLETED);
            List<AttendanceRecord> cRecords = attendanceRecordRepo.findCompletedByStudentAndCourse(studentId, c.getCourseId());
            long cPres = cRecords.stream().filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.PRESENT).count();
            Double cPct = courseCompleted.isEmpty() ? null : Math.round(((double) cPres * 100.0 / courseCompleted.size()) * 100.0) / 100.0;

            breakdowns.add(StudentAttendanceSummaryDto.CourseBreakdown.builder()
                .courseId(c.getCourseId())
                .courseCodeShort(c.getCourseCodeShort())
                .courseName(c.getCourseName())
                .totalCompleted(courseCompleted.size())
                .attended((int) cPres)
                .percentage(cPct)
                .build());
        }

        return StudentAttendanceSummaryDto.builder()
            .studentId(studentId)
            .rollNumber(student.getRollNumber())
            .studentName(student.getName())
            .section(student.getSection().getSectionName())
            .completedEligibleSessions(completedSessions.size())
            .attendedSessions((int) presentCount)
            .overallPercentage(overallPct)
            .courses(breakdowns)
            .build();
    }

    /**
     * Section attendance statistics for a subject.
     * Section average = total present marks / total eligible attendance marks (completed sessions only).
     */
    @Transactional(readOnly = true)
    public SectionAttendanceStatsDto getSectionSubjectStats(Long courseId, String sectionName) {
        Course course = courseRepo.findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
        Section section = sectionRepo.findBySectionName(sectionName)
            .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionName));

        List<AttendanceSession> completed = sessionRepo
            .findByCourseCourseIdAndSectionSectionIdAndStatus(courseId, section.getSectionId(), AttendanceSession.SessionStatus.COMPLETED);

        long rosterCount = studentRepo.countBySectionSectionName(sectionName);
        long totalEligibleMarks = completed.size() * rosterCount;
        long presentMarks = attendanceRecordRepo.countPresentMarksForSectionAndCourse(section.getSectionId(), courseId);

        Double avgPct = totalEligibleMarks == 0 ? null : Math.round(((double) presentMarks * 100.0 / totalEligibleMarks) * 100.0) / 100.0;

        return SectionAttendanceStatsDto.builder()
            .section(sectionName)
            .courseCodeShort(course.getCourseCodeShort())
            .courseName(course.getCourseName())
            .completedSessions(completed.size())
            .totalRosteredStudents((int) rosterCount)
            .totalEligibleMarks((int) totalEligibleMarks)
            .totalPresentMarks((int) presentMarks)
            .averagePercentage(avgPct)
            .build();
    }
}
"""

    # 7. Controllers
    modules["controller/StudentController.java"] = """package com.attendance.controller;

import com.attendance.dto.StudentDto;
import com.attendance.service.StudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;

    @GetMapping
    public ResponseEntity<List<StudentDto>> getAllStudents(@RequestParam(required = false) String section) {
        return ResponseEntity.ok(studentService.getAllStudents(section));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudentDto> getStudentById(@PathVariable String id) {
        // Supports numeric ID or University Roll Number lookup
        try {
            Long numId = Long.parseLong(id);
            return ResponseEntity.ok(studentService.getStudentById(numId));
        } catch (NumberFormatException e) {
            return ResponseEntity.ok(studentService.getStudentByRoll(id));
        }
    }
}
"""

    modules["controller/FacultyController.java"] = """package com.attendance.controller;

import com.attendance.dto.FacultyDto;
import com.attendance.service.FacultyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/faculty")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class FacultyController {

    private final FacultyService facultyService;

    @GetMapping
    public ResponseEntity<List<FacultyDto>> getAllFaculty() {
        return ResponseEntity.ok(facultyService.getAllFaculty());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FacultyDto> getFacultyById(@PathVariable String id) {
        try {
            Long numId = Long.parseLong(id);
            return ResponseEntity.ok(facultyService.getFacultyById(numId));
        } catch (NumberFormatException e) {
            return ResponseEntity.ok(facultyService.getFacultyByCode(id));
        }
    }
}
"""

    modules["controller/SubjectController.java"] = """package com.attendance.controller;

import com.attendance.dto.CourseDto;
import com.attendance.service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subjects")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SubjectController {

    private final CourseService courseService;

    @GetMapping
    public ResponseEntity<List<CourseDto>> getSubjects(@RequestParam(defaultValue = "true") boolean primaryOnly) {
        if (primaryOnly) {
            return ResponseEntity.ok(courseService.getPrimarySubjects());
        }
        return ResponseEntity.ok(courseService.getAllSubjects());
    }
}
"""

    modules["controller/TimetableController.java"] = """package com.attendance.controller;

import com.attendance.dto.TimetableDto;
import com.attendance.service.TimetableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/timetable")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;

    @GetMapping
    public ResponseEntity<List<TimetableDto>> getTimetable(@RequestParam(required = false) String section) {
        return ResponseEntity.ok(timetableService.getTimetable(section));
    }

    @GetMapping("/faculty/{facultyId}")
    public ResponseEntity<List<TimetableDto>> getTimetableForFaculty(@PathVariable Long facultyId) {
        return ResponseEntity.ok(timetableService.getTimetableByFaculty(facultyId));
    }
}
"""

    modules["controller/SessionController.java"] = """package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.service.AttendanceSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SessionController {

    private final AttendanceSessionService sessionService;

    @PostMapping
    public ResponseEntity<SessionDto> startSession(@RequestBody StartSessionRequest request) {
        SessionDto session = sessionService.startSession(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(session);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SessionDto> getSession(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSessionById(id));
    }

    @PostMapping("/{id}/attendance")
    public ResponseEntity<AttendanceSubmissionResponse> saveAttendance(
            @PathVariable Long id,
            @RequestBody MarkAttendanceRequest request) {
        return ResponseEntity.ok(sessionService.saveAttendance(id, request));
    }

    @GetMapping("/{id}/attendance")
    public ResponseEntity<List<AttendanceRecordDto>> getSessionAttendance(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSessionAttendance(id));
    }

    @GetMapping("/faculty/{facultyId}")
    public ResponseEntity<List<SessionDto>> getFacultySessions(@PathVariable Long facultyId) {
        return ResponseEntity.ok(sessionService.getSessionsForFaculty(facultyId));
    }
}
"""

    modules["controller/AttendanceHistoryController.java"] = """package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.service.AttendanceCalculationService;
import com.attendance.service.AttendanceSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AttendanceHistoryController {

    private final AttendanceCalculationService calculationService;
    private final AttendanceSessionService sessionService;

    @GetMapping("/api/students/{id}/attendance")
    public ResponseEntity<StudentAttendanceSummaryDto> getStudentAttendance(@PathVariable Long id) {
        return ResponseEntity.ok(calculationService.getStudentSummary(id));
    }

    @GetMapping("/api/students/{id}/attendance/subject/{subjectId}")
    public ResponseEntity<StudentAttendanceSummaryDto.CourseBreakdown> getStudentSubjectAttendance(
            @PathVariable Long id,
            @PathVariable Long subjectId) {
        StudentAttendanceSummaryDto summary = calculationService.getStudentSummary(id);
        return summary.getCourses().stream()
            .filter(c -> c.getCourseId().equals(subjectId))
            .findFirst()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/api/attendance/subject/{subjectId}/section/{section}")
    public ResponseEntity<SectionAttendanceStatsDto> getSectionSubjectStats(
            @PathVariable Long subjectId,
            @PathVariable String section) {
        return ResponseEntity.ok(calculationService.getSectionSubjectStats(subjectId, section));
    }

    @GetMapping("/api/faculty/{facultyId}/sessions")
    public ResponseEntity<List<SessionDto>> getFacultySessions(@PathVariable Long facultyId) {
        return ResponseEntity.ok(sessionService.getSessionsForFaculty(facultyId));
    }
}
"""

    # 8. Security Scaffolding
    modules["security/SecurityConfig.java"] = """package com.attendance.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public academic discovery and development endpoints
                .requestMatchers("/api/students/**").permitAll()
                .requestMatchers("/api/faculty/**").permitAll()
                .requestMatchers("/api/subjects/**").permitAll()
                .requestMatchers("/api/timetable/**").permitAll()
                .requestMatchers("/api/sessions/**").permitAll()
                .requestMatchers("/api/attendance/**").permitAll()
                .anyRequest().permitAll()
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
"""

    # 9. Test file
    modules["test/AttendanceBackendTests.java"] = """package com.attendance;

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
"""

    # Write individual source files
    for rel_path, code in modules.items():
        if rel_path.startswith("test/"):
            dest = f"src/test/java/com/attendance/{rel_path[5:]}"
        else:
            dest = f"src/main/java/com/attendance/{rel_path}"
        write_file(dest, code)

    # Now assemble the comprehensive monolithic reference AttendanceBackend.java
    monolithic_header = """// ============================================================
//  SMART ATTENDANCE SYSTEM — Java Backend (Spring Boot 3.x)
//  Academic Target: B.Tech CSE · 3rd Semester · July–Dec 2026
//  Authoritative Contract: 252 Students, 5 Primary Faculty, 5 Subjects, 80 Timetable Blocks
//  File structure shown via comments; all components also pre-extracted
//  into standard Maven project directory structure in src/main/java/com/attendance/
// ============================================================

// ────────────────────────────────────────────────────────────
// pom.xml  (Maven dependencies)
// ────────────────────────────────────────────────────────────
/*
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.11.5</version>
    </dependency>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
*/

// ────────────────────────────────────────────────────────────
// src/main/resources/application.properties
// ────────────────────────────────────────────────────────────
/*
server.port=8080
spring.datasource.url=jdbc:mysql://localhost:3306/smart_attendance?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata
spring.datasource.username=root
spring.datasource.password=${DB_PASSWORD:root}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect

jwt.secret=${JWT_SECRET:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}
jwt.expiration=86400000
*/
"""

    monolithic_parts = [monolithic_header]
    for rel_path, code in modules.items():
        if rel_path.startswith("test/"):
            continue
        monolithic_parts.append(f"\n// ============================================================\n// FILE: src/main/java/com/attendance/{rel_path}\n// ============================================================\n{code}")

    with open("AttendanceBackend.java", "w", encoding="utf-8") as f:
        f.write("\n".join(monolithic_parts))

    print("Successfully generated full modular Spring Boot codebase and updated AttendanceBackend.java!")

if __name__ == '__main__':
    build_all()
