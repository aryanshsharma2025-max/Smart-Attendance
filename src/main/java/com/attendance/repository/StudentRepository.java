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
