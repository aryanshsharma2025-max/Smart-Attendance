// ============================================================
//  SMARTATTEND — Production-Grade Departmental Application
//  Frontend Architecture: Vanilla ES6+, Enterprise SaaS Standard
//  Authoritative Academic Domain Model & Calculations Engine
// ============================================================

'use strict';

const API_BASE = 'http://localhost:8080/api'; // Mock endpoint base

// ── 1. CENTRALIZED DOMAIN CONFIGURATION & ATTENDANCE ENGINE ──
const ATTENDANCE_THRESHOLD = 75; // Application-level threshold percentage (75%)
const TOTAL_TERM_SESSIONS = 40;  // Standard term instructional session count

/**
 * Calculate attendance rate and breakdown
 * Formula: attendanceRate = (present / total) * 100 where total = present + absent
 */
function calculateAttendance(present, total) {
  const p = Math.max(0, parseInt(present) || 0);
  const t = Math.max(0, parseInt(total) || 0);
  if (t === 0) return { present: 0, absent: 0, total: 0, pct: 0, isCompliant: false };
  const absent = Math.max(0, t - p);
  const pct = Number(((p / t) * 100).toFixed(1));
  return {
    present: p,
    absent,
    total: t,
    pct,
    isCompliant: pct >= ATTENDANCE_THRESHOLD
  };
}

/**
 * Standardized risk classification policy
 * >= 85%    -> HEALTHY
 * 75–84.9%  -> COMPLIANT
 * 70–74.9%  -> WATCH
 * 60–69.9%  -> AT RISK
 * < 60%     -> CRITICAL
 */
function calculateRisk(pct) {
  const p = Number(pct) || 0;
  if (p >= 85) return 'HEALTHY';
  if (p >= 75) return 'COMPLIANT';
  if (p >= 70) return 'WATCH';
  if (p >= 60) return 'AT RISK';
  return 'CRITICAL';
}

/**
 * Calculate additional permissible absences before falling below threshold
 * Maximum integer x satisfying: present / (total + x) >= threshold
 */
function calculatePermissibleAbsences(present, total, threshold = ATTENDANCE_THRESHOLD) {
  const p = Math.max(0, parseInt(present) || 0);
  const t = Math.max(0, parseInt(total) || 0);
  const thresh = threshold / 100;
  if (t <= 0 || (p / t) < thresh) return 0;
  return Math.max(0, Math.floor((p - thresh * t) / thresh));
}

/**
 * Calculate sessions needed to reach threshold assuming all future sessions attended
 * Minimum integer x satisfying: (present + x) / (total + x) >= threshold
 */
function calculateSessionsNeededToReachThreshold(present, total, threshold = ATTENDANCE_THRESHOLD) {
  const p = Math.max(0, parseInt(present) || 0);
  const t = Math.max(0, parseInt(total) || 0);
  const thresh = threshold / 100;
  if (t <= 0) return 0;
  if ((p / t) >= thresh) return 0;
  return Math.max(0, Math.ceil((thresh * t - p) / (1 - thresh)));
}

/**
 * Format percentage consistently across all roles
 */
function formatPercent(val) {
  if (val === undefined || val === null || isNaN(val)) return '0%';
  const num = Number(val);
  return Number.isInteger(num) ? `${num}%` : `${num.toFixed(1)}%`;
}

// ── 2. ICON & THEME CONTROLLER ───────────────────────────────
function refreshIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

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

// ── 3. AUTHORITATIVE DEMO ACADEMIC UNIVERSE ──────────────────

// Enrolled Students derived strictly from authoritative HOD Excel workbook
const RAW_STUDENTS = (typeof AUTHORITATIVE_STUDENTS !== 'undefined' && AUTHORITATIVE_STUDENTS.length > 0)
  ? AUTHORITATIVE_STUDENTS
  : ((typeof SYNAPSE_STUDENTS !== 'undefined' && SYNAPSE_STUDENTS.length > 0) ? SYNAPSE_STUDENTS : []);

const STUDENTS = RAW_STUDENTS.map(s => {
  // Truthful baseline: 0 lectures recorded in HOD source workbook
  const attended = (s.attendance && s.attendance.attendedLectures !== undefined) ? s.attendance.attendedLectures : 0;
  const total = (s.attendance && s.attendance.totalLectures !== undefined) ? s.attendance.totalLectures : 0;
  const absent = Math.max(0, total - attended);
  const pct = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : null;
  const pctDisplay = pct !== null ? `${pct}%` : '--';
  const status = total > 0 ? (pct >= ATTENDANCE_THRESHOLD ? 'COMPLIANT' : 'BELOW THRESHOLD') : 'NO RECORDS';
  const risk = total > 0 ? calculateRisk(pct) : 'PENDING';

  return {
    ...s,
    sno: s.sno || 1,
    roll: s.rollNumber || s.roll,
    rollNumber: s.rollNumber || s.roll,
    sem: s.semester || s.sem || 3,
    sec: s.section || s.sec || 'A',
    dept: s.department || s.dept || 'CSE',
    attended,
    absent,
    total,
    pct,
    pctDisplay,
    risk,
    status,
    safeAbsences: total > 0 ? calculatePermissibleAbsences(attended, total) : 0,
    sessionsNeeded: total > 0 ? calculateSessionsNeededToReachThreshold(attended, total) : 0
  };
});

const STUDENT_MAP = {};
STUDENTS.forEach(s => {
  if (s.roll) STUDENT_MAP[s.roll] = s;
  if (s.id !== undefined) STUDENT_MAP[s.id] = s;
  if (s.studentId) STUDENT_MAP[s.studentId] = s;
});

// Classroom Attendance Records (Initially empty: 0 sessions conducted yet)
const RECENT_ATTENDANCE_LOGS = [];

// Instructional Sessions Dataset (Initially empty: populated as faculty conducts sessions)
const SESSIONS_DATA = [];

// Phase 4 & 5: Centralized Current User Context with Confirmed Sections A & B
let CURRENT_USER = {
  role: 'faculty',
  facultyId: 'faculty-os',
  facultyName: 'Devbrat Sahu',
  subjectId: 'operating-system',
  subjectName: 'Operating System',
  subjectCodeShort: 'OS',
  shortCode: 'DS',
  assignedSections: ['A', 'B'],
  sectionAllocationStatus: 'Sections A, B Confirmed (Sections C, D Pending)'
};

let CURRENT_SCHEDULE_DAY = 'Thursday';

// Phase 5A: Live Lecture Session Tracking & Active Dashboard Section
let ACTIVE_LECTURE = null; // null or { id, subject, faculty, facultyId, section, lectureNumber, status: 'recording', startedAt, startTime }
let CURRENT_DASHBOARD_SECTION = 'A';
let DASHBOARD_STUDENT_FILTER = '';

// 5 Official Curricular Subjects for B.Tech CSE 3rd Semester (July–Dec 2026)
const OFFICIAL_SUBJECTS = [
  'Operating System',
  'Discrete Mathematics',
  'OOPS in C++',
  'Web Technology',
  'Digital Electronics'
];

// Department Course Catalog strictly mapped to the active curriculum
const COURSE_CATALOG = {
  'CSE': {
    '3': OFFICIAL_SUBJECTS
  },
  'IT': {
    '3': OFFICIAL_SUBJECTS
  }
};

// Official Faculty-Subject Mapping
const FACULTY_SUBJECT_MAP = {
  'Operating System': 'Devbrat Sahu',
  'Discrete Mathematics': 'Pranjali Sharma',
  'OOPS in C++': 'Vaibhav Chandrakar',
  'Web Technology': 'Suman K. Swarnkar',
  'Digital Electronics': 'Navdeep Khare'
};

function getFacultyForSubject(subjectName) {
  if (!subjectName) return 'Devbrat Sahu';
  for (const [sub, fac] of Object.entries(FACULTY_SUBJECT_MAP)) {
    if (subjectName.toLowerCase().includes(sub.toLowerCase())) {
      return fac;
    }
  }
  return 'Devbrat Sahu';
}

function getCompletedLecturesCount(subjectName, section) {
  return SESSIONS_DATA.filter(s =>
    s.status === 'completed' &&
    (s.course === subjectName || s.subject === subjectName) &&
    s.sec === section
  ).length;
}


// ── PHASE 5: REAL TIMETABLE ENGINE & SCHEDULE COMPUTATION ────
function getSystemDayOfWeek(date = new Date()) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = days[date.getDay()];
  return d === 'Sunday' ? 'Monday' : d; // If Sunday, default to Monday
}

function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function getTimetableEntriesForFaculty(facultyNameOrId, day, section) {
  if (typeof TIMETABLE_ENTRIES === 'undefined') return [];
  const faculty = (typeof AUTHORITATIVE_FACULTY !== 'undefined')
    ? AUTHORITATIVE_FACULTY.find(f => f.id === facultyNameOrId || f.name === facultyNameOrId || f.shortCode === facultyNameOrId)
    : null;

  const targetName = faculty ? faculty.name : facultyNameOrId;
  const targetShort = faculty ? faculty.shortCode : facultyNameOrId;

  return TIMETABLE_ENTRIES.filter(e => {
    const matchFac = (e.facultyName === targetName) || (e.facultyShort === targetShort) || (e.facultyId === facultyNameOrId);
    const matchDay = !day || e.day.toLowerCase() === day.toLowerCase();
    const matchSec = !section || e.section.toUpperCase() === section.toUpperCase();
    return matchFac && matchDay && matchSec;
  });
}

function countScheduledSlotsPerWeek(facultyNameOrId, section) {
  return getTimetableEntriesForFaculty(facultyNameOrId, null, section).length;
}

function getCurrentAndNextClass(facultyNameOrId, customDate = new Date()) {
  const currentDay = getSystemDayOfWeek(customDate);
  const nowMin = customDate.getHours() * 60 + customDate.getMinutes();

  const todayEntries = getTimetableEntriesForFaculty(facultyNameOrId, currentDay, null)
    .sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));

  let currentClass = null;
  let nextClass = null;
  let startsInMinutes = null;

  for (const entry of todayEntries) {
    const sMin = timeStringToMinutes(entry.startTime);
    const eMin = timeStringToMinutes(entry.endTime);

    if (sMin <= nowMin && nowMin < eMin) {
      currentClass = entry;
      break;
    } else if (nowMin < sMin) {
      if (!nextClass) {
        nextClass = entry;
        startsInMinutes = sMin - nowMin;
      }
    }
  }

  // If no upcoming class today, check tomorrow / next available day
  if (!nextClass && !currentClass) {
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currIdx = daysOrder.indexOf(currentDay);
    for (let i = 1; i <= 6; i++) {
      const nextDayName = daysOrder[(currIdx + i) % 6];
      const nextDayEntries = getTimetableEntriesForFaculty(facultyNameOrId, nextDayName, null)
        .sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));
      if (nextDayEntries.length > 0) {
        nextClass = nextDayEntries[0];
        break;
      }
    }
  }

  return {
    day: currentDay,
    currentClass,
    nextClass,
    startsInMinutes,
    isRunning: !!currentClass
  };
}

function updateCurrentAndNextClassBanner() {
  if (!CURRENT_USER || CURRENT_USER.role !== 'faculty') return;

  const card = document.getElementById('dash-cnc-card');
  const titleEl = document.getElementById('cnc-title');
  const statusBadge = document.getElementById('cnc-status-badge');
  const descEl = document.getElementById('cnc-description');
  const actionBtn = document.getElementById('cnc-action-btn');

  if (!card || !descEl) return;

  const cnc = getCurrentAndNextClass(CURRENT_USER.facultyName);

  if (cnc.isRunning && cnc.currentClass) {
    const c = cnc.currentClass;
    if (titleEl) titleEl.textContent = `CURRENT CLASS: ${c.subjectName} (Section ${c.section})`;
    if (statusBadge) {
      statusBadge.className = 'badge badge-ok';
      statusBadge.textContent = 'Currently Running';
      statusBadge.style.background = 'var(--success-subtle)';
      statusBadge.style.color = 'var(--success)';
      statusBadge.style.borderColor = 'var(--success-border)';
    }
    descEl.innerHTML = `<strong>${c.timeDisplay}</strong> &middot; Period ${c.period} &middot; Room: <strong>${c.room}</strong> &middot; Status: <strong>Live Instructional Block</strong>. Click button to take classroom attendance.`;
    if (actionBtn) {
      actionBtn.innerHTML = `<i data-lucide="check-square" class="icon-sm"></i><span>Record Attendance for Period ${c.period}</span>`;
      actionBtn.onclick = () => startAttendanceFromTimetable(c.subjectName, c.section, `Period ${c.period}`, c.timeDisplay);
    }
  } else if (cnc.nextClass) {
    const n = cnc.nextClass;
    const isToday = n.day.toLowerCase() === cnc.day.toLowerCase();
    if (titleEl) titleEl.textContent = `NEXT CLASS: ${n.subjectName} (Section ${n.section})`;
    if (statusBadge) {
      statusBadge.className = 'badge';
      statusBadge.style.background = 'var(--primary-subtle)';
      statusBadge.style.color = 'var(--primary)';
      statusBadge.style.borderColor = 'var(--primary-border)';
      statusBadge.textContent = isToday && cnc.startsInMinutes !== null
        ? `Starts in ${cnc.startsInMinutes} min`
        : `Scheduled on ${n.day}`;
    }
    descEl.innerHTML = `<strong>${n.day} &middot; ${n.timeDisplay}</strong> &middot; Period ${n.period} &middot; Section <strong>${n.section}</strong> &middot; Room: <strong>${n.room}</strong> &middot; Configured in timetable W.E.F. 17/08/2026.`;
    if (actionBtn) {
      actionBtn.innerHTML = `<i data-lucide="check-square" class="icon-sm"></i><span>Open Take Attendance</span>`;
      actionBtn.onclick = () => startAttendanceFromTimetable(n.subjectName, n.section, `Period ${n.period}`, n.timeDisplay);
    }
  } else {
    if (titleEl) titleEl.textContent = 'No Teaching Classes Scheduled Today';
    if (statusBadge) {
      statusBadge.textContent = 'Idle';
    }
    descEl.textContent = 'There are no instructional sessions configured for your profile on this day according to the departmental timetable.';
    if (actionBtn) {
      actionBtn.onclick = () => showPage('take-attendance', null);
    }
  }
  refreshIcons();
}

