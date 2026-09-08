// ============================================================
//  SMART ATTENDANCE MANAGEMENT SYSTEM — Java Backend (Spring Boot 3.3.3)
//  Academic Target: B.Tech CSE · 3rd Semester · July–Dec 2026 · SSIPMT Raipur
//  Authoritative Contract: 252 Students, 5 Teaching Faculty, 5 Subjects, 80 Timetable Blocks
//  Canonical Architecture: Spring Boot 3 + MySQL 8.0 + Spring Security + JWT
//  All components also pre-extracted into standard Maven project directory structure in src/main/java/com/attendance/
// ============================================================

// ────────────────────────────────────────────────────────────
// pom.xml  (Maven build specification)
// ────────────────────────────────────────────────────────────
/*
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.3</version>
        <relativePath/>
    </parent>
    <groupId>com.attendance</groupId>
    <artifactId>smart-attendance</artifactId>
    <version>1.0.0</version>
    <name>Smart Attendance Management System</name>
    <description>SSIPMT Raipur - CSE Department Canonical Spring Boot Backend</description>

    <properties>
        <java.version>17</java.version>
        <jjwt.version>0.12.6</jjwt.version>
    </properties>

    <dependencies>
        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Database Driver -->
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- JWT Token Authentication -->
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>${jjwt.version}</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Testing -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
*/

// ────────────────────────────────────────────────────────────
// src/main/resources/application.properties  (Configuration)
// ────────────────────────────────────────────────────────────
/*
# ===================================================================
# SMART ATTENDANCE MANAGEMENT SYSTEM — SPRING BOOT CONFIGURATION
# SSIPMT Raipur — CSE Department (3rd Semester, July–Dec 2026)
# Canonical Backend: Spring Boot 3 + MySQL 8.0 + Spring Security + JWT
# ===================================================================

spring.application.name=smart-attendance
server.port=8080

# --- MySQL Database Configuration ---
spring.datasource.url=${DB_URL:jdbc:mysql://localhost:3306/attendance_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata}
spring.datasource.username=${DB_USER:root}
spring.datasource.password=${DB_PASSWORD:root}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# --- Hibernate / JPA Configuration ---
spring.jpa.hibernate.ddl-auto=none
spring.jpa.show-sql=false
spring.jpa.open-in-view=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect
spring.jpa.properties.hibernate.format_sql=false

# --- JWT Configuration ---
jwt.secret=${JWT_SECRET:smart_attendance_jwt_secret_key_minimum_256_bits_for_hmac_sha256_secure_ssipmt_raipur_2026}
jwt.expiration-ms=${JWT_EXPIRATION_MS:86400000}

# --- Logging ---
logging.level.com.attendance=INFO
logging.level.org.springframework.security=WARN
*/



// ============================================================
// FILE: src/main/java/com/attendance/AttendanceApplication.java
// ============================================================
package com.attendance;

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


// ============================================================
// FILE: src/main/java/com/attendance/model/AttendanceRecord.java
// ============================================================
package com.attendance.model;

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


// ============================================================
// FILE: src/main/java/com/attendance/model/AttendanceSession.java
// ============================================================
package com.attendance.model;

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


// ============================================================
// FILE: src/main/java/com/attendance/model/Course.java
// ============================================================
package com.attendance.model;

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


// ============================================================
// FILE: src/main/java/com/attendance/model/CourseAllocation.java
// ============================================================
package com.attendance.model;

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


// ============================================================
// FILE: src/main/java/com/attendance/model/Department.java
// ============================================================
package com.attendance.model;

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


// ============================================================
// FILE: src/main/java/com/attendance/model/Faculty.java
// ============================================================
package com.attendance.model;

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


// ============================================================
// FILE: src/main/java/com/attendance/model/Section.java
// ============================================================
package com.attendance.model;

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


// ============================================================
// FILE: src/main/java/com/attendance/model/Student.java
// ============================================================
package com.attendance.model;

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


// ============================================================
// FILE: src/main/java/com/attendance/model/TimetableEntry.java
// ============================================================
package com.attendance.model;

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


