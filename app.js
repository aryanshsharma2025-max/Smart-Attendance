// ============================================================
//  SMART ATTENDANCE SYSTEM — app.js
//  Handles: page routing, live scan simulation, charts,
//           student table, reports, session cards, modals, theme
// ============================================================

const API_BASE = 'http://localhost:8080/api';  // change to your server

// ── THEME TOGGLE ─────────────────────────────────────────────
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);

  // Re-render charts to match theme if needed (optional precision detail)
  // For a basic toggle, changing CSS variables is enough. 
  // Chart.js uses canvas, so let's update some colors if needed.
  if (window.myWeekChart) {
    window.myWeekChart.options.scales.y.grid.color = newTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    window.myWeekChart.options.scales.y.ticks.color = newTheme === 'dark' ? '#94a3b8' : '#64748b';
    window.myWeekChart.options.scales.x.ticks.color = newTheme === 'dark' ? '#94a3b8' : '#64748b';
    window.myWeekChart.update();
  }
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
  }
}

initTheme();

// ── SAMPLE / MOCK DATA ───────────────────────────────────────

const STUDENTS = [
  { id: 1, name: 'Aarav Sharma',   roll: '21CSE001', dept: 'CSE', sem: 3, rfid: 'A1B2C3D4', pct: 85 },
  { id: 2, name: 'Anita Patel',    roll: '21CSE002', dept: 'CSE', sem: 3, rfid: 'E5F6G7H8', pct: 92 },
  { id: 3, name: 'Suresh Verma',   roll: '21CSE003', dept: 'CSE', sem: 3, rfid: 'I9J0K1L2', pct: 64 },
  { id: 4, name: 'Divya Nair',     roll: '21CSE004', dept: 'CSE', sem: 3, rfid: 'C3D4E5F6', pct: 88 },
  { id: 5, name: 'Rohan Das',      roll: '21CSE005', dept: 'CSE', sem: 3, rfid: 'G7H8I9J0', pct: 79 },
  { id: 6, name: 'Sneha Gupta',    roll: '21CSE006', dept: 'CSE', sem: 3, rfid: 'K1L2M3N4', pct: 72 },
  { id: 7, name: 'Arjun Mehta',    roll: '21CSE007', dept: 'CSE', sem: 3, rfid: 'O5P6Q7R8', pct: 94 },
  { id: 8, name: 'Ananya Roy',     roll: '21CSE008', dept: 'CSE', sem: 3, rfid: 'S9T0U1V2', pct: 81 },
  { id: 9, name: 'Meena Joshi',    roll: '21ECE001', dept: 'ECE', sem: 3, rfid: 'M3N4O5P6', pct: 80 },
  { id: 10, name: 'Varun Dhawan',  roll: '21ME001',  dept: 'ME',  sem: 3, rfid: 'Q7R8S9T0', pct: 71 },
];

const RFID_MAP = {};
STUDENTS.forEach(s => { if (s.rfid) RFID_MAP[s.rfid] = s; });

const RECENT_SCANS = [
  { name: 'Aarav Sharma',  roll: '21CSE001', course: 'CSE301 — Data Structures', time: '09:02 AM', method: 'Manual', status: 'present' },
  { name: 'Anita Patel',   roll: '21CSE002', course: 'CSE301 — Data Structures', time: '09:03 AM', method: 'Manual', status: 'present' },
  { name: 'Suresh Verma',  roll: '21CSE003', course: 'CSE301 — Data Structures', time: '—',        method: 'Manual', status: 'absent' },
  { name: 'Divya Nair',    roll: '21CSE004', course: 'CSE301 — Data Structures', time: '09:05 AM', method: 'Manual', status: 'present' },
  { name: 'Rohan Das',     roll: '21CSE005', course: 'CSE301 — Data Structures', time: '09:06 AM', method: 'Manual', status: 'present' },
  { name: 'Meena Joshi',   roll: '21ECE001', course: 'ECE302 — DSP',             time: '11:04 AM', method: 'Manual', status: 'present' },
];