function renderFacultySchedule(selectedDay) {
  if (!CURRENT_USER || CURRENT_USER.role !== 'faculty') return;

  const day = selectedDay || CURRENT_SCHEDULE_DAY || 'Thursday';
  CURRENT_SCHEDULE_DAY = day;

  const listContainer = document.getElementById('dash-schedule-list');
  const dayBadge = document.getElementById('dash-sched-day-badge');
  const facNameEl = document.getElementById('dash-sched-fac-name');
  const facSubjEl = document.getElementById('dash-sched-fac-subj');

  if (dayBadge) dayBadge.textContent = day;
  if (facNameEl) facNameEl.textContent = CURRENT_USER.facultyName;
  if (facSubjEl) facSubjEl.textContent = CURRENT_USER.subjectName;

  // Update tab active state
  document.querySelectorAll('#sched-day-tabs .sched-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.day === day);
  });

  if (!listContainer) return;

  const entries = getTimetableEntriesForFaculty(CURRENT_USER.facultyName, day, null)
    .sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));

  if (entries.length === 0) {
    listContainer.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 28px; text-align: center; background: var(--surface-muted); border-radius: var(--radius-sm); border: 1px dashed var(--border); color: var(--text-muted); font-size: 13.5px;">
        <i data-lucide="calendar-off" class="icon-sm" style="margin-bottom: 6px; display: inline-block;"></i>
        <div>No instructional classes scheduled for <strong>${CURRENT_USER.facultyName}</strong> on <strong>${day}</strong>.</div>
        <div style="font-size: 12px; margin-top: 3px;">Select another day tab above to review scheduled periods.</div>
      </div>
    `;
    refreshIcons();
    return;
  }

  listContainer.innerHTML = entries.map(e => {
    const isLab = e.type === 'lab';
    return `
      <div class="card schedule-slot-card" style="padding: 16px 18px; border: 1px solid var(--border); background: var(--surface); display: flex; flex-direction: column; justify-content: space-between; gap: 12px; border-left: 3px solid ${isLab ? 'var(--warning)' : 'var(--primary)'};">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="badge" style="background: var(--primary-subtle); color: var(--primary); font-size: 11px; font-weight: 700;">Period ${escapeHtml(e.period)} (${escapeHtml(e.timeDisplay)})</span>
            <span class="badge" style="background: var(--surface-muted); color: var(--text-primary); border: 1px solid var(--border); font-size: 11px; font-weight: 600;">Section ${escapeHtml(e.section)}</span>
          </div>
          <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${escapeHtml(e.subjectName)}</div>
          <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 3px; display: flex; gap: 8px; align-items: center;">
            <span>Room: <strong>${escapeHtml(e.room)}</strong></span>
            <span>&middot;</span>
            <span style="text-transform: capitalize;">${escapeHtml(e.type)}</span>
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-xs" onclick="startAttendanceFromTimetable('${escapeHtml(e.subjectName)}', '${escapeHtml(e.section)}', 'Period ${escapeHtml(e.period)}', '${escapeHtml(e.timeDisplay)}')" style="justify-content: center; gap: 6px; font-weight: 600; padding: 7px 12px;">
          <i data-lucide="check-square" class="icon-xs"></i>
          <span>Record Attendance for this Slot &rarr;</span>
        </button>
      </div>
    `;
  }).join('');

  refreshIcons();
}

function selectScheduleDay(day) {
  renderFacultySchedule(day);
}

function startAttendanceFromTimetable(subject, section, period, timeDisplay) {
  showPage('take-attendance', null);

  const subjSelect = document.getElementById('att-subject');
  const secSelect = document.getElementById('att-section');
  const slotInfo = document.getElementById('att-tt-slot-info');

  if (subjSelect) subjSelect.value = subject;
  if (secSelect) secSelect.value = section;
  if (slotInfo) slotInfo.textContent = `${period} (${timeDisplay}) · Section ${section}`;

  onAttendanceFilterChange();
  loadStudentsAction();
  showToast(`Timetable context applied: ${period} (${timeDisplay}) · Section ${section}`);
}

function getNextLectureNumber(subjectName, section) {
  return getCompletedLecturesCount(subjectName, section) + 1;
}

/**
 * PHASE 5A: Centralized Live Section Attendance Analytics Calculation
 * Standardized formula:
 *   student live % = (present lectures / completed lectures) * 100
 *   average section attendance = mean of individual student live percentages
 */
function calculateLiveSectionMetrics(subjectName, section) {
  const completed = SESSIONS_DATA.filter(s =>
    s.status === 'completed' &&
    (s.course === subjectName || s.subject === subjectName) &&
    s.sec === section
  );

  const conductedCount = completed.length;
  const sectionStudents = STUDENTS.filter(s => s.sec === section);
  const totalStudents = sectionStudents.length;

  if (conductedCount === 0 || totalStudents === 0) {
    return {
      conductedCount: 0,
      currentLecture: ACTIVE_LECTURE && ACTIVE_LECTURE.subject === subjectName && ACTIVE_LECTURE.section === section
        ? ACTIVE_LECTURE.lectureNumber : null,
      nextLecture: 1,
      avgPct: null,
      presentToday: null,
      absentToday: null,
      atRiskCount: null,
      highestPct: null,
      lowestPct: null,
      studentStats: sectionStudents.map(s => ({
        ...s,
        liveAttended: 0,
        liveTotal: 0,
        livePct: null,
        statusLabel: 'Pending Sessions'
      }))
    };
  }

  // Count attendance events per student across all completed sessions
  const presentCountMap = new Map();
  sectionStudents.forEach(s => presentCountMap.set(s.roll, 0));

  completed.forEach(sess => {
    const liveRecord = (typeof LIVE_ATTENDANCE_RECORDS !== 'undefined')
      ? LIVE_ATTENDANCE_RECORDS.find(r => r.id === sess.id || (r.lectureNo === sess.lectureNo && r.subject === sess.subject && r.sec === sess.sec))
      : null;

    if (liveRecord && liveRecord.studentRecords) {
      liveRecord.studentRecords.forEach(sr => {
        if (sr.status === 'present') {
          presentCountMap.set(sr.roll, (presentCountMap.get(sr.roll) || 0) + 1);
        }
      });
    }
  });

  const studentStats = sectionStudents.map(s => {
    const attended = presentCountMap.get(s.roll) || 0;
    const pct = Number(((attended / conductedCount) * 100).toFixed(1));
    const isEligible = pct >= ATTENDANCE_THRESHOLD;
    return {
      ...s,
      liveAttended: attended,
      liveTotal: conductedCount,
      livePct: pct,
      statusLabel: isEligible ? 'Eligible (≥ 75%)' : 'Below Threshold (< 75%)'
    };
  });

  const sumPct = studentStats.reduce((acc, curr) => acc + curr.livePct, 0);
  const avgPct = Number((sumPct / studentStats.length).toFixed(1));
  const atRiskCount = studentStats.filter(s => s.livePct < ATTENDANCE_THRESHOLD).length;
  const pcts = studentStats.map(s => s.livePct);
  const highestPct = Math.max(...pcts);
  const lowestPct = Math.min(...pcts);

  // Latest session today stats
  const latestSession = completed[0];
  const presentToday = latestSession ? latestSession.present : null;
  const absentToday = latestSession ? latestSession.absent : null;

  const currentLecture = ACTIVE_LECTURE && ACTIVE_LECTURE.subject === subjectName && ACTIVE_LECTURE.section === section
    ? ACTIVE_LECTURE.lectureNumber : null;

  return {
    conductedCount,
    currentLecture,
    nextLecture: conductedCount + 1,
    avgPct,
    presentToday,
    absentToday,
    atRiskCount,
    highestPct,
    lowestPct,
    studentStats
  };
}

function onDashboardSectionChange(sec) {
  CURRENT_DASHBOARD_SECTION = sec;
  updateFacultyDashboardLiveMetrics();
}

function filterDashboardStudents(query) {
  DASHBOARD_STUDENT_FILTER = query;
  const subj = CURRENT_USER ? CURRENT_USER.subjectName : 'Operating System';
  const sec = CURRENT_DASHBOARD_SECTION;
  const metrics = calculateLiveSectionMetrics(subj, sec);
  renderDashboardStudentTable(metrics.studentStats, sec);
}

function renderDashboardStudentTable(studentStats, sec) {
  const tbody = document.getElementById('dash-student-table-body');
  const countBadge = document.getElementById('dash-roster-count-badge');
  const secTitle = document.getElementById('dash-roster-sec-title');

  if (secTitle) secTitle.textContent = sec;
  if (countBadge) countBadge.textContent = `${studentStats.length} Students`;
  if (!tbody) return;

  const q = (DASHBOARD_STUDENT_FILTER || '').toLowerCase().trim();
  const filtered = q
    ? studentStats.filter(s => s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q))
    : studentStats;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">No students found matching "${escapeHtml(q)}"</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    let badgeHtml = '';
    if (s.livePct === null) {
      badgeHtml = `<span class="badge" style="background: var(--surface-muted); color: var(--text-secondary); border: 1px solid var(--border); font-size: 11px;">Pending Sessions</span>`;
    } else if (s.livePct >= ATTENDANCE_THRESHOLD) {
      badgeHtml = `<span class="badge badge-ok" style="font-size: 11px;">Eligible (≥ 75%)</span>`;
    } else {
      badgeHtml = `<span class="badge badge-risk" style="font-size: 11px;">Below Threshold (&lt; 75%)</span>`;
    }

    const pctDisplay = s.livePct !== null ? `<strong>${s.livePct}%</strong>` : `<span style="color: var(--text-muted);">&mdash;</span>`;
    const lecturesDisplay = s.liveTotal > 0 ? `${s.liveAttended} / ${s.liveTotal}` : `<span style="color: var(--text-muted);">0 / 0</span>`;

    return `
      <tr>
        <td style="color: var(--text-muted); font-size: 12px;">${s.sno || '—'}</td>
        <td><code>${escapeHtml(s.roll)}</code></td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${escapeHtml(CURRENT_USER.subjectName)} &middot; Sec ${s.sec}</td>
        <td>${lecturesDisplay}</td>
        <td>${pctDisplay}</td>
        <td>${badgeHtml}</td>
      </tr>
    `;
  }).join('');
}

function updateTakeAttendanceHeader() {
  const secSelect = document.getElementById('att-section');
  const subjSelect = document.getElementById('att-subject');
  const sec = (secSelect && secSelect.value) || (ACTIVE_LECTURE ? ACTIVE_LECTURE.section : 'A');
  const subj = (CURRENT_USER && CURRENT_USER.role === 'faculty')
    ? CURRENT_USER.subjectName
    : ((subjSelect && subjSelect.value) || (ACTIVE_LECTURE ? ACTIVE_LECTURE.subject : 'Operating System'));
  const facultyName = (CURRENT_USER && CURRENT_USER.role === 'faculty') ? CURRENT_USER.facultyName : getFacultyForSubject(subj);

  const conducted = getCompletedLecturesCount(subj, sec);
  const isRecording = ACTIVE_LECTURE && ACTIVE_LECTURE.subject === subj && ACTIVE_LECTURE.section === sec && ACTIVE_LECTURE.status === 'recording';
  const currentLec = isRecording ? `Lecture ${ACTIVE_LECTURE.lectureNumber}` : '—';
  const nextLec = isRecording ? '—' : `Lecture ${conducted + 1}`;

  const hdrSubject = document.getElementById('att-hdr-subject');
  const hdrSection = document.getElementById('att-hdr-section');
  const hdrFaculty = document.getElementById('att-hdr-faculty');
  const hdrConducted = document.getElementById('att-hdr-conducted');
  const hdrCurrent = document.getElementById('att-hdr-current');
  const hdrCurrentSub = document.getElementById('att-hdr-current-sub');
  const hdrNext = document.getElementById('att-hdr-next');
  const hdrStatusText = document.getElementById('att-hdr-status-text');
  const hdrStatusSub = document.getElementById('att-hdr-status-sub');
  const hdrStatusBadge = document.getElementById('att-hdr-status-badge');

  if (hdrSubject) hdrSubject.textContent = subj;
  if (hdrSection) hdrSection.textContent = `Section ${sec}`;
  if (hdrFaculty) hdrFaculty.textContent = facultyName;
  if (hdrConducted) hdrConducted.textContent = conducted;
  if (hdrCurrent) hdrCurrent.textContent = currentLec;
  if (hdrCurrentSub) hdrCurrentSub.textContent = isRecording ? `Started at ${ACTIVE_LECTURE.startedAt}` : 'No active session';
  if (hdrNext) hdrNext.textContent = nextLec;
  const schedBadge = document.getElementById('att-tt-scheduled-count-badge');
  if (schedBadge) {
    const schedCount = countScheduledSlotsPerWeek(facultyName, sec);
    schedBadge.textContent = `Scheduled: ${schedCount} slots/week (Timetable 17/08/2026)`;
  }

  if (hdrStatusText) hdrStatusText.textContent = isRecording ? 'Recording' : (conducted > 0 ? 'Ready for next lecture' : 'Ready to start');
  if (hdrStatusSub) hdrStatusSub.textContent = isRecording ? `Lecture ${ACTIVE_LECTURE.lectureNumber} in progress` : (conducted > 0 ? `${conducted} lectures completed` : 'Awaiting lecture commencement');
  if (hdrStatusBadge) {
    if (isRecording) {
      hdrStatusBadge.className = 'badge badge-ok';
      hdrStatusBadge.style.background = 'var(--primary-subtle)';
      hdrStatusBadge.style.color = 'var(--primary)';
      hdrStatusBadge.style.borderColor = 'var(--primary-border)';
      hdrStatusBadge.textContent = `Status: Recording (Lecture ${ACTIVE_LECTURE.lectureNumber})`;
    } else {
      hdrStatusBadge.className = 'badge';
      hdrStatusBadge.style.background = 'var(--surface-muted)';
      hdrStatusBadge.style.color = 'var(--text-secondary)';
      hdrStatusBadge.style.borderColor = 'var(--border)';
      hdrStatusBadge.textContent = conducted > 0 ? 'Status: Ready for next lecture' : 'Status: Ready to start';
    }
  }
}

function onAttendanceFilterChange() {
  updateTakeAttendanceHeader();
}

function updateFacultyDashboardLiveMetrics() {
  if (!CURRENT_USER || CURRENT_USER.role !== 'faculty') return;

  const subj = CURRENT_USER.subjectName;
  const sec = CURRENT_DASHBOARD_SECTION || 'A';
  const metrics = calculateLiveSectionMetrics(subj, sec);

  // 1. Update active subject indicator
  const activeSubjBadge = document.getElementById('dash-active-subject-badge');
  if (activeSubjBadge) {
    const scheduledPerWeek = countScheduledSlotsPerWeek(CURRENT_USER.facultyName, sec);
    activeSubjBadge.textContent = `${subj} · Section ${sec} (${scheduledPerWeek} slots/week)`;
  }

  // 2. Lecture Status Cards
  const lecConducted = document.getElementById('dash-lec-conducted');
  if (lecConducted) lecConducted.textContent = metrics.conductedCount;

  const isRecording = ACTIVE_LECTURE && ACTIVE_LECTURE.subject === subj && ACTIVE_LECTURE.section === sec && ACTIVE_LECTURE.status === 'recording';
  const currentLecEl = document.getElementById('dash-lec-current');
  const currentLecSub = document.getElementById('dash-lec-current-sub');
  const currentLecBadge = document.getElementById('dash-lec-current-badge');

  if (currentLecEl) {
    currentLecEl.textContent = isRecording ? `Lecture ${ACTIVE_LECTURE.lectureNumber}` : '—';
  }
  if (currentLecSub) {
    currentLecSub.textContent = isRecording ? `Started at ${ACTIVE_LECTURE.startedAt}` : (metrics.conductedCount > 0 ? 'No active lecture' : 'No lecture currently running');
  }
  if (currentLecBadge) {
    if (isRecording) {
      currentLecBadge.style.background = 'var(--primary-subtle)';
      currentLecBadge.style.color = 'var(--primary)';
      currentLecBadge.style.borderColor = 'var(--primary-border)';
      currentLecBadge.textContent = 'Status: Recording';
    } else {
      currentLecBadge.style.background = 'var(--surface-muted)';
      currentLecBadge.style.color = 'var(--text-secondary)';
      currentLecBadge.style.borderColor = 'var(--border)';
      currentLecBadge.textContent = metrics.conductedCount > 0 ? 'Status: Ready for next lecture' : 'Status: Ready to start';
    }
  }

  const nextLecEl = document.getElementById('dash-lec-next');
  if (nextLecEl) {
    nextLecEl.textContent = isRecording ? '—' : `Lecture ${metrics.nextLecture}`;
  }

  const statusEl = document.getElementById('dash-lec-status');
  const statusSubEl = document.getElementById('dash-lec-status-sub');
  const statusBadgeEl = document.getElementById('dash-lec-status-badge');

  if (statusEl) {
    statusEl.textContent = isRecording ? 'Recording in progress' : (metrics.conductedCount > 0 ? 'Ready for next lecture' : 'Ready to start');
  }
  if (statusSubEl) {
    statusSubEl.textContent = isRecording ? `Lecture ${ACTIVE_LECTURE.lectureNumber} · Started ${ACTIVE_LECTURE.startedAt}` : (metrics.conductedCount > 0 ? `${metrics.conductedCount} lectures completed` : 'Awaiting lecture recording');
  }
  if (statusBadgeEl) {
    statusBadgeEl.textContent = isRecording ? 'Active Session' : (metrics.conductedCount > 0 ? 'Ready' : 'Pre-commencement');
  }

  // 3. Subject Attendance 6 KPIs
  const statAvg = document.getElementById('dash-stat-avg');
  if (statAvg) statAvg.textContent = metrics.avgPct !== null ? `${metrics.avgPct}%` : '—';

  const statPresent = document.getElementById('dash-stat-present');
  if (statPresent) statPresent.textContent = metrics.presentToday !== null ? metrics.presentToday : '—';

  const statAbsent = document.getElementById('dash-stat-absent');
  if (statAbsent) statAbsent.textContent = metrics.absentToday !== null ? metrics.absentToday : '—';

  const statRisk = document.getElementById('dash-stat-risk');
  if (statRisk) statRisk.textContent = metrics.atRiskCount !== null ? metrics.atRiskCount : '—';

  const statHigh = document.getElementById('dash-stat-high');
  if (statHigh) statHigh.textContent = metrics.highestPct !== null ? `${metrics.highestPct}%` : '—';

  const statLow = document.getElementById('dash-stat-low');
  if (statLow) statLow.textContent = metrics.lowestPct !== null ? `${metrics.lowestPct}%` : '—';

  // 4. Attendance Trend (Conditional)
  const trendEmpty = document.getElementById('dash-trend-empty');
  const trendCanvas = document.getElementById('dashTrendChart');
  if (trendEmpty && trendCanvas) {
    trendEmpty.style.display = 'block';
    trendCanvas.style.display = 'none';
  }

  // 5. Student Attendance Table
  renderDashboardStudentTable(metrics.studentStats, sec);

  // 6. Update Take Attendance header
  updateTakeAttendanceHeader();
}

/**
 * Load authentic student roster directly from enrolled students
 */
function getRosterForClass(dept, sem, sec) {
  const targetSem = parseInt(sem) || 3;
  const matched = STUDENTS.filter(s => s.dept === dept && s.sem === targetSem && (!sec || s.sec === sec));
  if (matched.length > 0) {
    return matched.map(s => ({ ...s, status: 'pending' }));
  }
  const deptStudents = STUDENTS.filter(s => s.dept === dept);
  if (deptStudents.length > 0) {
    return deptStudents.map(s => ({ ...s, status: 'pending' }));
  }
  return STUDENTS.map(s => ({ ...s, status: 'pending' }));
}

// ── 4. ATTENDANCE RECORDING STATE ────────────────────────────
const ATTENDANCE_STATE = {
  mode: 'present',      // 'present' or 'absent'
  status: 'initial',    // 'initial' | 'loading' | 'loaded' | 'saved'
  classInfo: null,      // { date, dept, deptName, sem, sec, subject }
  students: [],         // array of { id, roll, name, status: 'present'|'absent' }
  searchQuery: '',
  savedSummary: null
};

// ── 5. PAGE ROUTER ───────────────────────────────────────────
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
    const targetNavId = pageId === 'take-attendance' ? 'attendance' : pageId;
    const match = document.querySelector(`[data-page="${targetNavId}"]`);
    if (match) match.classList.add('active');
  }

  const titleMap = {
    dashboard: 'Dashboard',
    attendance: 'Attendance Overview',
    'take-attendance': 'Take Attendance',
    students: 'Student Registry',
    'student-profile': 'Student Profile',
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
  if (pageId === 'reports') {
    generateReport();
  }
  if (pageId === 'sessions') {
    renderSessions();
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

// ── 6. LIVE DATE DISPLAY ─────────────────────────────────────
function updateDate() {
  const d = new Date();
  const dateEl = document.getElementById('live-date');
  if (dateEl) {
    dateEl.textContent = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
}
updateDate();

// ── 7. ATTENDANCE OVERVIEW PAGE ENGINE ───────────────────────
function renderAttendanceOverviewPage() {
  // 1. Render class / session summaries
  const sessionsBody = document.getElementById('overview-sessions-body');
  if (sessionsBody) {
    if (SESSIONS_DATA.length === 0) {
      sessionsBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">No attendance sessions recorded yet for 3rd Semester 2026. Click "Record Session" to log the first lecture.</td></tr>`;
    } else {
      sessionsBody.innerHTML = SESSIONS_DATA.map(s => `
        <tr>
          <td><strong>${escapeHtml(s.dept || 'CSE')} · Sem ${s.sem || 3} (${s.sec || 'A'})</strong></td>
          <td>${escapeHtml(s.course)}</td>
          <td>${escapeHtml(s.faculty || 'Unassigned')}</td>
          <td style="color: var(--text-secondary); font-size: 13px;">${escapeHtml(s.time)} · ${escapeHtml(s.room)}</td>
          <td><strong style="color: ${s.pct >= ATTENDANCE_THRESHOLD ? 'var(--primary)' : 'var(--danger)'};">${s.status === 'scheduled' ? '—' : s.pct + '%'}</strong></td>
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
  }

  // 2. Render recent attendance records table
  const recordsBody = document.getElementById('overview-records-body');
  if (recordsBody) {
    if (RECENT_ATTENDANCE_LOGS.length === 0) {
      recordsBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">No student attendance logs recorded yet.</td></tr>`;
    } else {
      recordsBody.innerHTML = RECENT_ATTENDANCE_LOGS.slice(0, 6).map(r => `
        <tr>
          <td>
            <button type="button" class="student-link-btn" onclick="openStudentProfile(${r.id || `'${r.roll}'`})">
              <strong>${escapeHtml(r.name)}</strong>
            </button>
          </td>
          <td><code>${escapeHtml(r.roll)}</code></td>
          <td style="max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(r.course)}</td>
          <td><span class="badge badge-${r.status}">${r.status.toUpperCase()}</span></td>
          <td style="color: var(--text-muted); font-size: 12.5px;">${escapeHtml(r.time)}</td>
        </tr>
      `).join('');
    }
  }

  // 3. Render at-risk students watchlist in faculty scope (CSE)
  const atriskList = document.getElementById('overview-atrisk-list');
  if (atriskList) {
    const atRiskStudents = STUDENTS.filter(s => s.pct !== null && s.pct < ATTENDANCE_THRESHOLD);
    if (atRiskStudents.length === 0) {
      atriskList.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">No at-risk students flagged. Department attendance register is in pre-commencement baseline.</div>`;
    } else {
      atriskList.innerHTML = atRiskStudents.map(s => `
        <div class="attention-item">
          <div class="attention-info">
            <div>
              <strong>${escapeHtml(s.name)}</strong>
              <span style="color: var(--text-muted); margin-left: 4px;">(${escapeHtml(s.roll)})</span>
            </div>
            <span class="badge badge-risk">${s.pct}% Attendance</span>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="openStudentProfile(${s.id})">
            <span>View</span>
            <i data-lucide="arrow-right" style="width: 12px; height: 12px;"></i>
          </button>
        </div>
      `).join('');
    }
  }

  // 4. Update KPI stat cards on attendance overview (CSE scope: 252 enrolled across 4 sections)
  const completedSessions = SESSIONS_DATA.filter(s => s.status === 'completed');
  const ovAvg = document.getElementById('overview-stat-avg');
  const ovPres = document.getElementById('overview-stat-present');
  const ovPresSub = document.getElementById('overview-stat-present-sub');
  const ovAbs = document.getElementById('overview-stat-absent');
  const ovAbsSub = document.getElementById('overview-stat-absent-sub');
  const ovRisk = document.getElementById('overview-stat-risk');

  if (completedSessions.length === 0) {
    if (ovAvg) ovAvg.textContent = '--';
    if (ovPres) ovPres.textContent = '0';
    if (ovPresSub) ovPresSub.textContent = `Out of ${STUDENTS.length} enrolled CSE students`;
    if (ovAbs) ovAbs.textContent = '0';
    if (ovAbsSub) ovAbsSub.textContent = 'Across Sections A (60), B (59), C (66), D (67)';
    if (ovRisk) ovRisk.textContent = '0';
  } else {
    const totalPresent = completedSessions.reduce((acc, s) => acc + (s.present || 0), 0);
    const totalHead = completedSessions.reduce((acc, s) => acc + (s.total || 0), 0);
    const avgPct = totalHead > 0 ? ((totalPresent / totalHead) * 100).toFixed(1) + '%' : '--';
    if (ovAvg) ovAvg.textContent = avgPct;
    if (ovPres) ovPres.textContent = totalPresent;
    if (ovPresSub) ovPresSub.textContent = `Across ${completedSessions.length} completed sessions`;
    if (ovAbs) ovAbs.textContent = Math.max(0, totalHead - totalPresent);
    if (ovAbsSub) ovAbsSub.textContent = 'Recorded class absences';
    if (ovRisk) ovRisk.textContent = STUDENTS.filter(s => s.pct !== null && s.pct < ATTENDANCE_THRESHOLD).length;
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

// ── 8. TAKE ATTENDANCE WORKSPACE ─────────────────────────────
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
  const courses = (COURSE_CATALOG[dept] && COURSE_CATALOG[dept][sem]) || OFFICIAL_SUBJECTS;

  subjectSelect.innerHTML = courses.map((c, i) => {
    const fac = getFacultyForSubject(c);
    return `<option value="${c}" ${i === 0 ? 'selected' : ''}>${c} (${fac})</option>`;
  }).join('');
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
  const subject = subjectSelect && subjectSelect.value ? subjectSelect.value : 'Operating System';

  const deptNameMap = {
    CSE: 'Computer Science & Engineering',
    IT: 'Information Technology'
  };

  // Authorization check for faculty
  if (CURRENT_USER && CURRENT_USER.role === 'faculty') {
    if (CURRENT_USER.assignedSections && !CURRENT_USER.assignedSections.includes(sec)) {
      showToast(`Section ${sec} is not assigned to ${CURRENT_USER.facultyName}. Official allocation is pending.`, 'danger');
      if (secSelect) secSelect.value = 'A';
      return;
    }
  }

  const faculty = (CURRENT_USER && CURRENT_USER.role === 'faculty') ? CURRENT_USER.facultyName : getFacultyForSubject(subject);
  const facultyId = (CURRENT_USER && CURRENT_USER.role === 'faculty') ? CURRENT_USER.facultyId : ('faculty_' + faculty.toLowerCase().replace(/[^a-z]/g, ''));
  const effectiveSubject = (CURRENT_USER && CURRENT_USER.role === 'faculty') ? CURRENT_USER.subjectName : subject;
  const lectureNo = getNextLectureNumber(effectiveSubject, sec);
  const nowTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Phase 6: Standardized Live Session Model (Status: recording)
  ACTIVE_LECTURE = {
    id: `sess-${Date.now()}`,
    subjectId: (CURRENT_USER && CURRENT_USER.subjectId) || 'operating-system',
    subjectName: effectiveSubject,
    subjectCodeShort: (CURRENT_USER && CURRENT_USER.subjectCodeShort) || 'OS',
    facultyId: facultyId,
    facultyName: faculty,
    section: sec,
    semester: parseInt(sem) || 3,
    date: date,
    timetableEntryId: ACTIVE_LECTURE && ACTIVE_LECTURE.timetableEntryId ? ACTIVE_LECTURE.timetableEntryId : null,
    period: ACTIVE_LECTURE && ACTIVE_LECTURE.period ? ACTIVE_LECTURE.period : 'I',
    periodStart: ACTIVE_LECTURE && ACTIVE_LECTURE.periodStart ? ACTIVE_LECTURE.periodStart : 1,
    periodEnd: ACTIVE_LECTURE && ACTIVE_LECTURE.periodEnd ? ACTIVE_LECTURE.periodEnd : 1,
    startTime: ACTIVE_LECTURE && ACTIVE_LECTURE.startTime ? ACTIVE_LECTURE.startTime : '09:00 AM',
    endTime: ACTIVE_LECTURE && ACTIVE_LECTURE.endTime ? ACTIVE_LECTURE.endTime : '09:50 AM',
    lectureNumber: lectureNo,
    status: 'recording',
    completedAt: null,
    startedAt: nowTimeStr,
    startTimeTs: Date.now()
  };

  ATTENDANCE_STATE.classInfo = {
    date,
    dept,
    deptName: deptNameMap[dept] || dept,
    sem,
    sec,
    subject: effectiveSubject,
    faculty,
    lectureNumber: lectureNo,
    lectureNoDisplay: `Lecture No. ${lectureNo}`
  };

  ATTENDANCE_STATE.status = 'loading';
  renderAttendanceView();
  updateTakeAttendanceHeader();
  updateFacultyDashboardLiveMetrics();

  setTimeout(() => {
    ATTENDANCE_STATE.students = getRosterForClass(dept, sem, sec);
    ATTENDANCE_STATE.searchQuery = '';
    ATTENDANCE_STATE.status = 'loaded';
    renderAttendanceView();
    updateTakeAttendanceHeader();
    updateFacultyDashboardLiveMetrics();
    showToast(`Lecture No. ${lectureNo} started: ${ATTENDANCE_STATE.students.length} students rostered (Recording)`);
    refreshIcons();
  }, 280);
}