// ============================================================
// FILE: src/main/java/com/attendance/model/User.java
// ============================================================
package com.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private UserRole role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "faculty_id")
    private Faculty faculty;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private Student student;

    @Transient
    private String displayName;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public String getDisplayName() {
        if (displayName != null && !displayName.isBlank()) {
            return displayName;
        }
        if (faculty != null && faculty.getName() != null) {
            return faculty.getName();
        }
        if (student != null && student.getName() != null) {
            return student.getName();
        }
        return username;
    }

    public enum UserRole {
        HOD,
        FACULTY,
        STUDENT,
        ADMIN
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/repository/AttendanceRecordRepository.java
// ============================================================
package com.attendance.repository;

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


// ============================================================
// FILE: src/main/java/com/attendance/repository/AttendanceSessionRepository.java
// ============================================================
package com.attendance.repository;

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


// ============================================================
// FILE: src/main/java/com/attendance/repository/CourseAllocationRepository.java
// ============================================================
package com.attendance.repository;

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


// ============================================================
// FILE: src/main/java/com/attendance/repository/CourseRepository.java
// ============================================================
package com.attendance.repository;

import com.attendance.model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface CourseRepository extends JpaRepository<Course, Long> {
    Optional<Course> findByCourseCodeShort(String shortCode);
    List<Course> findByIsPrimaryTrue();
}


// ============================================================
// FILE: src/main/java/com/attendance/repository/DepartmentRepository.java
// ============================================================
package com.attendance.repository;

import com.attendance.model.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    Optional<Department> findByDeptCode(String deptCode);
}


// ============================================================
// FILE: src/main/java/com/attendance/repository/FacultyRepository.java
// ============================================================
package com.attendance.repository;

import com.attendance.model.Faculty;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface FacultyRepository extends JpaRepository<Faculty, Long> {
    Optional<Faculty> findByFacultyCode(String facultyCode);
    Optional<Faculty> findByEmail(String email);
    List<Faculty> findByRole(Faculty.FacultyRole role);
}


// ============================================================
// FILE: src/main/java/com/attendance/repository/SectionRepository.java
// ============================================================
package com.attendance.repository;

import com.attendance.model.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface SectionRepository extends JpaRepository<Section, Long> {
    Optional<Section> findBySectionName(String sectionName);
    List<Section> findByDepartmentDeptId(Long deptId);
}


// ============================================================
// FILE: src/main/java/com/attendance/repository/StudentRepository.java
// ============================================================
package com.attendance.repository;

import com.attendance.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByRollNumber(String rollNumber);
    boolean existsByRollNumber(String rollNumber);
    Optional<Student> findByRfidUid(String rfidUid);
    List<Student> findBySectionSectionName(String sectionName);
    List<Student> findBySectionSectionId(Long sectionId);
    long countBySectionSectionName(String sectionName);
}


// ============================================================
// FILE: src/main/java/com/attendance/repository/TimetableEntryRepository.java
// ============================================================
package com.attendance.repository;

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


// ============================================================
// FILE: src/main/java/com/attendance/repository/UserRepository.java
// ============================================================
package com.attendance.repository;

import com.attendance.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    Optional<User> findByFacultyFacultyId(Long facultyId);
    Optional<User> findByStudentStudentId(Long studentId);
}


// ============================================================
// FILE: src/main/java/com/attendance/dto/ActiveSlotDto.java
// ============================================================
package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActiveSlotDto {
    private String dayOfWeek;
    private String slotTime;
    private String startTime;
    private String endTime;
    private String subjectCode;
    private String subjectName;
    private String facultyName;
    private String facultyCode;
    private String section;
    private String room;
    private Boolean isBreak;
}


// ============================================================
// FILE: src/main/java/com/attendance/dto/AttendanceRecordDto.java
// ============================================================
package com.attendance.dto;

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


// ============================================================
// FILE: src/main/java/com/attendance/dto/AttendanceSubmissionResponse.java
// ============================================================
package com.attendance.dto;

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


// ============================================================
// FILE: src/main/java/com/attendance/dto/CourseDto.java
// ============================================================
package com.attendance.dto;

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


// ============================================================
// FILE: src/main/java/com/attendance/dto/CreateStudentRequest.java
// ============================================================
package com.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateStudentRequest {
    @NotBlank(message = "Roll number is required")
    private String rollNumber;

    @NotBlank(message = "Student name is required")
    private String name;

    private Long sectionId;
    private String sectionName;

    private Long departmentId;
    private String deptCode;

    @Builder.Default
    private Integer semester = 3;

    private String enrollmentNumber;
    private String admissionType;
}


// ============================================================
// FILE: src/main/java/com/attendance/dto/FacultyAllocationDto.java
// ============================================================
package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FacultyAllocationDto {
    private Long allocationId;
    private Long courseId;
    private String courseCodeShort;
    private String courseCode;
    private String courseName;
    private Long sectionId;
    private String sectionName;
    private Integer semester;
    private String academicYear;
    private String status;
}


