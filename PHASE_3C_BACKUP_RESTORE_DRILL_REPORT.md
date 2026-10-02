# SYNAPSE PHASE 3C: BACKUP RESTORE & DISASTER RECOVERY DRILL REPORT
**Authoritative Disaster Recovery Verification Report**  
**Date:** October 2, 2026  
**System Target:** Synapse Smart Attendance Management System  
**Canonical Stack:** Spring Boot 3.3.3 + MySQL 8.4 Community Server + Spring Security (JWT)  
**Execution Environment:** Windows 11 (PowerShell 5.1 / 7)  
**Drill Objective:** Disaster recovery validation proving logical, structural, constraint, and data equivalence upon restoring a Phase 3B backup into a disposable test database.  
**Phase Status:** **PASS (ALL DRILL OBJECTIVES SATISFIED)**

---

## 1. EXECUTIVE SUMMARY

Phase 3C conducted a complete, controlled disaster-recovery restoration drill for the Synapse Smart Attendance database. The verified backup generated during Phase 3B was restored into a newly initialized, disposable target database (`attendance_test_db`). 

### Core Findings & Outcomes:
1. **Pre-Restoration Checksum Validation**: The backup archive's SHA-256 hash was calculated and verified against the companion `.sha256` and `.json` sidecars prior to executing the restore.
2. **Clean Restoration**: The SQL dump imported in **727 milliseconds** with exit code 0 and zero errors/warnings.
3. **100% Structural Equivalence**: All 10 tables, 2 analytical views, primary keys, foreign keys, unique constraints, and the stored generated column (`active_marker`) restored identically.
4. **100% Data Fidelity**: All 10 table row counts matched `attendance_staging_db` with zero variance (including 252 students, 13 faculty, 8 attendance sessions, and 300 attendance records).
5. **Deterministic Transaction Integrity**: Cryptographic SHA-256 hashes computed across all historical attendance sessions and attendance records matched byte-for-byte between staging and restored databases (`38c10b4235...` and `9acb853661...`). Anti-joins in both directions returned zero missing rows.
6. **Constraint & View Validation**: Verified that analytical views (`vw_section_live_attendance`, `vw_student_live_attendance`) compile and execute accurately. Executed negative tests confirming that restored constraints (`uq_session_student`, `uq_active_recording`, foreign keys) reject invalid transactions.
7. **Strict Source Database Safety**: `attendance_staging_db` and `attendance_db` remained completely untouched and isolated throughout all operations.
8. **Teardown**: The disposable database `attendance_test_db` was cleanly dropped following evidence capture. Application regression tests (`mvn test`) passed with 5/5 tests and 0 errors.

---

## 2. SOURCE DATABASE

* **Database Name:** `attendance_staging_db`
* **Storage Engine:** MySQL 8.4 InnoDB (`utf8mb4_0900_ai_ci`)
* **Role:** Authoritative staging environment containing historical pilot attendance data (Gate 1 / Phase 1 / Phase 1.1 records).
* **Pre-Drill Table Counts:**
  - `departments`: 1
  - `sections`: 4
  - `faculty`: 13
  - `courses`: 14
  - `course_allocations`: 10
  - `students`: 252
  - `timetable_entries`: 80
  - `users`: 258
  - `attendance_sessions`: 8
  - `attendance_records`: 300

---

## 3. BACKUP ARTIFACT USED

* **SQL Dump File:** `D:\backups\synapse\synapse_backup_attendance_staging_db_20261002_182414.sql`
* **File Size:** 109,172 bytes (106.61 KB)
* **Metadata Sidecar:** `D:\backups\synapse\synapse_backup_attendance_staging_db_20261002_182414.json`
* **Checksum File:** `D:\backups\synapse\synapse_backup_attendance_staging_db_20261002_182414.sql.sha256`
* **Backup Provenance:** Generated during Phase 3B using `backup_synapse.ps1` with `--single-transaction`, `--quick`, `--default-character-set=utf8mb4`, `--routines`, `--triggers`, `--events`.

---

## 4. CHECKSUM VERIFICATION (PRE-RESTORATION)

In accordance with disaster-recovery safety rules, the backup archive was cryptographically validated before executing any restore operation:

| Checksum Source | Value | Match Result |
| :--- | :--- | :--- |
| **Real File Hash (SHA-256)** | `d5876186e267a53fd1777a7eced7a683863a01e79dcf04db224d8031c4c38104` | **BASE** |
| **`.sha256` File Content** | `d5876186e267a53fd1777a7eced7a683863a01e79dcf04db224d8031c4c38104` | **PASS (EXACT)** |
| **JSON Metadata (`sha256`)** | `d5876186e267a53fd1777a7eced7a683863a01e79dcf04db224d8031c4c38104` | **PASS (EXACT)** |
| **JSON Execution Status** | `SUCCESS` | **PASS** |

The backup archive was verified as uncorrupted and authentic.

---

## 5. RESTORE TARGET

* **Target Database:** `attendance_test_db`
* **Target Role:** Completely disposable sandbox created strictly for Phase 3C drill execution.
* **Pre-Restoration State:** Created via `CREATE DATABASE attendance_test_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`. Verified table count = 0.
* **Safety Isolation:** Zero commands targeted `attendance_staging_db` or `attendance_db`.

---

## 6. RESTORE COMMAND

The restoration was performed using the native MySQL 8.4 command-line client via process redirection with execution-scoped credentials:

```cmd
mysql.exe \
  --host=127.0.0.1 \
  --port=3306 \
  -u root \
  --default-character-set=utf8mb4 \
  attendance_test_db < "D:\backups\synapse\synapse_backup_attendance_staging_db_20261002_182414.sql"
```

---

## 7. RESTORE RESULT

* **Exit Code:** `0`
* **Restoration Duration:** **727 milliseconds**
* **Standard Output:** Empty (clean execution)
* **Standard Error:** Empty (zero errors, zero warnings)
* **Execution Status:** **SUCCESSFUL RESTORATION**

---

## 8. STRUCTURAL VERIFICATION

An inspection of `information_schema` and `SHOW CREATE TABLE` against `attendance_test_db` confirmed that all database objects were created with identical DDL definitions:

### 8.1 Base Tables (10 Tables)
1. `departments` (Engine: InnoDB, PK: `dept_id`, Unique: `dept_code`)
2. `sections` (Engine: InnoDB, PK: `section_id`, FK: `dept_id`, Unique: `uq_dept_section`)
3. `faculty` (Engine: InnoDB, PK: `faculty_id`, FK: `dept_id`, Unique: `faculty_code`, `email`)
4. `courses` (Engine: InnoDB, PK: `course_id`, FK: `dept_id`, Unique: `course_code_short`, Column: `is_primary`)
5. `course_allocations` (Engine: InnoDB, PK: `allocation_id`, FKs: `faculty_id`, `course_id`, `section_id`, Unique: `uq_fac_course_sec`)
6. `students` (Engine: InnoDB, PK: `student_id`, FKs: `dept_id`, `section_id`, Unique: `roll_number`, `rfid_uid`, `email`)
7. `timetable_entries` (Engine: InnoDB, PK: `entry_id`, FKs: `section_id`, `course_id`, `faculty_id`, Unique: `timetable_code`)
8. `users` (Engine: InnoDB, PK: `user_id`, FKs: `faculty_id`, `student_id`, Unique: `username`, `faculty_id`, `student_id`)
9. `attendance_sessions` (Engine: InnoDB, PK: `session_id`, FKs: `course_id`, `faculty_id`, `section_id`, `timetable_entry_id`)
10. `attendance_records` (Engine: InnoDB, PK: `record_id`, FKs: `session_id`, `student_id`)

### 8.2 Views (2 Views)
1. `vw_section_live_attendance` (Aggregated section live attendance metrics)
2. `vw_student_live_attendance` (Individual student course attendance metrics)

### 8.3 Constraints, Indexes & Generated Columns
* **Stored Generated Column:** `active_marker varchar(10) GENERATED ALWAYS AS (if((status = _utf8mb4'RECORDING'),_cp850'ACTIVE',NULL)) STORED` — **Restored and Active**.
* **Unique Key `uq_active_recording`:** (`faculty_id`, `course_id`, `section_id`, `session_date`, `active_marker`) — **Restored and Active**.
* **Unique Key `uq_session_lecture`:** (`course_id`, `section_id`, `lecture_number`) — **Restored and Active**.
* **Unique Key `uq_session_student`:** (`session_id`, `student_id`) — **Restored and Active**.
* **Foreign Keys:** All 14 foreign key constraints with `ON DELETE CASCADE` and `ON DELETE SET NULL` cascades restored.

---

## 9. ROW COUNT COMPARISON