const REPORT_DATA = [
  { roll: '21CSE001', name: 'Aarav Sharma',  total: 40, attended: 34, pct: 85 },
  { roll: '21CSE002', name: 'Anita Patel',   total: 40, attended: 37, pct: 92 },
  { roll: '21CSE003', name: 'Suresh Verma',  total: 40, attended: 26, pct: 65 },
  { roll: '21CSE004', name: 'Divya Nair',    total: 40, attended: 35, pct: 88 },
  { roll: '21CSE005', name: 'Rohan Das',     total: 40, attended: 32, pct: 80 },
  { roll: '21CSE006', name: 'Sneha Gupta',   total: 40, attended: 29, pct: 72 },
  { roll: '21ECE001', name: 'Meena Joshi',   total: 38, attended: 31, pct: 82 },
  { roll: '21ME001',  name: 'Varun Dhawan',  total: 36, attended: 26, pct: 72 },
];

const SESSIONS_DATA = [
  { id: 1, course: 'CSE301 — Data Structures & Algorithms', room: 'Room 204', time: '09:00–10:00', date: 'Today', status: 'completed' },
  { id: 2, course: 'CSE401 — Computer Networks', room: 'Room 101', time: '10:30–11:30', date: 'Today', status: 'active' },
  { id: 3, course: 'ECE302 — DSP', room: 'Lab 3', time: '11:00–12:00', date: 'Today', status: 'scheduled' },
  { id: 4, course: 'CSE302 — Object Oriented Programming', room: 'Room 204', time: '09:00–10:00', date: 'Yesterday', status: 'completed' },
];

// ── COURSE CATALOG & ROSTERS ─────────────────────────────────

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
    { id: 101, roll: '21CSE001', name: 'Aarav Sharma' },
    { id: 102, roll: '21CSE002', name: 'Anita Patel' },
    { id: 103, roll: '21CSE003', name: 'Suresh Verma' },
    { id: 104, roll: '21CSE004', name: 'Divya Nair' },
    { id: 105, roll: '21CSE005', name: 'Rohan Das' },
    { id: 106, roll: '21CSE006', name: 'Sneha Gupta' },
    { id: 107, roll: '21CSE007', name: 'Arjun Mehta' },
    { id: 108, roll: '21CSE008', name: 'Ananya Roy' },
    { id: 109, roll: '21CSE009', name: 'Karan Patel' },
    { id: 110, roll: '21CSE010', name: 'Meera Iyer' },
    { id: 111, roll: '21CSE011', name: 'Vikas Singh' },
    { id: 112, roll: '21CSE012', name: 'Tanvi Shah' },
    { id: 113, roll: '21CSE013', name: 'Aman Joshi' },
    { id: 114, roll: '21CSE014', name: 'Priya Anand' },
    { id: 115, roll: '21CSE015', name: 'Siddharth Rao' },
  ],
  'CSE_3_B': [
    { id: 116, roll: '21CSE051', name: 'Aditya Kulkarni' },
    { id: 117, roll: '21CSE052', name: 'Bhavya Sen' },
    { id: 118, roll: '21CSE053', name: 'Chaitanya Reddi' },
    { id: 119, roll: '21CSE054', name: 'Deepa Menon' },
    { id: 120, roll: '21CSE055', name: 'Farhan Khan' },
    { id: 121, roll: '21CSE056', name: 'Gauri Deshmukh' },
    { id: 122, roll: '21CSE057', name: 'Harshavardhan Rao' },
    { id: 123, roll: '21CSE058', name: 'Ishita Bansal' },
    { id: 124, roll: '21CSE059', name: 'Jatin Chawla' },
    { id: 125, roll: '21CSE060', name: 'Kriti Sanon' },
  ],
  'CSE_4_A': [
    { id: 126, roll: '20CSE001', name: 'Akash Pillai' },
    { id: 127, roll: '20CSE002', name: 'Brijesh Tiwari' },
    { id: 128, roll: '20CSE003', name: 'Chetna Jain' },
    { id: 129, roll: '20CSE004', name: 'Devendra Yadav' },
    { id: 130, roll: '20CSE005', name: 'Esha Bhattacharya' },
    { id: 131, roll: '20CSE006', name: 'Falguni Pathak' },
    { id: 132, roll: '20CSE007', name: 'Gautam Gambhir' },
    { id: 133, roll: '20CSE008', name: 'Himani Kapoor' },
  ],
  'ECE_3_A': [
    { id: 201, roll: '21ECE001', name: 'Meena Joshi' },
    { id: 202, roll: '21ECE002', name: 'Naman Mathur' },
    { id: 203, roll: '21ECE003', name: 'Omkar Salvi' },
    { id: 204, roll: '21ECE004', name: 'Pooja Hegde' },
    { id: 205, roll: '21ECE005', name: 'Raghavendra Pai' },
    { id: 206, roll: '21ECE006', name: 'Shreya Ghoshal' },
    { id: 207, roll: '21ECE007', name: 'Tarun Gogoi' },
    { id: 208, roll: '21ECE008', name: 'Uma Bharti' },
  ],
  'ME_3_A': [
    { id: 301, roll: '21ME001', name: 'Varun Dhawan' },
    { id: 302, roll: '21ME002', name: 'Yash Chopra' },
    { id: 303, roll: '21ME003', name: 'Zaid Hamid' },
    { id: 304, roll: '21ME004', name: 'Alok Nath' },
    { id: 305, roll: '21ME005', name: 'Bhupendra Jogi' },
    { id: 306, roll: '21ME006', name: 'Chirag Paswan' },
    { id: 307, roll: '21ME007', name: 'Dinesh Karthik' },
    { id: 308, roll: '21ME008', name: 'Ekta Kapoor' },
  ]
};