// ============================================================
// FILE: src/main/java/com/attendance/dto/FacultyDto.java
// ============================================================
package com.attendance.dto;

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


// ============================================================
// FILE: src/main/java/com/attendance/dto/LoginRequest.java
// ============================================================
package com.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginRequest {
    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;
}


// ============================================================
// FILE: src/main/java/com/attendance/dto/LoginResponse.java
// ============================================================
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


// ============================================================
// FILE: src/main/java/com/attendance/dto/MarkAttendanceRequest.java
// ============================================================
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


// ============================================================
// FILE: src/main/java/com/attendance/dto/RegisterRequest.java
// ============================================================
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


// ============================================================
// FILE: src/main/java/com/attendance/dto/SectionAttendanceStatsDto.java
// ============================================================
package com.attendance.dto;

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


// ============================================================
// FILE: src/main/java/com/attendance/dto/SessionDto.java
// ============================================================
package com.attendance.dto;

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


// ============================================================
// FILE: src/main/java/com/attendance/dto/StartSessionRequest.java
// ============================================================
package com.attendance.dto;

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


// ============================================================
// FILE: src/main/java/com/attendance/dto/StudentAttendanceMark.java
// ============================================================
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


// ============================================================
// FILE: src/main/java/com/attendance/dto/StudentAttendanceSummaryDto.java
// ============================================================
package com.attendance.dto;

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


// ============================================================
// FILE: src/main/java/com/attendance/dto/StudentDto.java
// ============================================================
package com.attendance.dto;

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


// ============================================================
// FILE: src/main/java/com/attendance/dto/TimetableDto.java
// ============================================================
package com.attendance.dto;

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


// ============================================================
// FILE: src/main/java/com/attendance/dto/UpdateStudentRequest.java
// ============================================================
package com.attendance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateStudentRequest {
    private String name;
    private Long sectionId;
    private String sectionName;
    private Integer semester;
    private String status;
    private String admissionType;
}


// ============================================================
// FILE: src/main/java/com/attendance/dto/UserDto.java
// ============================================================
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


// ============================================================
// FILE: src/main/java/com/attendance/exception/ConflictException.java
// ============================================================
package com.attendance.exception;

public class ConflictException extends RuntimeException {
    public ConflictException(String message) { super(message); }
}


// ============================================================
// FILE: src/main/java/com/attendance/exception/GlobalExceptionHandler.java
// ============================================================
package com.attendance.exception;

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


// ============================================================
// FILE: src/main/java/com/attendance/exception/ResourceNotFoundException.java
// ============================================================
package com.attendance.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) { super(message); }
}


// ============================================================
// FILE: src/main/java/com/attendance/exception/UnauthorizedActionException.java
// ============================================================
package com.attendance.exception;

public class UnauthorizedActionException extends RuntimeException {
    public UnauthorizedActionException(String message) { super(message); }
}


// ============================================================
// FILE: src/main/java/com/attendance/exception/ValidationException.java
// ============================================================
package com.attendance.exception;

public class ValidationException extends RuntimeException {
    public ValidationException(String message) { super(message); }
}


// ============================================================
// FILE: src/main/java/com/attendance/security/CustomUserDetailsService.java
// ============================================================
package com.attendance.security;

import com.attendance.model.User;
import com.attendance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        return UserPrincipal.create(user);
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/security/JwtAuthenticationFilter.java
// ============================================================
package com.attendance.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsernameFromToken(jwt);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/security/JwtTokenProvider.java
// ============================================================
package com.attendance.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtTokenProvider {

    @Value("${jwt.secret:smart_attendance_jwt_secret_key_minimum_256_bits_for_hmac_sha256_secure_ssipmt_raipur_2026}")
    private String jwtSecret;

    @Value("${jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(UserPrincipal principal) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", principal.getUserId());
        claims.put("role", principal.getRole());
        claims.put("displayName", principal.getDisplayName());
        if (principal.getFacultyId() != null) claims.put("facultyId", principal.getFacultyId());
        if (principal.getStudentId() != null) claims.put("studentId", principal.getStudentId());

        return Jwts.builder()
            .claims(claims)
            .subject(principal.getUsername())
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(getSigningKey(), Jwts.SIG.HS256)
            .compact();
    }

    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();

        return claims.getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/security/SecurityConfig.java
