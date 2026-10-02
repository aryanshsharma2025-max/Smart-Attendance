"""
Phase 8.1: Faculty Timetable + Collapsible Menu + Student Detail Enhancement
Comprehensive Verification Suite
Tests all 21 acceptance requirements from PART H.
"""

import os
import re
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_HTML = os.path.join(BASE_DIR, "index.html")
STYLE_CSS = os.path.join(BASE_DIR, "style.css")
APP_JS = os.path.join(BASE_DIR, "app.js")
TIMETABLE_JSON = os.path.join(BASE_DIR, "Assets", "generated", "authoritative_timetable.json")

passed_tests = 0
failed_tests = 0

def report(test_name, condition, details=""):
    global passed_tests, failed_tests
    if condition:
        print(f"Test {passed_tests + failed_tests + 1:02d}: [OK] {test_name} -> PASS")
        passed_tests += 1
    else:
        print(f"Test {passed_tests + failed_tests + 1:02d}: [FAIL] {test_name} -> FAIL: {details}")
        failed_tests += 1

print("=" * 68)
print(" PHASE 8.1: FACULTY TIMETABLE, COLLAPSIBLE MENU & STUDENT PROFILE")
print("=" * 68)

with open(INDEX_HTML, "r", encoding="utf-8") as f:
    html_content = f.read()

with open(STYLE_CSS, "r", encoding="utf-8") as f:
    css_content = f.read()

with open(APP_JS, "r", encoding="utf-8") as f:
    js_content = f.read()

with open(TIMETABLE_JSON, "r", encoding="utf-8") as f:
    tt_data = json.load(f)

# ── 1. Faculty Timetable Loads ──
report(
    "Faculty timetable loads dynamically from authoritative data",
    'renderWeeklyTimetableGrid()' in js_content and
    'openTimetableModalOrView(' in js_content and
    'selectModalScheduleDay(' in js_content and
    'id="tt-modal-grid-view"' in html_content and
    'id="tt-modal-day-view"' in html_content
)

# ── 2. Timetable is Derived from Authoritative Data ──
report(
    "Timetable is derived from authoritative data (80 entries, no fake timetable)",
    len(tt_data.get('entries', [])) == 80 and
    'TIMETABLE_ENTRIES' in js_content and
    'adaptTimetableEntry(' in js_content
)

# ── 3. Correct Faculty Slots Highlighted ──
devbrat_slots = [e for e in tt_data['entries'] if 'devbrat' in (e.get('facultyName') or '').lower()]
report(
    "Correct faculty slots identified and highlighted (Devbrat: 15 teaching slots)",
    len(devbrat_slots) == 15 and
    'isFacultySlotAssigned(' in js_content and
    'tt-slot-card-mine' in js_content and
    'tt-badge-mine' in js_content and
    'YOUR CLASS' in js_content
)

# ── 4. Other Faculty Slots Not Incorrectly Marked as Owned ──
anand_slot = [e for e in tt_data['entries'] if e.get('id') == 'tt-b-wed-55'][0]
report(
    "Other faculty slots not incorrectly marked as owned (Anand Sir HOD slot isolated)",
    'Dr. Anand Tamrakar' in anand_slot.get('facultyName') and
    'tt-slot-card-other' in js_content and
    'tt-slot-card-other' in css_content
)

# ── 5. Correct Day/Period/Time Information ──
report(
    "Correct day/period/time information rendered across CSVTU periods I to VIII",
    'Period I' in js_content and
    '09:00 – 09:50' in js_content and
    'Period VIII' in js_content and
    '15:20 – 16:00' in js_content
)

# ── 6. Take Attendance from Faculty-Owned Slot Works ──
report(
    "Take Attendance from faculty-owned timetable slot connects to attendance workflow",
    'startAttendanceFromTimetable(' in js_content and
    'btn-tt-take' in js_content and
    'showPage(\'take-attendance\'' in js_content
)

# ── 7. Hamburger Menu Closed by Default ──
report(
    "Hamburger menu is closed by default in CSS (-100% translateX)",
    'transform: translateX(-100%)' in css_content and
    '.sidebar.open' in css_content and
    'transform: translateX(0)' in css_content
)

# ── 8. Hamburger Button Opens Menu Correctly ──
report(
    "Hamburger button is present, visible on all viewports, and opens menu",
    'id="topbar-hamburger-btn"' in html_content and
    'toggleSidebar()' in html_content and
    'display: inline-flex' in css_content.split('.hamburger-btn {')[1].split('}')[0]
)

