// ============================================================
//  SMARTATTEND — Production-Grade Departmental Application
//  Frontend Architecture: Vanilla ES6+, Enterprise SaaS Standard
//  Handles: Theme, Routing, Attendance Overview, Take Attendance
//           Workspace, Student Drawer, Analytics, Reports, Sessions
// ============================================================

'use strict';

const API_BASE = 'http://localhost:8080/api'; // Mock endpoint base

// ── ICON UTILITY ─────────────────────────────────────────────
function refreshIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

// ── THEME CONTROLLER ─────────────────────────────────────────
function initTheme() {
  const savedTheme = localStorage.getItem('smartattend_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('smartattend_theme', newTheme);
  updateThemeIcon(newTheme);
  updateChartThemes(newTheme);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  btn.innerHTML = theme === 'dark'
    ? '<i data-lucide="sun" class="icon-sm"></i>'
    : '<i data-lucide="moon" class="icon-sm"></i>';
  refreshIcons();
}

initTheme();

// ── MOCK DATA LAYER (SYNAPSE EXTRACTED DEPARTMENTAL ENROLLMENT) ────

const STUDENTS = (typeof SYNAPSE_STUDENTS !== 'undefined' && SYNAPSE_STUDENTS.length > 0)
  ? [...SYNAPSE_STUDENTS]
  : [
      { id: 1, name: 'Aarohee Sharma', roll: '21CSE001', dept: 'CSE', sem: 2, sec: 'A', pct: 85, lastPresent: '02 Sep 2026', email: 'aarohee.sharma@student.edu' },
      { id: 2, name: 'Aarushi Shrivas', roll: '21CSE002', dept: 'CSE', sem: 2, sec: 'A', pct: 92, lastPresent: '02 Sep 2026', email: 'aarushi.shrivas@student.edu' },
      { id: 3, name: 'Aarvy Agrawal', roll: '21CSE003', dept: 'CSE', sem: 2, sec: 'A', pct: 88, lastPresent: '02 Sep 2026', email: 'aarvy.agrawal@student.edu' },
      { id: 32, name: 'Aryansh Sharma', roll: '21CSE032', dept: 'CSE', sem: 2, sec: 'A', pct: 84.6, lastPresent: '02 Sep 2026', email: 'aryansh.sharma@student.edu' },
      { id: 130, name: 'Aaditya Khosla', roll: '21IT001', dept: 'IT', sem: 2, sec: 'A', pct: 80, lastPresent: '02 Sep 2026', email: 'aaditya.khosla@student.edu' },
    ];

const STUDENT_MAP = {};
STUDENTS.forEach(s => {
  STUDENT_MAP[s.roll] = s;
  STUDENT_MAP[s.id] = s;
});
// Backwards compatibility alias for internal lookups
const RFID_MAP = STUDENT_MAP;

// Recent Classroom Attendance Records
const RECENT_ATTENDANCE_LOGS = [
  { name: 'Aryansh Sharma',  roll: '21CSE032', course: 'CSE301 — Data Structures', time: '09:02 AM', status: 'present', markedBy: 'Dr. Anand Tamrakar' },
  { name: 'Aarohee Sharma',  roll: '21CSE001', course: 'CSE301 — Data Structures', time: '09:03 AM', status: 'present', markedBy: 'Dr. Anand Tamrakar' },
  { name: 'Aarvy Agrawal',   roll: '21CSE003', course: 'CSE301 — Data Structures', time: '09:05 AM', status: 'present', markedBy: 'Dr. Anand Tamrakar' },
  { name: 'Aaryan Lodhi',    roll: '21CSE004', course: 'CSE301 — Data Structures', time: '09:05 AM', status: 'present', markedBy: 'Dr. Anand Tamrakar' },
  { name: 'Aastha Awasthi',  roll: '21CSE005', course: 'CSE301 — Data Structures', time: '09:06 AM', status: 'absent',  markedBy: 'Dr. Anand Tamrakar' },
  { name: 'Aaditya Khosla',  roll: '21IT001',  course: 'IT201 — Python Programming',time: '11:04 AM', status: 'present', markedBy: 'Dr. Mehta' },
];
// Backwards compatibility
const RECENT_SCANS = RECENT_ATTENDANCE_LOGS;

const REPORT_DATA = [
  { roll: '21CSE001', name: 'Aarav Sharma',  total: 40, attended: 34, absent: 6,  pct: 85, status: 'good' },
  { roll: '21CSE002', name: 'Anita Patel',   total: 40, attended: 37, absent: 3,  pct: 92, status: 'good' },
  { roll: '21CSE003', name: 'Suresh Verma',  total: 40, attended: 26, absent: 14, pct: 65, status: 'risk' },
  { roll: '21CSE004', name: 'Divya Nair',    total: 40, attended: 35, absent: 5,  pct: 88, status: 'good' },
  { roll: '21CSE005', name: 'Rohan Das',     total: 40, attended: 32, absent: 8,  pct: 80, status: 'good' },
  { roll: '21CSE006', name: 'Sneha Gupta',   total: 40, attended: 29, absent: 11, pct: 72, status: 'risk' },
  { roll: '21CSE007', name: 'Arjun Mehta',   total: 40, attended: 38, absent: 2,  pct: 95, status: 'good' },
  { roll: '21ECE001', name: 'Meena Joshi',   total: 38, attended: 31, absent: 7,  pct: 82, status: 'good' },
];

const SESSIONS_DATA = [
  { id: 1, course: 'CSE301 — Data Structures & Algorithms', dept: 'CSE', sem: 3, sec: 'A', room: 'Room 204', time: '09:00–10:00', date: 'Today', faculty: 'Dr. Priya Sharma', pct: 93, status: 'completed' },
  { id: 2, course: 'CSE401 — Computer Networks', room: 'Room 101', dept: 'CSE', sem: 4, sec: 'A', time: '10:30–11:30', date: 'Today', faculty: 'Prof. Arjun Mehta', pct: 88, status: 'active' },
  { id: 3, course: 'ECE302 — Digital Signal Processing', room: 'Lab 3', dept: 'ECE', sem: 3, sec: 'A', time: '11:00–12:00', date: 'Today', faculty: 'Dr. Kavita Rao', pct: 85, status: 'scheduled' },
  { id: 4, course: 'CSE302 — Object Oriented Programming', room: 'Room 204', dept: 'CSE', sem: 3, sec: 'B', time: '09:00–10:00', date: 'Yesterday', faculty: 'Dr. Priya Sharma', pct: 90, status: 'completed' },
];

const COURSE_CATALOG = {
  'CSE': {
    '1': ['CSE101 — Programming Fundamentals in C', 'MAT101 — Engineering Mathematics I'],
    '2': ['CSE201 — Object Oriented Concepts', 'MAT201 — Engineering Mathematics II'],
    '3': ['CSE301 — Data Structures & Algorithms', 'CSE302 — Object Oriented Programming', 'MAT301 — Discrete Mathematics'],
    '4': ['CSE401 — Computer Networks', 'CSE402 — Database Management Systems', 'CSE403 — Operating Systems'],
    '5': ['CSE501 — Theory of Computation', 'CSE502 — Software Engineering', 'CSE503 — Web Technologies'],
    '6': ['CSE601 — Artificial Intelligence', 'CSE602 — Cloud Computing', 'CSE603 — Compiler Design'],
    '7': ['CSE701 — Machine Learning', 'CSE702 — Cryptography & Network Security'],
    '8': ['CSE801 — Deep Learning', 'CSE802 — Distributed Systems']
  },
  'ECE': {
    '1': ['ECE101 — Basic Electronics Engineering', 'MAT101 — Engineering Mathematics I'],
    '2': ['ECE201 — Network Theory & Circuit Analysis', 'MAT201 — Engineering Mathematics II'],
    '3': ['ECE301 — Electronic Devices & Circuits', 'ECE302 — Digital Signal Processing'],
    '4': ['ECE401 — Analog Communication Systems', 'ECE402 — Microprocessors & Microcontrollers'],
    '5': ['ECE501 — VLSI Design', 'ECE502 — Linear Control Systems'],
    '6': ['ECE601 — Wireless Communication', 'ECE602 — Embedded Systems'],
    '7': ['ECE701 — Optical Fiber Communication', 'ECE702 — Microwave Engineering'],
    '8': ['ECE801 — Satellite Communication', 'ECE802 — Radar Engineering']
  },
  'ME': {
    '1': ['ME101 — Engineering Mechanics', 'MAT101 — Engineering Mathematics I'],
    '2': ['ME201 — Materials Science & Metallurgy', 'MAT201 — Engineering Mathematics II'],
    '3': ['ME301 — Engineering Thermodynamics', 'ME302 — Fluid Mechanics & Machinery'],
    '4': ['ME401 — Kinematics of Machinery', 'ME402 — Manufacturing Technology'],
    '5': ['ME501 — Heat & Mass Transfer', 'ME502 — Dynamics of Machines'],
    '6': ['ME601 — Design of Machine Elements', 'ME602 — Automobile Engineering'],
    '7': ['ME701 — CAD/CAM & Automation', 'ME702 — Refrigeration & Air Conditioning'],
    '8': ['ME801 — Power Plant Engineering', 'ME802 — Industrial Robotics']
  },
  'IT': {
    '1': ['IT101 — Fundamentals of Information Tech', 'MAT101 — Engineering Mathematics I'],
    '2': ['IT201 — Data Structures with Java', 'MAT201 — Engineering Mathematics II'],
    '3': ['IT301 — Data Structures & Algorithms', 'IT302 — Digital Logic Design'],
    '4': ['IT401 — Computer Organization', 'IT402 — Design & Analysis of Algorithms'],
    '5': ['IT501 — Full Stack Web Development', 'IT502 — Database Engineering'],
    '6': ['IT601 — Information & Cyber Security', 'IT602 — Cloud Architecture'],
    '7': ['IT701 — Big Data Analytics', 'IT702 — Mobile Application Development'],
    '8': ['IT801 — Internet of Things & Edge AI', 'IT802 — DevOps Practices']
  }
};

const CLASS_ROSTERS = {
  'CSE_3_A': [
    { id: 101, roll: '21CSE001', name: 'Aarav Sharma',   pct: 85, lastPresent: '02 Sep 2026', email: 'aarav@student.edu' },
    { id: 102, roll: '21CSE002', name: 'Anita Patel',    pct: 92, lastPresent: '02 Sep 2026', email: 'anita@student.edu' },
    { id: 103, roll: '21CSE003', name: 'Suresh Verma',   pct: 64, lastPresent: '26 Aug 2026', email: 'suresh@student.edu' },
    { id: 104, roll: '21CSE004', name: 'Divya Nair',     pct: 88, lastPresent: '02 Sep 2026', email: 'divya@student.edu' },
    { id: 105, roll: '21CSE005', name: 'Rohan Das',      pct: 79, lastPresent: '01 Sep 2026', email: 'rohan@student.edu' },
    { id: 106, roll: '21CSE006', name: 'Sneha Gupta',    pct: 72, lastPresent: '29 Aug 2026', email: 'sneha@student.edu' },
    { id: 107, roll: '21CSE007', name: 'Arjun Mehta',    pct: 94, lastPresent: '02 Sep 2026', email: 'arjun@student.edu' },
    { id: 108, roll: '21CSE008', name: 'Ananya Roy',     pct: 81, lastPresent: '02 Sep 2026', email: 'ananya@student.edu' },
    { id: 109, roll: '21CSE009', name: 'Karan Patel',    pct: 61, lastPresent: '24 Aug 2026', email: 'karan@student.edu' },
    { id: 110, roll: '21CSE010', name: 'Meera Iyer',     pct: 89, lastPresent: '02 Sep 2026', email: 'meera@student.edu' },
    { id: 111, roll: '21CSE011', name: 'Vikas Singh',    pct: 78, lastPresent: '01 Sep 2026', email: 'vikas@student.edu' },
    { id: 112, roll: '21CSE012', name: 'Tanvi Shah',     pct: 86, lastPresent: '02 Sep 2026', email: 'tanvi@student.edu' },
    { id: 113, roll: '21CSE013', name: 'Aman Joshi',     pct: 83, lastPresent: '01 Sep 2026', email: 'aman@student.edu' },
    { id: 114, roll: '21CSE014', name: 'Priya Anand',    pct: 91, lastPresent: '02 Sep 2026', email: 'priya@student.edu' },
    { id: 115, roll: '21CSE015', name: 'Siddharth Rao',  pct: 87, lastPresent: '02 Sep 2026', email: 'siddharth@student.edu' },
  ],
  'CSE_3_B': [
    { id: 116, roll: '21CSE051', name: 'Aditya Kulkarni', pct: 88, lastPresent: '01 Sep 2026', email: 'aditya@student.edu' },
    { id: 117, roll: '21CSE052', name: 'Bhavya Sen',      pct: 91, lastPresent: '02 Sep 2026', email: 'bhavya@student.edu' },
    { id: 118, roll: '21CSE053', name: 'Chaitanya Reddi', pct: 84, lastPresent: '01 Sep 2026', email: 'chaitanya@student.edu' },
    { id: 119, roll: '21CSE054', name: 'Deepa Menon',     pct: 82, lastPresent: '02 Sep 2026', email: 'deepa@student.edu' },
    { id: 120, roll: '21CSE055', name: 'Farhan Khan',     pct: 75, lastPresent: '30 Aug 2026', email: 'farhan@student.edu' },
    { id: 121, roll: '21CSE056', name: 'Gauri Deshmukh',  pct: 89, lastPresent: '02 Sep 2026', email: 'gauri@student.edu' },
    { id: 122, roll: '21CSE057', name: 'Harshavardhan',   pct: 68, lastPresent: '27 Aug 2026', email: 'harsha@student.edu' },
    { id: 123, roll: '21CSE058', name: 'Ishita Bansal',   pct: 93, lastPresent: '02 Sep 2026', email: 'ishita@student.edu' },
    { id: 124, roll: '21CSE059', name: 'Jatin Chawla',    pct: 77, lastPresent: '31 Aug 2026', email: 'jatin@student.edu' },
    { id: 125, roll: '21CSE060', name: 'Kriti Sanon',     pct: 85, lastPresent: '02 Sep 2026', email: 'kriti@student.edu' },
  ],
  'ECE_3_A': [
    { id: 201, roll: '21ECE001', name: 'Meena Joshi',    pct: 80, lastPresent: '02 Sep 2026', email: 'meena@student.edu' },
    { id: 202, roll: '21ECE002', name: 'Naman Mathur',   pct: 87, lastPresent: '02 Sep 2026', email: 'naman@student.edu' },
    { id: 203, roll: '21ECE003', name: 'Omkar Salvi',    pct: 74, lastPresent: '29 Aug 2026', email: 'omkar@student.edu' },
    { id: 204, roll: '21ECE004', name: 'Pooja Hegde',    pct: 90, lastPresent: '02 Sep 2026', email: 'pooja@student.edu' },
    { id: 205, roll: '21ECE005', name: 'Raghavendra Pai',pct: 85, lastPresent: '01 Sep 2026', email: 'raghav@student.edu' },
    { id: 206, roll: '21ECE006', name: 'Shreya Ghoshal', pct: 93, lastPresent: '02 Sep 2026', email: 'shreya@student.edu' },
    { id: 207, roll: '21ECE007', name: 'Tarun Gogoi',    pct: 69, lastPresent: '28 Aug 2026', email: 'tarun@student.edu' },
    { id: 208, roll: '21ECE008', name: 'Uma Bharti',     pct: 82, lastPresent: '01 Sep 2026', email: 'uma@student.edu' },
  ],
  'ME_3_A': [
    { id: 301, roll: '21ME001', name: 'Varun Dhawan',  pct: 71, lastPresent: '28 Aug 2026', email: 'varun@student.edu' },
    { id: 302, roll: '21ME002', name: 'Yash Chopra',   pct: 84, lastPresent: '02 Sep 2026', email: 'yash@student.edu' },
    { id: 303, roll: '21ME003', name: 'Zaid Hamid',    pct: 76, lastPresent: '30 Aug 2026', email: 'zaid@student.edu' },
    { id: 304, roll: '21ME004', name: 'Alok Nath',     pct: 89, lastPresent: '02 Sep 2026', email: 'alok@student.edu' },
    { id: 305, roll: '21ME005', name: 'Bhupendra Jogi',pct: 81, lastPresent: '01 Sep 2026', email: 'bhupendra@student.edu' },
    { id: 306, roll: '21ME006', name: 'Chirag Paswan', pct: 86, lastPresent: '02 Sep 2026', email: 'chirag@student.edu' },
    { id: 307, roll: '21ME007', name: 'Dinesh Karthik',pct: 92, lastPresent: '02 Sep 2026', email: 'dinesh@student.edu' },
    { id: 308, roll: '21ME008', name: 'Ekta Kapoor',   pct: 78, lastPresent: '01 Sep 2026', email: 'ekta@student.edu' },
  ]
};

function getRosterForClass(dept, sem, sec) {
  const key = `${dept}_${sem}_${sec}`;
  if (CLASS_ROSTERS[key] && CLASS_ROSTERS[key].length > 0) {
    return CLASS_ROSTERS[key].map(s => ({ ...s, status: 'present' }));
  }
  // Match directly from enrolled STUDENTS extracted from Synapse
  const matched = STUDENTS.filter(s => s.dept === dept && (!sec || s.sec === sec));
  if (matched.length > 0) {
    return matched.map(s => ({ ...s, status: 'present' }));
  }
  // General department roster
  const deptStudents = STUDENTS.filter(s => s.dept === dept);
  if (deptStudents.length > 0) {
    return deptStudents.slice(0, 35).map(s => ({ ...s, status: 'present' }));
  }
  // Universal fallback from enrolled roster
  return STUDENTS.slice(0, 25).map(s => ({ ...s, status: 'present' }));
}

// ── ATTENDANCE RECORDING STATE ────────────────────────────────

const ATTENDANCE_STATE = {
  mode: 'present',      // 'present' or 'absent'
  status: 'initial',    // 'initial' | 'loading' | 'loaded' | 'saved'
  classInfo: null,      // { date, dept, deptName, sem, sec, subject }
  students: [],         // array of { id, roll, name, status: 'present'|'absent' }
  searchQuery: '',
  savedSummary: null
};

// ── PAGE ROUTER (SEPARATES ATTENDANCE FROM TAKE ATTENDANCE) ───
function showPage(pageId, linkEl) {
  if (pageId === 'live') pageId = 'take-attendance';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + pageId);
  if (pageEl) pageEl.classList.add('active');

  // Handle active navigation styling
  if (linkEl) {
    linkEl.classList.add('active');
  } else {
    // When take-attendance is active, highlight Attendance in sidebar as parent context
    const targetNavId = pageId === 'take-attendance' ? 'attendance' : pageId;
    const match = document.querySelector(`[data-page="${targetNavId}"]`);
    if (match) match.classList.add('active');
  }

  const titleMap = {
    dashboard: 'Dashboard',
    attendance: 'Attendance Overview',
    'take-attendance': 'Take Attendance',
    students: 'Student Registry',
    analytics: 'Department Analytics',
    reports: 'Attendance Reports',
    sessions: 'Session Management',
    'student-dashboard': 'My Attendance',
    'hod-overview': 'Department Overview'
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) {
    titleEl.textContent = titleMap[pageId] || pageId;
  }

  // Page lifecycle triggers
  if (pageId === 'dashboard') {
    initCharts();
  }

  if (pageId === 'attendance') {
    renderAttendanceOverviewPage();
  }

  if (pageId === 'take-attendance') {
    initTakeAttendancePage();
  }

  if (pageId === 'analytics') {
    initAnalyticsCharts();
  }

  if (pageId === 'student-dashboard') {
    renderStudentDashboard();
  }

  if (pageId === 'hod-overview') {
    renderHodOverview();
  }

  refreshIcons();

  // Close sidebar on mobile
  if (window.innerWidth < 900) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

// ── LIVE DATE DISPLAY ────────────────────────────────────────
function updateDate() {
  const d = new Date();
  const dateEl = document.getElementById('live-date');
  if (dateEl) {
    dateEl.textContent = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
}
updateDate();

// ── 1. ATTENDANCE OVERVIEW PAGE ENGINE (SIDEBAR "ATTENDANCE") ──
function renderAttendanceOverviewPage() {
  // 1. Render class / session summaries
  const sessionsBody = document.getElementById('overview-sessions-body');
  if (sessionsBody) {
    sessionsBody.innerHTML = SESSIONS_DATA.map(s => `
      <tr>
        <td><strong>${escapeHtml(s.dept || 'CSE')} · Sem ${s.sem || 3} (${s.sec || 'A'})</strong></td>
        <td>${escapeHtml(s.course)}</td>
        <td>${escapeHtml(s.faculty || 'Dr. Priya Sharma')}</td>
        <td style="color: var(--text-secondary); font-size: 13px;">${escapeHtml(s.time)} · ${escapeHtml(s.room)}</td>
        <td><strong style="color: ${s.pct >= 75 ? 'var(--primary)' : 'var(--danger)'};">${s.pct || 88}%</strong></td>
        <td><span class="badge badge-${s.status}">${s.status.toUpperCase()}</span></td>
        <td style="text-align: right;">
          <button class="btn btn-outline btn-sm" onclick="launchTakeAttendanceForClass('${s.dept || 'CSE'}', '${s.sem || 3}', '${s.sec || 'A'}', '${escapeHtml(s.course)}')">
            <i data-lucide="check-square" class="icon-sm"></i>
            <span>Take</span>
          </button>
        </td>
      </tr>
    `).join('');
  }

  // 2. Render recent attendance records table
  const recordsBody = document.getElementById('overview-records-body');
  if (recordsBody) {
    recordsBody.innerHTML = RECENT_SCANS.slice(0, 5).map(r => `
      <tr>
        <td><strong>${escapeHtml(r.name)}</strong></td>
        <td><code>${escapeHtml(r.roll)}</code></td>
        <td style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(r.course)}</td>
        <td><span class="badge badge-${r.status}">${r.status.toUpperCase()}</span></td>
        <td style="color: var(--text-muted); font-size: 12.5px;">${escapeHtml(r.time)}</td>
      </tr>
    `).join('');
  }

  // 3. Render at-risk students watchlist
  const atriskList = document.getElementById('overview-atrisk-list');
  if (atriskList) {
    const atRiskStudents = STUDENTS.filter(s => s.pct < 75).concat([
      { id: 103, name: 'Suresh Verma', roll: '21CSE003', pct: 64, missed: 4 },
      { id: 106, name: 'Sneha Gupta', roll: '21CSE006', pct: 72, missed: 3 },
      { id: 109, name: 'Karan Patel', roll: '21CSE009', pct: 61, missed: 5 },
      { id: 301, name: 'Varun Dhawan', roll: '21ME001', pct: 71, missed: 3 },
    ]).filter((v, i, a) => a.findIndex(t => t.roll === v.roll) === i);

    atriskList.innerHTML = atRiskStudents.map(s => `
      <div class="attention-item">
        <div class="attention-info">
          <div>
            <strong>${escapeHtml(s.name)}</strong>
            <span style="color: var(--text-muted); margin-left: 4px;">(${escapeHtml(s.roll)})</span>
          </div>
          <span class="badge badge-risk">${s.pct}% Attendance</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="openStudentDrawer(${s.id})">
          <span>View</span>
          <i data-lucide="arrow-right" style="width: 12px; height: 12px;"></i>
        </button>
      </div>
    `).join('');
  }

  refreshIcons();
}

function launchTakeAttendanceForClass(dept, sem, sec, course) {
  showPage('take-attendance', null);
  const deptEl = document.getElementById('att-dept');
  const semEl = document.getElementById('att-sem');
  const secEl = document.getElementById('att-section');
  if (deptEl) deptEl.value = dept;
  if (semEl) semEl.value = sem;
  if (secEl) secEl.value = sec;
  onDepartmentOrSemChange();
  const subjectEl = document.getElementById('att-subject');
  if (subjectEl && course) subjectEl.value = course;
  loadStudentsAction();
}

// ── 2. DEDICATED TAKE ATTENDANCE ENGINE (TOP-RIGHT CTA) ───────
let takeAttendanceInitialized = false;

function initTakeAttendancePage() {
  const dateInput = document.getElementById('att-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  if (!takeAttendanceInitialized) {
    onDepartmentOrSemChange();
    renderAttendanceView();
    takeAttendanceInitialized = true;
  }
  refreshIcons();
}

function onDepartmentOrSemChange() {
  const deptSelect = document.getElementById('att-dept');
  const semSelect = document.getElementById('att-sem');
  const subjectSelect = document.getElementById('att-subject');

  if (!deptSelect || !semSelect || !subjectSelect) return;

  const dept = deptSelect.value;
  const sem = semSelect.value;
  const courses = (COURSE_CATALOG[dept] && COURSE_CATALOG[dept][sem]) || [
    `${dept}${sem}01 — Core Course I`,
    `${dept}${sem}02 — Core Course II`
  ];

  subjectSelect.innerHTML = courses.map((c, i) => `
    <option value="${c}" ${i === 0 ? 'selected' : ''}>${c}</option>
  `).join('');
}

function setQuickDefaultFilters() {
  const deptSelect = document.getElementById('att-dept');
  const semSelect = document.getElementById('att-sem');
  const secSelect = document.getElementById('att-section');
  const dateInput = document.getElementById('att-date');

  if (deptSelect) deptSelect.value = 'CSE';
  if (semSelect) semSelect.value = '3';
  if (secSelect) secSelect.value = 'A';
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  onDepartmentOrSemChange();
  showToast('Filters set to default: CSE · Sem 3 · Sec A');
  refreshIcons();
}

function loadStudentsAction() {
  const dateInput = document.getElementById('att-date');
  const deptSelect = document.getElementById('att-dept');
  const semSelect = document.getElementById('att-sem');
  const secSelect = document.getElementById('att-section');
  const subjectSelect = document.getElementById('att-subject');

  const date = dateInput && dateInput.value ? dateInput.value : new Date().toISOString().split('T')[0];
  const dept = deptSelect ? deptSelect.value : 'CSE';
  const sem = semSelect ? semSelect.value : '3';
  const sec = secSelect ? secSelect.value : 'A';
  const subject = subjectSelect && subjectSelect.value ? subjectSelect.value : 'CSE301 — Data Structures & Algorithms';

  const deptNameMap = {
    CSE: 'Computer Science & Engineering',
    ECE: 'Electronics & Communication',
    ME: 'Mechanical Engineering',
    IT: 'Information Technology'
  };

  ATTENDANCE_STATE.classInfo = {
    date,
    dept,
    deptName: deptNameMap[dept] || dept,
    sem,
    sec,
    subject
  };

  ATTENDANCE_STATE.status = 'loading';
  renderAttendanceView();

  setTimeout(() => {
    ATTENDANCE_STATE.students = getRosterForClass(dept, sem, sec);
    ATTENDANCE_STATE.searchQuery = '';
    ATTENDANCE_STATE.status = 'loaded';
    renderAttendanceView();
    showToast(`Loaded roster: ${ATTENDANCE_STATE.students.length} students enrolled`);
    refreshIcons();
  }, 280);
}

function getAttendanceMetrics() {
  const students = ATTENDANCE_STATE.students;
  const total = students.length;
  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = total - presentCount;
  const selectedCount = ATTENDANCE_STATE.mode === 'present' ? presentCount : absentCount;
  const presentPct = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  const absentPct = total > 0 ? Math.round((absentCount / total) * 100) : 0;

  return { total, presentCount, absentCount, selectedCount, presentPct, absentPct };
}

function renderAttendanceView() {
  const container = document.getElementById('attendance-content');
  if (!container) return;

  switch (ATTENDANCE_STATE.status) {
    case 'initial':
      container.innerHTML = renderInitialEmptyState();
      break;
    case 'loading':
      container.innerHTML = renderLoadingState();
      break;
    case 'loaded':
      container.innerHTML = renderLoadedState();
      updateMasterCheckboxState();
      break;
    case 'saved':
      container.innerHTML = renderSavedState();
      break;
  }
  refreshIcons();
}

function renderInitialEmptyState() {
  return `
    <div class="att-state-card">
      <div class="att-state-icon">
        <i data-lucide="clipboard-list" class="icon-sm"></i>
      </div>
      <div class="att-state-title">Select Class & Load Students</div>
      <div class="att-state-desc">
        Select the session date, branch, semester, section, and subject above, then click <strong>"Load Students"</strong> to populate the classroom roster.
      </div>
      <button class="btn btn-primary" onclick="loadStudentsAction()">
        <i data-lucide="users" class="icon-sm"></i>
        <span>Load Default Class Roster</span>
      </button>
    </div>
  `;
}

function renderLoadingState() {
  const info = ATTENDANCE_STATE.classInfo || { deptName: 'Department', sem: '3', sec: 'A' };
  return `
    <div class="att-state-card">
      <div class="att-spinner"></div>
      <div class="att-state-title">Loading Class Roster…</div>
      <div class="att-state-desc">
        Retrieving enrolled students for ${escapeHtml(info.deptName)} (Semester ${escapeHtml(info.sem)}, Section ${escapeHtml(info.sec)})…
      </div>
    </div>
  `;
}

function renderLoadedState() {
  const info = ATTENDANCE_STATE.classInfo || { dept: 'CSE', sem: '3', sec: 'A', date: 'Today', subject: 'Course' };
  const metrics = getAttendanceMetrics();
  const isMarkPresent = ATTENDANCE_STATE.mode === 'present';

  const q = ATTENDANCE_STATE.searchQuery.toLowerCase().trim();
  const filteredStudents = q
    ? ATTENDANCE_STATE.students.filter(s => s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q))
    : ATTENDANCE_STATE.students;

  return `
    <!-- Active Class Context Banner -->
    <div class="att-roster-banner">
      <div class="att-roster-details">
        <span class="att-roster-tag"><i data-lucide="building-2" class="icon-sm"></i> <strong>${escapeHtml(info.dept)} · Semester ${escapeHtml(info.sem)} (${escapeHtml(info.sec)})</strong></span>
        <span class="att-roster-tag"><i data-lucide="book-open" class="icon-sm"></i> <strong>${escapeHtml(info.subject)}</strong></span>
        <span class="att-roster-tag"><i data-lucide="calendar" class="icon-sm"></i> <strong>${escapeHtml(info.date)}</strong></span>
      </div>
      <button class="btn btn-outline btn-sm" onclick="resetAttendanceAction()">
        <i data-lucide="x" class="icon-sm"></i>
        <span>Change Class</span>
      </button>
    </div>

    <!-- Live Attendance Summary KPI Row (Focused: Total, Present, Absent, Attendance Rate) -->
    <div class="stats-grid" style="margin-bottom: 16px;">
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Total Students</span>
          <div class="stat-icon-wrap"><i data-lucide="users" class="icon-sm"></i></div>
        </div>
        <div class="stat-value" id="cnt-total">${metrics.total}</div>
        <div class="stat-sub">Enrolled roster strength</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Present</span>
          <div class="stat-icon-wrap" style="color: var(--success);"><i data-lucide="user-check" class="icon-sm"></i></div>
        </div>
        <div class="stat-value" id="cnt-present" style="color: var(--success);">${metrics.presentCount}</div>
        <div class="stat-sub" id="cnt-present-pct">${metrics.presentPct}% of enrolled class</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Absent</span>
          <div class="stat-icon-wrap" style="color: var(--danger);"><i data-lucide="user-x" class="icon-sm"></i></div>
        </div>
        <div class="stat-value" id="cnt-absent" style="color: var(--danger);">${metrics.absentCount}</div>
        <div class="stat-sub" id="cnt-absent-pct">${metrics.absentPct}% of enrolled class</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Attendance Rate</span>
          <div class="stat-icon-wrap" style="color: var(--primary);"><i data-lucide="percent" class="icon-sm"></i></div>
        </div>
        <div class="stat-value" id="cnt-rate" style="color: var(--primary);">${metrics.presentPct}%</div>
        <div class="stat-sub">Benchmark: &ge; 75%</div>
      </div>
    </div>

    <!-- Attendance Controls Toolbar -->
    <div class="att-controls-bar">
      <div class="att-modes-wrapper">
        <span class="att-mode-label">Mode:</span>
        <div class="mode-segmented-control" role="group" aria-label="Attendance marking mode">
          <button type="button" class="mode-btn ${isMarkPresent ? 'active-present' : ''}" onclick="setAttendanceMode('present')">
            <i data-lucide="check" class="icon-sm"></i>
            <span>MARK PRESENT</span>
          </button>
          <button type="button" class="mode-btn ${!isMarkPresent ? 'active-absent' : ''}" onclick="setAttendanceMode('absent')">
            <i data-lucide="x" class="icon-sm"></i>
            <span>MARK ABSENT</span>
          </button>
        </div>
      </div>

      <div class="att-bulk-group">
        <button type="button" class="btn btn-outline btn-sm" onclick="bulkSelectAll()" title="Select all students">
          <i data-lucide="check-square" class="icon-sm"></i>
          <span>Select All</span>
        </button>
        <button type="button" class="btn btn-outline btn-sm" onclick="bulkClearAll()" title="Clear all selections">
          <i data-lucide="square" class="icon-sm"></i>
          <span>Clear All</span>
        </button>
        <span class="selected-count-pill" id="cnt-selected-pill">
          Selected: ${metrics.selectedCount}
        </span>
      </div>

      <div class="search-wrapper" style="max-width: 260px;">
        <i data-lucide="search" class="search-icon-inside"></i>
        <input type="text" class="search-box" style="padding-top: 6px; padding-bottom: 6px;" placeholder="Search student or roll no…" value="${escapeHtml(ATTENDANCE_STATE.searchQuery)}" oninput="filterAttendanceTable(this.value)" />
      </div>
    </div>

    <!-- Mode Explanation Banner -->
    <div class="mode-explanation-banner ${isMarkPresent ? 'banner-present' : 'banner-absent'}">
      <div>
        <strong>Marking mode: ${isMarkPresent ? 'Present' : 'Absent'}</strong> —
        ${isMarkPresent
          ? 'Checked students will be recorded as present.'
          : 'Checked students will be recorded as absent.'
        }
      </div>
      <span class="banner-pill">${isMarkPresent ? 'Active: Checked = Present' : 'Active: Checked = Absent'}</span>
    </div>

    <!-- Student Attendance Table -->
    <div class="att-table-wrapper ${isMarkPresent ? 'mode-present-active' : 'mode-absent-active'}">
      <table class="att-table" id="att-students-table">
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th style="width: 130px;">Roll Number</th>
            <th>Student Name</th>
            <th style="width: 140px;">Attendance %</th>
            <th style="width: 140px;">Last Present</th>
            <th style="width: 130px;">Status</th>
            <th class="col-mark">
              <label class="custom-checkbox-wrap" title="${isMarkPresent ? 'Toggle Select All Present' : 'Toggle Select All Absent'}">
                <input type="checkbox" id="att-master-checkbox" class="att-checkbox-input" onchange="toggleHeaderCheckbox(this.checked)" />
              </label>
              <span style="margin-left: 6px;">${isMarkPresent ? 'Present' : 'Absent'}</span>
            </th>
          </tr>
        </thead>
        <tbody id="att-table-body">
          ${renderTableRows(filteredStudents, isMarkPresent)}
        </tbody>
      </table>
    </div>

    <!-- Save Attendance Bar -->
    <div class="att-save-bar">
      <div class="att-save-info">
        <i data-lucide="info" class="icon-sm" style="color: var(--primary); vertical-align: middle;"></i>
        <span>Session Summary: <strong id="save-summary-txt">${metrics.presentCount} Present, ${metrics.absentCount} Absent</strong> (${metrics.presentPct}% overall)</span>
      </div>
      <div class="att-save-actions">
        <button class="btn btn-outline" onclick="resetAttendanceAction()">Cancel</button>
        <button class="btn btn-primary" onclick="saveAttendanceAction()">
          <i data-lucide="save" class="icon-sm"></i>
          <span>Save Attendance</span>
        </button>
      </div>
    </div>
  `;
}

function renderTableRows(students, isMarkPresent) {
  if (!students || students.length === 0) {
    return `
      <tr>
        <td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">
          No enrolled students match your search filter.
        </td>
      </tr>
    `;
  }

  return students.map((s, index) => {
    const isChecked = isMarkPresent ? s.status === 'present' : s.status === 'absent';
    const pct = s.pct || (s.status === 'present' ? 86 : 64);
    const lastDate = s.lastPresent || (s.status === 'present' ? '02 Sep 2026' : '26 Aug 2026');

    return `
      <tr class="att-row ${s.status === 'present' ? 'row-is-present' : 'row-is-absent'}" id="att-row-${s.id}" onclick="handleRowClick(${s.id}, event)">
        <td>${index + 1}</td>
        <td><code>${escapeHtml(s.roll)}</code></td>
        <td>
          <button type="button" class="student-link-btn" onclick="openStudentDrawer(${s.id}); event.stopPropagation();">
            <span>${escapeHtml(s.name)}</span>
            <i data-lucide="external-link" style="width: 12px; height: 12px; opacity: 0.6;"></i>
          </button>
        </td>
        <td>
          <span style="font-weight: 600; color: ${pct >= 75 ? 'var(--text-primary)' : 'var(--danger)'};">${pct}%</span>
        </td>
        <td style="color: var(--text-secondary); font-size: 13px;">${escapeHtml(lastDate)}</td>
        <td>
          <span class="badge ${s.status === 'present' ? 'badge-present' : 'badge-absent'}" id="badge-${s.id}">
            ${s.status.toUpperCase()}
          </span>
        </td>
        <td class="col-mark" onclick="event.stopPropagation()">
          <label class="custom-checkbox-wrap">
            <input type="checkbox"
              class="att-checkbox-input att-student-checkbox"
              data-id="${s.id}"
              id="chk-${s.id}"
              ${isChecked ? 'checked' : ''}
              onchange="handleCheckboxChange(${s.id}, this.checked)"
              aria-label="Mark attendance for ${escapeHtml(s.name)}"
            />
          </label>
        </td>
      </tr>
    `;
  }).join('');
}

function renderSavedState() {
  const sum = ATTENDANCE_STATE.savedSummary || {
    subject: 'Data Structures & Algorithms',
    deptName: 'Computer Science & Engineering',
    sem: '3',
    sec: 'A',
    date: 'Today',
    total: 15,
    present: 14,
    absent: 1,
    pct: 93
  };

  return `
    <div class="att-saved-card">
      <div class="att-saved-icon">
        <i data-lucide="check" style="width: 26px; height: 26px;"></i>
      </div>
      <div class="att-saved-title">Attendance Recorded Successfully</div>
      <div class="att-saved-subtitle">
        ${escapeHtml(sum.subject)} · ${escapeHtml(sum.deptName)} (Sem ${sum.sem}, Sec ${sum.sec}) · ${escapeHtml(sum.date)}
      </div>

      <div class="att-saved-summary-box">
        <div class="att-saved-stat-item">
          <div class="att-saved-stat-val">${sum.total}</div>
          <div class="att-saved-stat-lbl">Enrolled</div>
        </div>
        <div class="att-saved-stat-item">
          <div class="att-saved-stat-val" style="color: var(--success);">${sum.present}</div>
          <div class="att-saved-stat-lbl">Present (${sum.pct}%)</div>
        </div>
        <div class="att-saved-stat-item">
          <div class="att-saved-stat-val" style="color: var(--danger);">${sum.absent}</div>
          <div class="att-saved-stat-lbl">Absent (${100 - sum.pct}%)</div>
        </div>
        <div class="att-saved-stat-item">
          <div class="att-saved-stat-val" style="color: var(--primary);">Manual</div>
          <div class="att-saved-stat-lbl">Recorded By Faculty</div>
        </div>
      </div>

      <div class="att-saved-actions">
        <button class="btn btn-primary" onclick="resetAttendanceAction()">
          <i data-lucide="plus" class="icon-sm"></i>
          <span>Record Another Class</span>
        </button>
        <button class="btn btn-outline" onclick="editCurrentAttendance()">
          <i data-lucide="edit-3" class="icon-sm"></i>
          <span>Review / Edit This Attendance</span>
        </button>
        <button class="btn btn-outline" onclick="showPage('attendance', null)">
          <i data-lucide="clipboard-check" class="icon-sm"></i>
          <span>Go to Attendance Overview</span>
        </button>
      </div>
    </div>
  `;
}

// ── ATTENDANCE ACTIONS & TOGGLE BEHAVIOR ──────────────────────

function setAttendanceMode(mode) {
  if (ATTENDANCE_STATE.mode === mode) return;
  ATTENDANCE_STATE.mode = mode;
  renderAttendanceView();
  showToast(`Switched marking mode to: ${mode.toUpperCase()}`);
}

function handleCheckboxChange(studentId, isChecked) {
  const student = ATTENDANCE_STATE.students.find(s => s.id === studentId);
  if (!student) return;

  if (ATTENDANCE_STATE.mode === 'present') {
    student.status = isChecked ? 'present' : 'absent';
  } else {
    student.status = isChecked ? 'absent' : 'present';
  }

  updateStudentRowDOM(student);
  updateLiveSummaryDOM();
  updateMasterCheckboxState();
}

function handleRowClick(studentId, event) {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.closest('.col-mark') || event.target.closest('.student-link-btn')) {
    return;
  }

  const student = ATTENDANCE_STATE.students.find(s => s.id === studentId);
  if (!student) return;

  student.status = student.status === 'present' ? 'absent' : 'present';

  updateStudentRowDOM(student);
  updateLiveSummaryDOM();
  updateMasterCheckboxState();
}