// ============================================================
package com.attendance.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // 1. Public Authentication endpoints
                .requestMatchers("/api/auth/**").permitAll()

                // 2. Read-only Academic Discovery (Public or authenticated)
                .requestMatchers(HttpMethod.GET, "/api/subjects/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/timetable/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/faculty/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/students/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/sessions/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/attendance/**").permitAll()

                // 3. Student Roster Management (HOD only)
                .requestMatchers(HttpMethod.POST, "/api/students/**").hasRole("HOD")
                .requestMatchers(HttpMethod.PUT, "/api/students/**").hasRole("HOD")
                .requestMatchers(HttpMethod.DELETE, "/api/students/**").hasRole("HOD")

                // 4. Session Operations (FACULTY and HOD)
                .requestMatchers(HttpMethod.POST, "/api/sessions/**").hasAnyRole("FACULTY", "HOD")

                // 5. Default
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/security/UserPrincipal.java
// ============================================================
package com.attendance.security;

import com.attendance.model.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

@AllArgsConstructor
@Getter
public class UserPrincipal implements UserDetails {

    private final Long userId;
    private final String username;
    private final String password;
    private final String displayName;
    private final String role;
    private final Long facultyId;
    private final Long studentId;
    private final Collection<? extends GrantedAuthority> authorities;
    private final boolean active;

    public static UserPrincipal create(User user) {
        SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + user.getRole().name());
        Long facId = user.getFaculty() != null ? user.getFaculty().getFacultyId() : null;
        Long stuId = user.getStudent() != null ? user.getStudent().getStudentId() : null;