Direct table-by-table row count audit comparing `attendance_staging_db` against restored `attendance_test_db`:

| Table Name | Source (`attendance_staging_db`) | Restored (`attendance_test_db`) | Delta | Verdict |
| :--- | :---: | :---: | :---: | :---: |
| `departments` | 1 | 1 | 0 | **PASS** |
| `sections` | 4 | 4 | 0 | **PASS** |
| `faculty` | 13 | 13 | 0 | **PASS** |
| `courses` | 14 | 14 | 0 | **PASS** |
| `course_allocations` | 10 | 10 | 0 | **PASS** |
| `students` | 252 | 252 | 0 | **PASS** |
| `timetable_entries` | 80 | 80 | 0 | **PASS** |
| `users` | 258 | 258 | 0 | **PASS** |
| `attendance_sessions` | 8 | 8 | 0 | **PASS** |
| `attendance_records` | 300 | 300 | 0 | **PASS** |

Total Database Records: **940 / 940 (100.0% Exact Match)**.

---

## 10. ATTENDANCE HISTORY COMPARISON

Every session and associated attendance mark distribution was audited across both databases:

| Session ID | Course ID | Faculty ID | Section ID | Lecture No | Session Date | Status | Active Marker | Total Marks | Present | Absent | Match |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | 4 (WT) | 4 (Suman) | 1 (A) | 1 | 2026-09-10 | COMPLETED | NULL | 60 | 60 | 0 | **EXACT** |
| **2** | 4 (WT) | 4 (Suman) | 1 (A) | 2 | 2026-09-10 | COMPLETED | NULL | 60 | 50 | 10 | **EXACT** |
| **3** | 4 (WT) | 4 (Suman) | 1 (A) | 3 | 2026-09-25 | COMPLETED | NULL | 60 | 58 | 2 | **EXACT** |
| **4** | 4 (WT) | 4 (Suman) | 1 (A) | 4 | 2026-09-25 | COMPLETED | NULL | 60 | 58 | 2 | **EXACT** |
| **7** | 1 (OS) | 1 (Devbrat)| 2 (B) | 1 | 2026-09-25 | RECORDING | ACTIVE | 0 | 0 | 0 | **EXACT** |
| **9** | 5 (DELD)| 5 (Navdeep)| 2 (B) | 1 | 2026-09-25 | RECORDING | ACTIVE | 0 | 0 | 0 | **EXACT** |
| **11**| 4 (WT) | 4 (Suman) | 1 (A) | 5 | 2026-09-25 | COMPLETED | NULL | 60 | 58 | 2 | **EXACT** |
| **12**| 4 (WT) | 4 (Suman) | 1 (A) | 6 | 2026-09-25 | RECORDING | ACTIVE | 0 | 0 | 0 | **EXACT** |

Every session ID, course, section, lecture number, timestamp, present/absent tally, and recording status restored with zero variance.

---

## 11. DATA INTEGRITY COMPARISON (CRYPTOGRAPHIC HASHES)

Beyond row counts, deterministic SHA-256 hashes of the concatenated primary-key-ordered rows were computed inside the database engine:

| Dataset | Canonical SHA-256 in Staging | Canonical SHA-256 in Restored Test DB | Verdict |
| :--- | :--- | :--- | :---: |
| `attendance_sessions` | `38c10b4235a3d9e2d80a3aefa4442a300c827a324b082dcc76f255c44eb6c1b4` | `38c10b4235a3d9e2d80a3aefa4442a300c827a324b082dcc76f255c44eb6c1b4` | **IDENTICAL** |
| `attendance_records` | `9acb85366160fbb09de60f508681654a765cf4dbcd33bb8a735546e253c2ccf0` | `9acb85366160fbb09de60f508681654a765cf4dbcd33bb8a735546e253c2ccf0` | **IDENTICAL** |

### Anti-Join Validation:
* `attendance_sessions` in staging missing from test DB: **0**
* `attendance_records` in staging missing from test DB: **0**

---

## 12. VIEW VERIFICATION

Representative analytical queries were executed against the restored views in `attendance_test_db`:

1. **`vw_section_live_attendance`**:
   - Query: `SELECT * FROM vw_section_live_attendance WHERE section_name='A' AND course_code_short='WT';`
   - Output: `completed_sessions = 5`, `total_marks = 300`, `total_present = 284`, `section_avg_pct = 94.67%`.
   - Result: **Compiled and executed successfully with mathematically accurate aggregated results.**