function getAttendanceMetrics() {
  const students = ATTENDANCE_STATE.students || [];
  const total = students.length;
  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const pendingCount = students.filter(s => s.status === 'pending' || !s.status).length;
  const markedCount = presentCount + absentCount;
  const selectedCount = ATTENDANCE_STATE.mode === 'present' ? presentCount : absentCount;
  const presentPct = total > 0 ? Number(((presentCount / total) * 100).toFixed(1)) : 0;
  const absentPct = total > 0 ? Number(((absentCount / total) * 100).toFixed(1)) : 0;

  return { total, presentCount, absentCount, pendingCount, markedCount, selectedCount, presentPct, absentPct };
}

function markAllPresent() {
  if (!ATTENDANCE_STATE.students) return;
  ATTENDANCE_STATE.students.forEach(s => s.status = 'present');
  renderAttendanceView();
  showToast('All students marked PRESENT');
}

function markAllAbsent() {
  if (!ATTENDANCE_STATE.students) return;
  ATTENDANCE_STATE.students.forEach(s => s.status = 'absent');
  renderAttendanceView();
  showToast('All students marked ABSENT');
}

function resetAllPending() {
  if (!ATTENDANCE_STATE.students) return;
  ATTENDANCE_STATE.students.forEach(s => s.status = 'pending');
  renderAttendanceView();
  showToast('All student marks reset to PENDING');
}

function setStudentAttendanceStatus(studentId, status) {
  const s = (ATTENDANCE_STATE.students || []).find(st => st.id === studentId || st.roll === studentId);
  if (s) {
    s.status = status;
    renderAttendanceView();
  }
}