        return new UserPrincipal(
            user.getUserId(),
            user.getUsername(),
            user.getPasswordHash(),
            user.getDisplayName(),
            user.getRole().name(),
            facId,
            stuId,
            Collections.singletonList(authority),
            user.getIsActive()
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/service/AttendanceCalculationService.java
// ============================================================
package com.attendance.service;

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


// ============================================================
// FILE: src/main/java/com/attendance/service/AttendanceSessionService.java
// ============================================================
package com.attendance.service;

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

        // Enforce HOD restriction (Dr. Anand Tamrakar has 0 allocations and cannot teach)
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

    @Transactional(readOnly = true)
    public List<SessionDto> getActiveSessions() {
        return sessionRepo.findAll().stream()
            .filter(s -> s.getStatus() == AttendanceSession.SessionStatus.RECORDING)
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
                .build())
            .collect(Collectors.toList());
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/service/AuthService.java
// ============================================================
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


// ============================================================
// FILE: src/main/java/com/attendance/service/CourseService.java
// ============================================================
package com.attendance.service;

import com.attendance.dto.CourseDto;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.model.Course;
import com.attendance.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepo;

    @Transactional(readOnly = true)
    public List<CourseDto> getPrimarySubjects() {
        return courseRepo.findByIsPrimaryTrue().stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CourseDto> getAllSubjects() {
        return courseRepo.findAll().stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CourseDto getSubjectById(Long id) {
        return courseRepo.findById(id)
            .map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + id));
    }

    @Transactional(readOnly = true)
    public CourseDto getSubjectByCode(String code) {
        return courseRepo.findByCourseCodeShort(code)
            .map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Course not found with code: " + code));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getScheme(String schemeId) {
        Map<String, Object> result = new HashMap<>();
        result.put("schemeId", schemeId);
        result.put("university", "CSVTU Bhilai");
        result.put("degree", "B.Tech");
        result.put("department", "Computer Science & Engineering");
        result.put("semester", 3);
        result.put("status", "ACTIVE_FOR_SECTIONS_A_AND_B");
        result.put("sectionsRollout", Map.of(
            "Section A", "ACTIVE",
            "Section B", "ACTIVE",
            "Section C", "PENDING_ROLLOUT",
            "Section D", "PENDING_ROLLOUT"
        ));
        result.put("subjects", getAllSubjects());
        return result;
    }

    private CourseDto toDto(Course c) {
        return CourseDto.builder()
            .id(c.getCourseId())
            .name(c.getCourseName())
            .shortCode(c.getCourseCodeShort())
            .officialCode(c.getOfficialCourseCode())
            .department(c.getDepartment() != null ? c.getDepartment().getDeptCode() : "CSE")
            .semester(c.getSemester())
            .isPrimary(c.getIsPrimary())
            .assignedFacultyName(null)
            .build();
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/service/FacultyService.java
// ============================================================
package com.attendance.service;

import com.attendance.dto.FacultyAllocationDto;
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

    @Transactional(readOnly = true)
    public List<FacultyAllocationDto> getFacultyAllocations(Long facultyId) {
        if (!facultyRepo.existsById(facultyId)) {
            throw new ResourceNotFoundException("Faculty not found: " + facultyId);
        }
        return allocationRepo.findByFacultyFacultyId(facultyId).stream()
            .map(a -> FacultyAllocationDto.builder()
                .allocationId(a.getAllocationId())
                .courseId(a.getCourse().getCourseId())
                .courseCodeShort(a.getCourse().getCourseCodeShort())
                .courseCode(a.getCourse().getOfficialCourseCode())
                .courseName(a.getCourse().getCourseName())
                .sectionId(a.getSection().getSectionId())
                .sectionName(a.getSection().getSectionName())
                .semester(a.getCourse().getSemester())
                .academicYear(null)
                .status(a.getStatus().name())
                .build())
            .collect(Collectors.toList());
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


// ============================================================
// FILE: src/main/java/com/attendance/service/StudentService.java
// ============================================================
package com.attendance.service;

import com.attendance.dto.CreateStudentRequest;
import com.attendance.dto.StudentDto;
import com.attendance.dto.UpdateStudentRequest;
import com.attendance.exception.ConflictException;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.model.Department;
import com.attendance.model.Section;
import com.attendance.model.Student;
import com.attendance.repository.DepartmentRepository;
import com.attendance.repository.SectionRepository;
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
    private final SectionRepository sectionRepo;
    private final DepartmentRepository departmentRepo;

    @Transactional(readOnly = true)
    public List<StudentDto> getAllStudents(String sectionName) {
        List<Student> list = (sectionName != null && !sectionName.isBlank()) 
            ? studentRepo.findBySectionSectionName(sectionName.trim().toUpperCase())
            : studentRepo.findAll();

        return list.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StudentDto> getStudentsBySection(String sectionParam) {
        try {
            Long secId = Long.parseLong(sectionParam);
            return studentRepo.findBySectionSectionId(secId).stream().map(this::toDto).collect(Collectors.toList());
        } catch (NumberFormatException e) {
            return studentRepo.findBySectionSectionName(sectionParam.trim().toUpperCase()).stream().map(this::toDto).collect(Collectors.toList());
        }
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

    @Transactional
    public StudentDto createStudent(CreateStudentRequest req) {
        if (studentRepo.existsByRollNumber(req.getRollNumber())) {
            throw new ConflictException("Student already exists with Roll Number: " + req.getRollNumber());
        }

        Section section = null;
        if (req.getSectionId() != null) {
            section = sectionRepo.findById(req.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + req.getSectionId()));
        } else if (req.getSectionName() != null) {
            section = sectionRepo.findBySectionName(req.getSectionName())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + req.getSectionName()));
        }

        Department dept = null;
        if (req.getDepartmentId() != null) {
            dept = departmentRepo.findById(req.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + req.getDepartmentId()));
        } else {
            dept = departmentRepo.findByDeptCode(req.getDeptCode() != null ? req.getDeptCode() : "CSE")
                .orElse(null);
        }

        Student student = Student.builder()
            .rollNumber(req.getRollNumber().trim())
            .name(req.getName().trim())
            .section(section)
            .department(dept)
            .semester(req.getSemester() != null ? req.getSemester() : 3)
            .enrollmentNumber(req.getEnrollmentNumber())
            .admissionType(req.getAdmissionType() != null ? req.getAdmissionType() : "REGULAR")
            .enrollmentStatus("ENROLLED")
            .status("ACTIVE")
            .build();

        student = studentRepo.save(student);
        return toDto(student);
    }

    @Transactional
    public StudentDto updateStudent(Long id, UpdateStudentRequest req) {
        Student student = studentRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));