2. **`vw_student_live_attendance`**:
   - Query: `SELECT * FROM vw_student_live_attendance WHERE roll_number='303302225001' AND course_code_short='WT';`
   - Output: `completed_sessions = 5`, `attended_sessions = 2`, `attendance_pct = 40.00%`.
   - Result: **Compiled and executed successfully with accurate student-level attendance percentage.**

---

## 13. CONSTRAINT VERIFICATION (NEGATIVE TESTING)

Three controlled negative tests were executed strictly against `attendance_test_db` to prove that relational and business rules survived restoration:

| Negative Test Case | Attempted SQL Operation | Restored Constraint Triggered | MySQL Error Code | Result |
| :--- | :--- | :--- | :--- | :---: |
| **1. Duplicate Attendance Record** | `INSERT INTO attendance_records (session_id, student_id, status) VALUES (1, 1, 'PRESENT')` | `uq_session_student` | `ERROR 1062 (23000): Duplicate entry '1-1'` | **PASS (REJECTED)** |
| **2. Duplicate Active Session** | `INSERT INTO attendance_sessions (course_id, faculty_id, section_id, semester, session_date, lecture_number, status) VALUES (1, 1, 2, 3, '2026-09-25', 99, 'RECORDING')` | `uq_active_recording` via `active_marker` | `ERROR 1062 (23000): Duplicate entry '1-1-2-2026-09-25-ACTIVE'` | **PASS (REJECTED)** |
| **3. Invalid Foreign Key Reference** | `INSERT INTO attendance_records (session_id, student_id, status) VALUES (999999, 1, 'PRESENT')` | `attendance_records_ibfk_1` | `ERROR 1452 (23000): Cannot add or update a child row: a foreign key constraint fails` | **PASS (REJECTED)** |

**Conclusion:** All database constraints, foreign keys, unique indexes, and generated columns actively guard data integrity in the restored environment.

---

## 14. APPLICATION COMPATIBILITY

To verify that the restored database is immediately usable by the Spring Boot backend without modifying application code, the exact SQL statements generated by Spring Data JPA repositories were executed against `attendance_test_db`:

1. **Authentication Lookup (`UserRepository.findByUsername`)**:
   - Query: `SELECT user_id, username, role, is_active FROM users WHERE username = 'faculty_os';`
   - Output: `user_id = 2`, `role = FACULTY`, `is_active = 1`.
2. **Faculty Profile Resolution (`FacultyRepository.findByFacultyCode`)**:
   - Query: `SELECT faculty_id, faculty_code, name, email, role, designation FROM faculty WHERE faculty_code = 'faculty_os';`
   - Output: `faculty_id = 1`, `Devbrat Sahu`, `devbrat.sahu@ssipmt.com`, `Assistant Professor`.
3. **Session History Query (`AttendanceSessionRepository.findByFacultyFacultyIdOrderBySessionDateDesc`)**:
   - Output: Retrieved all conducted sessions for faculty 4 in exact chronological order.
4. **Max Lecture Scoping (`AttendanceSessionRepository.findMaxLectureNumber`)**:
   - Output: Calculated `max_lecture = 6` for Course 4 in Section A.
5. **Roster Marks Fetch (`AttendanceRecordRepository.findBySessionSessionId`)**:
   - Output: Retrieved 60 marks (60 present) for session 1.

**Compatibility Verdict:** **100% Compatible**. The schema, column types, and data models match the JPA entities with zero adjustments required.

---

## 15. SOURCE DATABASE BEFORE / AFTER STATE

Direct audit of `attendance_staging_db` before and after all Phase 3C drill operations:

| Table | Count Before Drill | Count After Drill | Delta | Status |
| :--- | :---: | :---: | :---: | :---: |
| `departments` | 1 | 1 | 0 | **Untouched** |
| `sections` | 4 | 4 | 0 | **Untouched** |
| `faculty` | 13 | 13 | 0 | **Untouched** |
| `courses` | 14 | 14 | 0 | **Untouched** |
| `course_allocations` | 10 | 10 | 0 | **Untouched** |
| `students` | 252 | 252 | 0 | **Untouched** |
| `timetable_entries` | 80 | 80 | 0 | **Untouched** |
| `users` | 258 | 258 | 0 | **Untouched** |
| `attendance_sessions` | 8 | 8 | 0 | **Untouched** |
| `attendance_records` | 300 | 300 | 0 | **Untouched** |