function getRosterForClass(dept, sem, sec) {
  const key = `${dept}_${sem}_${sec}`;
  if (CLASS_ROSTERS[key]) {
    return CLASS_ROSTERS[key].map(s => ({ ...s, status: 'present' }));
  }
  const sampleNames = [
    'Aarav Sharma', 'Anita Patel', 'Suresh Verma', 'Divya Nair',
    'Rohan Das', 'Sneha Gupta', 'Arjun Mehta', 'Ananya Roy',
    'Karan Patel', 'Meera Iyer', 'Vikas Singh', 'Tanvi Shah',
    'Aman Joshi', 'Priya Anand', 'Siddharth Rao'
  ];
  return sampleNames.map((name, idx) => {
    const num = String(idx + 1).padStart(3, '0');
    return {
      id: parseInt(`${dept.charCodeAt(0)}${sem}${idx + 1}`),
      roll: `21${dept}${num}`,
      name: name,
      status: 'present'
    };
  });
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

// ── PAGE ROUTING ─────────────────────────────────────────────
function showPage(pageId, linkEl) {
  if (pageId === 'live') pageId = 'attendance';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + pageId);
  if (pageEl) pageEl.classList.add('active');

  if (linkEl) {
    linkEl.classList.add('active');
  } else {
    const match = document.querySelector(`[data-page="${pageId}"]`);
    if (match) match.classList.add('active');
  }

  const titleMap = {
    dashboard: 'Dashboard',
    attendance: 'Attendance Recording',
    students: 'Students',
    reports: 'Reports',
    sessions: 'Sessions'
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) {
    titleEl.textContent = titleMap[pageId] || pageId;
  }

  if (pageId === 'attendance') {
    initAttendancePage();
  }

  // Close sidebar on mobile
  if (window.innerWidth < 900) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── LIVE DATE ────────────────────────────────────────────────
function updateDate() {
  const d = new Date();
  document.getElementById('live-date').textContent =
    d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
updateDate();

// ── RECENT SCANS TABLE ───────────────────────────────────────
function renderRecentScans() {
  const tbody = document.getElementById('recent-body');
  tbody.innerHTML = RECENT_SCANS.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.roll}</td>
      <td>${s.course}</td>
      <td>${s.time}</td>
      <td><span class="badge badge-rfid">${s.method}</span></td>
      <td><span class="badge badge-${s.status}">${s.status.toUpperCase()}</span></td>
    </tr>
  `).join('');
}
renderRecentScans();

// ── STUDENTS TABLE ───────────────────────────────────────────
function renderStudents(data) {
  const tbody = document.getElementById('students-body');
  tbody.innerHTML = data.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.roll}</td>
      <td>${s.dept}</td>
      <td>Sem ${s.sem}</td>
      <td><code>${s.rfid}</code></td>
      <td>
        <span class="badge ${s.pct >= 75 ? 'badge-present' : 'badge-absent'}">${s.pct}%</span>
      </td>
      <td>
        <button class="btn btn-outline" style="padding:4px 10px;font-size:12px"
          onclick="editStudent(${s.id})">Edit</button>
      </td>
    </tr>
  `).join('');
}
renderStudents(STUDENTS);

function filterStudents(query) {
  const q = query.toLowerCase();
  const filtered = STUDENTS.filter(s =>
    s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q)
  );
  renderStudents(filtered);
}