function cancelLectureAction() {
  ACTIVE_LECTURE = null;
  ATTENDANCE_STATE.status = 'initial';
  ATTENDANCE_STATE.students = [];
  ATTENDANCE_STATE.savedSummary = null;
  renderAttendanceView();
  updateTakeAttendanceHeader();
  updateFacultyDashboardLiveMetrics();
  showToast('Lecture session cancelled. Temporary attendance discarded.', 'info');
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
      <div class="att-state-title">Select Class &amp; Load Roster</div>
      <div class="att-state-desc">
        Select the session date, branch, semester, section, and course above, then click <strong>"Load Students"</strong> to display the enrolled classroom roster.
      </div>
      <div class="att-workflow-steps">
        <div class="workflow-step">
          <span class="workflow-step-num">1</span>
          <span>Select Class Filters</span>
        </div>
        <div class="workflow-step-arrow">&rarr;</div>
        <div class="workflow-step">
          <span class="workflow-step-num">2</span>
          <span>Load Enrolled Roster</span>
        </div>
        <div class="workflow-step-arrow">&rarr;</div>
        <div class="workflow-step">
          <span class="workflow-step-num">3</span>
          <span>Mark &amp; Save Attendance</span>
        </div>
      </div>
      <button class="btn btn-primary" onclick="loadStudentsAction()" style="margin-top: 18px;">
        <i data-lucide="users" class="icon-sm"></i>
        <span>Load Selected Class Roster</span>
      </button>
    </div>
  `;
}

function renderLoadingState() {
  const info = ATTENDANCE_STATE.classInfo || { deptName: 'Department', sem: '2', sec: 'A' };
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
  const info = ATTENDANCE_STATE.classInfo || { dept: 'CSE', sem: '2', sec: 'A', date: 'Today', subject: 'Course' };
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
        <span class="att-roster-tag"><i data-lucide="building-2" class="icon-sm"></i> <strong>${escapeHtml(info.dept)} · Semester ${escapeHtml(info.sem)} (Section ${escapeHtml(info.sec)})</strong></span>
        <span class="att-roster-tag"><i data-lucide="book-open" class="icon-sm"></i> <strong>${escapeHtml(info.subject)}</strong></span>
        <span class="att-roster-tag"><i data-lucide="user" class="icon-sm"></i> <strong>Faculty: ${escapeHtml(info.faculty || 'Devbrat Sahu')}</strong></span>
        <span class="att-roster-tag" style="background: var(--primary); color: #fff; border-color: var(--primary); font-weight: 700;"><i data-lucide="hash" class="icon-sm"></i> <strong>${escapeHtml(info.lectureNoDisplay || 'Lecture No. 1')}</strong></span>
        <span class="att-roster-tag"><i data-lucide="calendar" class="icon-sm"></i> <strong>${escapeHtml(info.date)}</strong></span>
      </div>
      <button class="btn btn-outline btn-sm" onclick="cancelLectureAction()">
        <i data-lucide="x" class="icon-sm"></i>
        <span>Cancel Lecture</span>
      </button>
    </div>

    <!-- Action Status Ribbon (Phase 6: Marked vs Pending Counter) -->
    <div class="att-action-ribbon">
      <div class="att-ribbon-item">
        <span class="att-ribbon-lbl">Enrolled Class</span>
        <span class="att-ribbon-val" id="cnt-total">${metrics.total} Students</span>
      </div>
      <div class="att-ribbon-item">
        <span class="att-ribbon-lbl">Resolution Status</span>
        <span class="att-ribbon-val" id="cnt-resolution" style="color: ${metrics.pendingCount === 0 ? 'var(--success)' : 'var(--warning)'}; font-weight: 700;">
          ${metrics.markedCount} Marked &middot; ${metrics.pendingCount} Pending
        </span>
      </div>
      <div class="att-ribbon-item">
        <span class="att-ribbon-lbl">Marked Present</span>
        <span class="att-ribbon-val" id="cnt-present" style="color: var(--success);">${metrics.presentCount}</span>
      </div>
      <div class="att-ribbon-item">
        <span class="att-ribbon-lbl">Marked Absent</span>
        <span class="att-ribbon-val" id="cnt-absent" style="color: var(--danger);">${metrics.absentCount}</span>
      </div>
      <div class="att-ribbon-item att-ribbon-mode">
        <span class="att-ribbon-lbl">Marking Mode</span>
        <span class="badge ${isMarkPresent ? 'badge-ok' : 'badge-risk'}" id="cnt-mode-badge" style="font-size: 11px;">${isMarkPresent ? 'CHECKED = PRESENT' : 'CHECKED = ABSENT'}</span>
      </div>
    </div>

    <!-- Attendance Controls Toolbar (Phase 6: Bulk Actions) -->
    <div class="att-controls-bar" style="flex-wrap: wrap; gap: 10px;">
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

      <div class="att-bulk-group" style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button type="button" class="btn btn-outline btn-sm" onclick="markAllPresent()" title="Mark all students Present">
          <i data-lucide="check-check" class="icon-sm" style="color: var(--success);"></i>
          <span>Mark All Present</span>
        </button>
        <button type="button" class="btn btn-outline btn-sm" onclick="markAllAbsent()" title="Mark all students Absent">
          <i data-lucide="x-circle" class="icon-sm" style="color: var(--danger);"></i>
          <span>Mark All Absent</span>
        </button>
        <button type="button" class="btn btn-outline btn-sm" onclick="resetAllPending()" title="Reset all to Pending">
          <i data-lucide="rotate-ccw" class="icon-sm"></i>
          <span>Reset All Pending</span>
        </button>
      </div>

      <div class="search-wrapper" style="max-width: 240px; margin-left: auto;">
        <i data-lucide="search" class="search-icon-inside"></i>
        <input type="text" class="search-box" style="padding-top: 6px; padding-bottom: 6px;" placeholder="Search student or roll no…" value="${escapeHtml(ATTENDANCE_STATE.searchQuery)}" oninput="filterAttendanceTable(this.value)" />
      </div>
    </div>

    <!-- Mode Explanation Banner -->
    <div class="mode-explanation-banner ${isMarkPresent ? 'banner-present' : 'banner-absent'}">
      <div>
        <strong>Marking mode: ${isMarkPresent ? 'Present' : 'Absent'}</strong> —
        ${isMarkPresent
          ? 'Checked students will be recorded as present. All students must be resolved before saving.'
          : 'Checked students will be recorded as absent. All students must be resolved before saving.'
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
            <th style="width: 140px;">Roll Number</th>
            <th>Student Name</th>
            <th style="width: 130px; text-align: center;">Status</th>
            <th style="width: 120px; text-align: center;">Quick Action</th>
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

    <!-- Save Attendance Bar with Validation State -->
    <div class="att-save-bar">
      <div class="att-save-info">
        <i data-lucide="info" class="icon-sm" style="color: var(--primary); vertical-align: middle;"></i>
        <span>Session Summary: <strong id="save-summary-txt">${metrics.presentCount} Present &middot; ${metrics.absentCount} Absent</strong> &middot; <span style="color: ${metrics.pendingCount === 0 ? 'var(--success)' : 'var(--warning)'}; font-weight: 700;">${metrics.pendingCount} Pending</span></span>
      </div>
      <div class="att-save-actions" style="display: flex; gap: 8px;">
        <button class="btn btn-outline btn-danger" onclick="cancelLectureAction()">
          <i data-lucide="x" class="icon-sm"></i>
          <span>Cancel Lecture</span>
        </button>
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
        <td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">
          No enrolled students match your search filter.
        </td>
      </tr>
    `;
  }

  return students.map((s, index) => {
    const isChecked = isMarkPresent ? s.status === 'present' : s.status === 'absent';
    let statusBadge = '';
    let rowClass = 'att-row ';

    if (s.status === 'pending' || !s.status) {
      statusBadge = `<span class="badge badge-pending">PENDING</span>`;
      rowClass += 'row-is-pending';
    } else if (s.status === 'present') {
      statusBadge = `<span class="badge badge-present">PRESENT</span>`;
      rowClass += 'row-is-present';
    } else {
      statusBadge = `<span class="badge badge-absent">ABSENT</span>`;
      rowClass += 'row-is-absent';
    }

    return `
      <tr class="${rowClass}" id="att-row-${s.id}" onclick="handleRowClick(${s.id}, event)">
        <td>${index + 1}</td>
        <td><code>${escapeHtml(s.roll)}</code></td>
        <td>
          <button type="button" class="student-link-btn" onclick="openStudentProfile('${escapeHtml(s.roll)}'); event.stopPropagation();">
            <span>${escapeHtml(s.name)}</span>
            <i data-lucide="external-link" style="width: 12px; height: 12px; opacity: 0.6;"></i>
          </button>
        </td>
        <td style="text-align: center;" id="badge-td-${s.id}">${statusBadge}</td>
        <td style="text-align: center;" onclick="event.stopPropagation()">
          <div style="display: inline-flex; gap: 4px;">
            <button type="button" class="att-quick-mark-btn ${s.status === 'present' ? 'att-quick-p active' : 'btn-outline'}" onclick="setStudentAttendanceStatus('${escapeHtml(s.roll)}', 'present')" title="Mark Present">P</button>
            <button type="button" class="att-quick-mark-btn ${s.status === 'absent' ? 'att-quick-a active' : 'btn-outline'}" onclick="setStudentAttendanceStatus('${escapeHtml(s.roll)}', 'absent')" title="Mark Absent">A</button>
          </div>
        </td>
        <td class="col-mark" onclick="event.stopPropagation()">
          <label class="custom-checkbox-wrap">
            <input type="checkbox"
              class="att-checkbox-input att-student-checkbox"
              data-id="${s.id}"
              id="chk-${s.id}"
              ${isChecked && s.status !== 'pending' ? 'checked' : ''}
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
    subject: 'CS103 — Programming in Python',
    deptName: 'Computer Science & Engineering',
    sem: '2',
    sec: 'A',
    date: 'Today',
    total: 70,
    present: 62,
    absent: 8,
    pct: 88.6
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
          <div class="att-saved-stat-lbl">Absent (${Number((100 - sum.pct).toFixed(1))}%)</div>
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

  renderAttendanceView();
}

function handleRowClick(studentId, event) {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.closest('.col-mark') || event.target.closest('.student-link-btn')) {
    return;
  }

  const student = ATTENDANCE_STATE.students.find(s => s.id === studentId);
  if (!student) return;

  if (student.status === 'pending') {
    student.status = 'present';
  } else if (student.status === 'present') {
    student.status = 'absent';
  } else {
    student.status = 'present';
  }

  renderAttendanceView();
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
  const isMarkPresent = ATTENDANCE_STATE.mode === 'present';

  const cntTotal = document.getElementById('cnt-total');
  const cntPresent = document.getElementById('cnt-present');
  const cntAbsent = document.getElementById('cnt-absent');
  const cntRate = document.getElementById('cnt-rate');
  const cntModeBadge = document.getElementById('cnt-mode-badge');
  const selectedPill = document.getElementById('cnt-selected-pill');
  const saveTxt = document.getElementById('save-summary-txt');

  if (cntTotal) cntTotal.textContent = `${metrics.total} Students`;
  if (cntPresent) cntPresent.textContent = `${metrics.presentCount} (${metrics.presentPct}%)`;
  if (cntAbsent) cntAbsent.textContent = `${metrics.absentCount} (${metrics.absentPct}%)`;
  if (cntRate) {
    cntRate.textContent = `${metrics.presentPct}%`;
    cntRate.style.color = metrics.presentPct >= ATTENDANCE_THRESHOLD ? 'var(--primary)' : 'var(--danger)';
  }
  if (cntModeBadge) {
    cntModeBadge.className = `badge ${isMarkPresent ? 'badge-ok' : 'badge-risk'}`;
    cntModeBadge.textContent = isMarkPresent ? 'CHECKED = PRESENT' : 'CHECKED = ABSENT';
  }
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

  if (!ACTIVE_LECTURE || ACTIVE_LECTURE.status !== 'recording') {
    showToast('No active lecture in recording status', 'warning');
    return;
  }

  const metrics = getAttendanceMetrics();
  if (metrics.pendingCount > 0) {
    showToast(`Cannot save attendance: ${metrics.pendingCount} student(s) still have pending status. Mark all students Present or Absent before saving.`, 'warning');
    return;
  }

  const facultyName = (CURRENT_USER && CURRENT_USER.role === 'faculty')
    ? CURRENT_USER.facultyName
    : (ATTENDANCE_STATE.classInfo.faculty || getFacultyForSubject(ATTENDANCE_STATE.classInfo.subject));
  const facultyId = (CURRENT_USER && CURRENT_USER.role === 'faculty')
    ? CURRENT_USER.facultyId
    : ('faculty_' + facultyName.toLowerCase().replace(/[^a-z]/g, ''));
  const effectiveSubject = (CURRENT_USER && CURRENT_USER.role === 'faculty')
    ? CURRENT_USER.subjectName
    : ATTENDANCE_STATE.classInfo.subject;
  const sectionName = ATTENDANCE_STATE.classInfo.sec;

  // Authorization Check
  if (CURRENT_USER && CURRENT_USER.role === 'faculty') {
    if (CURRENT_USER.assignedSections && !CURRENT_USER.assignedSections.includes(sectionName)) {
      showToast(`Section ${sectionName} is not assigned to ${CURRENT_USER.facultyName}. Allocation is pending.`, 'danger');
      return;
    }
  }

  const lectureNo = ACTIVE_LECTURE.lectureNumber || getNextLectureNumber(effectiveSubject, sectionName);
  const lectureNoDisplay = `Lecture No. ${lectureNo}`;

  // Duplicate Check
  const duplicate = SESSIONS_DATA.find(s =>
    s.status === 'completed' &&
    (s.course === effectiveSubject || s.subject === effectiveSubject) &&
    s.sec === sectionName &&
    (s.lectureNo === lectureNo || s.lectureNumber === lectureNo)
  );
  if (duplicate) {
    showToast(`Lecture ${lectureNo} for ${effectiveSubject} (Section ${sectionName}) has already been saved. Duplicate rejected.`, 'danger');
    return;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const completedDate = ATTENDANCE_STATE.classInfo.date || 'Today';

  const newSessionRecord = {
    id: `sess-${Date.now()}`,
    lectureNo,
    lectureNumber: lectureNo,
    lectureNoDisplay,
    course: effectiveSubject,
    subject: effectiveSubject,
    subjectId: (CURRENT_USER && CURRENT_USER.subjectId) || 'operating-system',
    subjectName: effectiveSubject,
    subjectCodeShort: (CURRENT_USER && CURRENT_USER.subjectCodeShort) || 'OS',
    dept: ATTENDANCE_STATE.classInfo.dept || 'CSE',
    sem: parseInt(ATTENDANCE_STATE.classInfo.sem) || 3,
    semester: parseInt(ATTENDANCE_STATE.classInfo.sem) || 3,
    sec: sectionName,
    section: sectionName,
    room: ACTIVE_LECTURE.room || 'Classroom 301',
    time: ACTIVE_LECTURE.startedAt || timeStr,
    date: completedDate,
    timetableEntryId: ACTIVE_LECTURE.timetableEntryId || null,
    period: ACTIVE_LECTURE.period || 'I',
    periodStart: ACTIVE_LECTURE.periodStart || 1,
    periodEnd: ACTIVE_LECTURE.periodEnd || 1,
    startTime: ACTIVE_LECTURE.startTime || '09:00 AM',
    endTime: ACTIVE_LECTURE.endTime || '09:50 AM',
    completedAt: timeStr,
    faculty: facultyName,
    facultyName: facultyName,
    facultyId: facultyId,
    total: metrics.total,
    present: metrics.presentCount,
    absent: metrics.absentCount,
    pct: metrics.presentPct,
    status: 'completed'
  };

  const studentRecords = ATTENDANCE_STATE.students.map(s => ({
    sessionId: newSessionRecord.id,
    studentId: s.roll,
    roll: s.roll,
    name: s.name,
    status: s.status === 'present' ? 'PRESENT' : 'ABSENT',
    markedAt: timeStr
  }));

  // Enforce duplicate uniqueness for student records
  const uniqueRecords = [];
  const seenStudent = new Set();
  studentRecords.forEach(r => {
    if (!seenStudent.has(r.studentId)) {
      seenStudent.add(r.studentId);
      uniqueRecords.push(r);
    }
  });

  SESSIONS_DATA.unshift(newSessionRecord);

  if (typeof LIVE_ATTENDANCE_RECORDS !== 'undefined') {
    LIVE_ATTENDANCE_RECORDS.unshift({
      ...newSessionRecord,
      studentRecords: uniqueRecords
    });
  }

  // Clear active lecture session upon completion
  ACTIVE_LECTURE = null;

  renderSessions();

  uniqueRecords.slice(0, 5).forEach(s => {
    RECENT_ATTENDANCE_LOGS.unshift({
      name: s.name,
      roll: s.roll,
      course: effectiveSubject.split('—')[0].trim(),
      time: timeStr,
      status: s.status.toLowerCase(),
      markedBy: facultyName
    });
  });
  renderRecentAttendanceLogs();

  const sessStat = document.getElementById('stat-sessions');
  if (sessStat) {
    sessStat.textContent = SESSIONS_DATA.length;
  }

  ATTENDANCE_STATE.savedSummary = {
    ...newSessionRecord,
    total: metrics.total,
    present: metrics.presentCount,
    absent: metrics.absentCount,
    pct: metrics.presentPct,
    time: timeStr
  };

  ATTENDANCE_STATE.status = 'saved';
  renderAttendanceView();

  // Phase 6: Refresh live counters on Faculty Dashboard & Take Attendance
  updateFacultyDashboardLiveMetrics();
  updateTakeAttendanceHeader();

  showToast(`Attendance recorded: Lecture ${lectureNo} (${metrics.presentCount} Present, ${metrics.absentCount} Absent)`);
}

function resetAttendanceAction() {
  ATTENDANCE_STATE.status = 'initial';
  ATTENDANCE_STATE.students = [];
  ATTENDANCE_STATE.savedSummary = null;
  renderAttendanceView();
}

/**
 * Strict reset of live attendance runtime state.
 * Cleans up any test-generated sessions, ensures 0 live records, and restores truthful pre-commencement baseline.
 */
function resetLiveAttendanceState() {
  ACTIVE_LECTURE = null;
  SESSIONS_DATA.length = 0;
  if (typeof LIVE_ATTENDANCE_RECORDS !== 'undefined') {
    LIVE_ATTENDANCE_RECORDS.length = 0;
  }
  RECENT_ATTENDANCE_LOGS.length = 0;
  const sessStat = document.getElementById('stat-sessions');
  if (sessStat) sessStat.textContent = '0';
  const avgStat = document.getElementById('stat-avg');
  if (avgStat) avgStat.textContent = '--';
  const lowStat = document.getElementById('stat-low');
  if (lowStat) lowStat.textContent = '0';

  if (typeof ATTENDANCE_STATE !== 'undefined') {
    ATTENDANCE_STATE.status = 'initial';
    ATTENDANCE_STATE.students = [];
    ATTENDANCE_STATE.savedSummary = null;
  }

  renderSessions();
  renderRecentAttendanceLogs();
  updateFacultyDashboardLiveMetrics();
  updateTakeAttendanceHeader();
}

function editCurrentAttendance() {
  ATTENDANCE_STATE.status = 'loaded';
  renderAttendanceView();
}

// ── 9. FULL-SCREEN STUDENT PROFILE & DETAIL ENGINE ───────────
function openStudentProfile(studentIdOrRoll) {
  let student = null;
  if (typeof studentIdOrRoll === 'string') {
    const sIdStr = studentIdOrRoll.trim();
    student = STUDENTS.find(s => s.roll === sIdStr || s.studentId === sIdStr || String(s.id) === sIdStr);
  } else if (typeof studentIdOrRoll === 'number') {
    student = STUDENTS.find(s => s.id === studentIdOrRoll);
  }
  if (!student && ATTENDANCE_STATE.students) {
    student = ATTENDANCE_STATE.students.find(s => s.id === studentIdOrRoll || s.roll === studentIdOrRoll);
  }
  if (!student) {
    student = STUDENTS[0];
  }
  if (!student) return;

  // Set avatar initials
  const initials = student.name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const spAvatar = document.getElementById('sp-avatar');
  const spName = document.getElementById('sp-name');
  const spRoll = document.getElementById('sp-roll');
  const spDeptSem = document.getElementById('sp-dept-sem');
  const spSecBadge = document.getElementById('sp-sec-badge');
  const spSno = document.getElementById('sp-sno');
  const spRollVal = document.getElementById('sp-roll-val');
  const spEnrollVal = document.getElementById('sp-enroll-val');
  const spEnrollStatus = document.getElementById('sp-enroll-status');
  const spAdmissionType = document.getElementById('sp-admission-type');
  const spSourceSecTag = document.getElementById('sp-source-sec-tag');

  if (spAvatar) spAvatar.textContent = initials || 'ST';
  if (spName) spName.textContent = student.name;
  if (spRoll) spRoll.textContent = student.rollNumber || student.roll;
  if (spDeptSem) spDeptSem.textContent = `Department of Computer Science & Engineering · Semester ${student.sem} (July–Dec 2026)`;
  if (spSecBadge) spSecBadge.textContent = `SECTION ${student.sec}`;
  if (spSno) spSno.textContent = `#${student.sno}`;
  if (spRollVal) spRollVal.textContent = student.rollNumber || student.roll;

  if (spEnrollVal) {
    if (student.enrollmentStatus === 'verified' && student.enrollmentNumber) {
      spEnrollVal.textContent = student.enrollmentNumber;
      if (spEnrollStatus) spEnrollStatus.textContent = 'Verified CSVTU Enrollment Code';
    } else if (student.enrollmentStatus === 'unverified') {
      spEnrollVal.textContent = student.sourceEnrollmentNumber ? `${student.sourceEnrollmentNumber} (Unverified)` : 'Unverified';
      if (spEnrollStatus) spEnrollStatus.textContent = 'Unverified (Section B Copy-Paste Artifact)';
    } else {
      spEnrollVal.textContent = 'Not Issued / Pending';
      if (spEnrollStatus) spEnrollStatus.textContent = 'Not recorded in HOD Workbook';
    }
  }

  if (spAdmissionType) {
    spAdmissionType.textContent = student.admissionType === 'regular' ? 'Regular CSVTU Admission' : 'Lateral / Provisional Admission';
  }
  if (spSourceSecTag) {
    spSourceSecTag.textContent = student.sourceSectionCode && student.sourceSectionCode !== student.sec
      ? `Original Designation: ${student.sourceSectionCode} (Core Section ${student.sec})`
      : `Class Section: ${student.sec}`;
  }

  // Historical Attendance Snapshot card handling
  const histCard = document.getElementById('sp-historical-card');
  const histPct = document.getElementById('sp-historical-pct');
  const histBadge = document.getElementById('sp-historical-badge');
  const histCompliance = document.getElementById('sp-historical-compliance');
  const histSub = document.getElementById('sp-historical-sub');
  const histProv = document.getElementById('sp-historical-prov');
  const histSourceDesc = document.getElementById('sp-historical-source-desc');
  const histNote = document.getElementById('sp-historical-note');

  if (student.historicalSnapshot && student.historicalSnapshot.available) {
    const h = student.historicalSnapshot;
    if (histCard) histCard.style.display = 'block';
    if (histPct) histPct.textContent = `${h.attendancePercent}%`;
    if (histBadge) {
      histBadge.textContent = h.isBelowThreshold ? 'BELOW THRESHOLD (HISTORICAL)' : 'AT OR ABOVE THRESHOLD';
      histBadge.className = h.isBelowThreshold ? 'badge badge-risk' : 'badge badge-ok';
    }
    if (histCompliance) {
      histCompliance.textContent = h.isBelowThreshold ? 'Below Threshold (<75%)' : 'In Compliance (≥75%)';
      histCompliance.style.color = h.isBelowThreshold ? 'var(--danger)' : 'var(--success)';
    }
    if (histSub) {
      histSub.textContent = h.isBelowThreshold
        ? 'Below Attendance Threshold — Historical Snapshot'
        : 'Meets CSVTU 75% Attendance Criteria';
    }
    if (histProv) histProv.textContent = 'Verified Match by Roll No.';
    if (histSourceDesc) {
      histSourceDesc.innerHTML = `Source: <strong>${escapeHtml(h.source)}</strong> &middot; Printed Date: <strong>${escapeHtml(h.sourceDate)}</strong> <span style="color: var(--text-muted);">(${escapeHtml(h.dateStatus)})</span>`;
    }
    if (histNote) {
      histNote.textContent = '* Note: This represents a historical attendance percentage snapshot from the previous attendance register. In accordance with departmental policy, underlying lecture counts are not reconstructed or fabricated without official session records.';
    }
  } else {
    if (histCard) histCard.style.display = 'block';
    if (histPct) histPct.textContent = '--';
    if (histBadge) {
      histBadge.textContent = 'NO SNAPSHOT RECORDED';
      histBadge.className = 'badge';
    }
    if (histCompliance) {
      histCompliance.textContent = `No Snapshot for Section ${student.sec}`;
      histCompliance.style.color = 'var(--text-muted)';
    }
    if (histSub) histSub.textContent = 'Historical snapshot only provided for Section A';
    if (histProv) histProv.textContent = 'Pending Section Snapshot';
    if (histSourceDesc) {
      histSourceDesc.textContent = 'No historical attendance snapshot was supplied for this section in the source documentation.';
    }
    if (histNote) {
      histNote.textContent = '* Note: Section B, C, and D attendance registers are awaiting previous attendance snapshots from the HOD office.';
    }
  }

  // Live Attendance metrics on profile
  const sectionCompleted = SESSIONS_DATA.filter(s => s.status === 'completed' && s.sec === student.sec);
  const totalCompleted = sectionCompleted.length;

  let liveAttendedCount = 0;
  let liveMissedCount = 0;

  sectionCompleted.forEach(sess => {
    const liveRec = (typeof LIVE_ATTENDANCE_RECORDS !== 'undefined')
      ? LIVE_ATTENDANCE_RECORDS.find(r => r.id === sess.id || (r.lectureNo === sess.lectureNo && r.subject === sess.subject && r.sec === sess.sec))
      : null;
    if (liveRec && liveRec.studentRecords) {
      const sr = liveRec.studentRecords.find(r => r.roll === student.roll || r.studentId === student.roll || r.studentId === student.id);
      if (sr && (sr.status || '').toUpperCase() === 'PRESENT') {
        liveAttendedCount++;
      } else {
        liveMissedCount++;
      }
    }
  });

  const livePct = totalCompleted > 0 ? Number(((liveAttendedCount / totalCompleted) * 100).toFixed(1)) : null;

  const spTotal = document.getElementById('sp-total-held');
  const spAtt = document.getElementById('sp-attended');
  const spAbs = document.getElementById('sp-absent');
  const spPct = document.getElementById('sp-pct');

  if (spTotal) spTotal.textContent = totalCompleted;
  if (spAtt) spAtt.textContent = liveAttendedCount;
  if (spAbs) spAbs.textContent = liveMissedCount;
  if (spPct) spPct.textContent = livePct !== null ? `${livePct}%` : '--';

  // Populate Course Modules with 5 official subjects using live records
  const coursesBody = document.getElementById('sp-courses-body');
  if (coursesBody) {
    coursesBody.innerHTML = OFFICIAL_SUBJECTS.map(subj => {
      const fac = getFacultyForSubject(subj);
      const subjSessions = sectionCompleted.filter(s => (s.subject === subj || s.course === subj || s.subjectName === subj));
      const sCompleted = subjSessions.length;
      let sAttended = 0;

      subjSessions.forEach(sess => {
        const liveRec = (typeof LIVE_ATTENDANCE_RECORDS !== 'undefined')
          ? LIVE_ATTENDANCE_RECORDS.find(r => r.id === sess.id || (r.lectureNo === sess.lectureNo && r.subject === sess.subject && r.sec === sess.sec))
          : null;
        if (liveRec && liveRec.studentRecords) {
          const sr = liveRec.studentRecords.find(r => r.roll === student.roll || r.studentId === student.roll);
          if (sr && (sr.status || '').toUpperCase() === 'PRESENT') sAttended++;
        }
      });

      const sAbsent = sCompleted - sAttended;
      const sPct = sCompleted > 0 ? Number(((sAttended / sCompleted) * 100).toFixed(1)) : null;
      const sPctDisplay = sPct !== null ? `${sPct}%` : '--';
      const isEligible = sPct !== null && sPct >= ATTENDANCE_THRESHOLD;

      return `
        <tr>
          <td><strong>${escapeHtml(subj)}</strong></td>
          <td><span style="color: var(--text-muted); font-size: 12.5px;">Pending CSVTU Code</span></td>
          <td><strong>${escapeHtml(fac)}</strong></td>
          <td>${sCompleted}</td>
          <td>${sAttended}</td>
          <td><span style="font-weight: 600; color: ${sPct !== null ? (isEligible ? 'var(--text-primary)' : 'var(--danger)') : 'var(--text-muted)'};">${sPctDisplay}</span></td>
          <td>
            <span class="badge ${sPct === null ? '' : (isEligible ? 'badge-ok' : 'badge-risk')}" style="${sPct === null ? 'background: var(--surface-muted); color: var(--text-secondary); border: 1px solid var(--border);' : ''}">
              ${sPct === null ? 'Pending Sessions' : (isEligible ? 'Eligible (≥ 75%)' : 'Below Threshold (< 75%)')}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Navigate to full-screen profile page (NOT drawer/modal)
  showPage('student-profile', null);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  refreshIcons();
}

// Redirect old drawer invocation directly to full-screen student profile
function openStudentDrawer(studentIdOrRoll) {
  openStudentProfile(studentIdOrRoll);
}

function closeStudentDrawer() {
  const drawer = document.getElementById('student-drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

// ── 10. RECENT ATTENDANCE ACTIVITY TABLE ─────────────────────
function renderRecentAttendanceLogs() {
  const tbody = document.getElementById('recent-body');
  if (!tbody) return;
  if (!RECENT_ATTENDANCE_LOGS || RECENT_ATTENDANCE_LOGS.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">No recent attendance logs. Click "+ Take Attendance" to conduct a session.</td></tr>`;
    return;
  }
  tbody.innerHTML = RECENT_ATTENDANCE_LOGS.slice(0, 6).map(s => `
    <tr>
      <td>
        <button type="button" class="student-link-btn" onclick="openStudentProfile(${s.id || `'${s.roll}'`})">
          <strong>${escapeHtml(s.name)}</strong>
        </button>
      </td>
      <td><code>${escapeHtml(s.roll)}</code></td>
      <td>${escapeHtml(s.course)}</td>
      <td style="color: var(--text-secondary);">${escapeHtml(s.time)}</td>
      <td><span class="badge badge-${s.status}">${s.status.toUpperCase()}</span></td>
      <td style="color: var(--text-muted); font-size: 13px;">${escapeHtml(s.markedBy || 'Faculty')}</td>
    </tr>
  `).join('');
}

// ── 11. STUDENT REGISTRY TABLE ───────────────────────────────
let CURRENT_STUDENT_FILTERS = {
  query: '',
  section: 'All',
  semester: '3',
  sortBy: 'sno'
};

function renderStudents(data) {
  const tbody = document.getElementById('students-body');
  if (!tbody) return;

  const countBadge = document.getElementById('student-count-badge');
  if (countBadge) {
    countBadge.textContent = `Showing ${data.length} of ${STUDENTS.length} students (B.Tech CSE · Semester 3 · Academic Session 2026)`;
  }

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 32px; color: var(--text-muted);">No students found matching current filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(s => {
    const isCompliant = s.pct !== null ? s.pct >= ATTENDANCE_THRESHOLD : null;
    const attHtml = s.pct !== null 
      ? `<span style="font-weight: 600; color: ${isCompliant ? 'var(--text-primary)' : 'var(--danger)'};">${s.pct}%</span>`
      : `<span style="color: var(--text-muted); font-size: 12px;">-- <span class="badge" style="background:var(--surface-muted); color:var(--text-muted); font-size:10px; border:1px solid var(--border);">No Records Yet</span></span>`;

    return `
      <tr onclick="openStudentProfile(${s.id})" style="cursor: pointer;">
        <td style="color: var(--text-muted); font-size: 12.5px; font-weight: 500;">#${s.sno}</td>
        <td>
          <button type="button" class="student-link-btn" onclick="openStudentProfile(${s.id}); event.stopPropagation();" style="text-align: left; background: none; border: none; padding: 0; cursor: pointer; color: var(--primary); font-weight: 600;">
            ${escapeHtml(s.name)}
          </button>
        </td>
        <td><code>${escapeHtml(s.rollNumber || s.roll)}</code></td>
        <td>${escapeHtml(s.dept)}</td>
        <td>Semester ${s.sem}</td>
        <td><span class="badge" style="background: var(--surface-muted); color: var(--text-secondary); border: 1px solid var(--border);">Section ${escapeHtml(s.sec)}</span></td>
        <td>${attHtml}</td>
        <td>
          <span class="badge badge-ok">Active</span>
        </td>
        <td style="text-align: right;" onclick="event.stopPropagation();">
          <button class="btn btn-outline btn-sm" onclick="openStudentProfile(${s.id})" title="View Full-Screen Student Profile">
            <i data-lucide="eye" class="icon-sm"></i>
            <span>View Profile</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  refreshIcons();
}

function filterStudents(query) {
  const qInput = document.getElementById('student-search-input');
  if (query !== undefined && qInput && qInput.value !== query) {
    qInput.value = query;
  }
  CURRENT_STUDENT_FILTERS.query = query !== undefined ? query : (qInput ? qInput.value : '');
  applyStudentFilters();
}

function applyStudentFilters() {
  const qInput = document.getElementById('student-search-input');
  const secSelect = document.getElementById('filter-student-sec');
  const semSelect = document.getElementById('filter-student-sem');
  const sortSelect = document.getElementById('sort-student-by');

  if (qInput && CURRENT_STUDENT_FILTERS.query === undefined) CURRENT_STUDENT_FILTERS.query = qInput.value;
  if (qInput && qInput.value !== CURRENT_STUDENT_FILTERS.query) CURRENT_STUDENT_FILTERS.query = qInput.value;
  if (secSelect) CURRENT_STUDENT_FILTERS.section = secSelect.value;
  if (semSelect) CURRENT_STUDENT_FILTERS.semester = semSelect.value;
  if (sortSelect) CURRENT_STUDENT_FILTERS.sortBy = sortSelect.value;

  const q = CURRENT_STUDENT_FILTERS.query.toLowerCase().trim();
  const sec = CURRENT_STUDENT_FILTERS.section;
  const sem = CURRENT_STUDENT_FILTERS.semester;
  const sortBy = CURRENT_STUDENT_FILTERS.sortBy;

  let filtered = STUDENTS.filter(s => {
    // Search match
    const matchSearch = !q || 
      s.name.toLowerCase().includes(q) || 
      String(s.rollNumber || s.roll).toLowerCase().includes(q) ||
      String(s.sno) === q ||
      (s.studentId && s.studentId.toLowerCase().includes(q));

    // Section match
    const matchSec = (sec === 'All') || (s.sec === sec);

    // Semester match
    const matchSem = (sem === 'All') || (String(s.sem) === sem);

    return matchSearch && matchSec && matchSem;
  });

  // Sort
  if (sortBy === 'sno') {
    filtered.sort((a, b) => {
      if (a.sec !== b.sec) return a.sec.localeCompare(b.sec);
      return (Number(a.sno) || 0) - (Number(b.sno) || 0);
    });
  } else if (sortBy === 'roll') {
    filtered.sort((a, b) => String(a.roll).localeCompare(String(b.roll)));
  } else if (sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  renderStudents(filtered);
}

function editStudent(id) {
  showToast('Edit student profile — connected to faculty management');
}

// ── 12. DYNAMIC REPORT GENERATOR & EXPORT ────────────────────
function getFilteredReportData() {
  const courseEl = document.getElementById('report-course');
  const semEl = document.getElementById('report-sem');
  const secEl = document.getElementById('report-sec');

  const courseVal = courseEl ? courseEl.value : 'All';
  const semVal = semEl ? parseInt(semEl.value) || 2 : 2;
  const secVal = secEl ? secEl.value : 'All';

  let filtered = STUDENTS.filter(s => s.sem === semVal);
  if (secVal && secVal !== 'All') {
    const secLetter = secVal.includes('A') ? 'A' : (secVal.includes('B') ? 'B' : secVal);
    filtered = filtered.filter(s => s.sec === secLetter);
  }

  return filtered;
}

function renderReport(data) {
  const tbody = document.getElementById('report-body');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">No records found matching filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(r => {
    const pctDisplay = r.pct !== null ? `${r.pct}%` : '--';
    const isCompliant = r.pct !== null ? r.pct >= ATTENDANCE_THRESHOLD : null;
    const badgeClass = r.pct !== null ? (isCompliant ? 'badge-ok' : 'badge-risk') : '';
    const statusText = r.pct !== null ? r.status : 'NO RECORDS';

    return `
      <tr onclick="openStudentProfile(${r.id})" style="cursor: pointer;">
        <td><code>${escapeHtml(r.rollNumber || r.roll)}</code></td>
        <td>
          <button type="button" class="student-link-btn" onclick="openStudentProfile(${r.id}); event.stopPropagation();" style="text-align: left; background: none; border: none; padding: 0; cursor: pointer; color: var(--primary); font-weight: 600;">
            ${escapeHtml(r.name)}
          </button>
        </td>
        <td>${r.total}</td>
        <td><span style="color: var(--success); font-weight: 600;">${r.attended}</span></td>
        <td><span style="color: var(--danger); font-weight: 600;">${r.absent}</span></td>
        <td><span style="font-weight: 700; color: ${isCompliant !== null ? (isCompliant ? 'var(--text-primary)' : 'var(--danger)') : 'var(--text-muted)'};">${pctDisplay}</span></td>
        <td>${badgeClass ? `<span class="badge ${badgeClass}">${statusText}</span>` : `<span class="badge" style="background:var(--surface-muted); color:var(--text-muted); border:1px solid var(--border);">${statusText}</span>`}</td>
      </tr>
    `;
  }).join('');
}

function updateReportKPIs(data) {
  const sessEl = document.getElementById('report-kpi-sessions');
  const avgEl = document.getElementById('report-kpi-avg');
  const highValEl = document.getElementById('report-kpi-high-val');
  const highSubEl = document.getElementById('report-kpi-high-sub');
  const lowValEl = document.getElementById('report-kpi-low-val');
  const lowSubEl = document.getElementById('report-kpi-low-sub');

  if (!data || data.length === 0) return;

  const completedSessions = SESSIONS_DATA.filter(s => s.status === 'completed');
  if (completedSessions.length === 0) {
    if (sessEl) sessEl.textContent = '0';
    if (avgEl) avgEl.textContent = '--';
    if (highValEl) highValEl.textContent = '--';
    if (highSubEl) highSubEl.textContent = 'Pending recorded sessions';
    if (lowValEl) lowValEl.textContent = '--';
    if (lowSubEl) lowSubEl.textContent = 'Pending recorded sessions';
    return;
  }

  const totalSessions = completedSessions.length;
  const totalAttended = data.reduce((acc, s) => acc + s.attended, 0);
  const avgPct = Number(((totalAttended / (data.length * totalSessions)) * 100).toFixed(1));

  const sorted = [...data].filter(s => s.pct !== null).sort((a, b) => b.pct - a.pct);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];

  if (sessEl) sessEl.textContent = totalSessions;
  if (avgEl) avgEl.textContent = `${avgPct}%`;
  if (highValEl) highValEl.textContent = highest ? `${highest.pct}%` : '--';
  if (highSubEl) highSubEl.textContent = highest ? `${highest.name} (${highest.roll})` : '--';
  if (lowValEl) lowValEl.textContent = lowest ? `${lowest.pct}%` : '--';
  if (lowSubEl) lowSubEl.textContent = lowest ? `${lowest.name} (${lowest.roll})` : '--';
}

function generateReport() {
  const data = getFilteredReportData();
  renderReport(data);
  updateReportKPIs(data);
  refreshIcons();
}

function exportCSV() {
  const data = getFilteredReportData();
  const header = 'Roll No,Student Name,Department,Semester,Section,Total Sessions,Attended,Absent,Attendance %,Status\n';
  const rows = data.map(r =>
    `${r.roll},"${r.name}",${r.dept},${r.sem},${r.sec},${r.total},${r.attended},${r.absent},${r.pct}%,${r.status}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `smartattend_report_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast(`CSV report exported: ${data.length} student records`);
}

// ── 13. SESSION MANAGEMENT ───────────────────────────────────
function renderSessions() {
  const grid = document.getElementById('sessions-grid');
  if (!grid) return;
  grid.innerHTML = SESSIONS_DATA.map(s => `
    <div class="session-card">
      <div class="session-card-header">
        <div>
          <div class="session-card-title">${escapeHtml(s.course)}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            ${escapeHtml(s.dept || 'CSE')} · Semester ${s.sem || 2} (${s.sec || 'A'})
          </div>
        </div>
        <span class="badge badge-${s.status}">${s.status.toUpperCase()}</span>
      </div>
      <div class="session-card-meta">
        <div class="session-meta-row"><i data-lucide="map-pin" class="icon-sm"></i> ${escapeHtml(s.room)} · ${escapeHtml(s.time)}</div>
        <div class="session-meta-row"><i data-lucide="user" class="icon-sm"></i> Faculty: ${escapeHtml(s.faculty || 'Dr. Anand Tamrakar')}</div>
        <div class="session-meta-row"><i data-lucide="calendar" class="icon-sm"></i> Date: ${escapeHtml(s.date)} · Attendance: <strong style="color: var(--primary);">${s.status === 'scheduled' ? 'Scheduled' : s.pct + '%'}</strong></div>
      </div>
    </div>
  `).join('');
  refreshIcons();
}

function createSession() {
  showToast('Schedule session dialog — ready for faculty timetable integration');
}

// ── 14. ENROLL STUDENT MODAL ─────────────────────────────────
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
    sem: semInput ? parseInt(semInput.value) : 2,
    sec: 'A',
    attended: TOTAL_TERM_SESSIONS,
    absent: 0,
    total: TOTAL_TERM_SESSIONS,
    pct: 100,
    risk: 'HEALTHY',
    status: 'COMPLIANT',
    safeAbsences: calculatePermissibleAbsences(TOTAL_TERM_SESSIONS, TOTAL_TERM_SESSIONS),
    sessionsNeeded: 0,
    lastPresent: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  };
  STUDENTS.push(newStudent);
  STUDENT_MAP[newStudent.roll] = newStudent;
  STUDENT_MAP[newStudent.id] = newStudent;
  renderStudents(STUDENTS);
  closeModal();
  showToast(`${name} enrolled into ${newStudent.dept} Sem ${newStudent.sem}`);

  ['m-name', 'm-roll', 'm-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ── 15. CHARTS CONTROLLER ────────────────────────────────────
let chartsInitialized = false;
let analyticsChartsInitialized = false;
let hodChartInitialized = false;

function initCharts() {
  const weekEl = document.getElementById('weekChart');
  if (!weekEl || typeof Chart === 'undefined') return;

  const completedSessions = SESSIONS_DATA.filter(s => s.status === 'completed');
  const parent = weekEl.parentElement;
  if (!parent) return;

  if (completedSessions.length === 0) {
    if (window.myWeekChart) {
      window.myWeekChart.destroy();
      window.myWeekChart = null;
    }
    weekEl.style.display = 'none';
    let placeholder = parent.querySelector('.chart-empty-state');
    if (!placeholder) {
      placeholder = document.createElement('div');
      placeholder.className = 'chart-empty-state';
      placeholder.style.cssText = 'height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted); font-size: 13px; background: var(--surface-muted); border-radius: var(--radius-md); border: 1px dashed var(--border); padding: 20px;';
      placeholder.innerHTML = `
        <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">Attendance Trend Pending</div>
        <div style="max-width: 320px; line-height: 1.5;">Attendance data will appear after lectures are recorded.</div>
      `;
      parent.appendChild(placeholder);
    }
    chartsInitialized = true;
    return;
  }

  weekEl.style.display = 'block';
  const existingPlaceholder = parent.querySelector('.chart-empty-state');
  if (existingPlaceholder) existingPlaceholder.remove();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

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
        data: [0, 0, 0, 0, 0, 0],
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
          min: 0, max: 100,
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

function initHodChart() {
  const chartEl = document.getElementById('hodTrendChart');
  if (!chartEl || typeof Chart === 'undefined') return;

  const completedSessions = SESSIONS_DATA.filter(s => s.status === 'completed');
  const parent = chartEl.parentElement;
  if (!parent) return;

  if (completedSessions.length === 0) {
    if (window.myHodTrendChart) {
      window.myHodTrendChart.destroy();
      window.myHodTrendChart = null;
    }
    chartEl.style.display = 'none';
    let placeholder = parent.querySelector('.chart-empty-state');
    if (!placeholder) {
      placeholder = document.createElement('div');
      placeholder.className = 'chart-empty-state';
      placeholder.style.cssText = 'height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted); font-size: 13px; background: var(--surface-muted); border-radius: var(--radius-md); border: 1px dashed var(--border); padding: 20px;';
      placeholder.innerHTML = `
        <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">Department Longitudinal Trend Pending</div>
        <div style="max-width: 320px; line-height: 1.5;">Attendance data will appear after lectures are recorded.</div>
      `;
      parent.appendChild(placeholder);
    }
    hodChartInitialized = true;
    return;
  }

  chartEl.style.display = 'block';
  const existingPlaceholder = parent.querySelector('.chart-empty-state');
  if (existingPlaceholder) existingPlaceholder.remove();

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
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        label: 'Department Attendance %',
        data: [0, 0, 0, 0],
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
          min: 0, max: 100,
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

  const completedSessions = SESSIONS_DATA.filter(s => s.status === 'completed');

  if (completedSessions.length === 0) {
    [trendEl, subjectEl].forEach(el => {
      const parent = el.parentElement;
      if (!parent) return;
      el.style.display = 'none';
      let placeholder = parent.querySelector('.chart-empty-state');
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'chart-empty-state';
        placeholder.style.cssText = 'height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted); font-size: 13px; background: var(--surface-muted); border-radius: var(--radius-md); border: 1px dashed var(--border); padding: 20px;';
        placeholder.innerHTML = `
          <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">Analytics Data Pending</div>
          <div style="max-width: 320px; line-height: 1.5;">Attendance data will appear after lectures are recorded.</div>
        `;
        parent.appendChild(placeholder);
      }
    });
    analyticsChartsInitialized = true;
    return;
  }

  [trendEl, subjectEl].forEach(el => {
    el.style.display = 'block';
    const parent = el.parentElement;
    const existingPlaceholder = parent.querySelector('.chart-empty-state');
    if (existingPlaceholder) existingPlaceholder.remove();
  });

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
        data: [0, 0, 0, 0, 0],
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
          min: 0, max: 100,
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
      labels: [CURRENT_USER ? CURRENT_USER.subjectName : 'Operating System'],
      datasets: [{
        label: 'Subject Attendance %',
        data: [0],
        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.45)' : 'rgba(29, 78, 216, 0.25)',
        borderColor: isDark ? '#3b82f6' : '#1d4ed8',
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
          min: 0, max: 100,
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

// ── 16. TOAST NOTIFICATION ───────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = `<i data-lucide="info" class="icon-sm"></i> <span>${escapeHtml(msg)}</span>`;
  t.classList.add('show');
  refreshIcons();
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── 17. ESCAPE KEY ACCESSIBILITY ─────────────────────────────
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

// ── 18. AUTHENTICATION & DEMO ACCOUNTS STATE ─────────────────
const DEMO_ACCOUNTS = {
  student: {
    id: '303302225048',
    pass: 'demo123',
    name: 'ARYANSH SHARMA',
    role: 'student',
    roll: '303302225048',
    sno: 46,
    enrollmentNumber: 'CE9524',
    dept: 'CSE',
    sem: 3,
    sec: 'A',
    email: 'aryansh.sharma@student.ssipmt.edu'
  },
  faculty: {
    id: 'faculty_os',
    pass: 'demo123',
    name: 'Devbrat Sahu',
    role: 'faculty',
    dept: 'CSE',
    assignedSubject: 'Operating System',
    assignedSections: ['A', 'B'],
    sectionAllocationStatus: 'Sections A, B Confirmed (Sections C, D Pending)'
  },
  faculty_dm: {
    id: 'faculty_dm',
    pass: 'demo123',
    name: 'Pranjali Sharma',
    role: 'faculty',
    dept: 'CSE',
    assignedSubject: 'Discrete Mathematics',
    assignedSections: ['A', 'B'],
    sectionAllocationStatus: 'Sections A, B Confirmed (Sections C, D Pending)'
  },
  faculty_oops: {
    id: 'faculty_oops',
    pass: 'demo123',
    name: 'Vaibhav Chandrakar',
    role: 'faculty',
    dept: 'CSE',
    assignedSubject: 'OOPS in C++',
    assignedSections: ['A', 'B'],
    sectionAllocationStatus: 'Sections A, B Confirmed (Sections C, D Pending)'
  },
  faculty_wt: {
    id: 'faculty_wt',
    pass: 'demo123',
    name: 'Suman K. Swarnkar',
    role: 'faculty',
    dept: 'CSE',
    assignedSubject: 'Web Technology',
    assignedSections: ['A', 'B'],
    sectionAllocationStatus: 'Sections A, B Confirmed (Sections C, D Pending)'
  },
  faculty_de: {
    id: 'faculty_de',
    pass: 'demo123',
    name: 'Navdeep Khare',
    role: 'faculty',
    dept: 'CSE',
    assignedSubject: 'Digital Electronics',
    assignedSections: ['A', 'B'],
    sectionAllocationStatus: 'Sections A, B Confirmed (Sections C, D Pending)'
  },
  hod: {
    id: 'hod_cse',
    pass: 'demo123',
    name: 'Anand Sir',
    role: 'hod',
    designation: 'Head of Department',
    dept: 'CSE',
    institution: 'SSIPMT, Raipur'
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
    if (role === 'student') uInput.placeholder = 'Student ID or Roll No. (e.g. 303302225048)';
    else if (role === 'faculty') uInput.placeholder = 'Faculty ID (e.g. faculty_os)';
    else if (role === 'hod') uInput.placeholder = 'HOD ID (e.g. hod_cse)';
  }
  const errEl = document.getElementById('login-error-msg');
  if (errEl) errEl.style.display = 'none';
}

function quickFillDemo(role) {
  setLoginRole(role);
  const demo = DEMO_ACCOUNTS[role] || DEMO_ACCOUNTS.faculty;
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

  // Check matching demo accounts or faculty accounts
  let matchedDemo = null;
  for (const [key, d] of Object.entries(DEMO_ACCOUNTS)) {
    const isHodAlias = (currentLoginRole === 'hod' && ['hod_cse', 'anand_sir', 'anand', 'anandsir', 'hod'].includes(username.toLowerCase()) && key === 'hod');
    if (
      (isHodAlias ||
       d.id.toLowerCase() === username.toLowerCase() ||
       (d.roll && d.roll.toUpperCase() === username.toUpperCase()) ||
       (d.name && d.name.toLowerCase() === username.toLowerCase())) &&
      d.role === currentLoginRole &&
      password === d.pass
    ) {
      matchedDemo = d;
      break;
    }
  }

  if (matchedDemo) {
    authenticated = true;
    sessionData = {
      role: matchedDemo.role,
      userId: matchedDemo.id,
      displayName: matchedDemo.name,
      dept: matchedDemo.dept,
      roll: matchedDemo.roll || null,
      sem: matchedDemo.sem || null,
      sec: matchedDemo.sec || null,
      assignedSubject: matchedDemo.assignedSubject || null
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
      const demo = DEMO_ACCOUNTS[currentLoginRole] || DEMO_ACCOUNTS.faculty;
      errEl.textContent = `Invalid credentials for ${currentLoginRole.toUpperCase()} role. Use evaluation account: ${demo.id} / ${demo.pass}`;
      errEl.style.display = 'block';
    }
  }
}


// ── PHASE 4: FACULTY AREA PROFILE SELECTION & NAVIGATION ─────
function openFacultyArea() {
  document.body.classList.remove('app-mode');
  document.body.classList.add('landing-mode');
  const homeView = document.getElementById('landing-home-view');
  const facView = document.getElementById('landing-faculty-view');
  if (homeView) homeView.style.display = 'none';
  if (facView) {
    facView.style.display = 'block';
    facView.scrollIntoView({ behavior: 'smooth' });
  }
  refreshIcons();
}

function closeFacultyArea() {
  const homeView = document.getElementById('landing-home-view');
  const facView = document.getElementById('landing-faculty-view');
  if (facView) facView.style.display = 'none';
  if (homeView) {
    homeView.style.display = 'block';
    homeView.scrollIntoView({ behavior: 'smooth' });
  }
  refreshIcons();
}

function selectFacultyProfile(facultyId) {
  // Normalize ID (support both hyphens and underscores)
  const normId = (facultyId || '').replace('_', '-');
  const faculty = AUTHORITATIVE_FACULTY.find(f => f.id === normId || f.id.replace('-', '_') === facultyId) || AUTHORITATIVE_FACULTY[0];

  CURRENT_USER = {
    role: 'faculty',
    facultyId: faculty.id,
    facultyName: faculty.name,
    subjectId: faculty.subjectId,
    subjectName: faculty.subjectName,
    sectionAllocationStatus: faculty.sectionAllocationStatus || 'Section allocation pending'
  };

  const sessionData = {
    role: 'faculty',
    userId: faculty.id,
    facultyId: faculty.id,
    displayName: faculty.name,
    facultyName: faculty.name,
    subjectId: faculty.subjectId,
    subjectName: faculty.subjectName,
    assignedSubject: faculty.subjectName,
    sectionAllocationStatus: faculty.sectionAllocationStatus || 'Section allocation pending',
    dept: 'CSE'
  };

  localStorage.setItem('smartattend_session', JSON.stringify(sessionData));
  applySessionUI(sessionData);
  showToast(`Active Faculty Profile: ${faculty.name} (${faculty.subjectName})`);
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
    if (userAvatar) userAvatar.textContent = (session.displayName || 'Aryansh Sharma').split(' ').map(w => w[0]).join('').slice(0, 2);
    if (userName) userName.textContent = session.displayName || 'Aryansh Sharma';
    if (userRole) userRole.textContent = `${session.roll || '303302225048'} · Sem ${session.sem || 3} (Sec ${session.sec || 'A'})`;
    if (breadcrumbPrefix) breadcrumbPrefix.textContent = 'Student Academic Portal';
    const topbarSwitchBtnStu = document.getElementById('topbar-switch-faculty-btn');
    if (topbarSwitchBtnStu) topbarSwitchBtnStu.style.display = 'none';
    showPage('student-dashboard', document.querySelector('#nav-group-student [data-page="student-dashboard"]'));
    renderStudentDashboard(session.roll);
  } else if (session.role === 'hod') {
    if (portalLabel) portalLabel.textContent = 'HOD Administration';
    if (userAvatar) userAvatar.textContent = 'AS';
    if (userName) userName.textContent = 'Anand Sir';
    if (userRole) userRole.textContent = 'Head of Department (CSE) · SSIPMT, Raipur';
    if (breadcrumbPrefix) breadcrumbPrefix.textContent = 'Department Administration · HOD Anand Sir';

    const topbarSwitchBtnHod = document.getElementById('topbar-switch-faculty-btn');
    if (topbarSwitchBtnHod) topbarSwitchBtnHod.style.display = 'none';

    // Update HOD greeting and identity
    const hodGreeting = document.getElementById('hod-greeting-title');
    if (hodGreeting) hodGreeting.textContent = 'Good morning, Anand Sir';

    showPage('hod-overview', document.querySelector('#nav-group-hod [data-page="hod-overview"]'));
    renderHodMasterTimetable('A');
    renderHodOverview();
  } else {
    // Faculty (Phase 4 Real Faculty Context)
    const normId = ((session.facultyId || session.userId || 'faculty-os')).replace('_', '-');
    const faculty = AUTHORITATIVE_FACULTY.find(f => f.id === normId || f.name === session.displayName || f.name === session.facultyName) || AUTHORITATIVE_FACULTY[0];

    CURRENT_USER = {
      role: 'faculty',
      facultyId: faculty.id,
      facultyName: faculty.name,
      subjectId: faculty.subjectId,
      subjectName: faculty.subjectName,
      subjectCodeShort: faculty.subjectCodeShort || 'OS',
      shortCode: faculty.shortCode || 'DS',
      assignedSections: faculty.assignedSections || ['A', 'B'],
      sectionAllocationStatus: faculty.sectionAllocationStatus || 'Sections A, B Confirmed (Sections C, D Pending)'
    };

    const initials = faculty.name.split(' ').map(w => w[0]).join('').slice(0, 2);

    if (portalLabel) portalLabel.textContent = 'Faculty Workspace';
    if (userAvatar) userAvatar.textContent = initials;
    if (userName) userName.textContent = faculty.name;
    if (userRole) userRole.textContent = `Faculty · ${faculty.subjectName}`;
    if (breadcrumbPrefix) breadcrumbPrefix.textContent = 'Faculty Workspace';

    // Topbar switch faculty button
    const topbarSwitchBtn = document.getElementById('topbar-switch-faculty-btn');
    if (topbarSwitchBtn) topbarSwitchBtn.style.display = 'inline-flex';

    // Faculty Dashboard Identity Header elements
    const dashTitle = document.getElementById('dash-greeting-title');
    if (dashTitle) dashTitle.textContent = `Good morning, ${faculty.name}`;

    const dashFacName = document.getElementById('dash-fac-name');
    if (dashFacName) dashFacName.textContent = faculty.name;

    const dashFacAvatar = document.getElementById('dash-fac-avatar');
    if (dashFacAvatar) dashFacAvatar.textContent = initials;

    const dashFacSubject = document.getElementById('dash-fac-subject');
    if (dashFacSubject) dashFacSubject.textContent = faculty.subjectName;

    const dashFacSecStatus = document.getElementById('dash-fac-sec-status');
    if (dashFacSecStatus) dashFacSecStatus.textContent = faculty.sectionAllocationStatus || 'Section allocation pending';

    // 4 Initial Dashboard Shell Cards (Section 6 Specification)
    const cardSubject = document.getElementById('card-fac-subject');
    if (cardSubject) cardSubject.textContent = faculty.subjectName;

    const cardTeacher = document.getElementById('card-fac-teacher');
    if (cardTeacher) cardTeacher.textContent = `Faculty: ${faculty.name}`;

    // My Subject page foundation
    const mySubTitle = document.getElementById('my-subject-title');
    if (mySubTitle) mySubTitle.textContent = `My Subject · ${faculty.subjectName}`;

    const mySubSubtitle = document.getElementById('my-subject-subtitle');
    if (mySubSubtitle) mySubSubtitle.textContent = `Curricular module overview · Faculty: ${faculty.name}`;

    const mySubCardName = document.getElementById('my-subject-card-name');
    if (mySubCardName) mySubCardName.textContent = faculty.subjectName;

    const mySubCardFaculty = document.getElementById('my-subject-card-faculty');
    if (mySubCardFaculty) mySubCardFaculty.textContent = faculty.name;

    // Set default in Take Attendance subject select
    const attSubjectSelect = document.getElementById('att-subject');
    if (attSubjectSelect) {
      for (let i = 0; i < attSubjectSelect.options.length; i++) {
        if (attSubjectSelect.options[i].value === faculty.subjectName) {
          attSubjectSelect.selectedIndex = i;
          break;
        }
      }
    }

    CURRENT_SCHEDULE_DAY = getSystemDayOfWeek();
    renderFacultySchedule(CURRENT_SCHEDULE_DAY);
    updateCurrentAndNextClassBanner();
    updateFacultyDashboardLiveMetrics();
    updateTakeAttendanceHeader();
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

// ── 19. STUDENT DASHBOARD RENDERER ───────────────────────────
function renderStudentDashboard(rollOrId) {
  let student = STUDENTS.find(s => s.roll === rollOrId || s.id === rollOrId || s.studentId === rollOrId) ||
                STUDENTS.find(s => s.roll === '303302225048') || STUDENTS[0];
  if (!student) return;

  const titleEl = document.getElementById('stu-welcome-title');
  const subEl = document.getElementById('stu-welcome-subtitle');
  if (titleEl) titleEl.textContent = `Good morning, ${student.name.split(' ')[0]}`;
  if (subEl) subEl.textContent = `Roll No: ${student.roll} · Department of Computer Science & Engineering · Semester ${student.sem} (Section ${student.sec || 'A'})`;

  const total = student.total || 0;
  const attended = student.attended || 0;
  const missed = student.absent || 0;
  const pct = student.pct !== null ? student.pct : null;

  const bannerEl = document.getElementById('stu-compliance-banner');
  if (bannerEl) {
    if (total === 0) {
      const hasHist = student.historicalSnapshot && student.historicalSnapshot.available;
      bannerEl.style.background = 'var(--surface-muted)';
      bannerEl.style.borderColor = 'var(--border)';
      bannerEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i data-lucide="info" class="icon-sm"></i>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 14.5px; color: var(--text-primary);">
              Academic Session Status: Pre-Commencement / Registered
            </div>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
              Enrolled in B.Tech CSE Semester 3 (Session July–Dec 2026, W.E.F. 27/07/2026). ${
                hasHist
                  ? `Previous Attendance Snapshot: <strong>${student.historicalSnapshot.attendancePercent}%</strong> (Section A Attendance Sheet).`
                  : 'Attendance compliance monitoring will begin after the first instructional lecture is recorded.'
              }
            </div>
          </div>
          <span class="badge" style="background: var(--surface); border: 1px solid var(--border); font-size: 12px; padding: 5px 10px;">
            ${hasHist ? 'SNAPSHOT: ' + student.historicalSnapshot.attendancePercent + '%' : 'PRE-COMMENCEMENT'}
          </span>
        </div>
      `;
    } else {
      const isCompliant = pct >= ATTENDANCE_THRESHOLD;
      const margin = (pct - ATTENDANCE_THRESHOLD).toFixed(1);
      bannerEl.style.background = isCompliant ? 'var(--success-subtle)' : 'var(--danger-subtle)';
      bannerEl.style.borderColor = isCompliant ? 'var(--success-border)' : 'var(--danger-border)';
      bannerEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: ${isCompliant ? 'var(--success)' : 'var(--danger)'}; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i data-lucide="${isCompliant ? 'check' : 'alert-circle'}" class="icon-sm"></i>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 14.5px; color: ${isCompliant ? 'var(--success-hover)' : 'var(--danger)'};">
              Examination Eligibility Status: ${isCompliant ? 'Eligible (≥ 75%)' : 'Below Threshold (< 75%)'}
            </div>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
              ${isCompliant
                ? `Your aggregate attendance rate of <strong>${pct}%</strong> complies with criteria. Safety margin: <strong>+${margin}%</strong>.`
                : `Your attendance rate of <strong>${pct}%</strong> is below the 75% threshold.`
              }
            </div>
          </div>
          <span class="badge ${isCompliant ? 'badge-ok' : 'badge-risk'}" style="font-size: 12px; padding: 5px 10px;">
            ${isCompliant ? 'IN COMPLIANCE' : 'BELOW THRESHOLD'}
          </span>
        </div>
      `;
    }
  }

  const gaugePct = document.getElementById('stu-gauge-pct');
  const gaugeCircle = document.getElementById('stu-circle-prog');
  const attCount = document.getElementById('stu-attended-count');
  const missCount = document.getElementById('stu-missed-count');
  const totCount = document.getElementById('stu-total-count');
  const threshFill = document.getElementById('stu-threshold-fill');

  if (gaugePct) gaugePct.textContent = pct !== null ? `${pct}%` : '--';
  if (gaugeCircle) {
    gaugeCircle.setAttribute('stroke-dasharray', pct !== null ? `${pct}, 100` : '0, 100');
    gaugeCircle.setAttribute('stroke', (pct !== null && pct >= ATTENDANCE_THRESHOLD) ? 'var(--primary)' : 'var(--text-muted)');
  }
  if (attCount) attCount.textContent = attended;
  if (missCount) missCount.textContent = missed;
  if (totCount) totCount.textContent = total;
  if (threshFill) {
    threshFill.style.width = pct !== null ? `${Math.min(100, pct)}%` : '0%';
    threshFill.style.background = (pct !== null && pct >= ATTENDANCE_THRESHOLD) ? 'var(--success)' : 'var(--primary)';
  }

  // Dynamic Academic Advisory
  const advEl = document.getElementById('stu-advisory-desc');
  if (advEl) {
    if (total === 0) {
      advEl.innerHTML = `<strong>Term Advisory:</strong> Departmental lectures for 3rd Semester 2026 are preparing to commence. Attend all upcoming instructional sessions in your 5 core modules (<strong>Operating System, Discrete Mathematics, OOPS in C++, Web Technology, Digital Electronics</strong>) to build a solid compliance record early in the term.`;
    } else if (pct >= ATTENDANCE_THRESHOLD) {
      advEl.innerHTML = `Based on your attendance consistency over <strong>${total} completed instructional sessions</strong>, you maintain an aggregate safety margin above the 75% threshold.`;
    } else {
      advEl.innerHTML = `<strong>Attention Required:</strong> Your current attendance is below the 75% threshold. Regular attendance is required before semester examination registration.`;
    }
  }

  // Render Subject Cards strictly from 5 official subjects and faculty
  const subContainer = document.getElementById('stu-subjects-container');
  if (subContainer) {
    subContainer.innerHTML = OFFICIAL_SUBJECTS.map((subj, idx) => {
      const fac = getFacultyForSubject(subj);
      return `
        <div class="student-sub-card">
          <div class="sub-card-top">
            <div>
              <span class="sub-card-code">CSE-30${idx + 1}</span>
              <div class="sub-card-name">${escapeHtml(subj)}</div>
              <div class="sub-card-faculty">Faculty: <strong>${escapeHtml(fac)}</strong></div>
            </div>
            <span class="badge" style="background: var(--surface-muted); color: var(--text-secondary); border: 1px solid var(--border);">PENDING SESSIONS</span>
          </div>
          <div class="sub-prog-wrap">
            <div class="sub-prog-meta">
              <span>0 Attended / 0 Held</span>
              <strong style="color: var(--text-muted);">--</strong>
            </div>
            <div class="sub-prog-track">
              <div class="sub-prog-fill" style="width: 0%; background: var(--primary);"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Student History Table
  const histBody = document.getElementById('stu-history-body');
  if (histBody) {
    histBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">No attendance history recorded yet for 3rd Semester 2026.</td></tr>`;
  }
  refreshIcons();
}

// ── 20. HOD OVERVIEW RENDERER ────────────────────────────────
function renderHodOverview() {
  const statStudents = document.getElementById('hod-stat-students');
  if (statStudents) statStudents.textContent = STUDENTS.length; // 252

  // Curriculum Health table (5 Official Curricular Subjects)
  const healthBody = document.getElementById('hod-health-body');
  if (healthBody) {
    healthBody.innerHTML = OFFICIAL_SUBJECTS.map((subj, idx) => {
      const fac = getFacultyForSubject(subj);
      return `
        <tr>
          <td><strong>${escapeHtml(subj)}</strong> <span style="font-size:11px; color:var(--text-muted);">(Core Module)</span></td>
          <td><strong>${escapeHtml(fac)}</strong></td>
          <td>0 / 0 sessions</td>
          <td><span style="font-weight:700; color: var(--text-muted);">--</span></td>
          <td><span class="badge" style="background:var(--surface-muted); color:var(--text-secondary); border:1px solid var(--border);">0 students</span></td>
          <td><span class="badge" style="background:var(--surface-muted); color:var(--text-secondary); border:1px solid var(--border);">PENDING</span></td>
        </tr>
      `;
    }).join('');
  }

  // Flagged Students At Risk table
  const riskBody = document.getElementById('hod-risk-body');
  if (riskBody) {
    const atRiskStudents = STUDENTS.filter(s => s.pct !== null && s.pct < ATTENDANCE_THRESHOLD);
    if (atRiskStudents.length === 0) {
      riskBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">No students currently flagged at risk. Department attendance register is in pre-commencement status.</td></tr>`;
    } else {
      riskBody.innerHTML = atRiskStudents.map(s => {
        const needed = calculateSessionsNeededToReachThreshold(s.attended, s.total);
        return `
          <tr>
            <td>
              <button type="button" class="student-link-btn" onclick="openStudentProfile(${s.id})">
                <strong>${escapeHtml(s.name)}</strong>
                <i data-lucide="external-link" style="width: 12px; height: 12px; opacity: 0.6;"></i>
              </button>
            </td>
            <td><code>${escapeHtml(s.roll)}</code></td>
            <td>${escapeHtml(s.dept)} &middot; Section ${escapeHtml(s.sec || 'A')}</td>
            <td><span style="font-weight:700; color: var(--danger);">${s.pct}%</span></td>
            <td>${needed} sessions needed</td>
            <td><span class="badge badge-risk">${s.risk}</span></td>
            <td style="text-align: right;">
              <button class="btn btn-outline btn-sm" onclick="showToast('Notice prepared for ${escapeHtml(s.name)} (${s.roll})')">
                <i data-lucide="send" class="icon-sm"></i>
                <span>Send Notice</span>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  initHodChart();
  refreshIcons();
}

// ── 21. DATA VALIDATION LAYER ────────────────────────────────
function validateAcademicUniverse() {
  const issues = [];

  // 1. Department & Semester verification
  STUDENTS.forEach(s => {
    if (!s.dept || s.dept !== 'CSE') issues.push(`Invalid dept for student ${s.roll}`);
    if (s.sem !== 3) issues.push(`Invalid sem ${s.sem} for student ${s.roll}`);
    if (!['A', 'B', 'C', 'D'].includes(s.sec)) issues.push(`Invalid sec ${s.sec} for student ${s.roll}`);
  });

  // 2. Count checks: 252 total students (A: 60, B: 59, C: 66, D: 67)
  if (STUDENTS.length !== 252) issues.push(`Expected 252 students, got ${STUDENTS.length}`);
  const secA = STUDENTS.filter(s => s.sec === 'A').length;
  const secB = STUDENTS.filter(s => s.sec === 'B').length;
  const secC = STUDENTS.filter(s => s.sec === 'C').length;
  const secD = STUDENTS.filter(s => s.sec === 'D').length;

  if (secA !== 60) issues.push(`Expected 60 Section A students, got ${secA}`);
  if (secB !== 59) issues.push(`Expected 59 Section B students, got ${secB}`);
  if (secC !== 66) issues.push(`Expected 66 Section C students, got ${secC}`);
  if (secD !== 67) issues.push(`Expected 67 Section D students, got ${secD}`);

  // 3. Roll number uniqueness
  const rollSet = new Set();
  STUDENTS.forEach(s => {
    if (rollSet.has(s.roll)) issues.push(`Duplicate roll number detected: ${s.roll}`);
    rollSet.add(s.roll);
  });

  // 4. Aryansh Sharma verification in real roster (Section A, S.No 46, Roll 303302225048)
  const aryansh = STUDENTS.find(s => s.roll === '303302225048');
  if (!aryansh) {
    issues.push('Aryansh Sharma (303302225048) missing from Section A roster');
  } else {
    if (aryansh.sec !== 'A') issues.push(`Aryansh section expected A, got ${aryansh.sec}`);
    if (aryansh.sem !== 3) issues.push(`Aryansh semester expected 3, got ${aryansh.sem}`);
    if (aryansh.sno !== 46) issues.push(`Aryansh S.No expected 46, got ${aryansh.sno}`);
    if (!aryansh.historicalSnapshot || aryansh.historicalSnapshot.attendancePercent !== 97) {
      issues.push(`Aryansh historical snapshot expected 97%, got ${aryansh.historicalSnapshot ? aryansh.historicalSnapshot.attendancePercent : 'null'}`);
    }
  }

  // 5. Verification of Section-A Historical Attendance Snapshot (exactly 60 students matched)
  const secAWithSnapshot = STUDENTS.filter(s => s.sec === 'A' && s.historicalSnapshot && s.historicalSnapshot.available);
  if (secAWithSnapshot.length !== 60) {
    issues.push(`Expected exactly 60 Section A students with historical snapshots, got ${secAWithSnapshot.length}`);
  }
  const nonSecAWithSnapshot = STUDENTS.filter(s => s.sec !== 'A' && s.historicalSnapshot && s.historicalSnapshot.available);
  if (nonSecAWithSnapshot.length !== 0) {
    issues.push(`Expected 0 non-Section-A students with historical snapshots, got ${nonSecAWithSnapshot.length}`);
  }

  const secABelowThresh = secAWithSnapshot.filter(s => s.historicalSnapshot.attendancePercent < 75).length;
  const secAAtOrAboveThresh = secAWithSnapshot.filter(s => s.historicalSnapshot.attendancePercent >= 75).length;
  if (secABelowThresh !== 40) issues.push(`Expected 40 Section A students below 75% threshold, got ${secABelowThresh}`);
  if (secAAtOrAboveThresh !== 20) issues.push(`Expected 20 Section A students >= 75% threshold, got ${secAAtOrAboveThresh}`);

  // 6. Verification of Section-A Historical Extremes & Aggregate Values
  const secAPcts = secAWithSnapshot.map(s => s.historicalSnapshot.attendancePercent);
  const maxSecAPct = Math.max(...secAPcts);
  const minSecAPct = Math.min(...secAPcts);
  const sumSecAPct = secAPcts.reduce((a, b) => a + b, 0);
  const avgSecAPct = Number((sumSecAPct / secAPcts.length).toFixed(1));

  if (maxSecAPct !== 100) issues.push(`Expected Section A highest historical attendance 100%, got ${maxSecAPct}%`);
  if (minSecAPct !== 0) issues.push(`Expected Section A lowest historical attendance 0%, got ${minSecAPct}%`);
  if (sumSecAPct !== 3888) issues.push(`Expected Section A historical sum 3888, got ${sumSecAPct}`);
  if (avgSecAPct !== 64.8) issues.push(`Expected Section A historical average 64.8%, got ${avgSecAPct}%`);

  // 7. Verification of the two distinct Rahul Kumar students in Section C
  const rahuls = STUDENTS.filter(s => s.name === 'RAHUL KUMAR' && s.sec === 'C');
  if (rahuls.length !== 2) {
    issues.push(`Expected 2 RAHUL KUMAR students in Section C, found ${rahuls.length}`);
  } else {
    const r1 = rahuls.find(r => r.roll === '303302225180');
    const r2 = rahuls.find(r => r.roll === '303302225181');
    if (!r1 || !r2) issues.push('Rahul Kumar roll number mapping mismatch');
  }

  // 8. Verification of 5 Official Subjects and Faculty
  const expectedFacultySubjects = {
    'Operating System': 'Devbrat Sahu',
    'Discrete Mathematics': 'Pranjali Sharma',
    'OOPS in C++': 'Vaibhav Chandrakar',
    'Web Technology': 'Suman K. Swarnkar',
    'Digital Electronics': 'Navdeep Khare'
  };
  for (const [subj, expectedFac] of Object.entries(expectedFacultySubjects)) {
    const mappedFac = getFacultyForSubject(subj);
    if (mappedFac !== expectedFac) {
      issues.push(`Subject "${subj}" mapped to "${mappedFac}", expected "${expectedFac}"`);
    }
  }

  // 9. Zero test contamination / pristine live session baseline
  if (SESSIONS_DATA.length !== 0) {
    issues.push(`Expected 0 initial live sessions in SESSIONS_DATA, got ${SESSIONS_DATA.length}`);
  }
  if (typeof LIVE_ATTENDANCE_RECORDS !== 'undefined' && LIVE_ATTENDANCE_RECORDS.length !== 0) {
    issues.push(`Expected 0 initial live records in LIVE_ATTENDANCE_RECORDS, got ${LIVE_ATTENDANCE_RECORDS.length}`);
  }
  if (RECENT_ATTENDANCE_LOGS.length !== 0) {
    issues.push(`Expected 0 initial logs in RECENT_ATTENDANCE_LOGS, got ${RECENT_ATTENDANCE_LOGS.length}`);
  }

  // 10. Centralized threshold constant verification
  if (ATTENDANCE_THRESHOLD !== 75) issues.push(`ATTENDANCE_THRESHOLD expected 75, got ${ATTENDANCE_THRESHOLD}`);

  if (issues.length > 0) {
    console.error('[SmartAttend Phase 3.1 Validation Errors]', issues);
  } else {
      // Verify HOD Anand Sir identity
  const hodAccount = DEMO_ACCOUNTS.hod;
  if (!hodAccount || hodAccount.name !== 'Anand Sir' || hodAccount.role !== 'hod') {
    issues.push('HOD account mismatch: expected Anand Sir with role hod');
  }

  // Verify Anand Sir is NOT inside AUTHORITATIVE_FACULTY
  const anandInFaculty = AUTHORITATIVE_FACULTY.find(f => f.name.toLowerCase().includes('anand'));
  if (anandInFaculty) {
    issues.push('Anand Sir must not be in AUTHORITATIVE_FACULTY');
  }

  console.log('[SmartAttend Validation] Phase 3.1 Data Integrity Verified: 252 students (A:60, B:59, C:66, D:67), 60 Section-A historical records (Max: 100%, Min: 0%, Avg: 64.8%), 0 live sessions, 0 test contamination.');
  }
}



function renderStudentDashboard(roll) {
  const student = (STUDENTS || []).find(s => s.roll === roll || s.studentId === roll) || STUDENTS[0];
  if (!student) return;

  const welcomeTitle = document.getElementById('stu-welcome-title');
  const welcomeSub = document.getElementById('stu-welcome-subtitle');
  if (welcomeTitle) welcomeTitle.textContent = `Good morning, ${student.name.split(' ')[0]}`;
  if (welcomeSub) welcomeSub.textContent = `Roll No: ${student.roll} · S.No #${student.sno || '—'} · Computer Science & Engineering · Semester ${student.sem} (Section ${student.sec})`;

  // Calculate live completed sessions for student's section
  const sectionCompleted = SESSIONS_DATA.filter(s => s.status === 'completed' && s.sec === student.sec);
  const totalCompleted = sectionCompleted.length;

  let attendedCount = 0;
  let missedCount = 0;
  const historyRows = [];

  sectionCompleted.forEach(sess => {
    const liveRec = (typeof LIVE_ATTENDANCE_RECORDS !== 'undefined')
      ? LIVE_ATTENDANCE_RECORDS.find(r => r.id === sess.id || (r.lectureNo === sess.lectureNo && r.subject === sess.subject && r.sec === sess.sec))
      : null;

    let status = 'ABSENT';
    let markedAt = sess.completedAt || sess.time || '—';

    if (liveRec && liveRec.studentRecords) {
      const sr = liveRec.studentRecords.find(r => r.roll === student.roll || r.studentId === student.id || r.studentId === student.roll);
      if (sr) {
        status = (sr.status || '').toUpperCase() === 'PRESENT' ? 'PRESENT' : 'ABSENT';
        markedAt = sr.markedAt || markedAt;
      }
    }

    if (status === 'PRESENT') {
      attendedCount++;
    } else {
      missedCount++;
    }

    historyRows.push({
      date: sess.date || 'Today',
      time: markedAt,
      subject: sess.subjectName || sess.course || sess.subject,
      lectureNo: sess.lectureNumber || sess.lectureNo || 1,
      period: sess.period || 'I',
      faculty: sess.facultyName || sess.faculty || 'Devbrat Sahu',
      room: sess.room || 'Classroom 301',
      status: status,
      markedAt: markedAt
    });
  });

  const livePct = totalCompleted > 0 ? Number(((attendedCount / totalCompleted) * 100).toFixed(1)) : null;

  // Update gauge and hero stats
  const gaugePct = document.getElementById('stu-gauge-pct');
  const circleProg = document.getElementById('stu-circle-prog');
  const attCountEl = document.getElementById('stu-attended-count');
  const missCountEl = document.getElementById('stu-missed-count');
  const totalCountEl = document.getElementById('stu-total-count');
  const threshFill = document.getElementById('stu-threshold-fill');

  if (gaugePct) gaugePct.textContent = livePct !== null ? `${livePct}%` : '--';
  if (circleProg) circleProg.setAttribute('stroke-dasharray', `${livePct || 0}, 100`);
  if (attCountEl) attCountEl.textContent = attendedCount;
  if (missCountEl) missCountEl.textContent = missedCount;
  if (totalCountEl) totalCountEl.textContent = totalCompleted;
  if (threshFill) threshFill.style.width = `${Math.min(100, livePct || 0)}%`;

  // Update 5 Core Subject Breakdown
  const subjContainer = document.getElementById('stu-subjects-container');
  if (subjContainer) {
    subjContainer.innerHTML = OFFICIAL_SUBJECTS.map(subj => {
      const subjSessions = sectionCompleted.filter(s => (s.subject === subj || s.course === subj || s.subjectName === subj));
      const sCompleted = subjSessions.length;
      let sAttended = 0;

      subjSessions.forEach(sess => {
        const liveRec = (typeof LIVE_ATTENDANCE_RECORDS !== 'undefined')
          ? LIVE_ATTENDANCE_RECORDS.find(r => r.id === sess.id || (r.lectureNo === sess.lectureNo && r.subject === sess.subject && r.sec === sess.sec))
          : null;
        if (liveRec && liveRec.studentRecords) {
          const sr = liveRec.studentRecords.find(r => r.roll === student.roll || r.studentId === student.roll);
          if (sr && (sr.status || '').toUpperCase() === 'PRESENT') sAttended++;
        }
      });

      const sAbsent = sCompleted - sAttended;
      const sPct = sCompleted > 0 ? Number(((sAttended / sCompleted) * 100).toFixed(1)) : null;
      const sPctDisplay = sPct !== null ? `${sPct}%` : '--';
      const isEligible = sPct !== null && sPct >= ATTENDANCE_THRESHOLD;

      return `
        <div class="card" style="padding: 16px; border: 1px solid var(--border); background: var(--surface);">
          <div style="font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase;">${escapeHtml(subj)}</div>
          <div style="font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 6px 0 2px;">${sPctDisplay}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">
            ${sCompleted > 0 ? `${sAttended} Attended / ${sCompleted} Held` : 'No live sessions recorded yet'}
          </div>
          <div style="margin-top: 10px;">
            <span class="badge ${sPct === null ? '' : (isEligible ? 'badge-ok' : 'badge-risk')}" style="${sPct === null ? 'background: var(--surface-muted); color: var(--text-muted); border: 1px solid var(--border);' : ''} font-size: 11px;">
              ${sPct === null ? 'Pending Sessions' : (isEligible ? 'Eligible (≥ 75%)' : 'Below Threshold (< 75%)')}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Update Personal Attendance History Table
  const historyTbody = document.getElementById('stu-history-body');
  if (historyTbody) {
    if (historyRows.length === 0) {
      historyTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">
            No live instructional sessions recorded yet. Attendance logs will populate as teachers conduct class.
          </td>
        </tr>
      `;
    } else {
      historyTbody.innerHTML = historyRows.map(r => `
        <tr>
          <td>${escapeHtml(r.date)}</td>
          <td><code>${escapeHtml(r.markedAt)}</code></td>
          <td><strong>${escapeHtml(r.subject)}</strong> (Lecture ${r.lectureNo} &middot; Period ${r.period})</td>
          <td>${escapeHtml(r.faculty)}</td>
          <td>${escapeHtml(r.room)}</td>
          <td><span class="badge ${r.status === 'PRESENT' ? 'badge-present' : 'badge-absent'}">${r.status}</span></td>
        </tr>
      `).join('');
    }
  }

  refreshIcons();
}

function renderHodMasterTimetable(section = 'A') {
  const tbody = document.getElementById('hod-master-timetable-body');
  const btnA = document.getElementById('hod-tt-btn-secA');
  const btnB = document.getElementById('hod-tt-btn-secB');

  if (btnA && btnB) {
    btnA.className = section === 'A' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
    btnB.className = section === 'B' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
  }

  if (!tbody || typeof TIMETABLE_ENTRIES === 'undefined') return;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periods = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

  const rowsHtml = days.map(day => {
    const entries = TIMETABLE_ENTRIES.filter(e => e.section === section && e.day === day);
    const cells = periods.map(p => {
      const match = entries.find(e => {
        if (e.period === p) return true;
        if (e.periodStart && e.periodEnd) {
          const pIndexMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8 };
          const pNum = pIndexMap[p];
          return pNum >= e.periodStart && pNum <= e.periodEnd;
        }
        return false;
      });

      if (!match) {
        return `<td style="color: var(--text-muted); font-size: 11px; text-align: center;">&mdash;</td>`;
      }

      const isLab = match.type === 'lab';
      return `
        <td style="font-size: 11.5px; vertical-align: top; background: ${isLab ? 'rgba(234, 88, 12, 0.05)' : 'transparent'}; padding: 8px;">
          <div style="font-weight: 700; color: ${isLab ? 'var(--warning)' : 'var(--primary)'};">${escapeHtml(match.subjectCodeShort)}</div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">${escapeHtml(match.facultyShort)}</div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 1px;">${escapeHtml(match.room)}</div>
        </td>
      `;
    }).join('');

    return `
      <tr>
        <td style="font-weight: 700; color: var(--text-primary); font-size: 12px; white-space: nowrap;">${day}</td>
        ${cells}
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rowsHtml;
}

// ── 22. DOM READY INITIALIZATION ─────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initAuth();
  updateDate();
  renderStudents(STUDENTS);
  renderRecentAttendanceLogs();
  renderSessions();
  generateReport();
  validateAcademicUniverse();
  refreshIcons();
});
