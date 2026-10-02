import sqlite3
import re
import os
import sys

def run_phase_7a_verification():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    print("================================================================")
    print(" PHASE 7A: BACKEND FOUNDATION & CONTRACT VERIFICATION SUITE")
    print("================================================================\n")

    # Read the authoritative attendance_schema.sql
    with open('attendance_schema.sql', 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # Convert MySQL dialect to SQLite compatible syntax for in-memory execution
    sqlite_sql = sql_content
    sqlite_sql = re.sub(r'CREATE DATABASE IF NOT EXISTS \w+;', '', sqlite_sql)
    sqlite_sql = re.sub(r'USE \w+;', '', sqlite_sql)
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

    # Service simulation helpers with full server-side authorization and transaction management
    def create_session(faculty_code, course_code, section_name, session_date="2026-08-17", timetable_entry_id=None):
        # 1. Resolve faculty
        cursor.execute("SELECT faculty_id, role, name FROM faculty WHERE faculty_code = ?;", (faculty_code,))
        f_row = cursor.fetchone()
        if not f_row:
            raise Exception("Faculty not found")
        f_id, f_role, f_name = f_row
        if f_role == 'hod':
            raise PermissionError("403 Forbidden: HOD is not authorized to create attendance sessions")

        # 2. Resolve course
        cursor.execute("SELECT course_id, course_name FROM courses WHERE course_code_short = ?;", (course_code,))
        c_row = cursor.fetchone()
        if not c_row:
            raise Exception("Course not found")
        c_id, c_name = c_row

        # 3. Resolve section
        cursor.execute("SELECT section_id FROM sections WHERE section_name = ?;", (section_name,))
        s_row = cursor.fetchone()
        if not s_row:
            raise Exception("Section not found")
        s_id = s_row[0]

        # 4. Check Course Allocation
        cursor.execute("SELECT status FROM course_allocations WHERE faculty_id = ? AND course_id = ? AND section_id = ?;", (f_id, c_id, s_id))
        alloc_row = cursor.fetchone()
        if not alloc_row:
            raise PermissionError(f"403 Forbidden: Faculty {f_name} is not authorized for {course_code} in Section {section_name}")
        if alloc_row[0] != 'CONFIRMED':
            raise PermissionError(f"403 Forbidden: Allocation for {course_code} Section {section_name} is PENDING")

        # 5. Calculate next lecture number (subject + section scoped)
        cursor.execute("SELECT COALESCE(MAX(lecture_number), 0) + 1 FROM attendance_sessions WHERE course_id = ? AND section_id = ? AND status != 'CANCELLED';", (c_id, s_id))
        next_lecture = cursor.fetchone()[0]

        # 6. Insert session in RECORDING status
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
    except PermissionError as pe:
        devbrat_dm_blocked = True
        err_msg = str(pe)
    assert_test(9, "Devbrat cannot create DM-A (rejected with 403 Forbidden)", devbrat_dm_blocked, "Devbrat + DM was not blocked")

    # 10. Devbrat cannot create OS-C (403 Authorization Failure - Allocation Pending)
    devbrat_osc_blocked = False
    try:
        create_session('faculty_os', 'OS', 'C')
    except PermissionError as pe:
        devbrat_osc_blocked = True
        err_msg = str(pe)
    assert_test(10, "Devbrat cannot create OS-C (rejected with 403 Forbidden - Section Pending)", devbrat_osc_blocked, "Devbrat + OS + Section C was not blocked")

    # Save attendance helper with transactional integrity
    def save_attendance(session_id, faculty_code, marks):
        # Transaction begins
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

        # Get roster
        cursor.execute("SELECT student_id, roll_number FROM students WHERE section_id = ?;", (sec_id,))
        roster = cursor.fetchall()
        roster_map = {r[0]: r[1] for r in roster}
        roster_rolls = {r[1]: r[0] for r in roster}

        # Validations
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

        # Persist transactionally
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
    # Create second session for OS-A -> must be Lecture 2
    sess_os_a_2, lec_os_a_2 = create_session('faculty_os', 'OS', 'A')
    # Notice: OS-B session was created earlier and is Lecture 1.
    # Create session for DM-A -> must be Lecture 1
    sess_dm_a, lec_dm_a = create_session('faculty_dm', 'DM', 'A')
    scoping_ok = (lec_os_a_2 == 2 and lec_os_b == 1 and lec_dm_a == 1)
    assert_test(11, "Lecture numbering is subject+section scoped (OS-A:2, OS-B:1, DM-A:1)", scoping_ok, f"OS-A-2={lec_os_a_2}, OS-B={lec_os_b}, DM-A={lec_dm_a}")

    # 12. duplicate session numbers rejected
    dup_session_rejected = False
    try:
        # Attempt to manually insert a session with duplicate (course_id=1, section_id=1, lecture_number=1)
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
    assert_test(13, "Duplicate attendance records rejected (enforced by DB constraint uq_session_student)", dup_record_rejected, "DB allowed duplicate attendance record for same student and session")

    # 14. invalid student-section rejected
    alien_student_rejected = False
    cursor.execute("SELECT student_id FROM students WHERE section_id = 2 LIMIT 1;")
    sec_b_student_id = cursor.fetchone()[0]
    bad_marks_alien = [{'student_id': s[0], 'status': 'PRESENT'} for s in sec_a_students[:-1]]
    bad_marks_alien.append({'student_id': sec_b_student_id, 'status': 'PRESENT'}) # inject alien student from Sec B
    try:
        save_attendance(sess_os_a_2, 'faculty_os', bad_marks_alien)
    except ValueError as ve:
        alien_student_rejected = True
    assert_test(14, "Invalid student-section rejected (alien student submission blocked)", alien_student_rejected, "Alien student was not blocked")

    # 15. incomplete attendance rejected
    incomplete_rejected = False
    bad_marks_short = [{'student_id': s[0], 'status': 'PRESENT'} for s in sec_a_students[:30]] # only 30 students out of 60
    try:
        save_attendance(sess_os_a_2, 'faculty_os', bad_marks_short)
    except ValueError as ve:
        incomplete_rejected = True
    assert_test(15, "Incomplete attendance rejected (must account for all rostered students)", incomplete_rejected, "Incomplete roster was not blocked")

    # 16. transactional rollback works
    # We test that when save_attendance encounters an error (e.g. invalid status), no partial records remain and session status remains RECORDING
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
    # Let's verify student 1 (who was PRESENT) has 1/1 = 100%, student 60 (who was ABSENT) has 0/1 = 0%
    # And section A has 50 present out of 60 total = 83.33%
    st1_id = sec_a_students[0][0]
    st60_id = sec_a_students[59][0]
    cursor.execute("""
        SELECT 
            COUNT(DISTINCT ses.session_id) AS total_sessions,
            COUNT(DISTINCT CASE WHEN ar.status = 'PRESENT' THEN ar.record_id END) AS present_count
        FROM attendance_sessions ses
        JOIN attendance_records ar ON ar.session_id = ses.session_id
        WHERE ar.student_id = ? AND ses.status = 'COMPLETED';
    """, (st1_id,))
    st1_tot, st1_pres = cursor.fetchone()
    st1_pct = (st1_pres * 100.0) / st1_tot if st1_tot > 0 else 0.0

    cursor.execute("""
        SELECT 
            COUNT(DISTINCT ses.session_id) AS total_sessions,
            COUNT(DISTINCT CASE WHEN ar.status = 'PRESENT' THEN ar.record_id END) AS present_count
        FROM attendance_sessions ses
        JOIN attendance_records ar ON ar.session_id = ses.session_id
        WHERE ar.student_id = ? AND ses.status = 'COMPLETED';
    """, (st60_id,))
    st60_tot, st60_pres = cursor.fetchone()
    st60_pct = (st60_pres * 100.0) / st60_tot if st60_tot > 0 else 0.0

    cursor.execute("""
        SELECT 
            COUNT(ar.record_id) AS total_marks,
            SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) AS total_present
        FROM attendance_sessions ses
        JOIN attendance_records ar ON ar.session_id = ses.session_id
        WHERE ses.section_id = 1 AND ses.status = 'COMPLETED';
    """)
    sec_marks, sec_present = cursor.fetchone()
    sec_pct = round((sec_present * 100.0) / sec_marks, 2)

    calc_ok = (st1_pct == 100.0 and st60_pct == 0.0 and sec_pct == 83.33)
    assert_test(17, "Completed session produces correct attendance (Student:100% & 0%, Section:83.33%)", calc_ok, f"st1={st1_pct}%, st60={st60_pct}%, sec={sec_pct}%")

    # 18. recording session excluded from statistics
    # sess_os_a_2 is in RECORDING status. Check that it doesn't affect statistics!
    cursor.execute("SELECT COUNT(*) FROM attendance_sessions WHERE status = 'RECORDING';")
    rec_count = cursor.fetchone()[0]
    cursor.execute("""
        SELECT COUNT(*)
        FROM attendance_sessions ses
        JOIN attendance_records ar ON ar.session_id = ses.session_id
        WHERE ses.status = 'RECORDING';
    """)
    rec_records = cursor.fetchone()[0]
    cursor.execute("""
        SELECT COUNT(*) FROM attendance_sessions ses WHERE ses.status = 'COMPLETED';
    """)
    comp_count = cursor.fetchone()[0]
    stats_ok = (rec_count > 0 and rec_records == 0 and comp_count == 1)
    assert_test(18, "Recording session excluded from statistics (completed sessions only)", stats_ok, f"Recording sessions: {rec_count}, Completed: {comp_count}")

    # 19. initial live state is zero
    # Test on a fresh DB instance that initial sessions and records are 0
    fresh_db = sqlite3.connect(':memory:')
    fresh_cursor = fresh_db.cursor()
    fresh_cursor.executescript(sqlite_sql)
    fresh_cursor.execute("SELECT COUNT(*) FROM attendance_sessions;")
    init_sessions = fresh_cursor.fetchone()[0]
    fresh_cursor.execute("SELECT COUNT(*) FROM attendance_records;")
    init_records = fresh_cursor.fetchone()[0]
    init_ok = (init_sessions == 0 and init_records == 0)
    assert_test(19, "Initial live state is zero (0 live sessions, 0 live attendance records)", init_ok, f"Sessions: {init_sessions}, Records: {init_records}")

    print("\n================================================================")
    passed_count = sum(1 for r in test_results if r[2] == "PASS")
    total_count = len(test_results)
    print(f" RESULT: {passed_count}/{total_count} TESTS PASSED")
    print("================================================================")
    return passed_count == total_count

if __name__ == '__main__':
    success = run_phase_7a_verification()
    sys.exit(0 if success else 1)
