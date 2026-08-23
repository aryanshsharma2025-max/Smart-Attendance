/**
 * ═══════════════════════════════════════════════════
 *  SYNAPSE ATTENDANCE SYSTEM — app.js
 *  Modular, cinematic, production-grade frontend logic
 * ═══════════════════════════════════════════════════
 */

'use strict';

/* ─── DATA LAYER ──────────────────────────────────── */
const DATA = {
  students: [
    { roll:'CS21B001', name:'Priya Anand',    cls:'CS-A', subject:'Data Structures',   time:'09:02', status:'Present' },
    { roll:'CS21B002', name:'Aarvy Agrawal',  cls:'CS-A', subject:'Data Structures',   time:'09:05', status:'Present' },
    { roll:'CS21B003', name:'Sneha Gupta',    cls:'CS-A', subject:'Data Structures',   time:'09:11', status:'Late'    },
    { roll:'CS21B004', name:'Arjun Sharma',   cls:'CS-A', subject:'Data Structures',   time:'09:03', status:'Present' },
    { roll:'CS21B005', name:'Divya Nair',     cls:'CS-A', subject:'DBMS',              time:'09:00', status:'Present' },
    { roll:'CS21B006', name:'Karan Patel',    cls:'CS-A', subject:'DBMS',              time:'—',     status:'Absent'  },
    { roll:'CS21B007', name:'Meera Iyer',     cls:'CS-B', subject:'Operating Systems', time:'09:08', status:'Present' },
    { roll:'CS21B008', name:'Vikas Singh',    cls:'CS-B', subject:'Operating Systems', time:'—',     status:'Absent'  },
    { roll:'CS21B009', name:'Ananya Roy',     cls:'CS-B', subject:'Computer Networks', time:'09:14', status:'Late'    },
    { roll:'CS21B010', name:'Rohan Das',      cls:'CS-B', subject:'Computer Networks', time:'09:01', status:'Present' },
    { roll:'CS21B011', name:'Tanvi Shah',     cls:'CS-A', subject:'Mathematics',       time:'09:06', status:'Present' },
    { roll:'CS21B012', name:'Aman Joshi',     cls:'CS-A', subject:'Mathematics',       time:'—',     status:'Absent'  },
  ],

  records: [
    { date:'2025-04-10', time:'09:02', roll:'CS21B001', name:'Priya Anand',    subject:'Data Structures',   status:'Present' },
    { date:'2025-04-10', time:'09:05', roll:'CS21B002', name:'Rahul Mehta',    subject:'Data Structures',   status:'Present' },
    { date:'2025-04-10', time:'—',     roll:'CS21B006', name:'Karan Patel',    subject:'DBMS',              status:'Absent'  },
    { date:'2025-04-09', time:'09:11', roll:'CS21B003', name:'Sneha Gupta',    subject:'Operating Systems', status:'Late'    },
    { date:'2025-04-09', time:'09:03', roll:'CS21B004', name:'Arjun Sharma',   subject:'Computer Networks', status:'Present' },
    { date:'2025-04-09', time:'—',     roll:'CS21B008', name:'Vikas Singh',    subject:'Operating Systems', status:'Absent'  },
    { date:'2025-04-08', time:'09:00', roll:'CS21B005', name:'Divya Nair',     subject:'DBMS',              status:'Present' },
    { date:'2025-04-08', time:'09:14', roll:'CS21B009', name:'Ananya Roy',     subject:'Mathematics',       status:'Late'    },
    { date:'2025-04-07', time:'09:01', roll:'CS21B010', name:'Rohan Das',      subject:'Computer Networks', status:'Present' },
    { date:'2025-04-07', time:'09:06', roll:'CS21B011', name:'Tanvi Shah',     subject:'Mathematics',       status:'Present' },
    { date:'2025-04-07', time:'—',     roll:'CS21B012', name:'Aman Joshi',     subject:'Mathematics',       status:'Absent'  },
    { date:'2025-04-06', time:'09:08', roll:'CS21B007', name:'Meera Iyer',     subject:'Operating Systems', status:'Present' },
  ],

  lowAttendance: [
    { roll:'CS21B006', name:'Karan Patel',  pct: 61, missed: 18, risk: 'Critical' },
    { roll:'CS21B008', name:'Vikas Singh',  pct: 58, missed: 22, risk: 'Critical' },
    { roll:'CS21B012', name:'Aman Joshi',   pct: 70, missed: 12, risk: 'Warning'  },
    { roll:'CS21B003', name:'Sneha Gupta',  pct: 73, missed: 10, risk: 'Warning'  },
  ],

  subjects: [
    { name:'Data Structures',   present: 28, total: 32, color: 'blue',   icon: '📐' },
    { name:'DBMS',              present: 24, total: 30, color: 'purple',  icon: '🗄' },
    { name:'Operating Systems', present: 22, total: 28, color: 'green',   icon: '💻' },
    { name:'Computer Networks', present: 18, total: 26, color: 'amber',   icon: '🌐' },
    { name:'Mathematics',       present: 14, total: 20, color: 'red',     icon: '∑'  },
  ],

  stuRecords: [
    { date:'Apr 10', time:'09:02', subject:'Data Structures',   teacher:'Dr. Rajan',    status:'Present' },
    { date:'Apr 10', time:'10:30', subject:'DBMS',              teacher:'Prof. Sharma', status:'Present' },
    { date:'Apr 09', time:'09:00', subject:'Operating Systems', teacher:'Dr. Mehta',    status:'Absent'  },
    { date:'Apr 09', time:'11:00', subject:'Computer Networks', teacher:'Prof. Iyer',   status:'Present' },
    { date:'Apr 08', time:'09:02', subject:'Mathematics',       teacher:'Dr. Singh',    status:'Late'    },
    { date:'Apr 08', time:'10:30', subject:'Data Structures',   teacher:'Dr. Rajan',    status:'Present' },
    { date:'Apr 07', time:'09:00', subject:'DBMS',              teacher:'Prof. Sharma', status:'Present' },
    { date:'Apr 07', time:'11:00', subject:'Operating Systems', teacher:'Dr. Mehta',    status:'Present' },
  ],
};

