// ============================================================
//  SMART ATTENDANCE SYSTEM — Java Backend (Spring Boot)
//  File structure shown via comments; copy each section into
//  the corresponding file in your Maven/Gradle project.
// ============================================================

// ────────────────────────────────────────────────────────────
// pom.xml  (Maven dependencies — add inside <dependencies>)
// ────────────────────────────────────────────────────────────
/*
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
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
*/

// ────────────────────────────────────────────────────────────
// src/main/resources/application.properties
// ────────────────────────────────────────────────────────────
/*
spring.datasource.url=jdbc:mysql://localhost:3306/smart_attendance
spring.datasource.username=root
spring.datasource.password=your_password
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect

jwt.secret=SmartAttendance_SecretKey_2024!
jwt.expiration=86400000

server.port=8080
*/

// ============================================================
// FILE: src/main/java/com/attendance/AttendanceApplication.java
// ============================================================
package com.attendance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AttendanceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AttendanceApplication.class, args);
    }
}


// ============================================================
// FILE: model/Student.java
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
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long studentId;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String rollNumber;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(unique = true)
    private String rfidUid;

    private Integer fingerprintId;

    private Integer semester;

    private Integer enrolledYear;

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}


// ============================================================
// FILE: model/AttendanceRecord.java
// ============================================================
package com.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_records",
       uniqueConstraints = @UniqueConstraint(columnNames = {"session_id","student_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long recordId;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Enumerated(EnumType.STRING)
    private AttendanceStatus status = AttendanceStatus.PRESENT;

    @Enumerated(EnumType.STRING)
    private ScanMethod scanMethod = ScanMethod.RFID;

    private LocalDateTime scannedAt = LocalDateTime.now();

    public enum AttendanceStatus { PRESENT, ABSENT, LATE }
    public enum ScanMethod       { RFID, FINGERPRINT, MANUAL }
}


// ============================================================
// FILE: model/Session.java
// ============================================================
package com.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sessionId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "faculty_id", nullable = false)
    private Long facultyId;

    private LocalDate sessionDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String room;

    @Enumerated(EnumType.STRING)
    private SessionStatus status = SessionStatus.SCHEDULED;

    public enum SessionStatus { SCHEDULED, ACTIVE, COMPLETED, CANCELLED }
}


// ============================================================
// FILE: dto/RfidScanRequest.java  (DTO from Arduino/ESP8266)
// ============================================================
package com.attendance.dto;

import lombok.Data;

@Data
public class RfidScanRequest {
    private String rfidUid;
    private Long   sessionId;
    private String deviceMac;
}


// ============================================================
// FILE: dto/AttendanceResponse.java
// ============================================================
package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AttendanceResponse {
    private String  status;
    private String  message;
    private String  studentName;
    private String  rollNumber;
    private String  scannedAt;
}


// ============================================================
// FILE: repository/StudentRepository.java
// ============================================================
package com.attendance.repository;

import com.attendance.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByRfidUid(String rfidUid);
    Optional<Student> findByRollNumber(String rollNumber);
}


// ============================================================
// FILE: repository/AttendanceRepository.java
// ============================================================
package com.attendance.repository;

import com.attendance.model.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {

    Optional<AttendanceRecord> findBySessionIdAndStudentStudentId(Long sessionId, Long studentId);

    List<AttendanceRecord> findBySessionId(Long sessionId);

    @Query("""
        SELECT ar FROM AttendanceRecord ar
        WHERE ar.student.studentId = :studentId
        AND ar.sessionId IN (
            SELECT s.sessionId FROM Session s WHERE s.courseId = :courseId
        )
    """)
    List<AttendanceRecord> findByStudentAndCourse(
        @Param("studentId") Long studentId,
        @Param("courseId")  Long courseId
    );
}


// ============================================================
// FILE: service/AttendanceService.java
// ============================================================
package com.attendance.service;

