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

// ── SAMPLE DATA (replace with real API calls) ────────────────

const RFID_MAP = {};
STUDENTS.forEach(s => { RFID_MAP[s.rfid] = s; });

const SESSIONS_DATA = [
  { id: 1, course: 'CSE301 — Data Structures', room: 'Room 204', time: '09:00–10:00', date: 'Today', status: 'active' },
  { id: 2, course: 'CSE401 — Computer Networks', room: 'Room 101', time: '10:30–11:30', date: 'Today', status: 'active' },
  { id: 3, course: 'ECE302 — DSP', room: 'Lab 3', time: '11:00–12:00', date: 'Today', status: 'scheduled' },
  { id: 4, course: 'CSE301 — Data Structures', room: 'Room 204', time: '09:00–10:00', date: 'Yesterday', status: 'completed' },
];


let logCount = 0;
let markedInSession = new Set();

// ── PAGE ROUTING ─────────────────────────────────────────────
function showPage(pageId, linkEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('page-' + pageId).classList.add('active');

  if (linkEl) {
    linkEl.classList.add('active');
  } else {
    const match = document.querySelector(`[data-page="${pageId}"]`);
    if (match) match.classList.add('active');
  }

  document.getElementById('page-title').textContent =
    {
      dashboard: 'Dashboard', live: 'Live Scan', students: 'Students',
      reports: 'Reports', sessions: 'Sessions'
    }[pageId] || pageId;

  // Close sidebar on mobile
  if (window.innerWidth < 900) {
    document.getElementById('sidebar').classList.remove('open');
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

// ── LIVE SCAN SIMULATION ─────────────────────────────────────
function simulateScan() {
  const uid = document.getElementById('rfid-input').value.trim().toUpperCase();
  const sessionId = document.getElementById('session-select').value;

  if (!uid) {
    showToast('Enter an RFID UID first');
    return;
  }

  const ring = document.getElementById('scan-ring');
  ring.classList.add('scanning');
  ring.querySelector('.scan-label').textContent = 'Processing…';

  setTimeout(() => {
    const student = RFID_MAP[uid];
    let type, message;

    if (!student) {
      type = 'err';
      message = 'Unknown card: ' + uid;
      ring.classList.remove('scanning');
      ring.classList.add('error');
      ring.querySelector('.scan-label').textContent = 'Card not found';
    } else if (markedInSession.has(uid + '_' + sessionId)) {
      type = 'dup';
      message = 'Already marked: ' + student.name;
      ring.classList.remove('scanning');
      ring.querySelector('.scan-label').textContent = 'Duplicate scan';
    } else {
      type = 'ok';
      markedInSession.add(uid + '_' + sessionId);
      message = student.name + ' — Present';
      ring.classList.remove('scanning', 'error');
      ring.querySelector('.scan-label').textContent = '✓ Marked present';
      logCount++;
      document.getElementById('log-count').textContent = logCount + ' present';
    }

    addLogEntry(student, type, message);
    document.getElementById('rfid-input').value = '';

    setTimeout(() => {
      ring.classList.remove('scanning', 'error');
      ring.querySelector('.scan-label').textContent = 'Waiting for card…';
    }, 2200);

  }, 600);
}

function addLogEntry(student, type, message) {
  const list = document.getElementById('log-list');
  const empty = list.querySelector('.log-empty');
  if (empty) empty.remove();

  const initials = student
    ? student.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : '??';

  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <div class="log-avatar ${type}">${initials}</div>
    <div class="log-info">
      <div class="log-name">${message}</div>
      <div class="log-roll">${student ? student.roll : 'Unknown UID'}</div>
    </div>
    <div class="log-time">${now}</div>
  `;

  list.insertBefore(entry, list.firstChild);
}

// Allow Enter key in RFID input
const rfidInput = document.getElementById('rfid-input');
if (rfidInput) {
  rfidInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') simulateScan();
  });
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