/* ─── APP STATE ───────────────────────────────────── */
const STATE = {
  role: 'admin',
  theme: 'dark',
  currentStudents: [...DATA.students],
  chartsCreated: false,
};

/* ─── UTILITY ─────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

/* ─── CURSOR GLOW ─────────────────────────────────── */
(function initCursorGlow() {
  const glow = $('#cursor-glow');
  if (!glow) return;
  document.addEventListener('mousemove', (e) => {
    requestAnimationFrame(() => {
      glow.style.left = e.clientX + 'px';
      glow.style.top  = e.clientY + 'px';
    });
  });
})();

/* ─── CINEMATIC INTRO ─────────────────────────────── */
function runIntro() {
  const overlay = $('#intro-overlay');
  if (!overlay) return;
  // After bar fills, exit with animation
  setTimeout(() => {
    overlay.classList.add('exit');
    overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
  }, 2400);
}

/* ─── THEME TOGGLE ────────────────────────────────── */
function toggleTheme() {
  const html = document.documentElement;
  STATE.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = STATE.theme;
  showToast(`Switched to ${STATE.theme} mode`, 'info');
}

/* ─── TOAST SYSTEM ────────────────────────────────── */
const TOAST_ICONS = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠' };

function showToast(msg, type = 'info') {
  const container = $('#toast-container');
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || 'ℹ'}</span>
    <div class="toast-body">
      <div class="toast-msg">${msg}</div>
      <div class="toast-time">${timeStr}</div>
    </div>
    <button class="toast-close" onclick="dismissToast(this.parentElement)">×</button>
  `;

  container.appendChild(toast);

  // Auto-dismiss after 4s
  setTimeout(() => dismissToast(toast), 4000);
}

function dismissToast(el) {
  if (!el || el.classList.contains('exit')) return;
  el.classList.add('exit');
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

/* ─── MODAL SYSTEM ────────────────────────────────── */
function openModal(content) {
  const overlay = $('#modal-overlay');
  $('#modal-content').innerHTML = content;
  overlay.classList.add('open');
}

function closeModal() {
  const overlay = $('#modal-overlay');
  overlay.classList.remove('open');
}

function openAddStudentModal() {
  openModal(`
    <div class="modal-title">Add New Student</div>
    <div class="modal-sub">Register a new student and assign RFID card</div>
    <div class="field-group">
      <label class="field-label">Full Name</label>
      <div class="field-wrap">
        <span class="field-icon">◈</span>
        <input class="field-input" type="text" placeholder="e.g. Priya Anand" />
      </div>
    </div>
    <div class="field-group">
      <label class="field-label">Roll Number</label>
      <div class="field-wrap">
        <span class="field-icon">⬡</span>
        <input class="field-input" type="text" placeholder="e.g. CS21B049" />
      </div>
    </div>
    <div class="field-group">
      <label class="field-label">Class</label>
      <div class="field-wrap">
        <span class="field-icon">◉</span>
        <select class="field-input" style="padding-left:40px">
          <option>CS-A</option><option>CS-B</option><option>IT-A</option>
        </select>
      </div>
    </div>
    <div class="field-group">
      <label class="field-label">Email</label>
      <div class="field-wrap">
        <span class="field-icon">✉</span>
        <input class="field-input" type="email" placeholder="student@synapse.edu" />
      </div>
    </div>
    <div class="field-group">
      <label class="field-label">RFID Card ID</label>
      <div class="field-wrap">
        <span class="field-icon">📡</span>
        <input class="field-input" type="text" placeholder="Tap card or enter manually" />
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="closeModal(); showToast('Student registered successfully!', 'success')">
        Register Student <div class="btn-shimmer"></div>
      </button>
    </div>
  `);
}

/* ─── 3D TILT CARDS ───────────────────────────────── */
function initTiltCards() {
  $$('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', handleTilt);
    card.addEventListener('mouseleave', resetTilt);
  });
}

function handleTilt(e) {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top  + rect.height / 2;
  const dx = (e.clientX - cx) / (rect.width  / 2);
  const dy = (e.clientY - cy) / (rect.height / 2);
  const rotX = clamp(-dy * 6, -8, 8);
  const rotY = clamp( dx * 6, -8, 8);

  requestAnimationFrame(() => {
    card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
    card.style.transition = 'transform 0.08s linear';

    // Glow follows mouse
    const glow = card.querySelector('.card-glow');
    if (glow) {
      const glowX = 50 + dx * 40;
      const glowY = 50 + dy * 40;
      glow.style.transform = `translate(${glowX - 50}%, ${glowY - 50}%)`;
    }
  });
}

function resetTilt(e) {
  const card = e.currentTarget;
  card.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
  card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
  const glow = card.querySelector('.card-glow');
  if (glow) glow.style.transform = 'translate(0,0)';
}

/* ─── ANIMATED COUNTER ────────────────────────────── */
function animateCounter(el, target, duration = 1200, suffix = '') {
  const start = performance.now();
  const startVal = 0;

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Easing: ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startVal + (target - startVal) * ease);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function runStatCounters() {
  $$('.stat-val[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const hasPct = el.nextElementSibling && el.nextElementSibling.classList.contains('stat-unit');
    animateCounter(el, target, 1400);
  });

  // Student dashboard ring counters
  $$('.stu-hstat-val[data-target]').forEach(el => {
    animateCounter(el, parseInt(el.dataset.target, 10), 1200);
  });

  // Ring percentage
  const ringPct = $('.ring-pct[data-target]');
  if (ringPct) animateCounter(ringPct, parseInt(ringPct.dataset.target, 10), 1400);
}

/* ─── TABLE RENDERING ─────────────────────────────── */
function badgeHTML(status) {
  const cls = status === 'Present' ? 'present' : status === 'Absent' ? 'absent' : 'late';
  return `<span class="badge ${cls}"><div class="badge-dot"></div>${status}</span>`;
}

function renderAdminTable(data) {
  const tbody = $('#adminTbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  data.forEach((s, i) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i * 0.04}s`;
    tr.innerHTML = `
      <td><span class="roll-chip">${s.roll}</span></td>
      <td class="name-cell">${s.name}</td>
      <td><span class="class-chip">${s.cls}</span></td>
      <td>${s.subject}</td>
      <td><span class="time-chip">${s.time}</span></td>
      <td>${badgeHTML(s.status)}</td>
      <td><button class="row-action-btn" onclick="showToast('Editing ${s.name}…', 'info')">Edit</button></td>
    `;
    tbody.appendChild(tr);
  });

  const countEl = $('#tableCount');
  if (countEl) countEl.textContent = `Showing ${data.length} of ${DATA.students.length} records`;
}

