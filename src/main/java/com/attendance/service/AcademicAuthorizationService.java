package com.attendance.service;

import com.attendance.exception.ResourceNotFoundException;
import com.attendance.exception.UnauthorizedActionException;
import com.attendance.model.*;
import com.attendance.repository.*;
import com.attendance.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AcademicAuthorizationService {

    private final StudentRepository studentRepository;
    private final SectionRepository sectionRepository;
    private final CourseAllocationRepository allocationRepository;
    private final AttendanceSessionRepository sessionRepository;

    @Transactional(readOnly = true)
    public void checkStudentAccess(UserPrincipal principal, Long studentId) {
        if (principal == null) {
            throw new UnauthorizedActionException("401 Unauthorized: Authentication required");
        }

        String role = principal.getRole();
        if ("HOD".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role)) {
            return;
        }

        if ("STUDENT".equalsIgnoreCase(role)) {
            if (principal.getStudentId() == null || !principal.getStudentId().equals(studentId)) {
                throw new AccessDeniedException("403 Forbidden: Students are restricted from accessing records of other students");
            }
            return;
        }

        if ("FACULTY".equalsIgnoreCase(role)) {
            Long facId = principal.getFacultyId();
            if (facId == null) {
                throw new AccessDeniedException("403 Forbidden: Faculty identity not mapped");
            }

            Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId));

            Long studentSectionId = student.getSection() != null ? student.getSection().getSectionId() : null;
            if (studentSectionId == null) {
                throw new AccessDeniedException("403 Forbidden: Student has no assigned section");
            }

            boolean allocated = allocationRepository.findByFacultyFacultyId(facId).stream()
                .anyMatch(a -> a.getStatus() == CourseAllocation.AllocationStatus.CONFIRMED &&
                               a.getSection().getSectionId().equals(studentSectionId));

            if (!allocated) {
                throw new AccessDeniedException("403 Forbidden: Faculty " + facId + " is not allocated to Section " + student.getSection().getSectionName());
            }
            return;
        }

        throw new AccessDeniedException("403 Forbidden: Unauthorized role " + role);
    }

    @Transactional(readOnly = true)
    public void checkStudentAccessByRoll(UserPrincipal principal, String rollNumber) {
        if (principal == null) {
            throw new UnauthorizedActionException("401 Unauthorized: Authentication required");
        }

        String role = principal.getRole();
        if ("HOD".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role)) {
            return;
        }

        if ("STUDENT".equalsIgnoreCase(role)) {
            if (principal.getUsername() == null || !principal.getUsername().equalsIgnoreCase(rollNumber.trim())) {
                throw new AccessDeniedException("403 Forbidden: Students are restricted from accessing records of other students");
            }
            return;
        }

        if ("FACULTY".equalsIgnoreCase(role)) {
            Student student = studentRepository.findByRollNumber(rollNumber.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with Roll: " + rollNumber));
            checkStudentAccess(principal, student.getStudentId());
            return;
        }

        throw new AccessDeniedException("403 Forbidden: Unauthorized role " + role);
    }

    @Transactional(readOnly = true)
    public void checkSectionAccess(UserPrincipal principal, String sectionParam) {
        if (principal == null) {
            throw new UnauthorizedActionException("401 Unauthorized: Authentication required");
        }

        String role = principal.getRole();
        if ("HOD".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role)) {
            return;
        }

        if ("STUDENT".equalsIgnoreCase(role)) {
            throw new AccessDeniedException("403 Forbidden: Students cannot access section rosters or summaries");
        }

        if ("FACULTY".equalsIgnoreCase(role)) {
            Long facId = principal.getFacultyId();
            if (facId == null) {
                throw new AccessDeniedException("403 Forbidden: Faculty identity not mapped");
            }

            Section section = null;
            try {
                Long secId = Long.parseLong(sectionParam);
                section = sectionRepository.findById(secId).orElse(null);
            } catch (NumberFormatException e) {
                section = sectionRepository.findBySectionName(sectionParam.trim().toUpperCase()).orElse(null);
            }

            if (section == null) {
                throw new ResourceNotFoundException("Section not found: " + sectionParam);
            }

            Long targetSecId = section.getSectionId();
            boolean allocated = allocationRepository.findByFacultyFacultyId(facId).stream()
                .anyMatch(a -> a.getStatus() == CourseAllocation.AllocationStatus.CONFIRMED &&
                               a.getSection().getSectionId().equals(targetSecId));

            if (!allocated) {
                throw new AccessDeniedException("403 Forbidden: Faculty " + facId + " is not allocated to Section " + section.getSectionName());
            }
            return;
        }

        throw new AccessDeniedException("403 Forbidden: Unauthorized role " + role);
    }

    @Transactional(readOnly = true)
    public void checkSessionAccess(UserPrincipal principal, Long sessionId) {
        if (principal == null) {
            throw new UnauthorizedActionException("401 Unauthorized: Authentication required");
        }

        String role = principal.getRole();
        if ("HOD".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role)) {
            return;
        }

        if ("STUDENT".equalsIgnoreCase(role)) {
            throw new AccessDeniedException("403 Forbidden: Students cannot access session attendance records");
        }

        if ("FACULTY".equalsIgnoreCase(role)) {
            Long facId = principal.getFacultyId();
            if (facId == null) {
                throw new AccessDeniedException("403 Forbidden: Faculty identity not mapped");
            }

            AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

            boolean isOwner = session.getFaculty() != null && facId.equals(session.getFaculty().getFacultyId());
            boolean isAllocated = allocationRepository.findByFacultyFacultyIdAndCourseCourseIdAndSectionSectionId(
                facId, session.getCourse().getCourseId(), session.getSection().getSectionId()
            ).map(a -> a.getStatus() == CourseAllocation.AllocationStatus.CONFIRMED).orElse(false);

            if (!isOwner && !isAllocated) {
                throw new AccessDeniedException("403 Forbidden: Faculty " + facId + " is not authorized for session " + sessionId);
            }
            return;
        }

        throw new AccessDeniedException("403 Forbidden: Unauthorized role " + role);
    }

    @Transactional(readOnly = true)
    public void checkFacultySessionsAccess(UserPrincipal principal, Long targetFacultyId) {
        if (principal == null) {
            throw new UnauthorizedActionException("401 Unauthorized: Authentication required");
        }

        String role = principal.getRole();
        if ("HOD".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role)) {
            return;
        }

        if ("STUDENT".equalsIgnoreCase(role)) {
            throw new AccessDeniedException("403 Forbidden: Students cannot access faculty session telemetry");
        }

        if ("FACULTY".equalsIgnoreCase(role)) {
            if (principal.getFacultyId() == null || !principal.getFacultyId().equals(targetFacultyId)) {
                throw new AccessDeniedException("403 Forbidden: Faculty can only view their own sessions");
            }
            return;
        }

        throw new AccessDeniedException("403 Forbidden: Unauthorized role " + role);
    }

    @Transactional(readOnly = true)
    public void checkAllStudentsAccess(UserPrincipal principal, String sectionParam) {
        if (principal == null) {
            throw new UnauthorizedActionException("401 Unauthorized: Authentication required");
        }

        String role = principal.getRole();
        if ("HOD".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role)) {
            return;
        }

        if ("STUDENT".equalsIgnoreCase(role)) {
            throw new AccessDeniedException("403 Forbidden: Students cannot access student directories");
        }

        if ("FACULTY".equalsIgnoreCase(role)) {
            if (sectionParam != null && !sectionParam.isBlank()) {
                checkSectionAccess(principal, sectionParam);
            }
            return;
        }

        throw new AccessDeniedException("403 Forbidden: Unauthorized role " + role);
    }
}
