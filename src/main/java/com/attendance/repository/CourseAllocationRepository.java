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
