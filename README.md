# Smart Attendance Management System

**Academic Baseline:** B.Tech Computer Science & Engineering · 3rd Semester · Academic Year 2026–27 (July–Dec 2026)  
**Institution:** Shri Shankaracharya Institute of Professional Management and Technology (SSIPMT), Raipur  
**Affiliation:** Chhattisgarh Swami Vivekanand Technical University (CSVTU), Bhilai  

---

## 🏛️ Canonical Backend Architecture

The canonical production backend of the Smart Attendance Management System is built strictly with:

- **Language & Framework:** Java 17 + Spring Boot 3.3.3
- **Data Persistence:** Spring Data JPA + Hibernate (Schema managed deterministically via `attendance_schema.sql`, `ddl-auto=none`)
- **Database Engine:** MySQL 8.0+ (`InnoDB`, `utf8mb4`)
- **Security & Identity:** Spring Security 6 + Stateless JWT Authentication (HMAC-SHA256)
- **Architecture Standard:** Layered Domain-Driven Design (Controllers, Services, Repositories, Entities, DTOs, Security Filters)

> **Architectural Decision:** An experimental Node.js/Express backend prototype was developed and has been safely committed and archived in Git branch `backup/experimental-node-backend`. The project does **not** maintain two production backends. The Java / Spring Boot + MySQL architecture is the sole authoritative backend.

---

## 📋 Academic Baseline & Core Guarantees

| Metric / Entity | Value | Notes |
| :--- | :--- | :--- |
| **Total Rostered Students** | **252** | Section A: 60 · Section B: 59 · Section C: 66 · Section D: 67 |
| **Teaching Faculty** | **5** | Devbrat Sahu (OS), Dr. Pranjali Sharma (DM), Mr. Vaibhav Chandrakar (OOPS), Dr. Suman Kumar Swarnkar (WT), Mr. Navdeep Khare (DELD) |
| **Head of Department (HOD)** | **Dr. Anand Tamrakar** | `role = 'HOD'`; 0 teaching allocations; administrative oversight only |
| **Primary Subjects** | **5** | Operating Systems (OS), Discrete Mathematics (DM), Object-Oriented Programming (OOPS), Web Technology (WT), Digital Electronics & Logic Design (DELD) |
| **Timetable Blocks** | **80** | Section A: 39 blocks · Section B: 41 blocks · Sections C & D: Pending CSVTU scheme rollout (0 blocks) |
| **Initial Production State** | **0 Sessions / 0 Records** | Live attendance sessions and records start at clean zero baseline |

---

## 🔐 Security, Roles & Authentication

All API endpoints (except authentication and public read discovery) are secured with stateless JWT Bearer tokens. Passwords are deterministically hashed using BCrypt.

### User Roles & Permissions
1. **`HOD` (Administrator)**
   - Full read/write access to student registry (CRUD).
   - Read-only analytics across all departments, sections, faculty, and sessions.
   - **Business Restriction:** Blocked from creating teaching sessions (0 teaching allocations).
2. **`FACULTY` (Teaching Staff)**
   - Can start attendance sessions **only** for courses and sections explicitly assigned via confirmed `course_allocations`.
   - Can submit attendance records for own active sessions.
   - Cannot modify student rosters or create sessions for other faculty.
3. **`STUDENT` (Enrolled Students)**
   - Read-only access to own attendance summary and historical lecture attendance.
   - Strictly forbidden from starting sessions, submitting attendance, or modifying records.

### Default Seed Credentials (Password: `demo123`)
- **HOD:** `hod_cse`
- **Faculty:** `faculty_os`, `faculty_dm`, `faculty_oops`, `faculty_wt`, `faculty_de`
- **Students:** Use University Roll Number (e.g., `3000124001`, `3000124002`, ...)

---

## 🌐 REST API Endpoints Specification

### 1. Authentication (`/api/auth`)
- `POST /api/auth/login` — Authenticate username & password, returns JWT token + user profile.
- `POST /api/auth/register` — Register new user account (Admin/HOD).
- `GET /api/auth/me` — Retrieve profile of currently authenticated user.

### 2. Students (`/api/students`)
- `GET /api/students` — Retrieve roster (optional query param: `?section=A`).
- `GET /api/students/{id}` — Lookup student by numeric ID or roll number.
- `GET /api/students/section/{sectionId}` — Retrieve all students in a section.
- `POST /api/students` — [HOD Only] Add new student to roster.
- `PUT /api/students/{id}` — [HOD Only] Update student details.
- `DELETE /api/students/{id}` — [HOD Only] Delete student.

