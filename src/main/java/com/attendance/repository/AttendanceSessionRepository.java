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
