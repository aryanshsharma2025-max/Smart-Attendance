-- ============================================================
--  SMART ATTENDANCE SYSTEM — MySQL Database Schema
--  Compatible with MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_attendance;
USE smart_attendance;

-- ------------------------------------------------------------
-- Table: departments
-- ------------------------------------------------------------
CREATE TABLE departments (
    dept_id     INT AUTO_INCREMENT PRIMARY KEY,
    dept_name   VARCHAR(100) NOT NULL,
    dept_code   VARCHAR(20)  NOT NULL UNIQUE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Table: faculty
-- ------------------------------------------------------------
CREATE TABLE faculty (
    faculty_id  INT AUTO_INCREMENT PRIMARY KEY,
    dept_id     INT NOT NULL,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,   -- store bcrypt hash
    role        ENUM('admin','faculty') DEFAULT 'faculty',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Table: courses
-- ------------------------------------------------------------
CREATE TABLE courses (
    course_id   INT AUTO_INCREMENT PRIMARY KEY,
    dept_id     INT NOT NULL,
    faculty_id  INT NOT NULL,
    course_name VARCHAR(150) NOT NULL,
    course_code VARCHAR(30)  NOT NULL UNIQUE,
    semester    TINYINT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id)   REFERENCES departments(dept_id)  ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)  ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Table: students
-- ------------------------------------------------------------
CREATE TABLE students (
    student_id      INT AUTO_INCREMENT PRIMARY KEY,
    dept_id         INT NOT NULL,
    name            VARCHAR(100) NOT NULL,
    roll_number     VARCHAR(30)  NOT NULL UNIQUE,
    email           VARCHAR(100) NOT NULL UNIQUE,
    rfid_uid        VARCHAR(50)  UNIQUE,          -- RFID card UID
    fingerprint_id  INT UNIQUE,                   -- AS608 template slot
    enrolled_year   YEAR NOT NULL,
    semester        TINYINT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Table: enrollments  (students enrolled in courses)
-- ------------------------------------------------------------
CREATE TABLE enrollments (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id    INT NOT NULL,
    course_id     INT NOT NULL,
    enrolled_on   DATE NOT NULL DEFAULT (CURRENT_DATE),
    UNIQUE KEY uq_enroll (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES courses(course_id)   ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Table: sessions  (scheduled class sessions)
-- ------------------------------------------------------------
CREATE TABLE sessions (
    session_id      INT AUTO_INCREMENT PRIMARY KEY,
    course_id       INT NOT NULL,
    faculty_id      INT NOT NULL,
    session_date    DATE     NOT NULL,
    start_time      TIME     NOT NULL,
    end_time        TIME     NOT NULL,
    room            VARCHAR(50),
    status          ENUM('scheduled','active','completed','cancelled') DEFAULT 'scheduled',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id)  REFERENCES courses(course_id)   ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)  ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Table: attendance_records
-- ------------------------------------------------------------
CREATE TABLE attendance_records (
    record_id       INT AUTO_INCREMENT PRIMARY KEY,
    session_id      INT NOT NULL,
    student_id      INT NOT NULL,
    status          ENUM('present','absent','late') DEFAULT 'present',
    scan_method     ENUM('rfid','fingerprint','manual') DEFAULT 'rfid',
    scanned_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_record (session_id, student_id),
    FOREIGN KEY (session_id)  REFERENCES sessions(session_id)   ON DELETE CASCADE,
    FOREIGN KEY (student_id)  REFERENCES students(student_id)   ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Table: device_logs  (raw Arduino/ESP8266 scan events)
-- ------------------------------------------------------------
CREATE TABLE device_logs (
    log_id      INT AUTO_INCREMENT PRIMARY KEY,
    rfid_uid    VARCHAR(50),
    device_mac  VARCHAR(20),
    raw_payload TEXT,
    processed   BOOLEAN DEFAULT FALSE,
    logged_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Views
-- ============================================================

-- Attendance summary per student per course
CREATE OR REPLACE VIEW vw_attendance_summary AS
SELECT
    s.student_id,
    s.name            AS student_name,
    s.roll_number,
    c.course_id,
    c.course_name,
    c.course_code,
    COUNT(ses.session_id)                                    AS total_sessions,
    SUM(ar.status = 'present' OR ar.status = 'late')        AS attended,
    ROUND(
        100.0 * SUM(ar.status = 'present' OR ar.status = 'late')
              / NULLIF(COUNT(ses.session_id), 0), 2
    )                                                        AS attendance_pct
FROM students s
JOIN enrollments  e   ON e.student_id = s.student_id
JOIN courses      c   ON c.course_id  = e.course_id
LEFT JOIN sessions    ses ON ses.course_id = c.course_id AND ses.status = 'completed'
LEFT JOIN attendance_records ar
          ON ar.session_id = ses.session_id AND ar.student_id = s.student_id
GROUP BY s.student_id, c.course_id;

-- ============================================================
-- Stored Procedures
-- ============================================================

DELIMITER $$

-- Mark attendance from RFID scan
CREATE PROCEDURE sp_mark_attendance(
    IN  p_rfid_uid   VARCHAR(50),
    IN  p_session_id INT,
    OUT p_result     VARCHAR(100)
)
BEGIN
    DECLARE v_student_id INT;
    DECLARE v_already    INT DEFAULT 0;

    -- Lookup student by RFID
    SELECT student_id INTO v_student_id
    FROM students
    WHERE rfid_uid = p_rfid_uid
    LIMIT 1;

    IF v_student_id IS NULL THEN
        SET p_result = 'ERROR: Unknown RFID';
    ELSE
        -- Check duplicate
        SELECT COUNT(*) INTO v_already
        FROM attendance_records
        WHERE session_id = p_session_id AND student_id = v_student_id;

        IF v_already > 0 THEN
            SET p_result = 'DUPLICATE: Already marked';
        ELSE
            INSERT INTO attendance_records (session_id, student_id, status, scan_method)
            VALUES (p_session_id, v_student_id, 'present', 'rfid');
            SET p_result = CONCAT('OK: ', v_student_id);
        END IF;
    END IF;
END$$

DELIMITER ;

-- ============================================================
-- Sample Seed Data
-- ============================================================

INSERT INTO departments (dept_name, dept_code) VALUES
    ('Computer Science & Engineering', 'CSE'),
    ('Electronics & Communication',    'ECE'),
    ('Mechanical Engineering',         'ME');

INSERT INTO faculty (dept_id, name, email, password, role) VALUES
    (1, 'Dr. Priya Sharma',  'priya@college.edu',  '$2b$12$placeholder_hash_1', 'admin'),
    (1, 'Prof. Arjun Mehta', 'arjun@college.edu',  '$2b$12$placeholder_hash_2', 'faculty'),
    (2, 'Dr. Kavita Rao',    'kavita@college.edu', '$2b$12$placeholder_hash_3', 'faculty');

INSERT INTO courses (dept_id, faculty_id, course_name, course_code, semester) VALUES
    (1, 2, 'Data Structures & Algorithms', 'CSE301', 3),
    (1, 2, 'Computer Networks',            'CSE401', 4),
    (2, 3, 'Digital Signal Processing',    'ECE302', 3);

INSERT INTO students (dept_id, name, roll_number, email, rfid_uid, fingerprint_id, enrolled_year, semester) VALUES
    (1, 'Ravi Kumar',    '21CSE001', 'ravi@student.edu',    'A1B2C3D4', 1, 2021, 3),
    (1, 'Anita Patel',   '21CSE002', 'anita@student.edu',   'E5F6G7H8', 2, 2021, 3),
    (1, 'Suresh Verma',  '21CSE003', 'suresh@student.edu',  'I9J0K1L2', 3, 2021, 3),
    (2, 'Meena Joshi',   '21ECE001', 'meena@student.edu',   'M3N4O5P6', 4, 2021, 3);
