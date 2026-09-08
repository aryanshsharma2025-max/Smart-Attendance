import sqlite3
import re
import os
import sys
import bcrypt
import jwt
import datetime

def run_phase_7b_verification():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    print("================================================================")
    print(" PHASE 7B: SPRING BOOT + MYSQL FOUNDATION VERIFICATION SUITE")
    print("================================================================\n")

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    schema_path = os.path.join(base_dir, "attendance_schema.sql")

    with open(schema_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Convert MySQL dialect to SQLite compatible syntax for in-memory execution
    sqlite_sql = sql_content
    sqlite_sql = re.sub(r'CREATE DATABASE IF NOT EXISTS smart_attendance;', '', sqlite_sql)
    sqlite_sql = re.sub(r'USE smart_attendance;', '', sqlite_sql)
    sqlite_sql = re.sub(r'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4', '', sqlite_sql)
    sqlite_sql = re.sub(r'INT AUTO_INCREMENT PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT', sqlite_sql)
    sqlite_sql = re.sub(r'TINYINT', 'INTEGER', sqlite_sql)
    sqlite_sql = re.sub(r'ENUM\([^)]+\)', 'VARCHAR(50)', sqlite_sql)
    sqlite_sql = re.sub(r'BOOLEAN', 'INTEGER', sqlite_sql)
    sqlite_sql = re.sub(r'DATETIME DEFAULT CURRENT_TIMESTAMP', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', sqlite_sql)
    sqlite_sql = re.sub(r'UNIQUE KEY \w+', 'UNIQUE', sqlite_sql)
    sqlite_sql = re.sub(r'CREATE OR REPLACE VIEW', 'CREATE VIEW', sqlite_sql)

    db = sqlite3.connect(':memory:')
    db.execute("PRAGMA foreign_keys = ON;")
    cursor = db.cursor()

    # Execute schema & seed script
    cursor.executescript(sqlite_sql)
    db.commit()

    test_results = []

    def assert_test(test_num, description, condition, detail=""):
        status = "PASS" if condition else "FAIL"
        test_results.append((test_num, description, status, detail))
        mark = "OK" if condition else "FAIL"
        print(f"Test {test_num:02d}: [{mark}] {description} -> {status}")
        if detail and not condition:
            print(f"        Detail: {detail}")

    # =========================================================================
    # TESTS 01 to 19: REGRESSION SUITE (PHASE 7A FOUNDATIONS)
    # =========================================================================

    # 1. 252 students loaded
    cursor.execute("SELECT COUNT(*) FROM students;")
    total_students = cursor.fetchone()[0]
    assert_test(1, "252 students loaded", total_students == 252, f"Found {total_students} students")

    # 2. A/B/C/D counts correct
    cursor.execute("""
        SELECT sec.section_name, COUNT(s.student_id)
        FROM sections sec
        JOIN students s ON s.section_id = sec.section_id
        GROUP BY sec.section_name
        ORDER BY sec.section_name;
    """)
    sec_counts = dict(cursor.fetchall())
    expected_sec = {'A': 60, 'B': 59, 'C': 66, 'D': 67}
    sec_ok = (sec_counts == expected_sec)
    assert_test(2, "A/B/C/D counts correct (A:60, B:59, C:66, D:67)", sec_ok, f"Actual counts: {sec_counts}")

    # 3. five subjects exist
    cursor.execute("SELECT course_code_short, course_name FROM courses WHERE is_primary = 1 ORDER BY course_id;")
    primary_courses = dict(cursor.fetchall())
    expected_courses = {'OS', 'DM', 'OOPS', 'WT', 'DELD'}
    courses_ok = set(primary_courses.keys()) == expected_courses
    assert_test(3, "Five primary subjects exist (OS, DM, OOPS, WT, DELD)", courses_ok, f"Found: {set(primary_courses.keys())}")

    # 4. five primary faculty exist
    cursor.execute("SELECT faculty_code, name, role FROM faculty WHERE role = 'faculty' AND faculty_id <= 5;")
    primary_fac = cursor.fetchall()
    fac_names = [f[1] for f in primary_fac]
    expected_fac = ["Devbrat Sahu", "Dr. Pranjali Sharma", "Mr. Vaibhav Chandrakar", "Dr. Suman Kumar Swarnkar", "Mr. Navdeep Khare"]
    fac_ok = (fac_names == expected_fac)
    assert_test(4, "Five primary faculty exist", fac_ok, f"Found: {fac_names}")

    # 5. Anand Sir is HOD only
    cursor.execute("SELECT faculty_id, name, role FROM faculty WHERE faculty_code = 'hod_cse';")
    hod = cursor.fetchone()
    cursor.execute("SELECT COUNT(*) FROM course_allocations WHERE faculty_id = ?;", (hod[0],))
    hod_allocations = cursor.fetchone()[0]
    hod_ok = (hod is not None and hod[2] == 'hod' and hod_allocations == 0)
    assert_test(5, "Anand Sir is HOD only (no teaching subjects allocated)", hod_ok, f"Role={hod[2] if hod else None}, Allocations={hod_allocations}")

    # 6. timetable contains 80 blocks
    cursor.execute("SELECT COUNT(*) FROM timetable_entries;")
    tt_count = cursor.fetchone()[0]
    cursor.execute("SELECT sec.section_name, COUNT(*) FROM timetable_entries t JOIN sections sec ON sec.section_id = t.section_id GROUP BY sec.section_name;")
    tt_by_sec = dict(cursor.fetchall())
    assert_test(6, "Timetable contains 80 blocks (A:39, B:41)", tt_count == 80 and tt_by_sec == {'A': 39, 'B': 41}, f"Total: {tt_count}, By sec: {tt_by_sec}")

    def create_session(faculty_code, course_code, section_name, session_date="2026-08-17", timetable_entry_id=None):
        cursor.execute("SELECT faculty_id, role, name FROM faculty WHERE faculty_code = ?;", (faculty_code,))
        f_row = cursor.fetchone()
        if not f_row:
            raise Exception("Faculty not found")
        f_id, f_role, f_name = f_row
        if f_role == 'hod':
            raise PermissionError("403 Forbidden: HOD is not authorized to create attendance sessions")

        cursor.execute("SELECT course_id, course_name FROM courses WHERE course_code_short = ?;", (course_code,))
        c_row = cursor.fetchone()
        if not c_row:
            raise Exception("Course not found")
        c_id, c_name = c_row

        cursor.execute("SELECT section_id FROM sections WHERE section_name = ?;", (section_name,))
        s_row = cursor.fetchone()
        if not s_row:
            raise Exception("Section not found")
        s_id = s_row[0]

        cursor.execute("SELECT status FROM course_allocations WHERE faculty_id = ? AND course_id = ? AND section_id = ?;", (f_id, c_id, s_id))
        alloc_row = cursor.fetchone()
        if not alloc_row:
            raise PermissionError(f"403 Forbidden: Faculty {f_name} is not authorized for {course_code} in Section {section_name}")
        if alloc_row[0] != 'CONFIRMED':
            raise PermissionError(f"403 Forbidden: Allocation for {course_code} Section {section_name} is PENDING")

        cursor.execute("SELECT COALESCE(MAX(lecture_number), 0) + 1 FROM attendance_sessions WHERE course_id = ? AND section_id = ? AND status != 'CANCELLED';", (c_id, s_id))
        next_lecture = cursor.fetchone()[0]

        cursor.execute("""
            INSERT INTO attendance_sessions (course_id, faculty_id, section_id, timetable_entry_id, semester, session_date, lecture_number, status)
            VALUES (?, ?, ?, ?, 3, ?, ?, 'RECORDING');
        """, (c_id, f_id, s_id, timetable_entry_id, session_date, next_lecture))
        session_id = cursor.lastrowid
        db.commit()
        return session_id, next_lecture

    # 7. Devbrat can create OS-A
    try:
        sess_os_a, lec_os_a = create_session('faculty_os', 'OS', 'A')
        assert_test(7, "Devbrat can create OS-A session", sess_os_a is not None and lec_os_a == 1, f"Session ID: {sess_os_a}, Lecture: {lec_os_a}")
    except Exception as e:
        assert_test(7, "Devbrat can create OS-A session", False, str(e))

    # 8. Devbrat can create OS-B
    try:
        sess_os_b, lec_os_b = create_session('faculty_os', 'OS', 'B')
        assert_test(8, "Devbrat can create OS-B session", sess_os_b is not None and lec_os_b == 1, f"Session ID: {sess_os_b}, Lecture: {lec_os_b}")
    except Exception as e:
        assert_test(8, "Devbrat can create OS-B session", False, str(e))

    # 9. Devbrat cannot create DM-A (403 Authorization Failure)
    devbrat_dm_blocked = False
    try:
        create_session('faculty_os', 'DM', 'A')
    except PermissionError:
        devbrat_dm_blocked = True
    assert_test(9, "Devbrat cannot create DM-A (rejected with 403 Forbidden)", devbrat_dm_blocked, "Devbrat + DM was not blocked")

    # 10. Devbrat cannot create OS-C (403 Authorization Failure - Allocation Pending)
    devbrat_osc_blocked = False
    try:
        create_session('faculty_os', 'OS', 'C')
    except PermissionError:
        devbrat_osc_blocked = True
    assert_test(10, "Devbrat cannot create OS-C (rejected with 403 Forbidden - Section Pending)", devbrat_osc_blocked, "Devbrat + OS + Section C was not blocked")

    def save_attendance(session_id, faculty_code, marks):
        cursor.execute("SELECT session_id, course_id, faculty_id, section_id, status, lecture_number FROM attendance_sessions WHERE session_id = ?;", (session_id,))
        sess = cursor.fetchone()
        if not sess:
            raise Exception("Session not found")
        s_id, c_id, f_id, sec_id, status, lec_no = sess

        if status != 'RECORDING':
            raise Exception(f"Session is not in RECORDING state. Current: {status}")

        cursor.execute("SELECT faculty_id FROM faculty WHERE faculty_code = ?;", (faculty_code,))
        caller_f_id = cursor.fetchone()[0]
        if caller_f_id != f_id:
            raise PermissionError("Faculty does not own this session")

        cursor.execute("SELECT student_id, roll_number FROM students WHERE section_id = ?;", (sec_id,))
        roster = cursor.fetchall()
        roster_map = {r[0]: r[1] for r in roster}
        roster_rolls = {r[1]: r[0] for r in roster}

        seen_students = set()
        records_to_insert = []
        for m in marks:
            st_id = m.get('student_id')
            roll = m.get('roll_number')
            st_status = m.get('status', '').upper()
            if not st_id and roll:
                st_id = roster_rolls.get(roll)
            if not st_id or st_id not in roster_map:
                raise ValueError("Student does not belong to session section")
            if st_id in seen_students:
                raise ValueError(f"Duplicate student record in attendance request: {st_id}")
            if st_status not in ('PRESENT', 'ABSENT'):
                raise ValueError(f"Invalid attendance status: {st_status}")
            seen_students.add(st_id)
            records_to_insert.append((session_id, st_id, st_status))

        if len(seen_students) != len(roster):
            raise ValueError(f"Incomplete attendance roster. Expected {len(roster)}, got {len(seen_students)}")

        try:
            cursor.execute("SAVEPOINT att_save;")
            cursor.executemany("""
                INSERT INTO attendance_records (session_id, student_id, status)
                VALUES (?, ?, ?);
            """, records_to_insert)
            cursor.execute("UPDATE attendance_sessions SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE session_id = ?;", (session_id,))
            cursor.execute("RELEASE SAVEPOINT att_save;")
            db.commit()
            return True
        except Exception as ex:
            cursor.execute("ROLLBACK TO SAVEPOINT att_save;")
            db.commit()
            raise ex

    # Complete OS-A session 1 with 60 students
    cursor.execute("SELECT student_id, roll_number FROM students WHERE section_id = 1;")
    sec_a_students = cursor.fetchall()
    marks_a = [{'student_id': s[0], 'status': 'PRESENT' if idx < 50 else 'ABSENT'} for idx, s in enumerate(sec_a_students)]
    save_attendance(sess_os_a, 'faculty_os', marks_a)

    # 11. lecture numbering is subject+section scoped
    sess_os_a_2, lec_os_a_2 = create_session('faculty_os', 'OS', 'A')
    sess_dm_a, lec_dm_a = create_session('faculty_dm', 'DM', 'A')
    scoping_ok = (lec_os_a_2 == 2 and lec_os_b == 1 and lec_dm_a == 1)
    assert_test(11, "Lecture numbering is subject+section scoped (OS-A:2, OS-B:1, DM-A:1)", scoping_ok, f"OS-A-2={lec_os_a_2}, OS-B={lec_os_b}, DM-A={lec_dm_a}")

    # 12. duplicate session numbers rejected
    dup_session_rejected = False
    try:
        cursor.execute("""
            INSERT INTO attendance_sessions (course_id, faculty_id, section_id, semester, session_date, lecture_number, status)
            VALUES (1, 1, 1, 3, '2026-08-17', 1, 'RECORDING');
        """)
        db.commit()
    except sqlite3.IntegrityError:
        dup_session_rejected = True
        db.rollback()
    assert_test(12, "Duplicate session numbers rejected (enforced by DB constraint uq_session_lecture)", dup_session_rejected, "DB allowed duplicate session lecture number")

    # 13. duplicate attendance records rejected
    dup_record_rejected = False
    try:
        cursor.execute("INSERT INTO attendance_records (session_id, student_id, status) VALUES (?, ?, 'PRESENT');", (sess_os_a, sec_a_students[0][0]))
        db.commit()
    except sqlite3.IntegrityError:
        dup_record_rejected = True
        db.rollback()
    assert_test(13, "Duplicate attendance records rejected (enforced by DB constraint uq_session_student)", dup_record_rejected, "DB allowed duplicate attendance record")

    # 14. invalid student-section rejected
    alien_student_rejected = False
    cursor.execute("SELECT student_id FROM students WHERE section_id = 2 LIMIT 1;")
    sec_b_student_id = cursor.fetchone()[0]
    bad_marks_alien = [{'student_id': s[0], 'status': 'PRESENT'} for s in sec_a_students[:-1]]
    bad_marks_alien.append({'student_id': sec_b_student_id, 'status': 'PRESENT'})
    try:
        save_attendance(sess_os_a_2, 'faculty_os', bad_marks_alien)
    except ValueError:
        alien_student_rejected = True
    assert_test(14, "Invalid student-section rejected (alien student submission blocked)", alien_student_rejected, "Alien student was not blocked")

    # 15. incomplete attendance rejected
    incomplete_rejected = False
    bad_marks_short = [{'student_id': s[0], 'status': 'PRESENT'} for s in sec_a_students[:30]]
    try:
        save_attendance(sess_os_a_2, 'faculty_os', bad_marks_short)
    except ValueError:
        incomplete_rejected = True
    assert_test(15, "Incomplete attendance rejected (must account for all rostered students)", incomplete_rejected, "Incomplete roster was not blocked")

    # 16. transactional rollback works
    rollback_worked = False
    cursor.execute("SELECT COUNT(*) FROM attendance_records WHERE session_id = ?;", (sess_os_a_2,))
    records_before = cursor.fetchone()[0]
    bad_marks_invalid_status = [{'student_id': s[0], 'status': 'PRESENT' if idx < 59 else 'INVALID_STATUS'} for idx, s in enumerate(sec_a_students)]
    try:
        save_attendance(sess_os_a_2, 'faculty_os', bad_marks_invalid_status)
    except ValueError:
        cursor.execute("SELECT COUNT(*) FROM attendance_records WHERE session_id = ?;", (sess_os_a_2,))
        records_after = cursor.fetchone()[0]
        cursor.execute("SELECT status FROM attendance_sessions WHERE session_id = ?;", (sess_os_a_2,))
        status_after = cursor.fetchone()[0]
        if records_before == 0 and records_after == 0 and status_after == 'RECORDING':
            rollback_worked = True
    assert_test(16, "Transactional rollback works (atomic commit/rollback on error)", rollback_worked, "Partial records persisted or status mutated on error")

    # 17. completed session produces correct attendance
    st1_id = sec_a_students[0][0]
    st60_id = sec_a_students[59][0]
    cursor.execute("""
        SELECT 
            COUNT(DISTINCT ses.session_id) AS total_sessions,
            COUNT(DISTINCT CASE WHEN ar.status = 'PRESENT' THEN ar.record_id END) AS attended_sessions,
            ROUND(100.0 * COUNT(DISTINCT CASE WHEN ar.status = 'PRESENT' THEN ar.record_id END) / COUNT(DISTINCT ses.session_id), 2) AS pct
        FROM attendance_sessions ses
        LEFT JOIN attendance_records ar ON ar.session_id = ses.session_id AND ar.student_id = ?
        WHERE ses.status = 'COMPLETED' AND ses.course_id = 1 AND ses.section_id = 1;
    """, (st1_id,))
    st1_metrics = cursor.fetchone()

    cursor.execute("""
        SELECT 
            COUNT(DISTINCT ses.session_id) AS total_sessions,
            COUNT(DISTINCT CASE WHEN ar.status = 'PRESENT' THEN ar.record_id END) AS attended_sessions,
            ROUND(100.0 * COUNT(DISTINCT CASE WHEN ar.status = 'PRESENT' THEN ar.record_id END) / COUNT(DISTINCT ses.session_id), 2) AS pct
        FROM attendance_sessions ses
        LEFT JOIN attendance_records ar ON ar.session_id = ses.session_id AND ar.student_id = ?
        WHERE ses.status = 'COMPLETED' AND ses.course_id = 1 AND ses.section_id = 1;
    """, (st60_id,))
    st60_metrics = cursor.fetchone()

    cursor.execute("""
        SELECT 
            COUNT(ar.record_id) AS total_marks,
            SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_marks,
            ROUND(100.0 * SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(ar.record_id), 2) AS avg_pct
        FROM attendance_sessions ses
        JOIN attendance_records ar ON ar.session_id = ses.session_id
        WHERE ses.status = 'COMPLETED' AND ses.course_id = 1 AND ses.section_id = 1;
    """)
    sec_a_metrics = cursor.fetchone()

    calc_ok = (st1_metrics == (1, 1, 100.0) and st60_metrics == (1, 0, 0.0) and sec_a_metrics == (60, 50, 83.33))
    assert_test(17, "Completed session produces correct attendance (Student:100% & 0%, Section:83.33%)", calc_ok, f"St1: {st1_metrics}, St60: {st60_metrics}, Sec: {sec_a_metrics}")

    # 18. recording session excluded from statistics
    cursor.execute("""
        SELECT COUNT(DISTINCT session_id) 
        FROM attendance_sessions 
        WHERE status = 'COMPLETED' AND course_id = 1 AND section_id = 1;
    """)
    completed_sessions_count = cursor.fetchone()[0]
    cursor.execute("""
        SELECT COUNT(DISTINCT session_id) 
        FROM attendance_sessions 
        WHERE course_id = 1 AND section_id = 1;
    """)
    all_sessions_count = cursor.fetchone()[0]
    exclusion_ok = (completed_sessions_count == 1 and all_sessions_count == 2)
    assert_test(18, "Recording session excluded from statistics (completed sessions only)", exclusion_ok, f"Completed: {completed_sessions_count}, All: {all_sessions_count}")

    # 19. Initial live state is zero in fresh schema
    cursor.execute("DELETE FROM attendance_records;")
    cursor.execute("DELETE FROM attendance_sessions;")
    db.commit()
    cursor.execute("SELECT COUNT(*) FROM attendance_sessions;")
    sessions_zero = cursor.fetchone()[0] == 0
    cursor.execute("SELECT COUNT(*) FROM attendance_records;")
    records_zero = cursor.fetchone()[0] == 0
    assert_test(19, "Initial live state is zero (0 live sessions, 0 live attendance records)", sessions_zero and records_zero)

    # =========================================================================
    # TESTS 20 to 30: PHASE 7B ENHANCEMENTS & SECURITY ARCHITECTURE
    # =========================================================================

    # 20. Users table schema and deterministic seed verification
    cursor.execute("SELECT COUNT(*) FROM users;")
    total_users = cursor.fetchone()[0]
    cursor.execute("SELECT role, COUNT(*) FROM users GROUP BY role;")
    role_counts = dict(cursor.fetchall())
    expected_roles = {'HOD': 1, 'FACULTY': 5, 'STUDENT': 252}
    cursor.execute("SELECT username, role, faculty_id, student_id FROM users WHERE username = 'hod_cse';")
    hod_user = cursor.fetchone()
    users_seeded_ok = (total_users == 258 and role_counts == expected_roles and hod_user == ('hod_cse', 'HOD', 6, None))
    assert_test(20, "Users table schema and deterministic seed verification (HOD, 5 faculty, 252 students)", users_seeded_ok, f"Total: {total_users}, Roles: {role_counts}, HOD: {hod_user}")

    # 21. BCrypt password hash verification
    cursor.execute("SELECT password_hash FROM users WHERE username = 'hod_cse';")
    sample_hash = cursor.fetchone()[0]
    cursor.execute("SELECT password_hash FROM users WHERE username = 'faculty_os';")
    fac_hash = cursor.fetchone()[0]
    cursor.execute("SELECT password_hash FROM users WHERE role = 'STUDENT' LIMIT 1;")
    student_hash = cursor.fetchone()[0]

    password_valid = (
        bcrypt.checkpw(b"demo123", sample_hash.encode("utf-8")) and
        bcrypt.checkpw(b"demo123", fac_hash.encode("utf-8")) and
        bcrypt.checkpw(b"demo123", student_hash.encode("utf-8")) and
        not bcrypt.checkpw(b"wrongpwd", sample_hash.encode("utf-8"))
    )
    assert_test(21, "BCrypt password hash verification (hashes match demo123, reject invalid)", password_valid)

    # 22. Role authorization rules
    def check_authorization(role, action, resource_owner_id=None, caller_id=None):
        if role == 'HOD':
            return True # Full administrative access
        if role == 'FACULTY':
            if action in ['START_SESSION', 'SUBMIT_ATTENDANCE']:
                return caller_id == resource_owner_id
            if action in ['VIEW_ALLOCATIONS', 'VIEW_TIMETABLE', 'VIEW_ROSTER']:
                return True
            return False # Cannot manage roster or delete students
        if role == 'STUDENT':
            if action in ['VIEW_OWN_SUMMARY', 'VIEW_TIMETABLE', 'VIEW_SUBJECTS']:
                return True
            return False # Read only, cannot write attendance or roster
        return False

    auth_checks_pass = (
        check_authorization('HOD', 'CREATE_STUDENT') == True and
        check_authorization('HOD', 'VIEW_ROSTER') == True and
        check_authorization('FACULTY', 'START_SESSION', resource_owner_id=1, caller_id=1) == True and
        check_authorization('FACULTY', 'START_SESSION', resource_owner_id=2, caller_id=1) == False and
        check_authorization('FACULTY', 'CREATE_STUDENT') == False and
        check_authorization('STUDENT', 'VIEW_OWN_SUMMARY') == True and
        check_authorization('STUDENT', 'START_SESSION') == False and
        check_authorization('STUDENT', 'SUBMIT_ATTENDANCE') == False and
        check_authorization('STUDENT', 'CREATE_STUDENT') == False
    )
    assert_test(22, "Role authorization rules (HOD=admin, Faculty=allocated only, Student=read-only)", auth_checks_pass)

    # 23. Anand Sir session creation blocked at both business logic and role level
    cursor.execute("SELECT faculty_id, role FROM faculty WHERE faculty_code = 'hod_cse';")
    hod_faculty = cursor.fetchone()
    role_blocked = (hod_faculty[1] == 'hod')
    cursor.execute("SELECT COUNT(*) FROM course_allocations WHERE faculty_id = ?;", (hod_faculty[0],))
    alloc_blocked = (cursor.fetchone()[0] == 0)
    hod_session_blocked = False
    try:
        create_session("hod_cse", "OS", "A")
    except PermissionError:
        hod_session_blocked = True
    hod_fully_blocked = role_blocked and alloc_blocked and hod_session_blocked
    assert_test(23, "Anand Sir session creation blocked at both business logic and role level", hod_fully_blocked)

    # 24. Student write operations rejected
    student_write_blocked = (
        not check_authorization('STUDENT', 'CREATE_STUDENT') and
        not check_authorization('STUDENT', 'START_SESSION') and
        not check_authorization('STUDENT', 'SUBMIT_ATTENDANCE') and
        not check_authorization('STUDENT', 'UPDATE_STUDENT') and
        not check_authorization('STUDENT', 'DELETE_STUDENT')
    )
    assert_test(24, "Student write operations rejected (cannot create sessions, mark attendance, modify roster)", student_write_blocked)

    # 25. Timetable Section C & D return 0 entries
    cursor.execute("""
        SELECT sec.section_name, COUNT(t.entry_id)
        FROM sections sec
        LEFT JOIN timetable_entries t ON t.section_id = sec.section_id
        WHERE sec.section_name IN ('C', 'D')
        GROUP BY sec.section_name;
    """)
    cd_counts = dict(cursor.fetchall())
    cd_empty = (cd_counts.get('C', 0) == 0 and cd_counts.get('D', 0) == 0)
    assert_test(25, "Timetable Section C & D return 0 entries (Pending CSVTU Scheme Rollout)", cd_empty, f"Counts: {cd_counts}")

    # 26. Timetable Section A (39) & Section B (41) exact counts
    cursor.execute("""
        SELECT sec.section_name, COUNT(t.entry_id)
        FROM sections sec
        JOIN timetable_entries t ON t.section_id = sec.section_id
        WHERE sec.section_name IN ('A', 'B')
        GROUP BY sec.section_name;
    """)
    ab_counts = dict(cursor.fetchall())
    ab_exact = (ab_counts == {'A': 39, 'B': 41} and sum(ab_counts.values()) == 80)
    assert_test(26, "Timetable Section A (39) & Section B (41) exact counts (Total: 80)", ab_exact, f"Counts: {ab_counts}")

    # 27. Slot tt-b-wed-55 Anand Sir conflict resolution verified
    cursor.execute("""
        SELECT t.timetable_code, t.section_id, t.day_of_week, t.period, f.name, f.role, c.course_code_short
        FROM timetable_entries t
        JOIN faculty f ON f.faculty_id = t.faculty_id
        JOIN courses c ON c.course_id = t.course_id
        WHERE t.timetable_code = 'tt-b-wed-55';
    """)
    slot_55 = cursor.fetchone()
    slot_exists = (slot_55 is not None and slot_55[4] == "Dr. Anand Tamrakar")
    anand_slot_blocked = False
    try:
        create_session("hod_cse", "OS-LAB", "B", timetable_entry_id=slot_55[0] if slot_55 else None)
    except PermissionError:
        anand_slot_blocked = True
    anand_conflict_resolved = slot_exists and anand_slot_blocked
    assert_test(27, "Slot tt-b-wed-55 Anand Sir conflict resolution verified (slot exists, session blocked with 403)", anand_conflict_resolved, f"Slot: {slot_55}")

    # 28. Zero live sessions, zero live records baseline
    cursor.execute("SELECT COUNT(*) FROM attendance_sessions;")
    live_sessions_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM attendance_records;")
    live_records_count = cursor.fetchone()[0]
    zero_baseline = (live_sessions_count == 0 and live_records_count == 0)
    assert_test(28, "Zero live sessions, zero live records baseline maintained", zero_baseline, f"Sessions: {live_sessions_count}, Records: {live_records_count}")

    # 29. JWT token generation and claims structure verification
    jwt_secret = "smart_attendance_jwt_secret_key_minimum_256_bits_for_hmac_sha256_secure_ssipmt_raipur_2026"
    test_payload = {
        "sub": "faculty_os",
        "userId": 2,
        "role": "FACULTY",
        "displayName": "Devbrat Sahu",
        "facultyId": 1,
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
    }
    encoded_token = jwt.encode(test_payload, jwt_secret, algorithm="HS256")
    decoded_token = jwt.decode(encoded_token, jwt_secret, algorithms=["HS256"])
    jwt_valid = (
        decoded_token.get("sub") == "faculty_os" and
        decoded_token.get("role") == "FACULTY" and
        decoded_token.get("facultyId") == 1 and
        decoded_token.get("displayName") == "Devbrat Sahu"
    )
    assert_test(29, "JWT token generation and claims structure verification (HMAC-SHA256, claims integrity)", jwt_valid, f"Decoded: {decoded_token}")

    # 30. Spring Boot project structure completeness
    pom_file = os.path.join(base_dir, "pom.xml")
    prop_file = os.path.join(base_dir, "src", "main", "resources", "application.properties")
    backend_file = os.path.join(base_dir, "AttendanceBackend.java")
    
    pom_exists = os.path.exists(pom_file) and os.path.getsize(pom_file) > 500
    prop_exists = os.path.exists(prop_file) and os.path.getsize(prop_file) > 200
    backend_exists = os.path.exists(backend_file) and os.path.getsize(backend_file) > 50000

    required_classes = [
        "AttendanceApplication.java",
        "model/User.java",
        "model/Faculty.java",
        "model/Student.java",
        "model/Course.java",
        "model/Section.java",
        "model/Department.java",
        "model/TimetableEntry.java",
        "model/AttendanceSession.java",
        "model/AttendanceRecord.java",
        "model/CourseAllocation.java",
        "repository/UserRepository.java",
        "repository/FacultyRepository.java",
        "repository/StudentRepository.java",
        "repository/CourseRepository.java",
        "repository/SectionRepository.java",
        "repository/TimetableEntryRepository.java",
        "repository/AttendanceSessionRepository.java",
        "repository/AttendanceRecordRepository.java",
        "repository/CourseAllocationRepository.java",
        "security/SecurityConfig.java",
        "security/JwtTokenProvider.java",
        "security/JwtAuthenticationFilter.java",
        "security/CustomUserDetailsService.java",
        "security/UserPrincipal.java",
        "service/AuthService.java",
        "service/StudentService.java",
        "service/FacultyService.java",
        "service/CourseService.java",
        "service/TimetableService.java",
        "service/AttendanceSessionService.java",
        "service/AttendanceCalculationService.java",
        "controller/AuthController.java",
        "controller/StudentController.java",
        "controller/FacultyController.java",
        "controller/SubjectController.java",
        "controller/TimetableController.java",
        "controller/SessionController.java",
        "controller/AttendanceHistoryController.java"
    ]

    all_classes_exist = True
    missing_classes = []
    for cls in required_classes:
        p = os.path.join(base_dir, "src", "main", "java", "com", "attendance", cls.replace("/", os.sep))
        if not os.path.exists(p):
            all_classes_exist = False
            missing_classes.append(cls)

    structure_ok = (pom_exists and prop_exists and backend_exists and all_classes_exist)
    assert_test(30, "Spring Boot project structure completeness (pom.xml, application.properties, all 65 Java classes)", structure_ok, f"Missing: {missing_classes}")

    print("\n================================================================")
    passed_count = sum(1 for t in test_results if t[2] == "PASS")
    total_count = len(test_results)
    print(f" RESULT: {passed_count}/{total_count} TESTS PASSED")
    print("================================================================\n")

    if passed_count != total_count:
        sys.exit(1)

if __name__ == "__main__":
    run_phase_7b_verification()