import com.attendance.dto.*;
import com.attendance.model.*;
import com.attendance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final StudentRepository    studentRepo;
    private final AttendanceRepository attendanceRepo;

    // ── Called when ESP8266 POSTs an RFID scan ──────────────
    @Transactional
    public AttendanceResponse processRfidScan(RfidScanRequest req) {

        // 1. Find student by RFID UID
        Student student = studentRepo.findByRfidUid(req.getRfidUid())
            .orElse(null);

        if (student == null) {
            return new AttendanceResponse("ERROR", "Unknown RFID card", null, null,
                    LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        }

        // 2. Check for duplicate scan in this session
        boolean alreadyMarked = attendanceRepo
            .findBySessionIdAndStudentStudentId(req.getSessionId(), student.getStudentId())
            .isPresent();

        if (alreadyMarked) {
            return new AttendanceResponse(
                "DUPLICATE",
                "Already marked for this session",
                student.getName(),
                student.getRollNumber(),
                LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            );
        }

        // 3. Save attendance record
        AttendanceRecord record = new AttendanceRecord();
        record.setSessionId(req.getSessionId());
        record.setStudent(student);
        record.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);
        record.setScanMethod(AttendanceRecord.ScanMethod.RFID);
        record.setScannedAt(LocalDateTime.now());
        attendanceRepo.save(record);

        return new AttendanceResponse(
            "SUCCESS",
            "Attendance marked successfully",
            student.getName(),
            student.getRollNumber(),
            record.getScannedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );
    }

    // ── Get all records for a session (for live dashboard) ──
    public List<AttendanceRecord> getSessionAttendance(Long sessionId) {
        return attendanceRepo.findBySessionId(sessionId);
    }

    // ── Attendance % for a student in a course ───────────────
    public double getAttendancePercentage(Long studentId, Long courseId) {
        List<AttendanceRecord> records =
            attendanceRepo.findByStudentAndCourse(studentId, courseId);
        if (records.isEmpty()) return 0.0;
        long present = records.stream()
            .filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.PRESENT
                      || r.getStatus() == AttendanceRecord.AttendanceStatus.LATE)
            .count();
        return (present * 100.0) / records.size();
    }
}


// ============================================================
// FILE: controller/AttendanceController.java
// ============================================================
package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.model.AttendanceRecord;
import com.attendance.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "*")   // allow web dashboard to call
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    // POST /api/attendance/rfid  — called by ESP8266
    @PostMapping("/rfid")
    public ResponseEntity<AttendanceResponse> rfidScan(
            @RequestBody RfidScanRequest request) {
        AttendanceResponse resp = attendanceService.processRfidScan(request);
        return ResponseEntity.ok(resp);
    }

    // GET /api/attendance/session/{sessionId}
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<AttendanceRecord>> getBySession(
            @PathVariable Long sessionId) {
        return ResponseEntity.ok(
            attendanceService.getSessionAttendance(sessionId)
        );
    }

    // GET /api/attendance/percentage?studentId=1&courseId=2
    @GetMapping("/percentage")
    public ResponseEntity<Map<String, Object>> getPercentage(
            @RequestParam Long studentId,
            @RequestParam Long courseId) {
        double pct = attendanceService.getAttendancePercentage(studentId, courseId);
        return ResponseEntity.ok(Map.of(
            "studentId",  studentId,
            "courseId",   courseId,
            "percentage", String.format("%.2f%%", pct)
        ));
    }
}


// ============================================================
// FILE: controller/StudentController.java
// ============================================================
package com.attendance.controller;

import com.attendance.model.Student;
import com.attendance.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class StudentController {

    private final StudentRepository studentRepo;

    // GET all students
    @GetMapping
    public List<Student> getAll() {
        return studentRepo.findAll();
    }

    // GET student by ID
    @GetMapping("/{id}")
    public ResponseEntity<Student> getById(@PathVariable Long id) {
        return studentRepo.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // POST enroll new student
    @PostMapping
    public ResponseEntity<Student> create(@RequestBody Student student) {
        return ResponseEntity.ok(studentRepo.save(student));
    }

    // PUT update student RFID
    @PutMapping("/{id}/rfid")
    public ResponseEntity<Student> updateRfid(
            @PathVariable Long id,
            @RequestParam String rfidUid) {
        return studentRepo.findById(id).map(s -> {
            s.setRfidUid(rfidUid);
            return ResponseEntity.ok(studentRepo.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    // DELETE student
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        studentRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