function editStudent(id) {
  showToast('Edit functionality — connect to PUT /api/students/' + id);
}

// ── REPORT TABLE ─────────────────────────────────────────────
function renderReport(data) {
  const tbody = document.getElementById('report-body');
  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${r.roll}</td>
      <td><strong>${r.name}</strong></td>
      <td>${r.total}</td>
      <td>${r.attended}</td>
      <td><span class="badge ${r.pct >= 75 ? 'badge-present' : 'badge-absent'}">${r.pct}%</span></td>
      <td><span class="badge ${r.pct >= 75 ? 'badge-ok' : 'badge-risk'}">${r.pct >= 75 ? 'OK' : 'AT RISK'}</span></td>
    </tr>
  `).join('');
}
renderReport(REPORT_DATA);

function generateReport() {
  showToast('Report generated for selected course & date range');
  renderReport(REPORT_DATA);
}

function exportCSV() {
  const header = 'Roll No,Name,Total Sessions,Attended,Attendance %,Status\n';
  const rows = REPORT_DATA.map(r =>
    `${r.roll},${r.name},${r.total},${r.attended},${r.pct}%,${r.pct >= 75 ? 'OK' : 'AT RISK'}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'attendance_report.csv';
  a.click();
  showToast('CSV exported successfully');
}

// ── SESSION CARDS ────────────────────────────────────────────
function renderSessions() {
  const grid = document.getElementById('sessions-grid');
  grid.innerHTML = SESSIONS_DATA.map(s => `
    <div class="session-card">
      <div class="session-card-title">${s.course}</div>
      <div class="session-card-meta">${s.room} · ${s.time} · ${s.date}</div>
      <span class="session-card-status s-${s.status}">${s.status.toUpperCase()}</span>
    </div>
  `).join('');
}
renderSessions();

function createSession() {
  showToast('Session scheduler — connect to POST /api/sessions');
}

// ── ATTENDANCE PAGE FUNCTIONS ────────────────────────────────
let attendanceInitialized = false;

function initAttendancePage() {
  const dateInput = document.getElementById('att-date');
  if (dateInput && !dateInput.value) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }

  if (!attendanceInitialized) {
    onDepartmentOrSemChange();
    renderAttendanceView();
    attendanceInitialized = true;
  }
}

function onDepartmentOrSemChange() {
  const deptSelect = document.getElementById('att-dept');
  const semSelect = document.getElementById('att-sem');
  const subjectSelect = document.getElementById('att-subject');

  if (!deptSelect || !semSelect || !subjectSelect) return;

  const dept = deptSelect.value;
  const sem = semSelect.value;
  const courses = (COURSE_CATALOG[dept] && COURSE_CATALOG[dept][sem]) || [
    `${dept}${sem}01 — Core Subject I`,
    `${dept}${sem}02 — Core Subject II`
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
  showToast('Filters reset to default: CSE · Sem 3 · Sec A');
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
    showToast(`Loaded roster with ${ATTENDANCE_STATE.students.length} students`);
  }, 350);
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
}

function renderInitialEmptyState() {
  return `
    <div class="att-state-card">
      <div class="att-state-icon">📋</div>
      <div class="att-state-title">Select Class & Load Roster</div>
      <div class="att-state-desc">
        Configure the session date, branch, semester, section, and subject above, then click <strong>"Load Students"</strong> to begin recording attendance.
      </div>
      <button class="btn btn-primary" onclick="loadStudentsAction()">
        <span>⚡</span> Load Default Class Roster
      </button>
    </div>
  `;
}