function updateStudentRowDOM(student) {
  const isMarkPresent = ATTENDANCE_STATE.mode === 'present';
  const isChecked = isMarkPresent ? student.status === 'present' : student.status === 'absent';

  const chk = document.getElementById(`chk-${student.id}`);
  if (chk) chk.checked = isChecked;

  const badge = document.getElementById(`badge-${student.id}`);
  if (badge) {
    badge.className = `badge ${student.status === 'present' ? 'badge-present' : 'badge-absent'}`;
    badge.textContent = student.status.toUpperCase();
  }

  const row = document.getElementById(`att-row-${student.id}`);
  if (row) {
    row.className = `att-row ${student.status === 'present' ? 'row-is-present' : 'row-is-absent'}`;
  }
}

function updateLiveSummaryDOM() {
  const metrics = getAttendanceMetrics();

  const cntTotal = document.getElementById('cnt-total');
  const cntPresent = document.getElementById('cnt-present');
  const cntAbsent = document.getElementById('cnt-absent');
  const cntRate = document.getElementById('cnt-rate');
  const cntPresentPct = document.getElementById('cnt-present-pct');
  const cntAbsentPct = document.getElementById('cnt-absent-pct');
  const selectedPill = document.getElementById('cnt-selected-pill');
  const saveTxt = document.getElementById('save-summary-txt');

  if (cntTotal) cntTotal.textContent = metrics.total;
  if (cntPresent) cntPresent.textContent = metrics.presentCount;
  if (cntAbsent) cntAbsent.textContent = metrics.absentCount;
  if (cntRate) cntRate.textContent = `${metrics.presentPct}%`;
  if (cntPresentPct) cntPresentPct.textContent = `${metrics.presentPct}% of enrolled class`;
  if (cntAbsentPct) cntAbsentPct.textContent = `${metrics.absentPct}% of enrolled class`;
  if (selectedPill) selectedPill.textContent = `Selected: ${metrics.selectedCount}`;
  if (saveTxt) saveTxt.textContent = `${metrics.presentCount} Present, ${metrics.absentCount} Absent (${metrics.presentPct}% overall)`;
}

