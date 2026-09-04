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
