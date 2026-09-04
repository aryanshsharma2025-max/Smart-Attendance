package com.attendance.repository;

import com.attendance.model.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    Optional<Department> findByDeptCode(String deptCode);
}