### 3. Faculty (`/api/faculty`)
- `GET /api/faculty` — List all department faculty.
- `GET /api/faculty/{id}` — Get faculty details by ID or code.
- `GET /api/faculty/{id}/allocations` — Get confirmed course allocations for faculty.

### 4. Subjects & Curriculum (`/api/subjects`)
- `GET /api/subjects` — List all courses (query param: `?primaryOnly=true`).
- `GET /api/subjects/{id}` — Get course details by ID or short code.
- `GET /api/subjects/scheme/{schemeId}` — Get CSVTU-2024 semester 3 scheme metadata.

### 5. Timetable (`/api/timetable`)
- `GET /api/timetable` — Get timetable entries (optional `?section=A`).
- `GET /api/timetable/section/{sectionId}` — Get timetable entries for section.
- `GET /api/timetable/faculty/{facultyId}` — Get timetable for faculty member.
- `GET /api/timetable/active-slot` — Get currently active timetable slot.

### 6. Sessions (`/api/sessions`)
- `POST /api/sessions/start` or `POST /api/sessions` — [FACULTY Only] Start attendance session in `RECORDING` state. Validates confirmed allocation.
- `POST /api/sessions/{id}/submit` or `POST /api/sessions/{id}/attendance` — [FACULTY Only] Atomically submit attendance roster and mark session `COMPLETED`.
- `GET /api/sessions/{id}` — Get session status and metrics.
- `GET /api/sessions/{id}/records` — Get student attendance list for a session.
- `GET /api/sessions/active` — List all sessions currently in `RECORDING` state.
- `GET /api/sessions/faculty/{facultyId}` — List historical sessions by faculty.

### 7. Attendance Analytics (`/api/attendance`)
- `GET /api/attendance/summary/student/{studentId}` — Get student attendance summary (completed sessions only).
- `GET /api/attendance/summary/section/{sectionId}` — Get section-level subject attendance statistics.
- `GET /api/attendance/history/student/{studentId}` — Get detailed lecture-by-lecture history.

---

## 🛠️ Timetable Conflict & Business Rules

1. **Slot `tt-b-wed-55` (Anand Sir Conflict Resolution):**  
   The authoritative timetable includes Dr. Anand Tamrakar on Wednesday Period III–IV (`OS-LAB`). The timetable query returns this slot as published. However, because Dr. Anand Tamrakar has **0 course allocations** in the database and holds role `HOD`, any attempt to start an attendance session under his credentials triggers a **`403 Forbidden`** rejection.
2. **Sections C & D Status:**  
   Sections C (66 students) and D (67 students) are fully rostered and have student user accounts. Their timetable and course allocations are marked **`Pending CSVTU Scheme Rollout`**, returning 0 slots and blocking session creation until scheme rollout is complete.
3. **Session Atomicity & Integrity:**  
   All attendance submissions require full section roster accounting, reject alien students, enforce unique student marks, and transition session state from `RECORDING` to `COMPLETED` within a single database transaction.

---

## 🚀 Setup & Execution

### 1. Database Initialization
```bash
# Log in to MySQL
mysql -u root -p

# Execute canonical schema and deterministic seed data
mysql -u root -p < attendance_schema.sql
```

### 2. Configure Environment
Copy `.env.example` to configure database credentials and JWT secret:
```bash
cp .env.example .env
```

### 3. Run Spring Boot Backend
Using standard Apache Maven:
```bash
# Build the project
mvn clean package -DskipTests

# Run the Spring Boot application
mvn spring-boot:run
```

---

## 🧪 Verification & Test Suites

The repository contains automated, zero-external-dependency test harnesses executing against in-memory relational databases with foreign key and transaction constraints:

```bash
# Run Phase 7A Foundation & Contract Verification (19 Tests)
python scripts/test_phase7a_verification.py

# Run Phase 7B Full Verification & Security Suite (30 Tests)
python scripts/test_phase7b_verification.py
```

Both verification suites run in < 2 seconds and verify 100% pass rates on schema integrity, BCrypt hashing, role-based authorization, scoped lecture numbering, atomic rollbacks, and session lifecycle.