function updateMasterCheckboxState() {
  const masterChk = document.getElementById('att-master-checkbox');
  if (!masterChk) return;

  const students = ATTENDANCE_STATE.students;
  if (!students || students.length === 0) {
    masterChk.checked = false;
    masterChk.indeterminate = false;
    return;
  }

  const isMarkPresent = ATTENDANCE_STATE.mode === 'present';
  const checkedCount = students.filter(s => isMarkPresent ? s.status === 'present' : s.status === 'absent').length;

  if (checkedCount === students.length) {
    masterChk.checked = true;
    masterChk.indeterminate = false;
  } else if (checkedCount === 0) {
    masterChk.checked = false;
    masterChk.indeterminate = false;
  } else {
    masterChk.checked = false;
    masterChk.indeterminate = true;
  }
}

function toggleHeaderCheckbox(checked) {
  if (checked) {
    bulkSelectAll();
  } else {
    bulkClearAll();
  }
}

function bulkSelectAll() {
  if (!ATTENDANCE_STATE.students || ATTENDANCE_STATE.students.length === 0) return;

  if (ATTENDANCE_STATE.mode === 'present') {
    ATTENDANCE_STATE.students.forEach(s => s.status = 'present');
  } else {
    ATTENDANCE_STATE.students.forEach(s => s.status = 'absent');
  }

  renderAttendanceView();
  showToast(`All students marked ${ATTENDANCE_STATE.mode === 'present' ? 'Present' : 'Absent'}`);
}