function renderLoadingState() {
  const info = ATTENDANCE_STATE.classInfo || { deptName: 'Department', sem: '3', sec: 'A' };
  return `
    <div class="att-state-card">
      <div class="att-spinner"></div>
      <div class="att-state-title">Loading Student Roster…</div>
      <div class="att-state-desc">
        Fetching enrolled students for ${info.deptName} (Semester ${info.sem}, Section ${info.sec})…
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
    <!-- Roster Details Banner -->
    <div class="att-roster-banner">
      <div class="att-roster-details">
        <span class="att-roster-tag">🏫 <strong>${info.dept} · Sem ${info.sem} (${info.sec})</strong></span>
        <span class="att-roster-tag">📖 <strong>${info.subject}</strong></span>
        <span class="att-roster-tag">📅 <strong>${info.date}</strong></span>
      </div>
      <button class="btn btn-outline btn-sm" onclick="resetAttendanceAction()">
        ✕ Change Class
      </button>
    </div>

    <!-- Live Attendance Summary Grid -->
    <div class="att-summary-grid">
      <div class="att-stat-card stat-total">
        <div class="att-stat-info">
          <div class="att-stat-label">Total Students</div>
          <div class="att-stat-val" id="cnt-total">${metrics.total}</div>
          <div class="att-stat-sub">Enrolled roster count</div>
        </div>
      </div>

      <div class="att-stat-card stat-present">
        <div class="att-stat-info">
          <div class="att-stat-label">Present</div>
          <div class="att-stat-val" id="cnt-present">${metrics.presentCount}</div>
          <div class="att-stat-sub"><span class="att-stat-badge att-badge-green" id="cnt-present-pct">${metrics.presentPct}% of class</span></div>
        </div>
      </div>

      <div class="att-stat-card stat-absent">
        <div class="att-stat-info">
          <div class="att-stat-label">Absent</div>
          <div class="att-stat-val" id="cnt-absent">${metrics.absentCount}</div>
          <div class="att-stat-sub"><span class="att-stat-badge att-badge-red" id="cnt-absent-pct">${metrics.absentPct}% of class</span></div>
        </div>
      </div>

      <div class="att-stat-card stat-selected">
        <div class="att-stat-info">
          <div class="att-stat-label">Selected (${isMarkPresent ? 'Present' : 'Absent'})</div>
          <div class="att-stat-val" id="cnt-selected">${metrics.selectedCount}</div>
          <div class="att-stat-sub"><span class="att-stat-badge att-badge-purple" id="cnt-selected-label">${isMarkPresent ? 'Marked Present' : 'Marked Absent'}</span></div>
        </div>
      </div>
    </div>

    <!-- Attendance Controls Toolbar -->
    <div class="att-controls-bar">
      <div class="att-modes-wrapper">
        <span class="att-mode-label">Mode:</span>
        <div class="mode-segmented-control">
          <button type="button" class="mode-btn ${isMarkPresent ? 'active-present' : ''}" onclick="setAttendanceMode('present')">
            <span class="mode-icon">✓</span> MARK PRESENT
          </button>
          <button type="button" class="mode-btn ${!isMarkPresent ? 'active-absent' : ''}" onclick="setAttendanceMode('absent')">
            <span class="mode-icon">✕</span> MARK ABSENT
          </button>
        </div>
      </div>

      <div class="att-bulk-group">
        <button type="button" class="btn btn-outline btn-sm" onclick="bulkSelectAll()" title="Check all students in current mode">
          ☑ Select All
        </button>
        <button type="button" class="btn btn-outline btn-sm" onclick="bulkClearAll()" title="Uncheck all students in current mode">
          ☐ Clear All
        </button>
      </div>

      <div class="att-search-group">
        <input type="text" class="att-search-input" placeholder="Search student or roll no…" value="${escapeHtml(ATTENDANCE_STATE.searchQuery)}" oninput="filterAttendanceTable(this.value)" />
      </div>
    </div>

    <!-- Active Mode Explanation Banner -->
    <div class="mode-explanation-banner ${isMarkPresent ? 'banner-present' : 'banner-absent'}">
      <div>
        <strong>${isMarkPresent ? '🟢 MARK PRESENT MODE' : '🔴 MARK ABSENT MODE'}:</strong>
        ${isMarkPresent
          ? 'Checking a student records them as <strong>Present</strong>. Unchecking records them as <strong>Absent</strong>.'
          : 'Checking a student records them as <strong>Absent</strong>. Unchecking records them as <strong>Present</strong>.'
        }
      </div>
      <span class="banner-pill">${isMarkPresent ? 'Checked = Present' : 'Checked = Absent'}</span>
    </div>

    <!-- Student Attendance Table -->
    <div class="att-table-wrapper ${isMarkPresent ? 'mode-present-active' : 'mode-absent-active'}">
      <table class="att-table" id="att-students-table">
        <thead>
          <tr>
            <th style="width: 60px;">#</th>
            <th style="width: 160px;">Roll Number</th>
            <th>Student Name</th>
            <th style="width: 160px;">Current Status</th>
            <th class="col-checkbox">
              <label class="custom-checkbox-wrap" title="${isMarkPresent ? 'Toggle all Present' : 'Toggle all Absent'}">
                <input type="checkbox" id="att-master-checkbox" class="att-checkbox-input" onchange="toggleHeaderCheckbox(this.checked)" />
              </label>
              <div style="font-size: 11px; margin-top: 4px; font-weight: 700;">
                ${isMarkPresent ? 'MARK PRESENT' : 'MARK ABSENT'}
              </div>
            </th>
          </tr>
        </thead>
        <tbody id="att-table-body">
          ${renderTableRows(filteredStudents, isMarkPresent)}
        </tbody>
      </table>
    </div>

    <!-- Prominent Save Action Bar -->
    <div class="att-save-bar">
      <div class="att-save-info">
        <span>Ready to save session: <strong id="save-summary-txt">${metrics.presentCount} Present, ${metrics.absentCount} Absent</strong></span>
      </div>
      <div class="att-save-actions">
        <button class="btn btn-outline" onclick="resetAttendanceAction()">Cancel</button>
        <button class="btn btn-primary btn-save-attendance" onclick="saveAttendanceAction()">
          💾 Save Attendance
        </button>
      </div>
    </div>
  `;
}

