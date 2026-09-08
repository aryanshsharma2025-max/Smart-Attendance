import json
import os

def generate_schema_sql():
    with open('Assets/generated/authoritative_students_2026.json', 'r', encoding='utf-8') as f:
        students = json.load(f)

    with open('Assets/generated/authoritative_timetable.json', 'r', encoding='utf-8') as f:
        tt = json.load(f)

    entries = tt['entries']

    lines = []
    lines.append("-- ============================================================")
    lines.append("--  SMART ATTENDANCE SYSTEM — AUTHORITATIVE MYSQL DATABASE SCHEMA")
    lines.append("--  Academic Target: B.Tech CSE · 3rd Semester · July-Dec 2026")
    lines.append("--  Institution: SSIPMT Raipur | CSVTU Affiliated")
    lines.append("--  Compatible with MySQL 8.0+")
    lines.append("-- ============================================================\n")
    lines.append("CREATE DATABASE IF NOT EXISTS smart_attendance;")
    lines.append("USE smart_attendance;\n")

    lines.append("-- ------------------------------------------------------------")
    lines.append("-- Drop Tables in Reverse Dependency Order")
    lines.append("-- ------------------------------------------------------------")
    lines.append("DROP TABLE IF EXISTS users;")
    lines.append("DROP TABLE IF EXISTS attendance_records;")
    lines.append("DROP TABLE IF EXISTS attendance_sessions;")
    lines.append("DROP TABLE IF EXISTS timetable_entries;")
    lines.append("DROP TABLE IF EXISTS course_allocations;")
    lines.append("DROP TABLE IF EXISTS students;")
    lines.append("DROP TABLE IF EXISTS courses;")
    lines.append("DROP TABLE IF EXISTS faculty;")
    lines.append("DROP TABLE IF EXISTS sections;")
    lines.append("DROP TABLE IF EXISTS departments;\n")

    lines.append("-- ------------------------------------------------------------")
    lines.append("-- Table: departments")
    lines.append("-- ------------------------------------------------------------")
    lines.append("""CREATE TABLE departments (
    dept_id     INT AUTO_INCREMENT PRIMARY KEY,
    dept_name   VARCHAR(100) NOT NULL,
    dept_code   VARCHAR(20)  NOT NULL UNIQUE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n""")

    lines.append("-- ------------------------------------------------------------")
    lines.append("-- Table: sections")
    lines.append("-- ------------------------------------------------------------")
    lines.append("""CREATE TABLE sections (
    section_id    INT AUTO_INCREMENT PRIMARY KEY,
    dept_id       INT NOT NULL,
    section_name  VARCHAR(10) NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_dept_section (dept_id, section_name),
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n""")

    lines.append("-- ------------------------------------------------------------")
    lines.append("-- Table: faculty")
    lines.append("-- ------------------------------------------------------------")
    lines.append("""CREATE TABLE faculty (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n""")

    lines.append("-- ------------------------------------------------------------")
    lines.append("-- Table: courses (Official Curriculum Modules)")
    lines.append("-- ------------------------------------------------------------")
    lines.append("""CREATE TABLE courses (
    course_id            INT AUTO_INCREMENT PRIMARY KEY,
    dept_id              INT NOT NULL,
    course_name          VARCHAR(150) NOT NULL,
    course_code_short    VARCHAR(30)  NOT NULL UNIQUE,
    official_course_code VARCHAR(50)  NOT NULL DEFAULT 'Pending CSVTU Code',
    semester             TINYINT NOT NULL DEFAULT 3,
    is_primary           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n""")

    lines.append("-- ------------------------------------------------------------")
    lines.append("-- Table: course_allocations (Faculty-Course-Section mapping)")
    lines.append("-- ------------------------------------------------------------")
    lines.append("""CREATE TABLE course_allocations (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n""")

    lines.append("-- ------------------------------------------------------------")
    lines.append("-- Table: students (Authoritative 252 Roster)")
    lines.append("-- ------------------------------------------------------------")
    lines.append("""CREATE TABLE students (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n""")

    lines.append("-- ------------------------------------------------------------")
    lines.append("-- Table: timetable_entries (Authoritative 80 Timetable Blocks)")
    lines.append("-- ------------------------------------------------------------")
    lines.append("""CREATE TABLE timetable_entries (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n""")

    lines.append("-- ------------------------------------------------------------")
    lines.append("-- Table: attendance_sessions (Live Session Tracking)")
    lines.append("-- ------------------------------------------------------------")
    lines.append("""CREATE TABLE attendance_sessions (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n""")

    lines.append("-- ------------------------------------------------------------")
    lines.append("-- Table: attendance_records (Individual Student Attendance Marks)")
    lines.append("-- ------------------------------------------------------------")
    lines.append("""CREATE TABLE attendance_records (
    record_id   INT AUTO_INCREMENT PRIMARY KEY,
    session_id  INT NOT NULL,
    student_id  INT NOT NULL,
    status      ENUM('PRESENT','ABSENT') NOT NULL DEFAULT 'PRESENT',
    marked_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_session_student (session_id, student_id),
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id)            ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n""")

    lines.append("-- ------------------------------------------------------------")
    lines.append("-- Table: users (Authentication & Role Credentials)")
    lines.append("-- ------------------------------------------------------------")
    lines.append("""CREATE TABLE users (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(60) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('STUDENT','FACULTY','HOD','ADMIN') NOT NULL,
    faculty_id    INT NULL UNIQUE,
    student_id    INT NULL UNIQUE,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n""")

    lines.append("-- ============================================================")
    lines.append("-- Analytical Views (Completed Live Sessions Only)")
    lines.append("-- ============================================================\n")
    lines.append("""CREATE OR REPLACE VIEW vw_student_live_attendance AS
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
GROUP BY s.student_id, c.course_id;\n""")

    lines.append("""CREATE OR REPLACE VIEW vw_section_live_attendance AS
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
GROUP BY sec.section_id, c.course_id;\n""")

    lines.append("-- ============================================================")
    lines.append("-- SEED DATA")
    lines.append("-- ============================================================\n")

    # 1. Department
    lines.append("-- 1. Department")
    lines.append("INSERT INTO departments (dept_id, dept_name, dept_code) VALUES")
    lines.append("  (1, 'Computer Science & Engineering', 'CSE');\n")

    # 2. Sections
    lines.append("-- 2. Sections")
    lines.append("INSERT INTO sections (section_id, dept_id, section_name) VALUES")
    lines.append("  (1, 1, 'A'),")
    lines.append("  (2, 1, 'B'),")
    lines.append("  (3, 1, 'C'),")
    lines.append("  (4, 1, 'D');\n")

    # 3. Faculty
    lines.append("-- 3. Faculty")
    lines.append("-- Primary teaching faculty (IDs 1-5), HOD (ID 6 - non-teaching), Timetable supporting staff (IDs 7-13)")
    faculty_list = [
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
        (13, 1, 'faculty_mentors', 'Project Mentors', 'mentors@ssipmt.com', 'staff', 'Project Mentors')
    ]
    fac_lines = []
    for f in faculty_list:
        fac_lines.append(f"  ({f[0]}, {f[1]}, '{f[2]}', '{f[3]}', '{f[4]}', '{f[5]}', '{f[6]}')")
    lines.append("INSERT INTO faculty (faculty_id, dept_id, faculty_code, name, email, role, designation) VALUES\n" + ",\n".join(fac_lines) + ";\n")

    # 4. Courses
    lines.append("-- 4. Courses (5 Primary Teaching Modules + Supporting Timetable Modules)")
    courses_list = [
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
        (14, 1, 'Project Review', 'Project', 'Pending CSVTU Code', 3, False)
    ]
    crs_lines = []
    for c in courses_list:
        crs_lines.append(f"  ({c[0]}, {c[1]}, '{c[2]}', '{c[3]}', '{c[4]}', {c[5]}, {c[6]})")
    lines.append("INSERT INTO courses (course_id, dept_id, course_name, course_code_short, official_course_code, semester, is_primary) VALUES\n" + ",\n".join(crs_lines) + ";\n")

    # 5. Course Allocations
    lines.append("-- 5. Course Allocations (Confirmed for Sections A & B; C & D Pending; Anand Sir = 0 allocations)")
    alloc_list = [
        (1, 1, 1, 1, 'CONFIRMED'), # Devbrat Sahu -> OS -> A
        (2, 1, 1, 2, 'CONFIRMED'), # Devbrat Sahu -> OS -> B
        (3, 2, 2, 1, 'CONFIRMED'), # Dr. Pranjali Sharma -> DM -> A
        (4, 2, 2, 2, 'CONFIRMED'), # Dr. Pranjali Sharma -> DM -> B
        (5, 3, 3, 1, 'CONFIRMED'), # Mr. Vaibhav Chandrakar -> OOPS -> A
        (6, 3, 3, 2, 'CONFIRMED'), # Mr. Vaibhav Chandrakar -> OOPS -> B
        (7, 4, 4, 1, 'CONFIRMED'), # Dr. Suman Kumar Swarnkar -> WT -> A
        (8, 4, 4, 2, 'CONFIRMED'), # Dr. Suman Kumar Swarnkar -> WT -> B
        (9, 5, 5, 1, 'CONFIRMED'), # Mr. Navdeep Khare -> DELD -> A
        (10, 5, 5, 2, 'CONFIRMED') # Mr. Navdeep Khare -> DELD -> B
    ]
    al_lines = []
    for a in alloc_list:
        al_lines.append(f"  ({a[0]}, {a[1]}, {a[2]}, {a[3]}, '{a[4]}')")
    lines.append("INSERT INTO course_allocations (allocation_id, faculty_id, course_id, section_id, status) VALUES\n" + ",\n".join(al_lines) + ";\n")

    # 6. Students (Authoritative 252)
    lines.append("-- 6. Students (Authoritative 252 Roster: Sec A=60, Sec B=59, Sec C=66, Sec D=67)")
    sec_id_map = {'A': 1, 'B': 2, 'C': 3, 'D': 4}
    stu_lines = []
    for s in students:
        s_id = s['id']
        dept = 1
        sec_id = sec_id_map[s['section']]
        roll = s['rollNumber'].replace("'", "''")
        name = s['name'].replace("'", "''")
        enr_val = s.get('enrollmentNumber')
        if enr_val:
            enr_clean = str(enr_val).replace("'", "''")
            enr = f"'{enr_clean}'"
        else:
            enr = "NULL"
        enr_status = s.get('enrollmentStatus', 'verified').replace("'", "''")
        adm_type = s.get('admissionType', 'regular').replace("'", "''")
        sem = s.get('semester', 3)
        status = s.get('status', 'Active').replace("'", "''")
        stu_lines.append(f"  ({s_id}, {dept}, {sec_id}, '{roll}', '{name}', {enr}, '{enr_status}', '{adm_type}', {sem}, '{status}')")

    lines.append("INSERT INTO students (student_id, dept_id, section_id, roll_number, name, enrollment_number, enrollment_status, admission_type, semester, status) VALUES\n" + ",\n".join(stu_lines) + ";\n")

    # 7. Timetable Entries (80 Blocks)
    lines.append("-- 7. Timetable Entries (Authoritative 80 Timetable Blocks: W.E.F. 17/08/2026)")
    faculty_map = {
        'faculty-os': 1,
        'faculty-dm': 2,
        'faculty-oops': 3,
        'faculty-web': 4,
        'faculty-de': 5,
        'faculty-at': 6,
        'faculty-pb': 7,
        'faculty-aks': 8,
        'faculty-vc-aks': 9,
        'faculty-vc-pt': 10,
        'faculty-librarian': 11,
        'faculty-invited faculty': 12,
        'faculty-mentors': 13
    }
    course_map = {
        'OS': 1,
        'DM': 2,
        'OOPS': 3,
        'WT': 4,
        'DELD': 5,
        'WT Lab': 6,
        'OOPS Lab': 7,
        'OS-LAB': 8,
        'OS(T)': 9,
        'DSA': 10,
        'Gita': 11,
        'LIB': 12,
        'IDEA': 13,
        'Project': 14
    }
    tt_lines = []
    for i, e in enumerate(entries, start=1):
        tt_code = e['id'].replace("'", "''")
        sec_id = sec_id_map[e['section']]
        day = e['day'].replace("'", "''")
        day_idx = e['dayIndex']
        period = e['period'].replace("'", "''")
        p_start = e['periodStart'] if e.get('periodStart') is not None else "NULL"
        p_end = e['periodEnd'] if e.get('periodEnd') is not None else "NULL"
        st = f"'{e['startTime']}:00'"
        et = f"'{e['endTime']}:00'"
        c_id = course_map[e['subjectCodeShort']]
        f_id = faculty_map[e['facultyId']]
        stype = e.get('type', 'lecture').replace("'", "''")
        room_val = e.get('room')
        if room_val:
            room_clean = str(room_val).replace("'", "''")
            room = f"'{room_clean}'"
        else:
            room = "NULL"
        eff = e.get('effectiveDate', '17/08/2026').replace("'", "''")
        tt_lines.append(f"  ({i}, '{tt_code}', {sec_id}, '{day}', {day_idx}, '{period}', {p_start}, {p_end}, {st}, {et}, {c_id}, {f_id}, '{stype}', {room}, '{eff}')")

    lines.append("INSERT INTO timetable_entries (entry_id, timetable_code, section_id, day_of_week, day_index, period, period_start, period_end, start_time, end_time, course_id, faculty_id, slot_type, room, effective_date) VALUES\n" + ",\n".join(tt_lines) + ";\n")

    # 8. User Accounts (Authentication Credentials for HOD, Faculty, Students)
    lines.append("-- 8. User Accounts (Authentication Credentials for HOD, Faculty, Students)")
    user_lines = []
    demo_hash = "$2a$10$PTuTjhLreHw4vcq3ofAeHuf25E0g1ZkTLYbRwLqlrU1ND.bdF5grG"
    # HOD account (Dr. Anand Tamrakar, faculty_id = 6)
    user_lines.append(f"  (1, 'hod_cse', '{demo_hash}', 'HOD', 6, NULL, TRUE)")
    # 5 Confirmed Faculty accounts (faculty_id = 1..5)
    fac_usernames = ['faculty_os', 'faculty_dm', 'faculty_oops', 'faculty_wt', 'faculty_de']
    for idx, u in enumerate(fac_usernames, start=1):
        user_lines.append(f"  ({idx+1}, '{u}', '{demo_hash}', 'FACULTY', {idx}, NULL, TRUE)")
    # 252 Student accounts (student_id = 1..252)
    for idx, s in enumerate(students, start=1):
        s_id = s['id']
        u_id = 6 + idx
        roll = s['rollNumber'].replace("'", "''")
        user_lines.append(f"  ({u_id}, '{roll}', '{demo_hash}', 'STUDENT', NULL, {s_id}, TRUE)")

    lines.append("INSERT INTO users (user_id, username, password_hash, role, faculty_id, student_id, is_active) VALUES\n" + ",\n".join(user_lines) + ";\n")

    lines.append("-- ============================================================")
    lines.append("-- NOTE: Initial live state remains 0 sessions and 0 attendance records")
    lines.append("-- ============================================================\n")

    content = "\n".join(lines)
    with open('attendance_schema.sql', 'w', encoding='utf-8') as out:
        out.write(content)

    print(f"Successfully generated attendance_schema.sql! ({len(content)} bytes)")

if __name__ == '__main__':
    generate_schema_sql()