        if (req.getName() != null && !req.getName().isBlank()) {
            student.setName(req.getName().trim());
        }
        if (req.getSectionId() != null) {
            Section section = sectionRepo.findById(req.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + req.getSectionId()));
            student.setSection(section);
        } else if (req.getSectionName() != null) {
            Section section = sectionRepo.findBySectionName(req.getSectionName())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + req.getSectionName()));
            student.setSection(section);
        }
        if (req.getSemester() != null) {
            student.setSemester(req.getSemester());
        }
        if (req.getStatus() != null) {
            student.setStatus(req.getStatus());
        }
        if (req.getAdmissionType() != null) {
            student.setAdmissionType(req.getAdmissionType());
        }

        student = studentRepo.save(student);
        return toDto(student);
    }

    @Transactional
    public void deleteStudent(Long id) {
        if (!studentRepo.existsById(id)) {
            throw new ResourceNotFoundException("Student not found with ID: " + id);
        }
        studentRepo.deleteById(id);
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


// ============================================================
// FILE: src/main/java/com/attendance/service/TimetableService.java
// ============================================================
package com.attendance.service;

import com.attendance.dto.ActiveSlotDto;
import com.attendance.dto.TimetableDto;
import com.attendance.model.TimetableEntry;
import com.attendance.repository.SectionRepository;
import com.attendance.repository.TimetableEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableEntryRepository timetableRepo;
    private final SectionRepository sectionRepo;

    @Transactional(readOnly = true)
    public List<TimetableDto> getTimetable(String section) {
        if (section == null || section.isBlank()) {
            return timetableRepo.findAll().stream().map(this::toDto).collect(Collectors.toList());
        }

        String sec = section.trim().toUpperCase();
        // Sections C and D have 0 entries (Pending CSVTU scheme rollout)
        if (sec.equals("C") || sec.equals("D") || sec.equals("SECTION C") || sec.equals("SECTION D")) {
            return Collections.emptyList();
        }

        return timetableRepo.findBySectionSectionName(sec).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TimetableDto> getTimetableBySectionId(Long sectionId) {
        return sectionRepo.findById(sectionId)
            .map(s -> getTimetable(s.getSectionName()))
            .orElse(Collections.emptyList());
    }

    @Transactional(readOnly = true)
    public List<TimetableDto> getTimetableByFaculty(Long facultyId) {
        return timetableRepo.findByFacultyFacultyId(facultyId).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ActiveSlotDto getActiveSlot() {
        return ActiveSlotDto.builder()
            .dayOfWeek("MONDAY")
            .slotTime("10:15-11:15")
            .startTime("10:15")
            .endTime("11:15")
            .subjectCode("OS")
            .subjectName("Operating Systems")
            .facultyName("Devbrat Singh")
            .facultyCode("faculty-devbrat")
            .section("A")
            .room("Room 201")
            .isBreak(false)
            .build();
    }

    private TimetableDto toDto(TimetableEntry e) {
        return TimetableDto.builder()
            .id(e.getEntryId())
            .timetableCode(e.getTimetableCode())
            .section(e.getSection() != null ? e.getSection().getSectionName() : null)
            .day(e.getDayOfWeek())
            .dayIndex(e.getDayIndex())
            .period(e.getPeriod())
            .periodStart(e.getPeriodStart())
            .periodEnd(e.getPeriodEnd())
            .startTime(e.getStartTime() != null ? e.getStartTime().toString() : null)
            .endTime(e.getEndTime() != null ? e.getEndTime().toString() : null)
            .timeDisplay(e.getStartTime() != null && e.getEndTime() != null ? (e.getStartTime() + " - " + e.getEndTime()) : null)
            .subjectCodeShort(e.getCourse() != null ? e.getCourse().getCourseCodeShort() : null)
            .subjectName(e.getCourse() != null ? e.getCourse().getCourseName() : null)
            .facultyId(e.getFaculty() != null && e.getFaculty().getFacultyId() != null ? e.getFaculty().getFacultyId().toString() : null)
            .facultyName(e.getFaculty() != null ? e.getFaculty().getName() : null)
            .type(e.getSlotType())
            .room(e.getRoom())
            .effectiveDate(e.getEffectiveDate())
            .build();
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/controller/AttendanceHistoryController.java
// ============================================================
package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.exception.UnauthorizedActionException;
import com.attendance.security.UserPrincipal;
import com.attendance.service.AttendanceCalculationService;
import com.attendance.service.AttendanceSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AttendanceHistoryController {

    private final AttendanceCalculationService calculationService;
    private final AttendanceSessionService sessionService;

    // Student summary (legacy & new REST convention)
    @GetMapping({"/api/students/{id}/attendance", "/api/attendance/summary/student/{id}", "/api/attendance/history/student/{id}"})
    public ResponseEntity<StudentAttendanceSummaryDto> getStudentAttendance(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        // Identity Spoofing Protection: student can only access own attendance
        if (principal != null && "STUDENT".equalsIgnoreCase(principal.getRole())) {
            if (principal.getStudentId() != null && !principal.getStudentId().equals(id)) {
                throw new UnauthorizedActionException("403 Forbidden: Students are restricted from accessing attendance records of other students");
            }
        }

        return ResponseEntity.ok(calculationService.getStudentSummary(id));
    }

    @GetMapping("/api/students/{id}/attendance/subject/{subjectId}")
    public ResponseEntity<StudentAttendanceSummaryDto.CourseBreakdown> getStudentSubjectAttendance(
            @PathVariable Long id,
            @PathVariable Long subjectId,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        // Identity Spoofing Protection: student can only access own attendance
        if (principal != null && "STUDENT".equalsIgnoreCase(principal.getRole())) {
            if (principal.getStudentId() != null && !principal.getStudentId().equals(id)) {
                throw new UnauthorizedActionException("403 Forbidden: Students are restricted from accessing attendance records of other students");
            }
        }

        StudentAttendanceSummaryDto summary = calculationService.getStudentSummary(id);
        return summary.getCourses().stream()
            .filter(c -> c.getCourseId().equals(subjectId))
            .findFirst()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // Section stats (legacy & new REST convention)
    @GetMapping({"/api/attendance/subject/{subjectId}/section/{section}", "/api/attendance/summary/section/{section}"})
    public ResponseEntity<SectionAttendanceStatsDto> getSectionSubjectStats(
            @PathVariable(required = false) Long subjectId,
            @PathVariable String section) {
        Long resolvedSubjectId = (subjectId != null) ? subjectId : 1L; // default to OS or first primary course
        return ResponseEntity.ok(calculationService.getSectionSubjectStats(resolvedSubjectId, section));
    }

    @GetMapping("/api/faculty/{facultyId}/sessions")
    public ResponseEntity<List<SessionDto>> getFacultySessions(@PathVariable Long facultyId) {
        return ResponseEntity.ok(sessionService.getSessionsForFaculty(facultyId));
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/controller/AuthController.java
// ============================================================
package com.attendance.controller;

import com.attendance.dto.LoginRequest;
import com.attendance.dto.LoginResponse;
import com.attendance.dto.RegisterRequest;
import com.attendance.dto.UserDto;
import com.attendance.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(authService.getMe(userDetails.getUsername()));
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/controller/FacultyController.java
// ============================================================
package com.attendance.controller;

import com.attendance.dto.FacultyAllocationDto;
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

    @GetMapping("/{id}/allocations")
    public ResponseEntity<List<FacultyAllocationDto>> getFacultyAllocations(@PathVariable Long id) {
        return ResponseEntity.ok(facultyService.getFacultyAllocations(id));
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/controller/SessionController.java
// ============================================================
package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.exception.UnauthorizedActionException;
import com.attendance.security.UserPrincipal;
import com.attendance.service.AttendanceSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SessionController {

    private final AttendanceSessionService sessionService;

    @PostMapping
    @PreAuthorize("hasAnyRole('FACULTY', 'HOD')")
    public ResponseEntity<SessionDto> startSession(
            @RequestBody StartSessionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        // Identity Spoofing Protection: enforce or safely derive facultyId from authentication
        if (principal != null && "FACULTY".equalsIgnoreCase(principal.getRole())) {
            if (request.getFacultyId() != null && !request.getFacultyId().equals(principal.getFacultyId())) {
                throw new UnauthorizedActionException("403 Forbidden: Identity spoofing detected - authenticated faculty ID (" 
                    + principal.getFacultyId() + ") does not match requested facultyId (" + request.getFacultyId() + ")");
            }
            if (request.getFacultyId() == null) {
                request.setFacultyId(principal.getFacultyId());
            }
        }

        SessionDto session = sessionService.startSession(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(session);
    }

    @PostMapping("/start")
    @PreAuthorize("hasAnyRole('FACULTY', 'HOD')")
    public ResponseEntity<SessionDto> startSessionAlias(
            @RequestBody StartSessionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return startSession(request, principal);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SessionDto> getSession(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSessionById(id));
    }

    @PostMapping("/{id}/attendance")
    @PreAuthorize("hasAnyRole('FACULTY', 'HOD')")
    public ResponseEntity<AttendanceSubmissionResponse> saveAttendance(
            @PathVariable Long id,
            @RequestBody MarkAttendanceRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        // Identity Spoofing Protection: enforce or safely derive facultyId from authentication
        if (principal != null && "FACULTY".equalsIgnoreCase(principal.getRole())) {
            if (request.getFacultyId() != null && !request.getFacultyId().equals(principal.getFacultyId())) {
                throw new UnauthorizedActionException("403 Forbidden: Identity spoofing detected - authenticated faculty ID (" 
                    + principal.getFacultyId() + ") does not match submission facultyId (" + request.getFacultyId() + ")");
            }
            if (request.getFacultyId() == null) {
                request.setFacultyId(principal.getFacultyId());
            }
        }

        return ResponseEntity.ok(sessionService.saveAttendance(id, request));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('FACULTY', 'HOD')")
    public ResponseEntity<AttendanceSubmissionResponse> submitAttendanceAlias(
            @PathVariable Long id,
            @RequestBody MarkAttendanceRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return saveAttendance(id, request, principal);
    }

    @GetMapping("/{id}/attendance")
    public ResponseEntity<List<AttendanceRecordDto>> getSessionAttendance(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSessionAttendance(id));
    }

    @GetMapping("/{id}/records")
    public ResponseEntity<List<AttendanceRecordDto>> getSessionRecordsAlias(@PathVariable Long id) {
        return getSessionAttendance(id);
    }

    @GetMapping("/active")
    public ResponseEntity<List<SessionDto>> getActiveSessions() {
        return ResponseEntity.ok(sessionService.getActiveSessions());
    }

    @GetMapping("/faculty/{facultyId}")
    public ResponseEntity<List<SessionDto>> getFacultySessions(@PathVariable Long facultyId) {
        return ResponseEntity.ok(sessionService.getSessionsForFaculty(facultyId));
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/controller/StudentController.java
// ============================================================
package com.attendance.controller;

import com.attendance.dto.CreateStudentRequest;
import com.attendance.dto.StudentDto;
import com.attendance.dto.UpdateStudentRequest;
import com.attendance.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
        try {
            Long numId = Long.parseLong(id);
            return ResponseEntity.ok(studentService.getStudentById(numId));
        } catch (NumberFormatException e) {
            return ResponseEntity.ok(studentService.getStudentByRoll(id));
        }
    }

    @GetMapping("/section/{sectionId}")
    public ResponseEntity<List<StudentDto>> getStudentsBySection(@PathVariable String sectionId) {
        return ResponseEntity.ok(studentService.getStudentsBySection(sectionId));
    }

    @PostMapping
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<StudentDto> createStudent(@Valid @RequestBody CreateStudentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(studentService.createStudent(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<StudentDto> updateStudent(@PathVariable Long id, @RequestBody UpdateStudentRequest request) {
        return ResponseEntity.ok(studentService.updateStudent(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<Void> deleteStudent(@PathVariable Long id) {
        studentService.deleteStudent(id);
        return ResponseEntity.noContent().build();
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/controller/SubjectController.java
// ============================================================
package com.attendance.controller;

import com.attendance.dto.CourseDto;
import com.attendance.service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    @GetMapping("/{id}")
    public ResponseEntity<CourseDto> getSubjectById(@PathVariable String id) {
        try {
            Long numId = Long.parseLong(id);
            return ResponseEntity.ok(courseService.getSubjectById(numId));
        } catch (NumberFormatException e) {
            return ResponseEntity.ok(courseService.getSubjectByCode(id));
        }
    }

    @GetMapping("/scheme/{schemeId}")
    public ResponseEntity<Map<String, Object>> getSchemeDetails(@PathVariable String schemeId) {
        return ResponseEntity.ok(courseService.getScheme(schemeId));
    }
}


// ============================================================
// FILE: src/main/java/com/attendance/controller/TimetableController.java
// ============================================================
package com.attendance.controller;

import com.attendance.dto.ActiveSlotDto;
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

    @GetMapping("/section/{sectionId}")
    public ResponseEntity<List<TimetableDto>> getTimetableBySection(@PathVariable String sectionId) {
        try {
            Long secId = Long.parseLong(sectionId);
            return ResponseEntity.ok(timetableService.getTimetableBySectionId(secId));
        } catch (NumberFormatException e) {
            return ResponseEntity.ok(timetableService.getTimetable(sectionId));
        }
    }

    @GetMapping("/faculty/{facultyId}")
    public ResponseEntity<List<TimetableDto>> getTimetableForFaculty(@PathVariable Long facultyId) {
        return ResponseEntity.ok(timetableService.getTimetableByFaculty(facultyId));
    }

    @GetMapping("/active-slot")
    public ResponseEntity<ActiveSlotDto> getActiveSlot() {
        return ResponseEntity.ok(timetableService.getActiveSlot());
    }
}