function renderTableRows(students, isMarkPresent) {
  if (!students || students.length === 0) {
    return `
      <tr>
        <td colspan="5" style="text-align: center; padding: 36px; color: var(--text-2);">
          <em>No students found matching your search.</em>
        </td>
      </tr>
    `;
  }

  return students.map((s, index) => {
    const isChecked = isMarkPresent ? s.status === 'present' : s.status === 'absent';
    return `
      <tr class="att-row ${s.status === 'present' ? 'row-is-present' : 'row-is-absent'}" id="att-row-${s.id}" onclick="handleRowClick(${s.id}, event)">
        <td><strong>${index + 1}</strong></td>
        <td><code>${s.roll}</code></td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>
          <span class="badge ${s.status === 'present' ? 'badge-present' : 'badge-absent'}" id="badge-${s.id}">
            ${s.status.toUpperCase()}
          </span>
        </td>
        <td class="col-checkbox" onclick="event.stopPropagation()">
          <label class="custom-checkbox-wrap">
            <input type="checkbox"
              class="att-checkbox-input att-student-checkbox"
              data-id="${s.id}"
              id="chk-${s.id}"
              ${isChecked ? 'checked' : ''}
              onchange="handleCheckboxChange(${s.id}, this.checked)"
            />
          </label>
        </td>
      </tr>
    `;
  }).join('');
}

