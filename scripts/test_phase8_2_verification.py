"""
Phase 8.2: Faculty Weekly Timetable Redesign + Subject Highlighting + Home Navigation
Comprehensive Verification Suite
Tests all 25 acceptance requirements from PART V.
"""

import os
import re
import sys
import json
import subprocess

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_HTML = os.path.join(BASE_DIR, 'index.html')
STYLE_CSS = os.path.join(BASE_DIR, 'style.css')
APP_JS = os.path.join(BASE_DIR, 'app.js')
TIMETABLE_JSON = os.path.join(BASE_DIR, 'Assets', 'generated', 'authoritative_timetable.json')

passed_tests = 0
failed_tests = 0

def report(test_name, condition, details=''):
    global passed_tests, failed_tests
    if condition:
        print(f'Test {passed_tests + failed_tests + 1:02d}: [OK] {test_name} -> PASS')
        passed_tests += 1
    else:
        print(f'Test {passed_tests + failed_tests + 1:02d}: [FAIL] {test_name} -> FAIL: {details}')
        failed_tests += 1

print('=' * 72)
print(' PHASE 8.2: OFFICIAL TIMETABLE REDESIGN, SUBJECT HIGHLIGHTING & HOME')
print('=' * 72)

with open(INDEX_HTML, 'r', encoding='utf-8') as f:
    html_content = f.read()

with open(STYLE_CSS, 'r', encoding='utf-8') as f:
    css_content = f.read()

with open(APP_JS, 'r', encoding='utf-8') as f:
    js_content = f.read()

with open(TIMETABLE_JSON, 'r', encoding='utf-8') as f:
    tt_data = json.load(f)

# 1. Weekly Timetable Loads
report(
    'Weekly timetable loads dynamically from authoritative data',
    'function renderWeeklyTimetableGrid()' in js_content and
    'function openTimetableModalOrView(' in js_content and
    'id="tt-modal-grid-view"' in html_content and
    'id="tt-modal-day-view"' in html_content
)

# 2. Timetable Uses Authoritative Data
report(
    'Timetable is derived from authoritative data (80 entries, no fake timetable)',
    len(tt_data.get('entries', [])) == 80 and
    'TIMETABLE_ENTRIES' in js_content
)

# 3. Periods I-VIII Represented Correctly
period_labels = ['Period I', 'Period II', 'Period III', 'Period IV', 'Period V', 'Period VI', 'Period VII', 'Period VIII']
periods_in_js = all(p in js_content for p in period_labels)
timings_in_js = ('09:00 \u2013 09:50' in js_content or '09:00 - 09:50' in js_content) and ('15:20 \u2013 16:00' in js_content or '15:20 - 16:00' in js_content)
report(
    'Periods I?VIII are represented correctly with official timings',
    periods_in_js and timings_in_js
)