* `attendance_db` row counts: `sessions = 0`, `records = 0` (Clean).
* `attendance_staging_db` row counts: `sessions = 8`, `records = 300` (Intact).

---

## 16. CLEANUP RESULT

Following evidence capture:
* `DROP DATABASE IF EXISTS attendance_test_db;` executed successfully.
* Verified `SHOW DATABASES`: Only `attendance_db` and `attendance_staging_db` remain on the MySQL instance.
* Zero temporary test databases or dangling tables were left on the host.
* Production backup archives and checksums in `D:\backups\synapse\` were preserved.

---

## 17. DISASTER RECOVERY FINDINGS

Answers to the 7 core disaster recovery assessment questions:

1. **Can the backup reconstruct the database?**  
   **YES (VERIFIED).** The `.sql` archive reconstructed all 10 tables, 2 views, foreign keys, and stored generated columns in 727 ms.
2. **Can attendance history be recovered?**  
   **YES (VERIFIED).** All 8 sessions and 300 attendance records were fully restored, verified by cryptographic hash matching.
3. **Are constraints preserved?**  
   **YES (VERIFIED).** Negative testing confirmed that duplicate session-student records, duplicate active recording sessions, and invalid foreign keys are strictly blocked.
4. **Are views preserved?**  
   **YES (VERIFIED).** Analytical views compiled and executed with accurate calculations.
5. **Is application connectivity possible?**  
   **YES (VERIFIED).** All Spring Data JPA entity queries executed against the restored schema without modification.
6. **What parts of recovery remain manual?**  
   Service shutdown, issuing the `mysql.exe < backup.sql` restore command, and service restart currently require administrator initiation.
7. **What is still required for protection against physical disk failure?**  
   Off-machine or cloud-isolated backup replication (copying `D:\backups\synapse\` to a separate physical drive or network share).

---

## 18. STRICT TERMINOLOGY CLASSIFICATIONS

### IMPLEMENTED:
* `scripts/backup_synapse.ps1`: Automated backup engine generating timestamped dumps, SHA-256 hashes, and metadata.
* `scripts/verify_backup_script.ps1`: Automated 14-point backup verification test harness.
* Verified backup archive: `D:\backups\synapse\synapse_backup_attendance_staging_db_20261002_182414.sql`.

### VERIFIED:
* Pre-restore SHA-256 validation against `.sha256` and `.json` sidecars (`d5876186e267a53fd1777a7eced7a683863a01e79dcf04db224d8031c4c38104`).
* Complete database restoration in 727 ms into `attendance_test_db` with zero errors.
* Exact row count equivalence across all 10 tables (940 total records).
* Cryptographic hash equivalence of attendance sessions and records datasets.
* View compilation and query execution for `vw_section_live_attendance` and `vw_student_live_attendance`.
* Active enforcement of restored constraints (`uq_session_student`, `uq_active_recording`, `active_marker`, FKs).
* Application JPA query compatibility.
* Source database safety (`attendance_staging_db` untouched at 8/300).
* Clean teardown of disposable database `attendance_test_db`.
* Application regression suite passing (`mvn test` 5/5 passed).

### NOT VERIFIED:
* Bare-metal hardware recovery following catastrophic physical drive destruction (requires off-machine infrastructure).
* High-volume restoration scaling under 100,000+ attendance records (to be evaluated as term data accumulates).

### UNKNOWN:
* Time to restore under heavy network-attached storage latency if backups are mounted over SMB/NFS.

---

## 19. REMAINING RISKS

1. **Host-Drive Colocation (Risk: Medium):** Backups currently reside on local volume `D:\backups\synapse\`. If physical disk `D:` fails, both active data and backups would be lost. Scheduled replication to an off-machine storage target is recommended prior to campus-wide rollout.
2. **Point-in-Time Recovery Operationalization (Risk: Low):** While binary logging is active (`log_bin = ON`), automated log purging and incremental replay procedures have not yet been scripted into an automated tool.

---

## 20. PHASE 3C GATE DECISION

### **GATE DECISION: PASS (DISASTER RECOVERY FULLY VERIFIED)**
* Verified backup successfully restored to disposable test database with zero errors.
* Structural, constraint, view, and data equivalence verified 100%.
* Negative constraint tests passed (all illegal operations blocked).
* Staging database safety verified (100% untouched).
* Cleanup completed; regression tests passed (`mvn test` 5/5).
* **Synapse is disaster-recovery certified for live faculty testing.**