function bulkClearAll() {
  if (!ATTENDANCE_STATE.students || ATTENDANCE_STATE.students.length === 0) return;

  if (ATTENDANCE_STATE.mode === 'present') {
    ATTENDANCE_STATE.students.forEach(s => s.status = 'absent');
  } else {
    ATTENDANCE_STATE.students.forEach(s => s.status = 'present');
  }

  renderAttendanceView();
  showToast('All selections cleared');
}

function filterAttendanceTable(query) {
  ATTENDANCE_STATE.searchQuery = query;
  const q = query.toLowerCase().trim();
  const filtered = q
    ? ATTENDANCE_STATE.students.filter(s => s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q))
    : ATTENDANCE_STATE.students;

  const tbody = document.getElementById('att-table-body');
  if (tbody) {
    tbody.innerHTML = renderTableRows(filtered, ATTENDANCE_STATE.mode === 'present');
    refreshIcons();
  }
}

function saveAttendanceAction() {
  if (!ATTENDANCE_STATE.students || ATTENDANCE_STATE.students.length === 0) {
    showToast('No class roster loaded to record');
    return;
  }

  const metrics = getAttendanceMetrics();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  ATTENDANCE_STATE.savedSummary = {
    ...ATTENDANCE_STATE.classInfo,
    total: metrics.total,
    present: metrics.presentCount,
    absent: metrics.absentCount,
    pct: metrics.presentPct,
    time: timeStr
  };

  SESSIONS_DATA.unshift({
    id: SESSIONS_DATA.length + 1,
    course: ATTENDANCE_STATE.classInfo.subject,
    dept: ATTENDANCE_STATE.classInfo.dept,
    sem: ATTENDANCE_STATE.classInfo.sem,
    sec: ATTENDANCE_STATE.classInfo.sec,
    room: 'Room 204',
    time: timeStr,
    date: 'Today',
    faculty: 'Dr. Priya Sharma',
    pct: metrics.presentPct,
    status: 'completed'
  });
  renderSessions();

  ATTENDANCE_STATE.students.slice(0, 4).forEach(s => {
    RECENT_SCANS.unshift({
      name: s.name,
      roll: s.roll,
      course: ATTENDANCE_STATE.classInfo.subject.split('—')[0].trim(),
      time: timeStr,
      status: s.status,
      markedBy: 'Dr. Priya Sharma'
    });
  });
  renderRecentScans();

  const sessStat = document.getElementById('stat-sessions');
  if (sessStat) {
    const current = parseInt(sessStat.textContent) || 6;
    sessStat.textContent = current + 1;
  }

  ATTENDANCE_STATE.status = 'saved';
  renderAttendanceView();
  showToast(`Attendance recorded: ${metrics.presentCount} Present, ${metrics.absentCount} Absent`);
}

