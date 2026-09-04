-- ============================================================
--  SMART ATTENDANCE SYSTEM — AUTHORITATIVE MYSQL DATABASE SCHEMA
--  Academic Target: B.Tech CSE · 3rd Semester · July-Dec 2026
--  Institution: SSIPMT Raipur | CSVTU Affiliated
--  Compatible with MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_attendance;
USE smart_attendance;

-- ------------------------------------------------------------
-- Drop Tables in Reverse Dependency Order
-- ------------------------------------------------------------
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS attendance_sessions;
DROP TABLE IF EXISTS timetable_entries;
DROP TABLE IF EXISTS course_allocations;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS faculty;
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS departments;

-- ------------------------------------------------------------
-- Table: departments
-- ------------------------------------------------------------
CREATE TABLE departments (
    dept_id     INT AUTO_INCREMENT PRIMARY KEY,
    dept_name   VARCHAR(100) NOT NULL,
    dept_code   VARCHAR(20)  NOT NULL UNIQUE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: sections
-- ------------------------------------------------------------
CREATE TABLE sections (
    section_id    INT AUTO_INCREMENT PRIMARY KEY,
    dept_id       INT NOT NULL,
    section_name  VARCHAR(10) NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_dept_section (dept_id, section_name),
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: faculty
-- ------------------------------------------------------------
CREATE TABLE faculty (
    faculty_id    INT AUTO_INCREMENT PRIMARY KEY,
    dept_id       INT NOT NULL,
    faculty_code  VARCHAR(50)  NOT NULL UNIQUE,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL DEFAULT '$2a$10$placeholder_hash',
    role          ENUM('faculty','hod','admin','staff') NOT NULL DEFAULT 'faculty',
    designation   VARCHAR(100) NOT NULL DEFAULT 'Assistant Professor',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: courses (Official Curriculum Modules)
-- ------------------------------------------------------------
CREATE TABLE courses (
    course_id            INT AUTO_INCREMENT PRIMARY KEY,
    dept_id              INT NOT NULL,
    course_name          VARCHAR(150) NOT NULL,
    course_code_short    VARCHAR(30)  NOT NULL UNIQUE,
    official_course_code VARCHAR(50)  NOT NULL DEFAULT 'Pending CSVTU Code',
    semester             TINYINT NOT NULL DEFAULT 3,
    is_primary           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: course_allocations (Faculty-Course-Section mapping)
-- ------------------------------------------------------------
CREATE TABLE course_allocations (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id    INT NOT NULL,
    course_id     INT NOT NULL,
    section_id    INT NOT NULL,
    status        ENUM('CONFIRMED','PENDING') NOT NULL DEFAULT 'CONFIRMED',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_fac_course_sec (faculty_id, course_id, section_id),
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)  ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES courses(course_id)   ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: students (Authoritative 252 Roster)
-- ------------------------------------------------------------
CREATE TABLE students (
    student_id        INT AUTO_INCREMENT PRIMARY KEY,
    dept_id           INT NOT NULL,
    section_id        INT NOT NULL,
    roll_number       VARCHAR(50)  NOT NULL UNIQUE,
    name              VARCHAR(150) NOT NULL,
    enrollment_number VARCHAR(50)  NULL,
    enrollment_status VARCHAR(50)  NOT NULL DEFAULT 'verified',
    admission_type    VARCHAR(50)  NOT NULL DEFAULT 'regular',
    semester          TINYINT NOT NULL DEFAULT 3,
    status            VARCHAR(20)  NOT NULL DEFAULT 'Active',
    rfid_uid          VARCHAR(50)  NULL UNIQUE,
    email             VARCHAR(120) NULL UNIQUE,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id)    REFERENCES departments(dept_id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: timetable_entries (Authoritative 80 Timetable Blocks)
-- ------------------------------------------------------------
CREATE TABLE timetable_entries (
    entry_id        INT AUTO_INCREMENT PRIMARY KEY,
    timetable_code  VARCHAR(50) NOT NULL UNIQUE,
    section_id      INT NOT NULL,
    day_of_week     VARCHAR(20) NOT NULL,
    day_index       TINYINT NOT NULL,
    period          VARCHAR(30) NOT NULL,
    period_start    INT NULL,
    period_end      INT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    course_id       INT NOT NULL,
    faculty_id      INT NOT NULL,
    slot_type       VARCHAR(30) NOT NULL DEFAULT 'lecture',
    room            VARCHAR(50) NULL,
    effective_date  VARCHAR(30) NOT NULL DEFAULT '17/08/2026',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES courses(course_id)   ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: attendance_sessions (Live Session Tracking)
-- ------------------------------------------------------------
CREATE TABLE attendance_sessions (
    session_id          INT AUTO_INCREMENT PRIMARY KEY,
    course_id           INT NOT NULL,
    faculty_id          INT NOT NULL,
    section_id          INT NOT NULL,
    timetable_entry_id  INT NULL,
    semester            TINYINT NOT NULL DEFAULT 3,
    session_date        DATE NOT NULL,
    period_start        INT NULL,
    period_end          INT NULL,
    start_time          TIME NULL,
    end_time            TIME NULL,
    lecture_number      INT NOT NULL,
    status              ENUM('RECORDING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'RECORDING',
    started_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at        DATETIME NULL,
    UNIQUE KEY uq_session_lecture (course_id, section_id, lecture_number),
    FOREIGN KEY (course_id)           REFERENCES courses(course_id)           ON DELETE CASCADE,
    FOREIGN KEY (faculty_id)          REFERENCES faculty(faculty_id)          ON DELETE CASCADE,
    FOREIGN KEY (section_id)          REFERENCES sections(section_id)         ON DELETE CASCADE,
    FOREIGN KEY (timetable_entry_id)  REFERENCES timetable_entries(entry_id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: attendance_records (Individual Student Attendance Marks)
-- ------------------------------------------------------------
CREATE TABLE attendance_records (
    record_id   INT AUTO_INCREMENT PRIMARY KEY,
    session_id  INT NOT NULL,
    student_id  INT NOT NULL,
    status      ENUM('PRESENT','ABSENT') NOT NULL DEFAULT 'PRESENT',
    marked_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_session_student (session_id, student_id),
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id)            ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Analytical Views (Completed Live Sessions Only)
-- ============================================================

CREATE OR REPLACE VIEW vw_student_live_attendance AS
SELECT 
    s.student_id,
    s.roll_number,
    s.name AS student_name,
    sec.section_name,
    c.course_id,
    c.course_name,
    c.course_code_short,
    COUNT(DISTINCT ses.session_id) AS completed_sessions,
    COUNT(DISTINCT CASE WHEN ar.status = 'PRESENT' THEN ar.record_id END) AS attended_sessions,
    ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN ar.status = 'PRESENT' THEN ar.record_id END)
              / NULLIF(COUNT(DISTINCT ses.session_id), 0), 2
    ) AS attendance_pct
FROM students s
JOIN sections sec ON sec.section_id = s.section_id
JOIN courses c ON c.dept_id = s.dept_id AND c.semester = s.semester
LEFT JOIN attendance_sessions ses 
       ON ses.course_id = c.course_id 
      AND ses.section_id = s.section_id 
      AND ses.status = 'COMPLETED'
LEFT JOIN attendance_records ar 
       ON ar.session_id = ses.session_id 
      AND ar.student_id = s.student_id
WHERE c.is_primary = TRUE
GROUP BY s.student_id, c.course_id;

CREATE OR REPLACE VIEW vw_section_live_attendance AS
SELECT 
    sec.section_id,
    sec.section_name,
    c.course_id,
    c.course_code_short,
    c.course_name,
    COUNT(DISTINCT ses.session_id) AS completed_sessions,
    COUNT(ar.record_id) AS total_marks,
    SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) AS total_present,
    ROUND(
        100.0 * SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END)
              / NULLIF(COUNT(ar.record_id), 0), 2
    ) AS section_avg_pct
FROM sections sec
CROSS JOIN courses c
LEFT JOIN attendance_sessions ses 
       ON ses.section_id = sec.section_id 
      AND ses.course_id = c.course_id 
      AND ses.status = 'COMPLETED'
LEFT JOIN attendance_records ar 
       ON ar.session_id = ses.session_id
WHERE c.is_primary = TRUE
GROUP BY sec.section_id, c.course_id;

-- ============================================================
-- SEED DATA
-- ============================================================

-- 1. Department
INSERT INTO departments (dept_id, dept_name, dept_code) VALUES
  (1, 'Computer Science & Engineering', 'CSE');

-- 2. Sections
INSERT INTO sections (section_id, dept_id, section_name) VALUES
  (1, 1, 'A'),
  (2, 1, 'B'),
  (3, 1, 'C'),
  (4, 1, 'D');

-- 3. Faculty
-- Primary teaching faculty (IDs 1-5), HOD (ID 6 - non-teaching), Timetable supporting staff (IDs 7-13)
INSERT INTO faculty (faculty_id, dept_id, faculty_code, name, email, role, designation) VALUES
  (1, 1, 'faculty_os', 'Devbrat Sahu', 'devbrat.sahu@ssipmt.com', 'faculty', 'Assistant Professor'),
  (2, 1, 'faculty_dm', 'Dr. Pranjali Sharma', 'pranjali.sharma@ssipmt.com', 'faculty', 'Assistant Professor'),
  (3, 1, 'faculty_oops', 'Mr. Vaibhav Chandrakar', 'vaibhav.chandrakar@ssipmt.com', 'faculty', 'Assistant Professor'),
  (4, 1, 'faculty_web', 'Dr. Suman Kumar Swarnkar', 'suman.swarnkar@ssipmt.com', 'faculty', 'Assistant Professor'),
  (5, 1, 'faculty_de', 'Mr. Navdeep Khare', 'navdeep.khare@ssipmt.com', 'faculty', 'Assistant Professor'),
  (6, 1, 'hod_cse', 'Dr. Anand Tamrakar', 'anand.tamrakar@ssipmt.com', 'hod', 'Head of Department'),
  (7, 1, 'faculty_pb', 'Mr. Prakash Bishi', 'prakash.bishi@ssipmt.com', 'faculty', 'Assistant Professor'),
  (8, 1, 'faculty_aks', 'AKS', 'aks@ssipmt.com', 'faculty', 'Assistant Professor'),
  (9, 1, 'faculty_vc_aks', 'VC / AKS', 'vc.aks@ssipmt.com', 'faculty', 'Faculty'),
  (10, 1, 'faculty_vc_pt', 'VC / PT', 'vc.pt@ssipmt.com', 'faculty', 'Faculty'),
  (11, 1, 'faculty_librarian', 'Librarian', 'librarian@ssipmt.com', 'staff', 'Librarian'),
  (12, 1, 'faculty_invited', 'Invited Faculty', 'invited@ssipmt.com', 'faculty', 'Visiting Faculty'),
  (13, 1, 'faculty_mentors', 'Project Mentors', 'mentors@ssipmt.com', 'staff', 'Project Mentors');

-- 4. Courses (5 Primary Teaching Modules + Supporting Timetable Modules)
INSERT INTO courses (course_id, dept_id, course_name, course_code_short, official_course_code, semester, is_primary) VALUES
  (1, 1, 'Operating System', 'OS', 'Pending CSVTU Code', 3, True),
  (2, 1, 'Discrete Mathematics', 'DM', 'Pending CSVTU Code', 3, True),
  (3, 1, 'Object Oriented Programming in C++', 'OOPS', 'Pending CSVTU Code', 3, True),
  (4, 1, 'Web Technology', 'WT', 'Pending CSVTU Code', 3, True),
  (5, 1, 'Digital Electronics', 'DELD', 'Pending CSVTU Code', 3, True),
  (6, 1, 'Web Technology Lab', 'WT Lab', 'Pending CSVTU Code', 3, False),
  (7, 1, 'OOPS in C++ Lab', 'OOPS Lab', 'Pending CSVTU Code', 3, False),
  (8, 1, 'Operating System Lab', 'OS-LAB', 'Pending CSVTU Code', 3, False),
  (9, 1, 'Operating System (Tutorial)', 'OS(T)', 'Pending CSVTU Code', 3, False),
  (10, 1, 'DSA using C++', 'DSA', 'Pending CSVTU Code', 3, False),
  (11, 1, 'Life Concept by Bhagwat Gita', 'Gita', 'Pending CSVTU Code', 3, False),
  (12, 1, 'Library', 'LIB', 'Pending CSVTU Code', 3, False),
  (13, 1, 'IDEA Innovation Lab', 'IDEA', 'Pending CSVTU Code', 3, False),
  (14, 1, 'Project Review', 'Project', 'Pending CSVTU Code', 3, False);

-- 5. Course Allocations (Confirmed for Sections A & B; C & D Pending; Anand Sir = 0 allocations)
INSERT INTO course_allocations (allocation_id, faculty_id, course_id, section_id, status) VALUES
  (1, 1, 1, 1, 'CONFIRMED'),
  (2, 1, 1, 2, 'CONFIRMED'),
  (3, 2, 2, 1, 'CONFIRMED'),
  (4, 2, 2, 2, 'CONFIRMED'),
  (5, 3, 3, 1, 'CONFIRMED'),
  (6, 3, 3, 2, 'CONFIRMED'),
  (7, 4, 4, 1, 'CONFIRMED'),
  (8, 4, 4, 2, 'CONFIRMED'),
  (9, 5, 5, 1, 'CONFIRMED'),
  (10, 5, 5, 2, 'CONFIRMED');

-- 6. Students (Authoritative 252 Roster: Sec A=60, Sec B=59, Sec C=66, Sec D=67)
INSERT INTO students (student_id, dept_id, section_id, roll_number, name, enrollment_number, enrollment_status, admission_type, semester, status) VALUES
  (1, 1, 1, '303302225001', 'AADITYA ATTREE', 'CE9491', 'verified', 'regular', 3, 'Active'),
  (2, 1, 1, '303302225002', 'AADITYA PRADHAN', 'CE9625', 'verified', 'regular', 3, 'Active'),
  (3, 1, 1, '303302225003', 'AAROHEE SHARMA', 'CE9448', 'verified', 'regular', 3, 'Active'),
  (4, 1, 1, '303302225004', 'AARSHABH CHATURVEDI', 'CE9442', 'verified', 'regular', 3, 'Active'),
  (5, 1, 1, '303302225005', 'AARUSHI SHRIVAS', 'CE9422', 'verified', 'regular', 3, 'Active'),
  (6, 1, 1, '303302225006', 'AARVY AGRAWAL', 'CE9474', 'verified', 'regular', 3, 'Active'),
  (7, 1, 1, '303302225007', 'AARYAN LODHI', 'CE9587', 'verified', 'regular', 3, 'Active'),
  (8, 1, 1, '303302225008', 'AASTHA AWASTHI', 'CE9607', 'verified', 'regular', 3, 'Active'),
  (9, 1, 1, '303302225009', 'AAYUSH SONKAR', 'CE9446', 'verified', 'regular', 3, 'Active'),
  (10, 1, 1, '303302225010', 'AAYUSHI SINHA', 'CE9578', 'verified', 'regular', 3, 'Active'),
  (11, 1, 1, '303302225011', 'ABHIJEET MISHRA', 'CE9602', 'verified', 'regular', 3, 'Active'),
  (12, 1, 1, '303302225012', 'ABHILAKH DEWANGAN', 'CE9529', 'verified', 'regular', 3, 'Active'),
  (13, 1, 1, '303302225013', 'ABHINAV KASHYAP', 'CE9451', 'verified', 'regular', 3, 'Active'),
  (14, 1, 1, '303302225014', 'ABHISHEK PANDIT', 'CE9547', 'verified', 'regular', 3, 'Active'),
  (15, 1, 1, '303302225015', 'ADITI CHOUBEY', 'CE9604', 'verified', 'regular', 3, 'Active'),
  (16, 1, 1, '303302225016', 'ADITI SHRIVASTAVA', 'CE9511', 'verified', 'regular', 3, 'Active'),
  (17, 1, 1, '303302225017', 'ADITYA BAJPAI', 'CE9626', 'verified', 'regular', 3, 'Active'),
  (18, 1, 1, '303302225018', 'ADITYA GOTMARAY', 'CE9449', 'verified', 'regular', 3, 'Active'),
  (19, 1, 1, '303302225019', 'ADITYA KRISHAN GUPTA', 'CE9615', 'verified', 'regular', 3, 'Active'),
  (20, 1, 1, '303302225020', 'ADITYA KUMAR GIRI', 'CE9574', 'verified', 'regular', 3, 'Active'),
  (21, 1, 1, '303302225021', 'ADITYA KUMAR ROY', 'CE9435', 'verified', 'regular', 3, 'Active'),
  (22, 1, 1, '303302225022', 'AHEMAD RAZA ANSARI', 'CE9554', 'verified', 'regular', 3, 'Active'),
  (23, 1, 1, '303302225023', 'AKSHITA TRIPATHI', 'CE9500', 'verified', 'regular', 3, 'Active'),
  (24, 1, 1, '303302225024', 'AMAN N K ARYA', 'CE9551', 'verified', 'regular', 3, 'Active'),
  (25, 1, 1, '303302225025', 'AMAN PAL', 'CE9614', 'verified', 'regular', 3, 'Active'),
  (26, 1, 1, '303302225026', 'AMARJOT SINGH', 'CE9465', 'verified', 'regular', 3, 'Active'),
  (27, 1, 1, '303302225027', 'AMIT KUMAR', 'CE9411', 'verified', 'regular', 3, 'Active'),
  (28, 1, 1, '303302225028', 'AMIT KUMAR VERMA', 'CE9476', 'verified', 'regular', 3, 'Active'),
  (29, 1, 1, '303302225029', 'AMRENDRA KUMAR PANDIT', 'CE9420', 'verified', 'regular', 3, 'Active'),
  (30, 1, 1, '303302225030', 'ANANDITA SHARMA', 'CE9530', 'verified', 'regular', 3, 'Active'),
  (31, 1, 1, '303302225031', 'ANANYA RAJPUT', 'CE9475', 'verified', 'regular', 3, 'Active'),
  (32, 1, 1, '303302225032', 'ANIKET PATEL', 'CE9503', 'verified', 'regular', 3, 'Active'),
  (33, 1, 1, '303302225033', 'ANJAL KUMAR PRAJAPATI', 'CE9518', 'verified', 'regular', 3, 'Active'),
  (34, 1, 1, '303302225034', 'ANJALI SINGH SENGAR', 'CE9464', 'verified', 'regular', 3, 'Active'),
  (35, 1, 1, '303302225035', 'ANMOL SINGH CHAWLA', 'CE9610', 'verified', 'regular', 3, 'Active'),
  (36, 1, 1, '303302225036', 'ANNANT LOHI', 'CE9510', 'verified', 'regular', 3, 'Active'),
  (37, 1, 1, '303302225038', 'ANSHU VERMA', 'CD1384', 'verified', 'regular', 3, 'Active'),
  (38, 1, 1, '303302225039', 'ANUBHAV TRIPATHI', 'CE9469', 'verified', 'regular', 3, 'Active'),
  (39, 1, 1, '303302225040', 'ANURAG PANDEY', 'CE9579', 'verified', 'regular', 3, 'Active'),
  (40, 1, 1, '303302225041', 'ANUSHKA KUMARI', 'CE9598', 'verified', 'regular', 3, 'Active'),
  (41, 1, 1, '303302225042', 'ANUSHKA SONI', 'CE9569', 'verified', 'regular', 3, 'Active'),
  (42, 1, 1, '303302225043', 'APURVA WATE', 'CE9599', 'verified', 'regular', 3, 'Active'),
  (43, 1, 1, '303302225044', 'ARNAB NAYAK', 'CE9597', 'verified', 'regular', 3, 'Active'),
  (44, 1, 1, '303302225045', 'ARYA SHARMA', 'CE9490', 'verified', 'regular', 3, 'Active'),
  (45, 1, 1, '303302225046', 'ARYAN BALI', 'CE9618', 'verified', 'regular', 3, 'Active'),
  (46, 1, 1, '303302225048', 'ARYANSH SHARMA', 'CE9524', 'verified', 'regular', 3, 'Active'),
  (47, 1, 1, '303302225049', 'ASHMIT LAKRA', 'CE9562', 'verified', 'regular', 3, 'Active'),
  (48, 1, 1, '303302225050', 'ASHUTOSH SINGH RATHOUR', 'CE9538', 'verified', 'regular', 3, 'Active'),
  (49, 1, 1, '303302225051', 'ASMIT KHARE', 'CE9515', 'verified', 'regular', 3, 'Active'),
  (50, 1, 1, '303302225052', 'ASTHA DIWAN', 'CE9541', 'verified', 'regular', 3, 'Active'),
  (51, 1, 1, '303302225053', 'ATHARAV CHOURASIA', 'CE9560', 'verified', 'regular', 3, 'Active'),
  (52, 1, 1, '303302225054', 'ATHARV PATLE', 'CE9477', 'verified', 'regular', 3, 'Active'),
  (53, 1, 1, '303302225055', 'ATHARVA KELKAR', 'CE9455', 'verified', 'regular', 3, 'Active'),
  (54, 1, 1, '303302225056', 'AVANI SARASWAT', 'CE9622', 'verified', 'regular', 3, 'Active'),
  (55, 1, 1, '303302225057', 'AYUSH KUMAR', 'CE9572', 'verified', 'regular', 3, 'Active'),
  (56, 1, 1, '303302225058', 'AYUSH SINGH RANA', 'CE9580', 'verified', 'regular', 3, 'Active'),
  (57, 1, 1, '303302225059', 'AYUSH VERMA', 'CE9528', 'verified', 'regular', 3, 'Active'),
  (58, 1, 1, '303302225060', 'BALAJI GUPTA', 'CE9582', 'verified', 'regular', 3, 'Active'),
  (59, 1, 1, '303302225061', 'BHAVISHYA DEWANGAN', 'CE9439', 'verified', 'regular', 3, 'Active'),
  (60, 1, 1, '303302225062', 'BHAWESH DEWANGAN', 'CE9425', 'verified', 'regular', 3, 'Active'),
  (61, 1, 2, '303302225063', 'BHUMIKA BAGHEL', NULL, 'unverified', 'regular', 3, 'Active'),
  (62, 1, 2, '303302225065', 'CH YASHWANT KUMAR', NULL, 'unverified', 'regular', 3, 'Active'),
  (63, 1, 2, '303302225066', 'CHANCHAL YADAV', NULL, 'unverified', 'regular', 3, 'Active'),
  (64, 1, 2, '303302225067', 'CHHAVIKANT SAHU', NULL, 'unverified', 'regular', 3, 'Active'),
  (65, 1, 2, '303302225068', 'CHINMAY', NULL, 'unverified', 'regular', 3, 'Active'),
  (66, 1, 2, '303302225069', 'CHINMAY SAHU', NULL, 'unverified', 'regular', 3, 'Active'),
  (67, 1, 2, '303302225070', 'CHIRAG SAHU', NULL, 'unverified', 'regular', 3, 'Active'),
  (68, 1, 2, '303302225072', 'DARSHNA BUDHWANI', NULL, 'unverified', 'regular', 3, 'Active'),
  (69, 1, 2, '303302225073', 'DEEKSHA BANCHHOR', NULL, 'unverified', 'regular', 3, 'Active'),
  (70, 1, 2, '303302225074', 'DEEPANJALI NISHAD', NULL, 'unverified', 'regular', 3, 'Active'),
  (71, 1, 2, '303302225075', 'DEEPTANGSHU CHOWDHURY', NULL, 'unverified', 'regular', 3, 'Active'),
  (72, 1, 2, '303302225076', 'DEVANSH DONGRE', NULL, 'unverified', 'regular', 3, 'Active'),
  (73, 1, 2, '303302225077', 'DEVSHREE CHANDRAKAR', NULL, 'unverified', 'regular', 3, 'Active'),
  (74, 1, 2, '303302225078', 'DHAIRYA CHANDRAKAR', NULL, 'unverified', 'regular', 3, 'Active'),
  (75, 1, 2, '303302225079', 'DHANANJAY JANGHEL', NULL, 'unverified', 'regular', 3, 'Active'),
  (76, 1, 2, '303302225081', 'DHARINI SAHU', NULL, 'unverified', 'regular', 3, 'Active'),
  (77, 1, 2, '303302225082', 'DHEERAJ AGRAWAL', NULL, 'unverified', 'regular', 3, 'Active'),
  (78, 1, 2, '303302225083', 'DIMPLE', NULL, 'unverified', 'regular', 3, 'Active'),
  (79, 1, 2, '303302225084', 'DIPAK KUMAR', NULL, 'unverified', 'regular', 3, 'Active'),
  (80, 1, 2, '303302225085', 'DIPTI SANDE', NULL, 'unverified', 'regular', 3, 'Active'),
  (81, 1, 2, '303302225086', 'DIVYA SAHU', NULL, 'unverified', 'regular', 3, 'Active'),
  (82, 1, 2, '303302225087', 'DIVYANSH DEY', NULL, 'unverified', 'regular', 3, 'Active'),
  (83, 1, 2, '303302225088', 'DIWAKAR KUMAR', NULL, 'unverified', 'regular', 3, 'Active'),
  (84, 1, 2, '303302225089', 'DUBA N PAVANI', NULL, 'unverified', 'regular', 3, 'Active'),
  (85, 1, 2, '303302225090', 'DUJRAM SAHU', NULL, 'unverified', 'regular', 3, 'Active'),
  (86, 1, 2, '303302225091', 'E ASHLESHANJALI', NULL, 'unverified', 'regular', 3, 'Active'),
  (87, 1, 2, '303302225092', 'EKLAVYA MANOJ KHATRI', NULL, 'unverified', 'regular', 3, 'Active'),
  (88, 1, 2, '303302225093', 'ESHNA JAIN', NULL, 'unverified', 'regular', 3, 'Active'),
  (89, 1, 2, '303302225094', 'GARGEE YADU', NULL, 'unverified', 'regular', 3, 'Active'),
  (90, 1, 2, '303302225095', 'GARIMA GAUTAM', NULL, 'unverified', 'regular', 3, 'Active'),
  (91, 1, 2, '303302225096', 'GAURAV KUMAR RATREY', NULL, 'unverified', 'regular', 3, 'Active'),
  (92, 1, 2, '303302225099', 'HARSHIT RAJESH PRAJAPATI', NULL, 'unverified', 'regular', 3, 'Active'),
  (93, 1, 2, '303302225100', 'HITESH PRAJAPATI', NULL, 'unverified', 'regular', 3, 'Active'),
  (94, 1, 2, '303302225101', 'INSIYA MURTAZA HUSSAIN', NULL, 'unverified', 'regular', 3, 'Active'),
  (95, 1, 2, '303302225102', 'ISHAN LODH', NULL, 'unverified', 'regular', 3, 'Active'),
  (96, 1, 2, '303302225103', 'JAHNAVI KANHE', NULL, 'unverified', 'regular', 3, 'Active'),
  (97, 1, 2, '303302225104', 'JASIKA SAHU', NULL, 'unverified', 'regular', 3, 'Active'),
  (98, 1, 2, '303302225105', 'JASPREET KAUR', NULL, 'unverified', 'regular', 3, 'Active'),
  (99, 1, 2, '303302225106', 'JAYESH KADAM', NULL, 'unverified', 'regular', 3, 'Active'),
  (100, 1, 2, '303302225107', 'JIGYASHU SAHU', NULL, 'unverified', 'regular', 3, 'Active'),
  (101, 1, 2, '303302225108', 'JOHANN J VARGHESE', NULL, 'unverified', 'regular', 3, 'Active'),
  (102, 1, 2, '303302225110', 'JOSHUA TIRKEY', NULL, 'unverified', 'regular', 3, 'Active'),
  (103, 1, 2, '303302225111', 'KANAK NARWARE', NULL, 'unverified', 'regular', 3, 'Active'),
  (104, 1, 2, '303302225113', 'KANISHK MISHRA', NULL, 'unverified', 'regular', 3, 'Active'),
  (105, 1, 2, '303302225114', 'KANISHKA AGRAWAL', NULL, 'unverified', 'regular', 3, 'Active'),
  (106, 1, 2, '303302225115', 'KARAMJEET SINGH', NULL, 'unverified', 'regular', 3, 'Active'),
  (107, 1, 2, '303302225116', 'KAVYA JANGDE', NULL, 'unverified', 'regular', 3, 'Active'),
  (108, 1, 2, '303302225117', 'KHUSH GOYAL', NULL, 'unverified', 'regular', 3, 'Active'),
  (109, 1, 2, '303302225118', 'KHUSHI KUMARI', NULL, 'unverified', 'regular', 3, 'Active'),
  (110, 1, 2, '303302225119', 'KRISH BIZOARA', NULL, 'unverified', 'regular', 3, 'Active'),
  (111, 1, 2, '303302225120', 'KRITI SINGH', NULL, 'unverified', 'regular', 3, 'Active'),
  (112, 1, 2, '303302225121', 'LAKSHYA SAXENA', NULL, 'unverified', 'regular', 3, 'Active'),
  (113, 1, 2, '303302225122', 'LAVANYA LALCHANDANI', NULL, 'unverified', 'regular', 3, 'Active'),
  (114, 1, 2, '303302225123', 'LAVISHA PINJANI', NULL, 'unverified', 'regular', 3, 'Active'),
  (115, 1, 2, '303302225124', 'LEENA KATARI', NULL, 'unverified', 'regular', 3, 'Active'),
  (116, 1, 2, '303302225125', 'LOKANSH KASHYAP', NULL, 'unverified', 'regular', 3, 'Active'),
  (117, 1, 2, '303302225126', 'LOKESH KUMAR', NULL, 'unverified', 'regular', 3, 'Active'),
  (118, 1, 2, '303302225127', 'MAHEK VYAS', NULL, 'unverified', 'regular', 3, 'Active'),
  (119, 1, 2, '303302225128', 'MANAS PATIDAR', NULL, 'unverified', 'regular', 3, 'Active'),
  (120, 1, 3, '303302225129', 'MANISH DEWANGAN', 'CE9491', 'verified', 'regular', 3, 'Active'),
  (121, 1, 3, '303302225130', 'MANJOT SINGH RANDHAWA', 'CE9625', 'verified', 'regular', 3, 'Active'),
  (122, 1, 3, '303302225131', 'MANYA TAMBOLI', 'CE9448', 'verified', 'regular', 3, 'Active'),
  (123, 1, 3, '303302225132', 'MAYUKH MONDAL', 'CE9442', 'verified', 'regular', 3, 'Active'),
  (124, 1, 3, '303302225133', 'MEGHA FATNANI', 'CE9422', 'verified', 'regular', 3, 'Active'),
  (125, 1, 3, '303302225135', 'MIMANSHU MISHRA', 'CE9474', 'verified', 'regular', 3, 'Active'),
  (126, 1, 3, '303302225136', 'MINAKSHI SHARMA', 'CE9587', 'verified', 'regular', 3, 'Active'),
  (127, 1, 3, '303302225137', 'MOHAMMAD REHAN RAZA', 'CE9607', 'verified', 'regular', 3, 'Active'),
  (128, 1, 3, '303302225138', 'MOHAMMED AAMIR RIYAZ', 'CE9446', 'verified', 'regular', 3, 'Active'),
  (129, 1, 3, '303302225139', 'MONIT SAHU', 'CE9578', 'verified', 'regular', 3, 'Active'),
  (130, 1, 3, '303302225140', 'NABIL HAFEEZ', 'CE9602', 'verified', 'regular', 3, 'Active'),
  (131, 1, 3, '303302225141', 'NAVYA SHARMA', 'CE9529', 'verified', 'regular', 3, 'Active'),
  (132, 1, 3, '303302225142', 'NEHA SAHU', 'CE9451', 'verified', 'regular', 3, 'Active'),
  (133, 1, 3, '303302225143', 'NEHAL CHANDRAKAR', 'CE9547', 'verified', 'regular', 3, 'Active'),
  (134, 1, 3, '303302225144', 'NITI AGRAWAL', 'CE9604', 'verified', 'regular', 3, 'Active'),
  (135, 1, 3, '303302225145', 'NITIN VERMA', 'CE9511', 'verified', 'regular', 3, 'Active'),
  (136, 1, 3, '303302225146', 'NOMITA SEN', 'CE9626', 'verified', 'regular', 3, 'Active'),
  (137, 1, 3, '303302225147', 'NUKALA SATVIKA', 'CE9449', 'verified', 'regular', 3, 'Active'),
  (138, 1, 3, '303302225148', 'OM ANGARE', 'CE9615', 'verified', 'regular', 3, 'Active'),
  (139, 1, 3, '303302225149', 'OMKAR SAHU', 'CE9574', 'verified', 'regular', 3, 'Active'),
  (140, 1, 3, '303302225150', 'PALAK SHARMA', 'CE9435', 'verified', 'regular', 3, 'Active'),
  (141, 1, 3, '303302225151', 'PALCHHIN DEWANGAN', 'CE9554', 'verified', 'regular', 3, 'Active'),
  (142, 1, 3, '303302225152', 'PARMESHWAR SAHU', 'CE9500', 'verified', 'regular', 3, 'Active'),
  (143, 1, 3, '303302225153', 'PIYUSH DEWANGAN', 'CE9551', 'verified', 'regular', 3, 'Active'),
  (144, 1, 3, '303302225155', 'POONAM DHIWAR', 'CE9614', 'verified', 'regular', 3, 'Active'),
  (145, 1, 3, '303302225156', 'PRACHI GUPTA', 'CE9465', 'verified', 'regular', 3, 'Active'),
  (146, 1, 3, '303302225157', 'PRACHI NAYAK', 'CE9411', 'verified', 'regular', 3, 'Active'),
  (147, 1, 3, '303302225159', 'PRAGATI CHANDRAKAR', 'CE9476', 'verified', 'regular', 3, 'Active'),
  (148, 1, 3, '303302225160', 'PRAGATI KUMARI', 'CE9420', 'verified', 'regular', 3, 'Active'),
  (149, 1, 3, '303302225161', 'PRAGYA VISHWAKARMA', 'CE9530', 'verified', 'regular', 3, 'Active'),
  (150, 1, 3, '303302225162', 'PRANJALI BHAJE', 'CE9475', 'verified', 'regular', 3, 'Active'),
  (151, 1, 3, '303302225163', 'PRASHANT DADSENA', 'CE9503', 'verified', 'regular', 3, 'Active'),
  (152, 1, 3, '303302225164', 'PRATEEK MISHRA', 'CE9518', 'verified', 'regular', 3, 'Active'),
  (153, 1, 3, '303302225165', 'PRATEEK SHARMA', 'CE9464', 'verified', 'regular', 3, 'Active'),
  (154, 1, 3, '303302225166', 'PRATHAM GUPTA', 'CE9610', 'verified', 'regular', 3, 'Active'),
  (155, 1, 3, '303302225167', 'PRATHAM SHARMA', 'CE9510', 'verified', 'regular', 3, 'Active'),
  (156, 1, 3, '303302225168', 'PRATYUSH PATRA', 'CD1384', 'verified', 'regular', 3, 'Active'),
  (157, 1, 3, '303302225169', 'PRATYUSH SAHU', 'CE9469', 'verified', 'regular', 3, 'Active'),
  (158, 1, 3, '303302225170', 'PRERAK DEWANGAN', 'CE9579', 'verified', 'regular', 3, 'Active'),
  (159, 1, 3, '303302225171', 'PRINCE GUPTA', 'CE9598', 'verified', 'regular', 3, 'Active'),
  (160, 1, 3, '303302225172', 'PRINCE KUMAR', 'CE9569', 'verified', 'regular', 3, 'Active'),
  (161, 1, 3, '303302225173', 'PRISHA VERMA', 'CE9599', 'verified', 'regular', 3, 'Active'),
  (162, 1, 3, '303302225174', 'PRIYAL CHAWDA', 'CE9597', 'verified', 'regular', 3, 'Active'),
  (163, 1, 3, '303302225175', 'PRIYAL KESHARWANI', 'CE9490', 'verified', 'regular', 3, 'Active'),
  (164, 1, 3, '303302225176', 'PRIYANSHI KUSHWAHA', 'CE9618', 'verified', 'regular', 3, 'Active'),
  (165, 1, 3, '303302225177', 'PURVI KANNOUJE', 'CE9524', 'verified', 'regular', 3, 'Active'),
  (166, 1, 3, '303302225178', 'PUSHPANJALI SAHU', 'CE9562', 'verified', 'regular', 3, 'Active'),
  (167, 1, 3, '303302225179', 'RAGHAV SAXENA', 'CE9538', 'verified', 'regular', 3, 'Active'),
  (168, 1, 3, '303302225180', 'RAHUL KUMAR', 'CE9515', 'verified', 'regular', 3, 'Active'),
  (169, 1, 3, '303302225181', 'RAHUL KUMAR', 'CE9541', 'verified', 'regular', 3, 'Active'),
  (170, 1, 3, '303302225182', 'RAHUL SHARMA', 'CE9560', 'verified', 'regular', 3, 'Active'),
  (171, 1, 3, '303302225183', 'RAJAL CHOUDHARY', 'CE9477', 'verified', 'regular', 3, 'Active'),
  (172, 1, 3, '303302225184', 'RAJVEER SINGH RAJPUT', 'CE9455', 'verified', 'regular', 3, 'Active'),
  (173, 1, 3, '303302225185', 'RANI SAH', 'CE9622', 'verified', 'regular', 3, 'Active'),
  (174, 1, 3, '303302225186', 'RISHABH NISHAD', 'CE9572', 'verified', 'regular', 3, 'Active'),
  (175, 1, 3, '303302225187', 'RISHI GUPTA', 'CE9580', 'verified', 'regular', 3, 'Active'),
  (176, 1, 3, '303302225188', 'RITIKA BAGHAV', 'CE9528', 'verified', 'regular', 3, 'Active'),
  (177, 1, 3, '303302225189', 'RITIKA RANI JAISWAL', 'CE9582', 'verified', 'regular', 3, 'Active'),
  (178, 1, 3, '303302225190', 'RITURAJ YADAV', 'CE9439', 'verified', 'regular', 3, 'Active'),
  (179, 1, 3, '303302225191', 'RIYA DAPURKAR', 'CE9425', 'verified', 'regular', 3, 'Active'),
  (180, 1, 3, 'B1', 'ABHA TIWARI', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (181, 1, 3, 'B2', 'ABHISHEK PATEL', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (182, 1, 3, 'B3', 'ANSH AGRAWAL', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (183, 1, 3, 'B4', 'HIMANSHI VERMA', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (184, 1, 3, 'B5', 'KASHAF PAREKH', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (185, 1, 3, 'B7', 'MANASHREE JAIN', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (186, 1, 4, '303302225192', 'RIYA SONANT', NULL, 'missing', 'regular', 3, 'Active'),
  (187, 1, 4, '303302225193', 'ROHAN NIRMALKAR', NULL, 'missing', 'regular', 3, 'Active'),
  (188, 1, 4, '303302225194', 'S AMULYA', NULL, 'missing', 'regular', 3, 'Active'),
  (189, 1, 4, '303302225196', 'SAHIL DEWANGAN', NULL, 'missing', 'regular', 3, 'Active'),
  (190, 1, 4, '303302225197', 'SAKSHAM PANIGRAHI', NULL, 'missing', 'regular', 3, 'Active'),
  (191, 1, 4, '303302225198', 'SANCHITA KALE', NULL, 'missing', 'regular', 3, 'Active'),
  (192, 1, 4, '303302225199', 'SARTHAK SAHU', NULL, 'missing', 'regular', 3, 'Active'),
  (193, 1, 4, '303302225200', 'SHAURYA KUMAR SHUKLA', NULL, 'missing', 'regular', 3, 'Active'),
  (194, 1, 4, '303302225201', 'SHILPI CHANDRAKAR', NULL, 'missing', 'regular', 3, 'Active'),
  (195, 1, 4, '303302225202', 'SHIVANI DUBEY', NULL, 'missing', 'regular', 3, 'Active'),
  (196, 1, 4, '303302225203', 'SHIVANI NEELESH PIMPLAPURE', NULL, 'missing', 'regular', 3, 'Active'),
  (197, 1, 4, '303302225204', 'SHIVANSH KHARE', NULL, 'missing', 'regular', 3, 'Active'),
  (198, 1, 4, '303302225205', 'SHIVANSH SHUKLA', NULL, 'missing', 'regular', 3, 'Active'),
  (199, 1, 4, '303302225206', 'SHOURYA ASHATKAR', NULL, 'missing', 'regular', 3, 'Active'),
  (200, 1, 4, '303302225207', 'SHOURYA TIWARI', NULL, 'missing', 'regular', 3, 'Active'),
  (201, 1, 4, '303302225208', 'SHRADDHA NAG', NULL, 'missing', 'regular', 3, 'Active'),
  (202, 1, 4, '303302225209', 'SHREY ORAON', NULL, 'missing', 'regular', 3, 'Active'),
  (203, 1, 4, '303302225210', 'SHREYA PATEL', NULL, 'missing', 'regular', 3, 'Active'),
  (204, 1, 4, '303302225211', 'SHREYANSH TIWARI', NULL, 'missing', 'regular', 3, 'Active'),
  (205, 1, 4, '303302225212', 'SHREYASHI PODDAR', NULL, 'missing', 'regular', 3, 'Active'),
  (206, 1, 4, '303302225213', 'SHRISHTI DEWANGAN', NULL, 'missing', 'regular', 3, 'Active'),
  (207, 1, 4, '303302225214', 'SHRIYA JHA', NULL, 'missing', 'regular', 3, 'Active'),
  (208, 1, 4, '303302225215', 'SHUBHAM BANI', NULL, 'missing', 'regular', 3, 'Active'),
  (209, 1, 4, '303302225216', 'SHUBHAM CHOUDHARY', NULL, 'missing', 'regular', 3, 'Active'),
  (210, 1, 4, '303302225217', 'SHUBHAM SHARMA', NULL, 'missing', 'regular', 3, 'Active'),
  (211, 1, 4, '303302225218', 'SIRUVURI SURYA SRUJANA', NULL, 'missing', 'regular', 3, 'Active'),
  (212, 1, 4, '303302225219', 'SNEHA MALLICK', NULL, 'missing', 'regular', 3, 'Active'),
  (213, 1, 4, '303302225220', 'SNEHA VERMA', NULL, 'missing', 'regular', 3, 'Active'),
  (214, 1, 4, '303302225221', 'SOUMYA SHARMA', NULL, 'missing', 'regular', 3, 'Active'),
  (215, 1, 4, '303302225222', 'SRISHTI SHARMA', NULL, 'missing', 'regular', 3, 'Active'),
  (216, 1, 4, '303302225223', 'SUBHANANDA DUTTA', NULL, 'missing', 'regular', 3, 'Active'),
  (217, 1, 4, '303302225224', 'SUMIT KUMAR', NULL, 'missing', 'regular', 3, 'Active'),
  (218, 1, 4, '303302225225', 'SUPARNA DAS', NULL, 'missing', 'regular', 3, 'Active'),
  (219, 1, 4, '303302225226', 'SURAJ KUMAR', NULL, 'missing', 'regular', 3, 'Active'),
  (220, 1, 4, '303302225227', 'SURUCHI KUMARI', NULL, 'missing', 'regular', 3, 'Active'),
  (221, 1, 4, '303302225228', 'SURYANSH JAISWAL', NULL, 'missing', 'regular', 3, 'Active'),
  (222, 1, 4, '303302225229', 'TANISH MISHRA', NULL, 'missing', 'regular', 3, 'Active'),
  (223, 1, 4, '303302225230', 'TANISHKA AGRAWAL', NULL, 'missing', 'regular', 3, 'Active'),
  (224, 1, 4, '303302225231', 'TANMAY JHA', NULL, 'missing', 'regular', 3, 'Active'),
  (225, 1, 4, '303302225232', 'TANVEER KUMAR PANDEY', NULL, 'missing', 'regular', 3, 'Active'),
  (226, 1, 4, '303302225233', 'TANVI RAYAKWAR', NULL, 'missing', 'regular', 3, 'Active'),
  (227, 1, 4, '303302225234', 'TIKUANAND SETHI', NULL, 'missing', 'regular', 3, 'Active'),
  (228, 1, 4, '303302225235', 'TUSHAR VERMA', NULL, 'missing', 'regular', 3, 'Active'),
  (229, 1, 4, '303302225236', 'TWINKLE JHARIYE', NULL, 'missing', 'regular', 3, 'Active'),
  (230, 1, 4, '303302225237', 'UDAY KUMAR SAHU', NULL, 'missing', 'regular', 3, 'Active'),
  (231, 1, 4, '303302225238', 'UDAY SAHU', NULL, 'missing', 'regular', 3, 'Active'),
  (232, 1, 4, '303302225239', 'UDAYBHAN SHRIVAS', NULL, 'missing', 'regular', 3, 'Active'),
  (233, 1, 4, '303302225240', 'UTKARSH SAXENA', NULL, 'missing', 'regular', 3, 'Active'),
  (234, 1, 4, '303302225241', 'UTKARSHA SAMADHIYA', NULL, 'missing', 'regular', 3, 'Active'),
  (235, 1, 4, '303302225242', 'VADALI SHRIDHAR RAO', NULL, 'missing', 'regular', 3, 'Active'),
  (236, 1, 4, '303302225243', 'VANI KEDIA', NULL, 'missing', 'regular', 3, 'Active'),
  (237, 1, 4, '303302225244', 'VANSHIKA SAHU', NULL, 'missing', 'regular', 3, 'Active'),
  (238, 1, 4, '303302225245', 'VIKAS PATEL', NULL, 'missing', 'regular', 3, 'Active'),
  (239, 1, 4, '303302225246', 'VIPLAV VERMA', NULL, 'missing', 'regular', 3, 'Active'),
  (240, 1, 4, '303302225248', 'YASH KUMAR SAHU', NULL, 'missing', 'regular', 3, 'Active'),
  (241, 1, 4, '303302225249', 'YASHASVI SHARMA', NULL, 'missing', 'regular', 3, 'Active'),
  (242, 1, 4, '303302225250', 'YUGAL PRAJAPATI', NULL, 'missing', 'regular', 3, 'Active'),
  (243, 1, 4, '303302225251', 'YUVRAJ SINGH', NULL, 'missing', 'regular', 3, 'Active'),
  (244, 1, 4, '2615715000059', 'BHAVIKA DHUWARE', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (245, 1, 4, '2615715000126', 'SNEHA GUPTA', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (246, 1, 4, '2615715000155', 'APURBO SAHA', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (247, 1, 4, 'B6', 'KHYATI SAHU', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (248, 1, 4, 'B8', 'MAYANK KUMAR SINGH', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (249, 1, 4, 'B9', 'PALAK SONKAR', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (250, 1, 4, 'B10', 'SUHANI SAGARWANSHI', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (251, 1, 4, 'B11', 'VAIBHAVI SHARMA', NULL, 'missing', 'lateral_or_provisional', 3, 'Active'),
  (252, 1, 4, 'CLG_03', 'SWAYAM SHRIVASTAVA', NULL, 'missing', 'lateral_or_provisional', 3, 'Active');

-- 7. Timetable Entries (Authoritative 80 Timetable Blocks: W.E.F. 17/08/2026)
INSERT INTO timetable_entries (entry_id, timetable_code, section_id, day_of_week, day_index, period, period_start, period_end, start_time, end_time, course_id, faculty_id, slot_type, room, effective_date) VALUES
  (1, 'tt-a-mon-1', 1, 'Monday', 1, 'I', NULL, NULL, '09:00:00', '09:50:00', 3, 3, 'lecture', 'Classroom 301', '17/08/2026'),
  (2, 'tt-a-mon-2', 1, 'Monday', 1, 'II', NULL, NULL, '09:50:00', '10:40:00', 2, 2, 'lecture', 'Classroom 301', '17/08/2026'),
  (3, 'tt-a-mon-3', 1, 'Monday', 1, 'III–IV', 3, 4, '10:40:00', '12:20:00', 11, 12, 'activity', 'Auditorium', '17/08/2026'),
  (4, 'tt-a-mon-4', 1, 'Monday', 1, 'V–VI', 5, 6, '13:00:00', '14:40:00', 6, 7, 'lab', 'CSE Lab 3', '17/08/2026'),
  (5, 'tt-a-mon-5', 1, 'Monday', 1, 'VII', NULL, NULL, '14:40:00', '15:20:00', 5, 5, 'lecture', 'Classroom 301', '17/08/2026'),
  (6, 'tt-a-mon-6', 1, 'Monday', 1, 'VIII', NULL, NULL, '15:20:00', '16:00:00', 12, 11, 'activity', 'Central Library', '17/08/2026'),
  (7, 'tt-a-tue-7', 1, 'Tuesday', 2, 'I', NULL, NULL, '09:00:00', '09:50:00', 1, 1, 'lecture', 'Classroom 301', '17/08/2026'),
  (8, 'tt-a-tue-8', 1, 'Tuesday', 2, 'II', NULL, NULL, '09:50:00', '10:40:00', 5, 5, 'lecture', 'Classroom 301', '17/08/2026'),
  (9, 'tt-a-tue-9', 1, 'Tuesday', 2, 'III–IV', 3, 4, '10:40:00', '12:20:00', 8, 1, 'lab', 'CSE Lab 1', '17/08/2026'),
  (10, 'tt-a-tue-10', 1, 'Tuesday', 2, 'V', NULL, NULL, '13:00:00', '13:50:00', 4, 4, 'lecture', 'Classroom 301', '17/08/2026'),
  (11, 'tt-a-tue-11', 1, 'Tuesday', 2, 'VI', NULL, NULL, '13:50:00', '14:40:00', 3, 3, 'lecture', 'Classroom 301', '17/08/2026'),
  (12, 'tt-a-tue-12', 1, 'Tuesday', 2, 'VII', NULL, NULL, '14:40:00', '15:20:00', 10, 9, 'lecture', 'Classroom 301', '17/08/2026'),
  (13, 'tt-a-wed-13', 1, 'Wednesday', 3, 'I', NULL, NULL, '09:00:00', '09:50:00', 2, 2, 'lecture', 'Classroom 301', '17/08/2026'),
  (14, 'tt-a-wed-14', 1, 'Wednesday', 3, 'II', NULL, NULL, '09:50:00', '10:40:00', 4, 4, 'lecture', 'Classroom 301', '17/08/2026'),
  (15, 'tt-a-wed-15', 1, 'Wednesday', 3, 'III', NULL, NULL, '10:40:00', '11:30:00', 3, 3, 'lecture', 'Classroom 301', '17/08/2026'),
  (16, 'tt-a-wed-16', 1, 'Wednesday', 3, 'IV', NULL, NULL, '11:30:00', '12:20:00', 5, 5, 'lecture', 'Classroom 301', '17/08/2026'),
  (17, 'tt-a-wed-17', 1, 'Wednesday', 3, 'V', NULL, NULL, '13:00:00', '13:50:00', 1, 1, 'lecture', 'Classroom 301', '17/08/2026'),
  (18, 'tt-a-wed-18', 1, 'Wednesday', 3, 'VI', NULL, NULL, '13:50:00', '14:40:00', 4, 4, 'lecture', 'Classroom 301', '17/08/2026'),
  (19, 'tt-a-wed-19', 1, 'Wednesday', 3, 'VII', NULL, NULL, '14:40:00', '15:20:00', 10, 8, 'lecture', 'Classroom 301', '17/08/2026'),
  (20, 'tt-a-thu-20', 1, 'Thursday', 4, 'I', NULL, NULL, '09:00:00', '09:50:00', 5, 5, 'lecture', 'Classroom 301', '17/08/2026'),
  (21, 'tt-a-thu-21', 1, 'Thursday', 4, 'II', NULL, NULL, '09:50:00', '10:40:00', 3, 3, 'lecture', 'Classroom 301', '17/08/2026'),
  (22, 'tt-a-thu-22', 1, 'Thursday', 4, 'III', NULL, NULL, '10:40:00', '11:30:00', 4, 4, 'lecture', 'Classroom 301', '17/08/2026'),
  (23, 'tt-a-thu-23', 1, 'Thursday', 4, 'IV', NULL, NULL, '11:30:00', '12:20:00', 2, 2, 'lecture', 'Classroom 301', '17/08/2026'),
  (24, 'tt-a-thu-24', 1, 'Thursday', 4, 'V', NULL, NULL, '13:00:00', '13:50:00', 1, 1, 'lecture', 'Classroom 301', '17/08/2026'),
  (25, 'tt-a-thu-25', 1, 'Thursday', 4, 'VI–VII', 6, 7, '13:50:00', '15:20:00', 13, 5, 'lab', 'Innovation Lab', '17/08/2026'),
  (26, 'tt-a-thu-26', 1, 'Thursday', 4, 'VIII', NULL, NULL, '15:20:00', '16:00:00', 5, 5, 'lecture', 'Classroom 301', '17/08/2026'),
  (27, 'tt-a-fri-27', 1, 'Friday', 5, 'I', NULL, NULL, '09:00:00', '09:50:00', 4, 4, 'lecture', 'Classroom 301', '17/08/2026'),
  (28, 'tt-a-fri-28', 1, 'Friday', 5, 'II', NULL, NULL, '09:50:00', '10:40:00', 5, 5, 'lecture', 'Classroom 301', '17/08/2026'),
  (29, 'tt-a-fri-29', 1, 'Friday', 5, 'III–IV', 3, 4, '10:40:00', '12:20:00', 7, 3, 'lab', 'CSE Lab 1', '17/08/2026'),
  (30, 'tt-a-fri-30', 1, 'Friday', 5, 'V', NULL, NULL, '13:00:00', '13:50:00', 1, 1, 'lecture', 'Classroom 301', '17/08/2026'),
  (31, 'tt-a-fri-31', 1, 'Friday', 5, 'VI', NULL, NULL, '13:50:00', '14:40:00', 2, 2, 'lecture', 'Classroom 301', '17/08/2026'),
  (32, 'tt-a-fri-32', 1, 'Friday', 5, 'VII–VIII', 7, 8, '14:40:00', '16:00:00', 1, 1, 'lecture', 'Classroom 301', '17/08/2026'),
  (33, 'tt-a-sat-33', 1, 'Saturday', 6, 'I', NULL, NULL, '09:00:00', '09:50:00', 1, 1, 'lecture', 'Classroom 301', '17/08/2026'),
  (34, 'tt-a-sat-34', 1, 'Saturday', 6, 'II', NULL, NULL, '09:50:00', '10:40:00', 4, 4, 'lecture', 'Classroom 301', '17/08/2026'),
  (35, 'tt-a-sat-35', 1, 'Saturday', 6, 'III', NULL, NULL, '10:40:00', '11:30:00', 5, 5, 'lecture', 'Classroom 301', '17/08/2026'),
  (36, 'tt-a-sat-36', 1, 'Saturday', 6, 'IV', NULL, NULL, '11:30:00', '12:20:00', 3, 3, 'lecture', 'Classroom 301', '17/08/2026'),
  (37, 'tt-a-sat-37', 1, 'Saturday', 6, 'V', NULL, NULL, '13:00:00', '13:50:00', 4, 4, 'lecture', 'Classroom 301', '17/08/2026'),
  (38, 'tt-a-sat-38', 1, 'Saturday', 6, 'VI', NULL, NULL, '13:50:00', '14:40:00', 1, 1, 'lecture', 'Classroom 301', '17/08/2026'),
  (39, 'tt-a-sat-39', 1, 'Saturday', 6, 'VII–VIII', 7, 8, '14:40:00', '16:00:00', 14, 13, 'activity', 'Seminar Hall', '17/08/2026'),
  (40, 'tt-b-mon-40', 2, 'Monday', 1, 'I', NULL, NULL, '09:00:00', '09:50:00', 1, 1, 'lecture', 'Classroom 302', '17/08/2026'),
  (41, 'tt-b-mon-41', 2, 'Monday', 1, 'II', NULL, NULL, '09:50:00', '10:40:00', 5, 5, 'lecture', 'Classroom 302', '17/08/2026'),
  (42, 'tt-b-mon-42', 2, 'Monday', 1, 'III–IV', 3, 4, '10:40:00', '12:20:00', 11, 12, 'activity', 'Auditorium', '17/08/2026'),
  (43, 'tt-b-mon-43', 2, 'Monday', 1, 'V', NULL, NULL, '13:00:00', '13:50:00', 2, 2, 'lecture', 'Classroom 302', '17/08/2026'),
  (44, 'tt-b-mon-44', 2, 'Monday', 1, 'VI', NULL, NULL, '13:50:00', '14:40:00', 4, 4, 'lecture', 'Classroom 302', '17/08/2026'),
  (45, 'tt-b-mon-45', 2, 'Monday', 1, 'VII', NULL, NULL, '14:40:00', '15:20:00', 3, 3, 'lecture', 'Classroom 302', '17/08/2026'),
  (46, 'tt-b-mon-46', 2, 'Monday', 1, 'VIII', NULL, NULL, '15:20:00', '16:00:00', 5, 5, 'lecture', 'Classroom 302', '17/08/2026'),
  (47, 'tt-b-tue-47', 2, 'Tuesday', 2, 'I', NULL, NULL, '09:00:00', '09:50:00', 3, 3, 'lecture', 'Classroom 302', '17/08/2026'),
  (48, 'tt-b-tue-48', 2, 'Tuesday', 2, 'II', NULL, NULL, '09:50:00', '10:40:00', 2, 2, 'lecture', 'Classroom 302', '17/08/2026'),
  (49, 'tt-b-tue-49', 2, 'Tuesday', 2, 'III–IV', 3, 4, '10:40:00', '12:20:00', 6, 7, 'lab', 'CSE Lab 3', '17/08/2026'),
  (50, 'tt-b-tue-50', 2, 'Tuesday', 2, 'V', NULL, NULL, '13:00:00', '13:50:00', 5, 5, 'lecture', 'Classroom 302', '17/08/2026'),
  (51, 'tt-b-tue-51', 2, 'Tuesday', 2, 'VI', NULL, NULL, '13:50:00', '14:40:00', 1, 1, 'lecture', 'Classroom 302', '17/08/2026'),
  (52, 'tt-b-tue-52', 2, 'Tuesday', 2, 'VII', NULL, NULL, '14:40:00', '15:20:00', 10, 10, 'lecture', 'Classroom 302', '17/08/2026'),
  (53, 'tt-b-wed-53', 2, 'Wednesday', 3, 'I', NULL, NULL, '09:00:00', '09:50:00', 1, 1, 'lecture', 'Classroom 302', '17/08/2026'),
  (54, 'tt-b-wed-54', 2, 'Wednesday', 3, 'II', NULL, NULL, '09:50:00', '10:40:00', 2, 2, 'lecture', 'Classroom 302', '17/08/2026'),
  (55, 'tt-b-wed-55', 2, 'Wednesday', 3, 'III–IV', 3, 4, '10:40:00', '12:20:00', 8, 6, 'lab', 'CSE Lab 3', '17/08/2026'),
  (56, 'tt-b-wed-56', 2, 'Wednesday', 3, 'V', NULL, NULL, '13:00:00', '13:50:00', 4, 4, 'lecture', 'Classroom 302', '17/08/2026'),
  (57, 'tt-b-wed-57', 2, 'Wednesday', 3, 'VI', NULL, NULL, '13:50:00', '14:40:00', 5, 5, 'lecture', 'Classroom 302', '17/08/2026'),
  (58, 'tt-b-wed-58', 2, 'Wednesday', 3, 'VII', NULL, NULL, '14:40:00', '15:20:00', 10, 10, 'lecture', 'Classroom 302', '17/08/2026'),
  (59, 'tt-b-thu-59', 2, 'Thursday', 4, 'I', NULL, NULL, '09:00:00', '09:50:00', 4, 4, 'lecture', 'Classroom 302', '17/08/2026'),
  (60, 'tt-b-thu-60', 2, 'Thursday', 4, 'II', NULL, NULL, '09:50:00', '10:40:00', 9, 1, 'tutorial', 'Classroom 302', '17/08/2026'),
  (61, 'tt-b-thu-61', 2, 'Thursday', 4, 'III', NULL, NULL, '10:40:00', '11:30:00', 3, 3, 'lecture', 'Classroom 302', '17/08/2026'),
  (62, 'tt-b-thu-62', 2, 'Thursday', 4, 'IV', NULL, NULL, '11:30:00', '12:20:00', 2, 2, 'lecture', 'Classroom 302', '17/08/2026'),
  (63, 'tt-b-thu-63', 2, 'Thursday', 4, 'V', NULL, NULL, '13:00:00', '13:50:00', 2, 2, 'lecture', 'Classroom 302', '17/08/2026'),
  (64, 'tt-b-thu-64', 2, 'Thursday', 4, 'VI', NULL, NULL, '13:50:00', '14:40:00', 3, 3, 'lecture', 'Classroom 302', '17/08/2026'),
  (65, 'tt-b-thu-65', 2, 'Thursday', 4, 'VII', NULL, NULL, '14:40:00', '15:20:00', 1, 1, 'lecture', 'Classroom 302', '17/08/2026'),
  (66, 'tt-b-thu-66', 2, 'Thursday', 4, 'VIII', NULL, NULL, '15:20:00', '16:00:00', 12, 11, 'activity', 'Central Library', '17/08/2026'),
  (67, 'tt-b-fri-67', 2, 'Friday', 5, 'I', NULL, NULL, '09:00:00', '09:50:00', 1, 1, 'lecture', 'Classroom 302', '17/08/2026'),
  (68, 'tt-b-fri-68', 2, 'Friday', 5, 'II', NULL, NULL, '09:50:00', '10:40:00', 3, 3, 'lecture', 'Classroom 302', '17/08/2026'),
  (69, 'tt-b-fri-69', 2, 'Friday', 5, 'III', NULL, NULL, '10:40:00', '11:30:00', 2, 2, 'lecture', 'Classroom 302', '17/08/2026'),
  (70, 'tt-b-fri-70', 2, 'Friday', 5, 'IV', NULL, NULL, '11:30:00', '12:20:00', 5, 5, 'lecture', 'Classroom 302', '17/08/2026'),
  (71, 'tt-b-fri-71', 2, 'Friday', 5, 'V–VI', 5, 6, '13:00:00', '14:40:00', 13, 5, 'lab', 'Innovation Lab', '17/08/2026'),
  (72, 'tt-b-fri-72', 2, 'Friday', 5, 'VII', NULL, NULL, '14:40:00', '15:20:00', 4, 4, 'lecture', 'Classroom 302', '17/08/2026'),
  (73, 'tt-b-fri-73', 2, 'Friday', 5, 'VIII', NULL, NULL, '15:20:00', '16:00:00', 4, 4, 'lecture', 'Classroom 302', '17/08/2026'),
  (74, 'tt-b-sat-74', 2, 'Saturday', 6, 'I', NULL, NULL, '09:00:00', '09:50:00', 4, 4, 'lecture', 'Classroom 302', '17/08/2026'),
  (75, 'tt-b-sat-75', 2, 'Saturday', 6, 'II', NULL, NULL, '09:50:00', '10:40:00', 5, 5, 'lecture', 'Classroom 302', '17/08/2026'),
  (76, 'tt-b-sat-76', 2, 'Saturday', 6, 'III', NULL, NULL, '10:40:00', '11:30:00', 3, 3, 'lecture', 'Classroom 302', '17/08/2026'),
  (77, 'tt-b-sat-77', 2, 'Saturday', 6, 'IV', NULL, NULL, '11:30:00', '12:20:00', 1, 1, 'lecture', 'Classroom 302', '17/08/2026'),
  (78, 'tt-b-sat-78', 2, 'Saturday', 6, 'V', NULL, NULL, '13:00:00', '13:50:00', 5, 5, 'lecture', 'Classroom 302', '17/08/2026'),
  (79, 'tt-b-sat-79', 2, 'Saturday', 6, 'VI', NULL, NULL, '13:50:00', '14:40:00', 4, 4, 'lecture', 'Classroom 302', '17/08/2026'),
  (80, 'tt-b-sat-80', 2, 'Saturday', 6, 'VII–VIII', 7, 8, '14:40:00', '16:00:00', 14, 13, 'activity', 'Seminar Hall', '17/08/2026');

-- ============================================================
-- NOTE: Initial live state remains 0 sessions and 0 attendance records
-- ============================================================
