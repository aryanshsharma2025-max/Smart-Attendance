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