function resetAttendanceAction() {
  ATTENDANCE_STATE.status = 'initial';
  ATTENDANCE_STATE.searchQuery = '';
  renderAttendanceView();
}

function editCurrentAttendance() {
  ATTENDANCE_STATE.status = 'loaded';
  renderAttendanceView();
}

// ── STUDENT DETAIL DRAWER ────────────────────────────────────

function openStudentDrawer(studentId) {
  let student = ATTENDANCE_STATE.students.find(s => s.id === studentId);
  if (!student) {
    student = STUDENTS.find(s => s.id === studentId) || STUDENTS[0];
  }
  if (!student) return;

  const initials = student.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const pct = student.pct || (student.status === 'present' ? 88 : 64);
  const totalClasses = 40;
  const attended = Math.round((pct / 100) * totalClasses);
  const absent = totalClasses - attended;
  const lastDate = student.lastPresent || '02 Sep 2026';
  const streak = student.status === 'absent' ? '2 Classes Absent' : '0 Classes (Regular)';

  const dAvatar = document.getElementById('d-avatar');
  const dName = document.getElementById('d-name');
  const dRoll = document.getElementById('d-roll');
  const dDept = document.getElementById('d-dept');
  const dSemSec = document.getElementById('d-sem-sec');
  const dRollDetail = document.getElementById('d-roll-detail');
  const dEmail = document.getElementById('d-email');
  const dPctText = document.getElementById('d-pct-text');
  const dPctBar = document.getElementById('d-pct-bar');
  const dAttended = document.getElementById('d-attended');
  const dAbsent = document.getElementById('d-absent');
  const dLastPresent = document.getElementById('d-last-present');
  const dStreak = document.getElementById('d-streak');
  const dHistoryList = document.getElementById('d-history-list');

  if (dAvatar) dAvatar.textContent = initials;
  if (dName) dName.textContent = student.name;
  if (dRoll) dRoll.textContent = `${student.roll} · Computer Science & Engineering`;
  if (dDept) dDept.textContent = student.dept || 'CSE';
  if (dSemSec) dSemSec.textContent = `Semester ${student.sem || 3} · Section ${student.sec || 'A'}`;
  if (dRollDetail) dRollDetail.textContent = student.roll;
  if (dEmail) dEmail.textContent = student.email || `${student.roll.toLowerCase()}@student.edu`;
  if (dPctText) {
    dPctText.textContent = `${pct}%`;
    dPctText.style.color = pct >= 75 ? 'var(--text-primary)' : 'var(--danger)';
  }
  if (dPctBar) {
    dPctBar.style.width = `${pct}%`;
    dPctBar.style.backgroundColor = pct >= 75 ? 'var(--primary)' : 'var(--danger)';
  }
  if (dAttended) dAttended.textContent = attended;
  if (dAbsent) dAbsent.textContent = absent;
  if (dLastPresent) dLastPresent.textContent = lastDate;
  if (dStreak) dStreak.textContent = streak;

  // Render recent 5 attendance history items
  if (dHistoryList) {
    const historyData = [
      { date: '02 Sep 2026', subject: 'Data Structures & Algorithms', status: student.status === 'absent' ? 'absent' : 'present' },
      { date: '01 Sep 2026', subject: 'Data Structures & Algorithms', status: 'present' },
      { date: '30 Aug 2026', subject: 'Object Oriented Programming',   status: pct < 70 ? 'absent' : 'present' },
      { date: '29 Aug 2026', subject: 'Data Structures & Algorithms', status: 'present' },
      { date: '28 Aug 2026', subject: 'Discrete Mathematics',          status: pct < 65 ? 'absent' : 'present' },
    ];

    dHistoryList.innerHTML = historyData.map(h => `
      <div class="drawer-history-item">
        <div class="drawer-history-left">
          <span class="drawer-history-sub">${escapeHtml(h.subject)}</span>
          <span class="drawer-history-date">${escapeHtml(h.date)}</span>
        </div>
        <span class="badge ${h.status === 'present' ? 'badge-present' : 'badge-absent'}">
          ${h.status.toUpperCase()}
        </span>
      </div>
    `).join('');
  }

  const drawer = document.getElementById('student-drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
  refreshIcons();
}

function closeStudentDrawer() {
  const drawer = document.getElementById('student-drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

// ── RECENT ATTENDANCE ACTIVITY TABLE ─────────────────────────
function renderRecentScans() {
  const tbody = document.getElementById('recent-body');
  if (!tbody) return;
  tbody.innerHTML = RECENT_SCANS.slice(0, 6).map(s => `
    <tr>
      <td><strong>${escapeHtml(s.name)}</strong></td>
      <td><code>${escapeHtml(s.roll)}</code></td>
      <td>${escapeHtml(s.course)}</td>
      <td style="color: var(--text-secondary);">${escapeHtml(s.time)}</td>
      <td><span class="badge badge-${s.status}">${s.status.toUpperCase()}</span></td>
      <td style="color: var(--text-muted); font-size: 13px;">${escapeHtml(s.markedBy || 'Faculty')}</td>
    </tr>
  `).join('');
}
renderRecentScans();

// ── STUDENTS REGISTRY TABLE ──────────────────────────────────
function renderStudents(data) {
  const tbody = document.getElementById('students-body');
  if (!tbody) return;
  tbody.innerHTML = data.map(s => `
    <tr onclick="openStudentDrawer(${s.id})" style="cursor: pointer;">
      <td><strong>${escapeHtml(s.name)}</strong></td>
      <td><code>${escapeHtml(s.roll)}</code></td>
      <td>${escapeHtml(s.dept)}</td>
      <td>Semester ${s.sem}</td>
      <td><span class="badge" style="background: var(--surface-muted); color: var(--text-secondary); border: 1px solid var(--border);">Section ${escapeHtml(s.sec || 'A')}</span></td>
      <td>
        <span style="font-weight: 600; color: ${s.pct >= 75 ? 'var(--text-primary)' : 'var(--danger)'};">${s.pct}%</span>
      </td>
      <td>
        <span class="badge ${s.pct >= 75 ? 'badge-ok' : 'badge-risk'}">${s.pct >= 75 ? 'REGULAR' : 'AT RISK'}</span>
      </td>
      <td style="text-align: right;" onclick="event.stopPropagation();">
        <button class="btn btn-outline btn-sm" onclick="openStudentDrawer(${s.id})" title="View Student Detail Drawer">
          <i data-lucide="eye" class="icon-sm"></i>
          <span>View</span>
        </button>
        <button class="btn btn-ghost btn-sm" onclick="editStudent(${s.id})" title="Edit Student">
          <i data-lucide="edit-2" class="icon-sm"></i>
        </button>
      </td>
    </tr>
  `).join('');
  refreshIcons();
}
renderStudents(STUDENTS);

function filterStudents(query) {
  const q = query.toLowerCase().trim();
  const filtered = STUDENTS.filter(s =>
    s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q) || s.dept.toLowerCase().includes(q) || (s.sec && s.sec.toLowerCase() === q)
  );
  renderStudents(filtered);
}

function editStudent(id) {
  showToast('Edit student profile — connected to faculty management mock');
}

// ── REPORT TABLE ─────────────────────────────────────────────
function renderReport(data) {
  const tbody = document.getElementById('report-body');
  if (!tbody) return;
  tbody.innerHTML = data.map(r => `
    <tr>
      <td><code>${escapeHtml(r.roll)}</code></td>
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td>${r.total}</td>
      <td><span style="color: var(--success); font-weight: 600;">${r.attended}</span></td>
      <td><span style="color: var(--danger); font-weight: 600;">${r.absent}</span></td>
      <td><span style="font-weight: 700; color: ${r.pct >= 75 ? 'var(--text-primary)' : 'var(--danger)'};">${r.pct}%</span></td>
      <td><span class="badge ${r.pct >= 75 ? 'badge-ok' : 'badge-risk'}">${r.pct >= 75 ? 'SATISFACTORY' : 'AT RISK'}</span></td>
    </tr>
  `).join('');
}
renderReport(REPORT_DATA);

function generateReport() {
  showToast('Report generated for selected course & semester range');
  renderReport(REPORT_DATA);
}

function exportCSV() {
  const header = 'Roll No,Student Name,Total Sessions,Attended,Absent,Attendance %,Status\n';
  const rows = REPORT_DATA.map(r =>
    `${r.roll},${r.name},${r.total},${r.attended},${r.absent},${r.pct}%,${r.pct >= 75 ? 'SATISFACTORY' : 'AT RISK'}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'department_attendance_report.csv';
  a.click();
  showToast('CSV report exported successfully');
}

// ── SESSION MANAGEMENT ───────────────────────────────────────
function renderSessions() {
  const grid = document.getElementById('sessions-grid');
  if (!grid) return;
  grid.innerHTML = SESSIONS_DATA.map(s => `
    <div class="session-card">
      <div class="session-card-header">
        <div>
          <div class="session-card-title">${escapeHtml(s.course)}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            ${escapeHtml(s.dept || 'CSE')} · Semester ${s.sem || 3} (${s.sec || 'A'})
          </div>
        </div>
        <span class="badge badge-${s.status}">${s.status.toUpperCase()}</span>
      </div>
      <div class="session-card-meta">
        <div class="session-meta-row"><i data-lucide="map-pin" class="icon-sm"></i> ${escapeHtml(s.room)} · ${escapeHtml(s.time)}</div>
        <div class="session-meta-row"><i data-lucide="user" class="icon-sm"></i> Faculty: ${escapeHtml(s.faculty || 'Dr. Priya Sharma')}</div>
        <div class="session-meta-row"><i data-lucide="calendar" class="icon-sm"></i> Date: ${escapeHtml(s.date)} · Attendance: <strong style="color: var(--primary);">${s.pct || 88}%</strong></div>
      </div>
    </div>
  `).join('');
  refreshIcons();
}
renderSessions();

function createSession() {
  showToast('Schedule session dialog — ready for faculty timetable integration');
}

// ── ENROLL STUDENT MODAL ─────────────────────────────────────
function openAddModal() {
  const modal = document.getElementById('modal-overlay');
  if (modal) modal.classList.add('open');
}

function closeModal() {
  const modal = document.getElementById('modal-overlay');
  if (modal) modal.classList.remove('open');
}

function saveStudent() {
  const nameInput = document.getElementById('m-name');
  const rollInput = document.getElementById('m-roll');
  const emailInput = document.getElementById('m-email');
  const deptInput = document.getElementById('m-dept');
  const semInput = document.getElementById('m-sem');

  const name = nameInput ? nameInput.value.trim() : '';
  const roll = rollInput ? rollInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';

  if (!name || !roll || !email) {
    showToast('Please complete all required fields');
    return;
  }

  const newStudent = {
    id: STUDENTS.length + 101,
    name,
    roll,
    email,
    dept: deptInput ? deptInput.value : 'CSE',
    sem: semInput ? parseInt(semInput.value) : 3,
    sec: 'A',
    pct: 100,
    lastPresent: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  };
  STUDENTS.push(newStudent);
  renderStudents(STUDENTS);
  closeModal();
  showToast(`${name} enrolled into ${newStudent.dept} Sem ${newStudent.sem}`);

  ['m-name', 'm-roll', 'm-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ── CHARTS CONTROLLER (DASHBOARD & ANALYTICS) ────────────────
let chartsInitialized = false;
let analyticsChartsInitialized = false;

function initCharts() {
  const weekEl = document.getElementById('weekChart');
  if (!weekEl || typeof Chart === 'undefined') return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  // Weekly bar chart
  const weekCtx = weekEl.getContext('2d');
  if (window.myWeekChart) {
    window.myWeekChart.destroy();
  }
  window.myWeekChart = new Chart(weekCtx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      datasets: [{
        label: 'Attendance %',
        data: [85, 78, 90, 72, 88, 60],
        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(29, 78, 216, 0.2)',
        borderColor: isDark ? '#3b82f6' : '#1d4ed8',
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 40, max: 100,
          grid: { color: gridColor },
          ticks: { callback: v => v + '%', font: { family: 'Inter', size: 11 }, color: textColor }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: textColor }
        }
      }
    }
  });

  chartsInitialized = true;
}

let hodChartInitialized = false;

function initHodChart() {
  const chartEl = document.getElementById('hodTrendChart');
  if (!chartEl || typeof Chart === 'undefined') return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const ctx = chartEl.getContext('2d');
  if (window.myHodTrendChart) {
    window.myHodTrendChart.destroy();
  }
  window.myHodTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
      datasets: [{
        label: 'Department Compliance %',
        data: [81.5, 82.8, 83.2, 85.0, 84.1, 86.4, 85.2, 84.2],
        borderColor: isDark ? '#3b82f6' : '#1d4ed8',
        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(29, 78, 216, 0.08)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: isDark ? '#3b82f6' : '#1d4ed8'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 65, max: 100,
          grid: { color: gridColor },
          ticks: { callback: v => v + '%', font: { family: 'Inter', size: 11 }, color: textColor }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: textColor }
        }
      }
    }
  });
  hodChartInitialized = true;
}

function initAnalyticsCharts() {
  if (analyticsChartsInitialized) return;
  const trendEl = document.getElementById('analyticsTrendChart');
  const subjectEl = document.getElementById('analyticsSubjectChart');

  if (!trendEl || !subjectEl || typeof Chart === 'undefined') return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  // 30-Day Trend
  const trendCtx = trendEl.getContext('2d');
  window.myAnalyticsTrendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
      datasets: [{
        label: 'Department Avg %',
        data: [81, 84, 79, 86, 84],
        borderColor: isDark ? '#3b82f6' : '#1d4ed8',
        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(29, 78, 216, 0.06)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 60, max: 100,
          grid: { color: gridColor },
          ticks: { callback: v => v + '%', font: { family: 'Inter', size: 11 }, color: textColor }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: textColor }
        }
      }
    }
  });

  // Attendance by Subject
  const subjectCtx = subjectEl.getContext('2d');
  window.myAnalyticsSubjectChart = new Chart(subjectCtx, {
    type: 'bar',
    data: {
      labels: ['Data Structures', 'Networks', 'OOP', 'Discrete Math', 'DSP'],
      datasets: [{
        label: 'Subject Attendance %',
        data: [88, 82, 85, 76, 80],
        backgroundColor: isDark ? 'rgba(34, 197, 94, 0.5)' : 'rgba(22, 163, 74, 0.25)',
        borderColor: isDark ? '#22c55e' : '#16a34a',
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          min: 50, max: 100,
          grid: { color: gridColor },
          ticks: { callback: v => v + '%', font: { family: 'Inter', size: 10 }, color: textColor }
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: textColor }
        }
      }
    }
  });

  analyticsChartsInitialized = true;
}

function updateChartThemes(theme) {
  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  [window.myWeekChart, window.myAnalyticsTrendChart, window.myAnalyticsSubjectChart, window.myHodTrendChart].forEach(chart => {
    if (chart && chart.options && chart.options.scales) {
      if (chart.options.scales.y) {
        chart.options.scales.y.grid.color = gridColor;
        chart.options.scales.y.ticks.color = textColor;
      }
      if (chart.options.scales.x) {
        chart.options.scales.x.ticks.color = textColor;
      }
      chart.update();
    }
  });
}

// ── TOAST NOTIFICATION ───────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = `<i data-lucide="info" class="icon-sm"></i> <span>${escapeHtml(msg)}</span>`;
  t.classList.add('show');
  refreshIcons();
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── ESCAPE KEY ACCESSIBILITY ─────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeStudentDrawer();
    closeModal();
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── AUTHENTICATION & DEMO ACCOUNTS STATE (PHASE 3) ────────────

const DEMO_ACCOUNTS = {
  student: {
    id: 'student001',
    pass: 'demo123',
    name: 'Aryansh Sharma',
    role: 'student',
    roll: '21CSE032',
    dept: 'CSE',
    sem: 2,
    sec: 'A',
    email: 'aryansh.sharma@student.edu'
  },
  faculty: {
    id: 'faculty001',
    pass: 'demo123',
    name: 'Dr. Anand Tamrakar',
    role: 'faculty',
    dept: 'CSE',
    email: 'anand.tamrakar@faculty.edu'
  },
  hod: {
    id: 'hod001',
    pass: 'demo123',
    name: 'Dr. K. R. Ramanathan',
    role: 'hod',
    dept: 'CSE',
    email: 'hod.cse@institution.edu'
  }
};

let currentLoginRole = 'faculty';

function setLoginRole(role) {
  currentLoginRole = role;
  document.querySelectorAll('#login-role-tabs .role-tab-btn').forEach(btn => {
    const r = (btn.dataset && btn.dataset.role) || (btn.getAttribute && btn.getAttribute('data-role'));
    btn.classList.toggle('active', r === role);
  });
  const uInput = document.getElementById('login-username');
  if (uInput) {
    if (role === 'student') uInput.placeholder = 'Student ID or Roll No. (e.g. student001 / 21CSE032)';
    else if (role === 'faculty') uInput.placeholder = 'Faculty ID (e.g. faculty001)';
    else if (role === 'hod') uInput.placeholder = 'HOD ID (e.g. hod001)';
  }
  const errEl = document.getElementById('login-error-msg');
  if (errEl) errEl.style.display = 'none';
}

function quickFillDemo(role) {
  setLoginRole(role);
  const demo = DEMO_ACCOUNTS[role];
  const uInput = document.getElementById('login-username');
  const pInput = document.getElementById('login-password');
  if (uInput) uInput.value = demo.id;
  if (pInput) pInput.value = demo.pass;
  const errEl = document.getElementById('login-error-msg');
  if (errEl) errEl.style.display = 'none';
}

function scrollToLogin() {
  const el = document.getElementById('login-section');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function selectRoleAndScroll(role) {
  setLoginRole(role);
  quickFillDemo(role);
  scrollToLogin();
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleLoginPassword() {
  const pInput = document.getElementById('login-password');
  const eye = document.getElementById('login-pass-eye');
  if (!pInput) return;
  if (pInput.type === 'password') {
    pInput.type = 'text';
    if (eye) eye.setAttribute('data-lucide', 'eye-off');
  } else {
    pInput.type = 'password';
    if (eye) eye.setAttribute('data-lucide', 'eye');
  }
  refreshIcons();
}

function handleForgotPassword(event) {
  if (event) event.preventDefault();
  showToast('Institutional password reset: please contact your departmental IT administrator or Dean of Academics.');
}

function handleLoginSubmit(event) {
  if (event) event.preventDefault();
  const username = (document.getElementById('login-username').value || '').trim();
  const password = (document.getElementById('login-password').value || '').trim();
  const errEl = document.getElementById('login-error-msg');

  let authenticated = false;
  let sessionData = null;

  const demo = DEMO_ACCOUNTS[currentLoginRole];
  if (demo && (username.toLowerCase() === demo.id.toLowerCase() || (currentLoginRole === 'student' && username.toUpperCase() === demo.roll)) && password === demo.pass) {
    authenticated = true;
    sessionData = {
      role: currentLoginRole,
      userId: demo.id,
      displayName: demo.name,
      dept: demo.dept,
      roll: demo.roll || null,
      sem: demo.sem || null,
      sec: demo.sec || null
    };
  } else if (password === 'demo123') {
    const foundStu = STUDENTS.find(s => s.roll.toUpperCase() === username.toUpperCase() || s.name.toLowerCase() === username.toLowerCase());
    if (foundStu && currentLoginRole === 'student') {
      authenticated = true;
      sessionData = {
        role: 'student',
        userId: foundStu.roll,
        displayName: foundStu.name,
        dept: foundStu.dept,
        roll: foundStu.roll,
        sem: foundStu.sem,
        sec: foundStu.sec
      };
    }
  }

  if (authenticated && sessionData) {
    localStorage.setItem('smartattend_session', JSON.stringify(sessionData));
    if (errEl) errEl.style.display = 'none';
    applySessionUI(sessionData);
    showToast(`Signed in as ${sessionData.displayName} (${sessionData.role.toUpperCase()})`);
  } else {
    if (errEl) {
      errEl.textContent = `Invalid credentials for ${currentLoginRole.toUpperCase()} role. Use demo account: ${demo.id} / ${demo.pass}`;
      errEl.style.display = 'block';
    }
  }
}

function doSignOut() {
  localStorage.removeItem('smartattend_session');
  document.body.classList.remove('app-mode');
  document.body.classList.add('landing-mode');
  showToast('Signed out of SmartAttend');
  refreshIcons();
}

function applySessionUI(session) {
  document.body.classList.remove('landing-mode');
  document.body.classList.add('app-mode');

  const facGroup = document.getElementById('nav-group-faculty');
  const stuGroup = document.getElementById('nav-group-student');
  const hodGroup = document.getElementById('nav-group-hod');
  const takeAttBtn = document.getElementById('topbar-take-att-btn');
  const portalLabel = document.getElementById('sidebar-portal-label');
  const userAvatar = document.getElementById('sidebar-user-avatar');
  const userName = document.getElementById('sidebar-user-name');
  const userRole = document.getElementById('sidebar-user-role');
  const breadcrumbPrefix = document.querySelector('.breadcrumb-prefix');

  if (facGroup) facGroup.style.display = session.role === 'faculty' ? 'block' : 'none';
  if (stuGroup) stuGroup.style.display = session.role === 'student' ? 'block' : 'none';
  if (hodGroup) hodGroup.style.display = session.role === 'hod' ? 'block' : 'none';

  if (takeAttBtn) takeAttBtn.style.display = session.role === 'faculty' ? 'inline-flex' : 'none';

  if (session.role === 'student') {
    if (portalLabel) portalLabel.textContent = 'Student Portal';
    if (userAvatar) userAvatar.textContent = (session.displayName || 'Student').split(' ').map(w => w[0]).join('').slice(0, 2);
    if (userName) userName.textContent = session.displayName;
    if (userRole) userRole.textContent = `${session.roll || '21CSE032'} · Sem ${session.sem || 2}`;
    if (breadcrumbPrefix) breadcrumbPrefix.textContent = 'Student Academic Portal';
    showPage('student-dashboard', document.querySelector('#nav-group-student [data-page="student-dashboard"]'));
    renderStudentDashboard(session.roll);
  } else if (session.role === 'hod') {
    if (portalLabel) portalLabel.textContent = 'HOD Administration';
    if (userAvatar) userAvatar.textContent = 'KR';
    if (userName) userName.textContent = session.displayName || 'Dr. K. R. Ramanathan';
    if (userRole) userRole.textContent = 'Head of Department (CSE)';
    if (breadcrumbPrefix) breadcrumbPrefix.textContent = 'Department Administration';
    showPage('hod-overview', document.querySelector('#nav-group-hod [data-page="hod-overview"]'));
    renderHodOverview();
  } else {
    // Faculty
    if (portalLabel) portalLabel.textContent = 'Department Faculty';
    if (userAvatar) userAvatar.textContent = (session.displayName || 'Dr. Anand').split(' ').map(w => w[0]).join('').slice(0, 2);
    if (userName) userName.textContent = session.displayName || 'Dr. Anand Tamrakar';
    if (userRole) userRole.textContent = 'Department Faculty';
    if (breadcrumbPrefix) breadcrumbPrefix.textContent = 'Computer Science & Engineering';
    showPage('dashboard', document.querySelector('#nav-group-faculty [data-page="dashboard"]'));
    initCharts();
  }
  refreshIcons();
}

function initAuth() {
  const sessionStr = localStorage.getItem('smartattend_session');
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      if (session && session.role) {
        applySessionUI(session);
        return;
      }
    } catch (e) {
      localStorage.removeItem('smartattend_session');
    }
  }
  document.body.classList.remove('app-mode');
  document.body.classList.add('landing-mode');
  setLoginRole('faculty');
  refreshIcons();
}

// ── STUDENT DASHBOARD RENDERER ────────────────────────────────
function renderStudentDashboard(rollOrId) {
  let student = STUDENTS.find(s => s.roll === rollOrId || s.id === rollOrId) || STUDENTS.find(s => s.roll === '21CSE032') || STUDENTS[0];
  if (!student) return;

  const titleEl = document.getElementById('stu-welcome-title');
  const subEl = document.getElementById('stu-welcome-subtitle');
  if (titleEl) titleEl.textContent = `Good morning, ${student.name.split(' ')[0]}`;
  if (subEl) subEl.textContent = `Roll No: ${student.roll} · Department of ${student.dept === 'IT' ? 'Information Technology' : 'Computer Science & Engineering'} · Semester ${student.sem} (Section ${student.sec || 'A'})`;

  const pct = student.pct || 84.6;
  const total = 39;
  const attended = Math.round((pct / 100) * total);
  const missed = total - attended;

  const gaugePct = document.getElementById('stu-gauge-pct');
  const gaugeCircle = document.getElementById('stu-circle-prog');
  const attCount = document.getElementById('stu-attended-count');
  const missCount = document.getElementById('stu-missed-count');
  const totCount = document.getElementById('stu-total-count');
  const threshFill = document.getElementById('stu-threshold-fill');

  if (gaugePct) gaugePct.textContent = `${pct}%`;
  if (gaugeCircle) {
    gaugeCircle.setAttribute('stroke-dasharray', `${pct}, 100`);
    gaugeCircle.setAttribute('stroke', pct >= 75 ? 'var(--primary)' : 'var(--danger)');
  }
  if (attCount) attCount.textContent = attended;
  if (missCount) missCount.textContent = missed;
  if (totCount) totCount.textContent = total;
  if (threshFill) {
    threshFill.style.width = `${pct}%`;
    threshFill.style.background = pct >= 75 ? 'var(--success)' : 'var(--danger)';
  }

  // Render Subject Cards
  const subContainer = document.getElementById('stu-subjects-container');
  if (subContainer && typeof SYNAPSE_SUBJECTS !== 'undefined') {
    subContainer.innerHTML = SYNAPSE_SUBJECTS.map(sub => {
      const isSafe = sub.pct >= 75;
      return `
        <div class="student-sub-card">
          <div class="sub-card-top">
            <div>
              <span class="sub-card-code">${escapeHtml(sub.code)}</span>
              <div class="sub-card-name">${escapeHtml(sub.name)}</div>
              <div class="sub-card-faculty">${escapeHtml(sub.faculty)}</div>
            </div>
            <span class="badge ${isSafe ? 'badge-ok' : 'badge-risk'}">${isSafe ? 'ELIGIBLE' : 'WARNING'}</span>
          </div>
          <div class="sub-prog-wrap">
            <div class="sub-prog-meta">
              <span>${sub.attended} / ${sub.total} sessions</span>
              <strong style="color: ${isSafe ? 'var(--text-primary)' : 'var(--danger)'};">${sub.pct}%</strong>
            </div>
            <div class="sub-prog-track">
              <div class="sub-prog-fill" style="width: ${sub.pct}%; background: ${isSafe ? 'var(--primary)' : 'var(--danger)'};"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Student History Table
  const histBody = document.getElementById('stu-history-body');
  if (histBody && typeof SYNAPSE_PERSONAL_HISTORY !== 'undefined') {
    histBody.innerHTML = SYNAPSE_PERSONAL_HISTORY.map(h => `
      <tr>
        <td><strong>${escapeHtml(h.date)}</strong></td>
        <td><code>${escapeHtml(h.time)}</code></td>
        <td>${escapeHtml(h.subject)}</td>
        <td>${escapeHtml(h.teacher)}</td>
        <td>${escapeHtml(h.room)}</td>
        <td><span class="badge badge-${h.status}">${h.status.toUpperCase()}</span></td>
      </tr>
    `).join('');
  }
  refreshIcons();
}

// ── HOD OVERVIEW RENDERER ────────────────────────────────────
function renderHodOverview() {
  const statStudents = document.getElementById('hod-stat-students');
  if (statStudents) statStudents.textContent = STUDENTS.length;

  const healthBody = document.getElementById('hod-health-body');
  if (healthBody && typeof HOD_SUBJECT_HEALTH !== 'undefined') {
    healthBody.innerHTML = HOD_SUBJECT_HEALTH.map(h => `
      <tr>
        <td><strong>${escapeHtml(h.name)}</strong> <span style="font-size:11px; color:var(--text-muted);">(${escapeHtml(h.code)})</span></td>
        <td>${escapeHtml(h.faculty)}</td>
        <td>${h.completed} / ${h.sessions} sessions</td>
        <td><span style="font-weight:700; color: ${h.avgPct >= 75 ? 'var(--text-primary)' : 'var(--danger)'};">${h.avgPct}%</span></td>
        <td><span class="badge ${h.atRisk > 2 ? 'badge-risk' : 'badge-ok'}">${h.atRisk} students</span></td>
        <td><span class="badge ${h.status === 'Normal' ? 'badge-ok' : 'badge-risk'}">${h.status.toUpperCase()}</span></td>
      </tr>
    `).join('');
  }

  const riskBody = document.getElementById('hod-risk-body');
  if (riskBody) {
    const atRiskStudents = STUDENTS.filter(s => s.pct < 75);
    riskBody.innerHTML = atRiskStudents.map(s => `
      <tr>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td><code>${escapeHtml(s.roll)}</code></td>
        <td>${escapeHtml(s.dept)} &middot; Section ${escapeHtml(s.sec || 'A')}</td>
        <td><span style="font-weight:700; color: var(--danger);">${s.pct}%</span></td>
        <td>${Math.ceil((75 - s.pct) * 0.4)} sessions needed</td>
        <td><span class="badge badge-risk">CRITICAL</span></td>
        <td style="text-align: right;">
          <button class="btn btn-outline btn-sm" onclick="showToast('Attendance notice sent to ${escapeHtml(s.name)} (${s.roll})', 'info')">
            <i data-lucide="send" class="icon-sm"></i>
            <span>Send Notice</span>
          </button>
        </td>
      </tr>
    `).join('');
  }

  initHodChart();
  refreshIcons();
}

// ── DOM READY INITIALIZATION ─────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initAuth();
  updateDate();
  refreshIcons();
});