function renderRecordsTable(data) {
  const tbody = $('#recTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  data.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i * 0.04}s`;
    tr.innerHTML = `
      <td><span class="time-chip">${r.date}</span></td>
      <td><span class="time-chip">${r.time}</span></td>
      <td><span class="roll-chip">${r.roll}</span></td>
      <td class="name-cell">${r.name}</td>
      <td>${r.subject}</td>
      <td>${badgeHTML(r.status)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderLowTable() {
  const tbody = $('#lowTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  DATA.lowAttendance.forEach((s, i) => {
    const isCrit = s.risk === 'Critical';
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i * 0.05}s`;
    tr.innerHTML = `
      <td><span class="roll-chip">${s.roll}</span></td>
      <td class="name-cell">${s.name}</td>
      <td>
        <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:1.05rem;color:${isCrit ? 'var(--red)' : 'var(--amber)'}">
          ${s.pct}%
        </span>
      </td>
      <td style="color:var(--text-secondary)">${s.missed} classes</td>
      <td>
        <span class="badge ${isCrit ? 'absent' : 'late'}">${s.risk}</span>
      </td>
      <td>
        <button class="row-action-btn" style="opacity:1" onclick="showToast('Notice sent to ${s.name}', 'success')">
          Send Notice
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderStuRecords() {
  const tbody = $('#stuRecTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  DATA.stuRecords.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i * 0.04}s`;
    tr.innerHTML = `
      <td><span class="time-chip">${r.date}</span></td>
      <td><span class="time-chip">${r.time}</span></td>
      <td class="name-cell">${r.subject}</td>
      <td style="color:var(--text-secondary)">${r.teacher}</td>
      <td>${badgeHTML(r.status)}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ─── SUBJECT LIST (STUDENT) ──────────────────────── */
const COLOR_MAP = {
  blue:   { bg:'rgba(59,130,246,0.12)',  fill:'linear-gradient(90deg,#3b82f6,#8b5cf6)', text:'var(--blue)'   },
  purple: { bg:'rgba(139,92,246,0.12)', fill:'linear-gradient(90deg,#8b5cf6,#3b82f6)', text:'var(--purple)' },
  green:  { bg:'rgba(16,185,129,0.12)', fill:'linear-gradient(90deg,#10b981,#3b82f6)', text:'var(--green)'  },
  amber:  { bg:'rgba(245,158,11,0.12)', fill:'linear-gradient(90deg,#f59e0b,#ef4444)', text:'var(--amber)'  },
  red:    { bg:'rgba(239,68,68,0.12)',   fill:'linear-gradient(90deg,#ef4444,#f59e0b)', text:'var(--red)'    },
};

function renderSubjectList() {
  const list = $('#subjectList');
  if (!list) return;
  list.innerHTML = '';
  DATA.subjects.forEach((s, i) => {
    const pct = Math.round(s.present / s.total * 100);
    const c = COLOR_MAP[s.color];
    const row = document.createElement('div');
    row.className = 'subject-row';
    row.style.animationDelay = `${i * 0.07}s`;
    row.innerHTML = `
      <div class="sub-icon" style="background:${c.bg}">${s.icon}</div>
      <div class="sub-info">
        <div class="sub-name">${s.name}</div>
        <div class="sub-classes">${s.present}/${s.total} classes</div>
      </div>
      <div class="sub-prog">
        <div class="sub-prog-track">
          <div class="sub-prog-fill" data-width="${pct}" style="background:${c.fill}"></div>
        </div>
        <div class="sub-pct" style="color:${c.text}">${pct}%</div>
      </div>
    `;
    list.appendChild(row);
  });

  // Animate progress bars after render
  requestAnimationFrame(() => {
    $$('.sub-prog-fill').forEach(bar => {
      setTimeout(() => { bar.style.width = bar.dataset.width + '%'; }, 200);
    });
  });
}

/* ─── CHARTS ──────────────────────────────────────── */
let chartInstances = {};

function initCharts() {
  if (STATE.chartsCreated) return;
  STATE.chartsCreated = true;

  const isDark = document.documentElement.dataset.theme !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const labelColor = isDark ? '#44445a' : '#aaaacc';
  const tickColor  = isDark ? '#8888aa' : '#4a4a6a';

  // Shared defaults
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.color = tickColor;

  const baseScales = {
    x: { grid: { color: gridColor }, ticks: { color: tickColor, font:{ size:11 } } },
    y: { grid: { color: gridColor }, ticks: { color: tickColor, font:{ size:11 } }, min:0, max:100 }
  };

  // Donut — attendance ring
  const ringCanvas = $('#attendanceRing');
  if (ringCanvas) {
    chartInstances.ring = new Chart(ringCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Present', 'Absent'],
        datasets: [{
          data: [106, 23],
          backgroundColor: ['#10b981', 'rgba(255,255,255,0.06)'],
          borderColor: ['#10b981', 'rgba(255,255,255,0.04)'],
          borderWidth: 2,
          hoverOffset: 6,
        }]
      },
      options: {
        cutout: '76%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { animateRotate: true, duration: 1400 },
      }
    });
  }

  // Line — weekly trend
  const weekCanvas = $('#weekChart');
  if (weekCanvas) {
    chartInstances.week = new Chart(weekCanvas, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{
          label: 'Attendance %',
          data: [80, 100, 60, 100, 80, 100],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          tension: 0.45, fill: true,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#3b82f6',
          pointRadius: 4, pointHoverRadius: 7,
          borderWidth: 2.5,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          ...baseScales,
          y: { ...baseScales.y, max: 110 }
        },
        animation: { duration: 1200, easing: 'easeOutQuart' },
      }
    });
  }

  // Bar — subject breakdown
  const subCanvas = $('#subChart');
  if (subCanvas) {
    chartInstances.sub = new Chart(subCanvas, {
      type: 'bar',
      data: {
        labels: ['DS', 'DBMS', 'OS', 'Networks', 'Maths'],
        datasets: [{
          label: 'Attendance %',
          data: [88, 80, 79, 69, 70],
          backgroundColor: [
            'rgba(59,130,246,0.7)',
            'rgba(139,92,246,0.7)',
            'rgba(16,185,129,0.7)',
            'rgba(245,158,11,0.7)',
            'rgba(239,68,68,0.7)',
          ],
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: baseScales,
        animation: { duration: 1000, easing: 'easeOutQuart' },
      }
    });
  }
}

/* ─── LOGIN ───────────────────────────────────────── */
let currentRole = 'admin';

function setRole(role, btn) {
  currentRole = role;
  const track = $('#roleTrack');
  $$('.role-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  if (role === 'student') {
    track.classList.add('right');
    $('#emailLabel').textContent = 'Student Email';
    $('#loginEmail').placeholder = 'student@synapse.edu';
  } else {
    track.classList.remove('right');
    $('#emailLabel').textContent = 'Email address';
    $('#loginEmail').placeholder = 'admin@synapse.edu';
  }
}

function doLogin(e) {
  e.preventDefault();
  const email = $('#loginEmail').value.trim();
  const pass  = $('#loginPass').value.trim();
  const errE  = $('#emailError');
  const errP  = $('#passError');
  let valid = true;

  errE.textContent = '';
  errP.textContent = '';

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    errE.textContent = 'Please enter a valid email address.';
    valid = false;
  }
  if (!pass || pass.length < 6) {
    errP.textContent = 'Password must be at least 6 characters.';
    valid = false;
  }
  if (!valid) return false;

  if (currentRole === 'admin') {
    if (email === 'admin@synapse.edu' && pass === 'admin123') {
      navigateTo('page-admin', initAdminDashboard);
    } else {
      errE.textContent = 'Invalid credentials — use admin@synapse.edu / admin123';
    }
  } else {
    if (email === 'student@synapse.edu' && pass === 'pass123') {
      navigateTo('page-student', initStudentDashboard);
    } else {
      errE.textContent = 'Invalid credentials — use student@synapse.edu / pass123';
    }
  }
  return false;
}

function togglePass() {
  const input = $('#loginPass');
  input.type = input.type === 'password' ? 'text' : 'password';
}

/* ─── PAGE NAVIGATION ─────────────────────────────── */
function navigateTo(pageId, onShow) {
  const current = $('.page.active');
  if (current) {
    current.classList.add('exit');
    current.addEventListener('animationend', () => {
      current.classList.remove('active', 'exit');
      current.style.display = 'none';
    }, { once: true });
    setTimeout(() => {
      activatePage(pageId, onShow);
    }, 200);
  } else {
    activatePage(pageId, onShow);
  }
}

function activatePage(pageId, onShow) {
  const page = $('#' + pageId);
  if (!page) return;
  page.style.display = '';
  requestAnimationFrame(() => {
    page.classList.add('active');
    if (onShow) onShow();
  });
}

function logout() {
  navigateTo('page-login', () => {
    $('#loginEmail').value = '';
    $('#loginPass').value  = '';
    $('#emailError').textContent = '';
    $('#passError').textContent  = '';
    showToast('Signed out successfully', 'info');
  });
}

/* ─── ADMIN INIT ──────────────────────────────────── */
function initAdminDashboard() {
  // Date
  const d = new Date();
  const el = $('#dashDate');
  if (el) el.textContent = d.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const fDate = $('#fDate');
  if (fDate) fDate.value = d.toISOString().split('T')[0];

  // Render tables
  STATE.currentStudents = [...DATA.students];
  renderAdminTable(STATE.currentStudents);
  renderLowTable();

  // Animate stat counters
  setTimeout(runStatCounters, 300);

  // Tilt cards
  setTimeout(initTiltCards, 100);

  showToast('Welcome back, Dr. Rajan 👋', 'success');
}

/* ─── ADMIN VIEW SWITCHING ────────────────────────── */
function switchView(viewId, btn) {
  // Update sidebar
  $$('#page-admin .nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Update topbar
  const titles = {
    'view-dashboard': ['Dashboard', 'Overview · Today'],
    'view-records':   ['Attendance Records', 'Historical Log'],
    'view-reports':   ['Reports', 'Exports & Analytics'],
  };
  const t = titles[viewId] || ['', ''];
  const tt = $('#topbarTitle'); if (tt) tt.textContent = t[0];
  const tb = $('#topbarBreadcrumb'); if (tb) tb.textContent = t[1];

  // Switch views
  $$('#page-admin .view').forEach(v => v.classList.remove('active'));
  const target = $('#' + viewId);
  if (target) {
    target.classList.add('active');

    if (viewId === 'view-records') renderRecordsTable(DATA.records);
    if (viewId === 'view-dashboard') setTimeout(initTiltCards, 100);
  }
}

/* ─── FILTERS ─────────────────────────────────────── */
function applyFilters() {
  const sub = $('#fSubject')?.value;
  const cls = $('#fClass')?.value;

  let data = DATA.students;
  if (sub) data = data.filter(s => s.subject === sub);
  if (cls) data = data.filter(s => s.cls === cls);

  STATE.currentStudents = data;
  renderAdminTable(data);
  showToast(`Filters applied — ${data.length} records`, 'info');
}

function resetFilters() {
  if ($('#fSubject')) $('#fSubject').value = '';
  if ($('#fClass'))   $('#fClass').value   = '';
  STATE.currentStudents = [...DATA.students];
  renderAdminTable(STATE.currentStudents);
  showToast('Filters cleared', 'info');
}

function searchTable() {
  const q = $('#tableSearch')?.value.toLowerCase().trim();
  if (!q) { renderAdminTable(STATE.currentStudents); return; }
  const filtered = STATE.currentStudents.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.roll.toLowerCase().includes(q) ||
    s.subject.toLowerCase().includes(q)
  );
  renderAdminTable(filtered);
}

function filterRecords() {
  const q    = $('#recSearch')?.value.toLowerCase().trim();
  const stat = $('#recStatus')?.value;
  const sub  = $('#recSubject')?.value;

  let data = DATA.records;
  if (q)    data = data.filter(r => r.name.toLowerCase().includes(q) || r.roll.toLowerCase().includes(q));
  if (stat) data = data.filter(r => r.status === stat);
  if (sub)  data = data.filter(r => r.subject === sub);

  renderRecordsTable(data);
}

/* ─── STUDENT INIT ────────────────────────────────── */
function initStudentDashboard() {
  renderSubjectList();
  renderStuRecords();

  setTimeout(() => {
    initCharts();
    runStatCounters();
    initTiltCards();
  }, 200);

  showToast('Welcome back, Arjun! 🎓', 'success');
}

/* ─── STUDENT VIEW SWITCHING ──────────────────────── */
function switchStuView(viewId, btn) {
  $$('#page-student .nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  $$('#page-student .view').forEach(v => v.classList.remove('active'));
  const target = $('#' + viewId);
  if (target) target.classList.add('active');
}

/* ─── PROGRESS BAR ANIMATION OBSERVER ────────────── */
function observeProgressBars() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        const w = bar.dataset.width || bar.style.width.replace('%','') || '0';
        setTimeout(() => { bar.style.width = w + '%'; }, 100);
        obs.unobserve(bar);
      }
    });
  }, { threshold: 0.2 });

  $$('.stat-bar-fill').forEach(b => obs.observe(b));
}

/* ─── KEYBOARD SHORTCUTS ──────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* ─── INIT ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  runIntro();
  observeProgressBars();

  // Ensure login page shows on load
  const loginPage = $('#page-login');
  if (loginPage) loginPage.style.display = '';

  // Stagger login animation
  setTimeout(() => {
    $$('.page--login .login-brand > *').forEach((el, i) => {
      el.style.animationDelay = `${i * 0.12 + 0.3}s`;
    });
  }, 100);
});