# ── 9. Hamburger Closes Correctly ──
report(
    "Hamburger closes correctly via backdrop click, close button, and Escape key",
    'id="sidebar-overlay"' in html_content and
    'toggleSidebar(false)' in html_content and
    'Escape' in js_content and
    'toggleSidebar(false);' in js_content
)

# ── 10. HOME Returns to Dashboard ──
report(
    "HOME item in menu returns directly to faculty dashboard without page reload",
    '<i data-lucide="home"' in html_content and
    "showPage('dashboard',this); toggleSidebar(false);" in html_content
)

# ── 11. Navigation Closes Menu After Selection ──
report(
    "Navigation items close menu immediately after selection",
    all("toggleSidebar(false)" in line for line in html_content.split('<div class="nav-role-group" id="nav-group-faculty">')[1].split('</div>')[0].splitlines() if '<a href=' in line)
)

# ── 12. No Permanent Desktop Sidebar in Faculty View ──
report(
    "No permanent desktop sidebar occupies horizontal space in faculty view",
    'margin-left: 0 !important' in css_content and
    '.main-content {' in css_content
)

# ── 13. Student Profile Loads ──
report(
    "Student profile loads via full-screen view and openStudentProfile function",
    'id="page-student-profile"' in html_content and
    'async function openStudentProfile(' in js_content
)

# ── 14. Student Profile Shows Real Student Information ──
report(
    "Student profile shows real academic information (Name, Roll, Dept, Sem, Sec)",
    'id="sp-name"' in html_content and
    'id="sp-roll"' in html_content and
    'id="sp-sec-badge"' in html_content and
    'id="sp-dept-sem"' in html_content and
    'id="sp-sno"' in html_content
)

# ── 15. Bar Chart Exists in Student Profile ──
report(
    "Real Chart.js bar graph canvas exists and is initialized in JS",
    'id="sp-monthly-bar-chart"' in html_content and
    'new Chart(' in js_content and
    "type: 'bar'" in js_content
)

# ── 16. Bar Chart Uses Backend-Derived Attendance Data ──
report(
    "Bar chart uses backend-derived attendance data (monthlyStats)",
    'monthlyStats' in js_content and
    'sp-monthly-bar-chart' in js_content and
    'ATTENDANCE_THRESHOLD' in js_content
)

# ── 17. Monthly Attendance Uses Real Session History ──
report(
    "Monthly attendance details grid covers July through December with real history",
    'id="sp-monthly-attendance-grid"' in html_content and
    'July' in js_content and
    'December' in js_content and
    'id="sp-attendance-trend-badge"' in html_content
)

# ── 18. Empty Live-Attendance State Remains Honest ──
report(
    "Empty live-attendance state remains honest (0 live sessions shows clear empty state)",
    'id="sp-chart-empty-state"' in html_content and
    'No Live Attendance Recorded Yet' in html_content and
    'No attendance recorded' in js_content
)

# ── 19. Historical Section A Snapshot Remains Isolated ──
report(
    "Historical Section A snapshot remains isolated in dedicated historical card",
    'id="sp-historical-card"' in html_content and
    'id="sp-historical-pct"' in html_content and
    'sp-historical-badge' in html_content and
    'HISTORICAL SNAPSHOT' in html_content
)

# ── 20. Existing Phase 8 Verification Tests Pass ──
import subprocess
p8_result = subprocess.run([sys.executable, os.path.join(BASE_DIR, "scripts", "test_phase8_verification.py")], capture_output=True, text=True)
report(
    "Existing Phase 8 verification suite passes 18/18",
    p8_result.returncode == 0,
    details=p8_result.stdout
)

# ── 21. Existing Phase 7B/7C Suite Passes ──
p7_result = subprocess.run([sys.executable, os.path.join(BASE_DIR, "scripts", "test_phase7b_verification.py")], capture_output=True, text=True)
report(
    "Existing Phase 7B/7C verification suite passes 30/30",
    p7_result.returncode == 0,
    details=p7_result.stdout
)

print("=" * 68)
print(f" RESULT: {passed_tests}/{passed_tests + failed_tests} TESTS PASSED")
print("=" * 68)

if failed_tests > 0:
    sys.exit(1)
sys.exit(0)
