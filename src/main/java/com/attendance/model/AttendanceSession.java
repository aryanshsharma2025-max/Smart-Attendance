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
