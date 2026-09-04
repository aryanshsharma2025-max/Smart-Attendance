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
