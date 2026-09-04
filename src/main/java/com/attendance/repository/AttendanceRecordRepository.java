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
