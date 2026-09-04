package com.attendance.repository;

import com.attendance.model.Faculty;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface FacultyRepository extends JpaRepository<Faculty, Long> {
    Optional<Faculty> findByFacultyCode(String facultyCode);
    Optional<Faculty> findByEmail(String email);
    List<Faculty> findByRole(Faculty.FacultyRole role);
}
