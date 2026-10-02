package com.attendance.repository;

import com.attendance.model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface CourseRepository extends JpaRepository<Course, Long> {
    Optional<Course> findByCourseCodeShort(String shortCode);
    List<Course> findByIsPrimaryTrue();
}