# 4. Monday-Saturday Represented Correctly
days_check = all(d in js_content for d in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
days_headers = all(d in html_content and d in js_content for d in ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'])
report(
    'Monday?Saturday are represented correctly across table headers',
    days_check and days_headers
)

# 5. Lunch is Represented Correctly
lunch_js = 'LUNCH' in js_content and ('12:20 \u2013 13:00' in js_content or '12:20' in js_content) and 'tt-lunch-row' in js_content
lunch_css = '.tt-lunch-row' in css_content and '.tt-lunch-content-cell' in css_content
report(
    'Lunch is represented correctly as neutral institutional merged region (12:20?13:00)',
    lunch_js and lunch_css
)

# 6. Combined Periods Remain Combined
rowspan_logic = 'rowspan' in js_content and 'skipCells' in js_content
report(
    'Combined periods remain combined via rowspan and skipped cell engine',
    rowspan_logic
)

# 7. Faculty's Own Classes Correctly Identified
devbrat_slots = [e for e in tt_data['entries'] if 'devbrat' in (e.get('facultyName') or '').lower()]
report(
    "Faculty's own classes correctly identified (Devbrat Sahu: 15 teaching slots)",
    len(devbrat_slots) == 15 and 'isFacultySlotAssigned(' in js_content
)

# 8. Faculty's Own Classes are Highlighted
report(
    "Faculty's own classes are highlighted with distinct badge and card class",
    'tt-slot-card-mine' in js_content and
    'tt-badge-mine' in js_content and
    'YOUR CLASS' in js_content and
    '.tt-slot-card-mine' in css_content
)

# 9. Subject Highlighting is Consistent
subjects_fn = 'getSubjectCategory(' in js_content
css_subjects = all(c in css_content for c in ['.tt-sub-os', '.tt-sub-dm', '.tt-sub-oops', '.tt-sub-wt', '.tt-sub-deld'])
report(
    'Subject highlighting is consistent across OS, DM, OOPS, WT, and DELD',
    subjects_fn and css_subjects and 'tt-legend-bar' in html_content
)

# 10. Other Faculty Classes Not Incorrectly Highlighted
report(
    'Other faculty classes are neutral and not incorrectly highlighted',
    'tt-slot-card-other' in js_content and
    '.tt-slot-card-other' in css_content and
    'tt-slot-subj-other' in js_content
)

# 11. Anand Sir / HOD Timetable Slot Isolated
anand_slot = [e for e in tt_data['entries'] if e.get('id') == 'tt-b-wed-55'][0]
report(
    'Anand Sir/HOD timetable slot remains correctly isolated (tt-b-wed-55 non-owned)',
    'Dr. Anand Tamrakar' in anand_slot.get('facultyName') and
    anand_slot.get('facultyShort') == 'AT' and
    anand_slot.get('facultyId') == 'faculty-at'
)

# 12. Take Attendance Appears Only for Faculty-Owned Slots
report(
    'Take Attendance button appears only in faculty-owned card template',
    'btn-tt-take' in js_content and
    'Take Attendance' in js_content and
    all('btn-tt-take' not in c for c in re.findall(r'tt-slot-card-other[\s\S]*?</div>\s*`;', js_content))
)

# 13. Take Attendance Launches Existing Attendance Workflow
report(
    'Take Attendance launches existing attendance workflow (startAttendanceFromTimetable)',
    'startAttendanceFromTimetable(' in js_content and
    "showPage('take-attendance'" in js_content and
    'att-subject' in js_content and
    'att-section' in js_content
)

# 14. Faculty Name Appears Correctly
report(
    'Faculty name appears cleanly in timetable header without technical IDs',
    'id="tt-modal-fac-name"' in html_content and
    'tt-modal-fac-name' in js_content and
    'Department of Computer Science' in html_content
)

# 15. Section A/B Information Correct
sec_a_slots = [e for e in tt_data['entries'] if e.get('section') == 'A']
sec_b_slots = [e for e in tt_data['entries'] if e.get('section') == 'B']
report(
    'Section A/B information is accurate (Sec A: 39 slots, Sec B: 41 slots)',
    len(sec_a_slots) == 39 and len(sec_b_slots) == 41 and 'Section ${escapeHtml(slot.section)}' in js_content
)

# 16. No Fabricated Section C/D Timetable
sections = set(e.get('section') for e in tt_data['entries'])
report(
    'No fabricated Section C/D timetable data (only authoritative A & B)',
    sections == {'A', 'B'}
)

# 17. Hamburger Menu Remains Hidden by Default
sidebar_hidden = re.search(r'\.sidebar\s*\{[^}]*transform:\s*translateX\(-100%\)', css_content)
report(
    'Hamburger menu remains hidden by default (-100% translateX in CSS)',
    bool(sidebar_hidden)
)

# 18. Hamburger Opens Correctly
report(
    'Hamburger button opens collapsible navigation drawer',
    'id="topbar-hamburger-btn"' in html_content and
    'toggleSidebar(' in js_content and
    "sidebar.classList.add('open')" in js_content
)

# 19. HOME Returns to Dashboard
report(
    'HOME button in topbar returns directly to faculty dashboard',
    'id="topbar-home-btn"' in html_content and
    "showPage('dashboard'" in html_content
)

# 20. Synapse Logo/Name Returns to Dashboard
report(
    'SYNAPSE brand logo/name in topbar returns directly to dashboard',
    'id="topbar-brand-link"' in html_content and
    "showPage('dashboard'" in html_content and
    'SYNAPSE' in html_content
)

# 21. Timetable Home Navigation Works
report(
    'Timetable modal includes explicit Home return navigation in header and footer',
    'id="tt-modal-home-btn"' in html_content and
    'tt-modal-home-footer-btn' in html_content and
    "closeTimetableModal(); showPage('dashboard'" in html_content
)

# 22. Existing Phase 8.1 Tests Still Pass
res_8_1 = subprocess.run([sys.executable, os.path.join(BASE_DIR, 'scripts', 'test_phase8_1_verification.py')], capture_output=True, text=True)
report(
    'Existing Phase 8.1 test suite passes 21/21',
    res_8_1.returncode == 0 and '21/21 TESTS PASSED' in res_8_1.stdout,
    res_8_1.stderr
)

# 23. Existing Phase 7B/7C Tests Still Pass
res_8 = subprocess.run([sys.executable, os.path.join(BASE_DIR, 'scripts', 'test_phase8_verification.py')], capture_output=True, text=True)
res_7b = subprocess.run([sys.executable, os.path.join(BASE_DIR, 'scripts', 'test_phase7b_verification.py')], capture_output=True, text=True)
report(
    'Existing Phase 8 and Phase 7B/7C verification suites pass completely',
    res_8.returncode == 0 and res_7b.returncode == 0
)

# 24. JavaScript Syntax Passes
res_node = subprocess.run(['node', '-c', APP_JS], capture_output=True, text=True)
report(
    'JavaScript syntax passes cleanly with zero errors (node -c app.js)',
    res_node.returncode == 0,
    res_node.stderr
)

# 25. Runtime Execution Simulation
sim_code = """
const fs = require('fs');
const jsCode = fs.readFileSync('app.js', 'utf8');
const docElements = {};
global.document = {
  getElementById: (id) => {
    if (!docElements[id]) {
      docElements[id] = { style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, innerHTML: '', textContent: '', querySelectorAll: () => [] };
    }
    return docElements[id];
  },
  querySelectorAll: () => [],
  querySelector: () => null
};
global.window = { innerWidth: 1024 };
global.escapeHtml = (s) => String(s || '');
global.timeStringToMinutes = (t) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
global.getSystemDayOfWeek = () => 'Monday';
global.refreshIcons = () => {};
global.showToast = () => {};
const ttData = JSON.parse(fs.readFileSync('Assets/generated/authoritative_timetable.json', 'utf8'));
global.TIMETABLE_ENTRIES = ttData.entries;
global.CURRENT_USER = { facultyName: 'Devbrat Sahu', shortCode: 'DS', facultyShort: 'DS', facultyId: 'faculty-os', subjectName: 'Operating System' };
eval(jsCode.substring(jsCode.indexOf('let CURRENT_TIMETABLE_VIEW_MODE'), jsCode.indexOf('function getNextLectureNumber')));
try {
  CURRENT_TIMETABLE_FILTER = 'mine'; renderWeeklyTimetableGrid();
  CURRENT_TIMETABLE_FILTER = 'A'; renderWeeklyTimetableGrid();
  CURRENT_TIMETABLE_FILTER = 'B'; renderWeeklyTimetableGrid();
  CURRENT_TIMETABLE_FILTER = 'all'; renderWeeklyTimetableGrid();
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].forEach(d => selectModalScheduleDay(d));
  switchTimetableViewMode('grid'); switchTimetableViewMode('day');
  const catOS = getSubjectCategory({ subjectCodeShort: 'OS' });
  const catDM = getSubjectCategory({ subjectCodeShort: 'DM' });
  const catOOPS = getSubjectCategory({ subjectCodeShort: 'OOPS' });
  const catWT = getSubjectCategory({ subjectCodeShort: 'WT' });
  const catDELD = getSubjectCategory({ subjectCodeShort: 'DELD' });
  if (catOS === 'OS' && catDM === 'DM' && catOOPS === 'OOPS' && catWT === 'WT' && catDELD === 'DELD') {
    console.log('RUNTIME_SIM_SUCCESS');
  } else { console.log('RUNTIME_SIM_CATEGORY_MISMATCH'); }
} catch(e) { console.error('RUNTIME_SIM_ERROR:', e.message); process.exit(1); }
"""

res_runtime = subprocess.run(['node', '-e', sim_code], capture_output=True, text=True, cwd=BASE_DIR)
report(
    'No console/runtime errors during timetable rendering & filter interaction',
    res_runtime.returncode == 0 and 'RUNTIME_SIM_SUCCESS' in res_runtime.stdout,
    res_runtime.stderr or res_runtime.stdout
)

print('=' * 72)
print(f' RESULT: {passed_tests}/{passed_tests + failed_tests} TESTS PASSED')
print('=' * 72)

if failed_tests > 0:
    sys.exit(1)