function renderSavedState() {
  const sum = ATTENDANCE_STATE.savedSummary || {
    subject: 'Course',
    deptName: 'Department',
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
      <div class="att-saved-icon">✓</div>
      <div class="att-saved-title">Attendance Successfully Recorded!</div>
      <div class="att-saved-subtitle">
        ${escapeHtml(sum.subject)} · ${escapeHtml(sum.deptName)} (Sem ${sum.sem}, Sec ${sum.sec}) on ${sum.date}
      </div>

      <div class="att-saved-summary-box">
        <div class="att-saved-stat-item">
          <div class="att-saved-stat-val">${sum.total}</div>
          <div class="att-saved-stat-lbl">Total Students</div>
        </div>
        <div class="att-saved-stat-item">
          <div class="att-saved-stat-val" style="color: var(--green);">${sum.present}</div>
          <div class="att-saved-stat-lbl">Present (${sum.pct}%)</div>
        </div>
        <div class="att-saved-stat-item">
          <div class="att-saved-stat-val" style="color: var(--red);">${sum.absent}</div>
          <div class="att-saved-stat-lbl">Absent (${100 - sum.pct}%)</div>
        </div>
        <div class="att-saved-stat-item">
          <div class="att-saved-stat-val" style="color: var(--purple);">Manual</div>
          <div class="att-saved-stat-lbl">Recording Method</div>
        </div>
      </div>

      <div class="att-saved-actions">
        <button class="btn btn-primary" onclick="resetAttendanceAction()">
          <span>➕</span> Record Another Class
        </button>
        <button class="btn btn-outline" onclick="editCurrentAttendance()">
          <span>✏️</span> Review / Edit This Attendance
        </button>
        <button class="btn btn-outline" onclick="showPage('reports', null)">
          <span>📊</span> View in Reports
        </button>
      </div>
    </div>
  `;
}

// ── ATTENDANCE ACTIONS & MODE BEHAVIOR ────────────────────────

function setAttendanceMode(mode) {
  if (ATTENDANCE_STATE.mode === mode) return;
  ATTENDANCE_STATE.mode = mode;
  renderAttendanceView();
  showToast(`Switched to MARK ${mode.toUpperCase()} mode`);
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
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.closest('.col-checkbox')) {
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
  const cntSelected = document.getElementById('cnt-selected');
  const cntPresentPct = document.getElementById('cnt-present-pct');
  const cntAbsentPct = document.getElementById('cnt-absent-pct');
  const saveTxt = document.getElementById('save-summary-txt');

  if (cntTotal) cntTotal.textContent = metrics.total;
  if (cntPresent) cntPresent.textContent = metrics.presentCount;
  if (cntAbsent) cntAbsent.textContent = metrics.absentCount;
  if (cntSelected) cntSelected.textContent = metrics.selectedCount;
  if (cntPresentPct) cntPresentPct.textContent = `${metrics.presentPct}% of class`;
  if (cntAbsentPct) cntAbsentPct.textContent = `${metrics.absentPct}% of class`;
  if (saveTxt) saveTxt.textContent = `${metrics.presentCount} Present, ${metrics.absentCount} Absent`;
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
  }
}

function saveAttendanceAction() {
  if (!ATTENDANCE_STATE.students || ATTENDANCE_STATE.students.length === 0) {
    showToast('No students loaded to record attendance');
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
    room: 'Room 204',
    time: timeStr,
    date: 'Today',
    status: 'completed'
  });
  renderSessions();

  ATTENDANCE_STATE.students.slice(0, 4).forEach(s => {
    RECENT_SCANS.unshift({
      name: s.name,
      roll: s.roll,
      course: ATTENDANCE_STATE.classInfo.subject.split('—')[0].trim(),
      time: timeStr,
      method: 'Manual',
      status: s.status
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
  showToast(`✓ Attendance saved! ${metrics.presentCount} Present, ${metrics.absentCount} Absent`);
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── MODAL ────────────────────────────────────────────────────
function openAddModal() {
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function saveStudent() {
  const name = document.getElementById('m-name').value.trim();
  const roll = document.getElementById('m-roll').value.trim();
  const email = document.getElementById('m-email').value.trim();
  const rfid = document.getElementById('m-rfid').value.trim().toUpperCase();

  if (!name || !roll || !email) {
    showToast('Please fill required fields');
    return;
  }

  // In production: POST to /api/students
  const newStudent = {
    id: STUDENTS.length + 1,
    name, roll,
    dept: document.getElementById('m-dept').value.substring(0, 3).toUpperCase(),
    sem: parseInt(document.getElementById('m-sem').value),
    rfid: rfid || 'PENDING',
    pct: 0
  };
  STUDENTS.push(newStudent);
  if (rfid) RFID_MAP[rfid] = newStudent;

  renderStudents(STUDENTS);
  closeModal();
  showToast(`${name} enrolled successfully`);

  // Clear form
  ['m-name', 'm-roll', 'm-email', 'm-rfid'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

// ── CHARTS ───────────────────────────────────────────────────
function initCharts() {
  // Weekly bar chart
  const weekCtx = document.getElementById('weekChart').getContext('2d');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  window.myWeekChart = new Chart(weekCtx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      datasets: [{
        label: 'Attendance %',
        data: [85, 78, 90, 72, 88, 60],
        backgroundColor: 'rgba(45,110,247,0.25)',
        borderColor: '#2d6ef7',
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: 'rgba(45,110,247,0.4)',
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 40, max: 100,
          grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
          ticks: { callback: v => v + '%', font: { size: 11 }, color: isDark ? '#94a3b8' : '#64748b' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: isDark ? '#94a3b8' : '#64748b' }
        }
      }
    }
  });

  // Dept doughnut chart
  const deptCtx = document.getElementById('deptChart').getContext('2d');
  new Chart(deptCtx, {
    type: 'doughnut',
    data: {
      labels: ['CSE', 'ECE', 'ME'],
      datasets: [{
        data: [82, 78, 70],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 12 }, padding: 16, boxWidth: 12, color: '#64748b' }
        }
      }
    }
  });
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── INIT ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initCharts();
  showPage('dashboard', document.querySelector('[data-page="dashboard"]'));
});
