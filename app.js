// ============================================================
//  SMARTATTEND — Production-Grade Departmental Application
//  Frontend Architecture: Vanilla ES6+, Enterprise SaaS Standard
//  Authoritative Academic Domain Model & Calculations Engine
// ============================================================

'use strict';

// ── CANONICAL BACKEND API CLIENT (SPRING BOOT 3 + MYSQL 8.0) ──
const API_BASE = 'http://localhost:8080/api';
const AUTH_TOKEN_KEY = 'smartattend_token';
const AUTH_SESSION_KEY = 'smartattend_session';

/**
 * Global token helpers
 */
function getStoredAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY) || null;
}

function setStoredAuthToken(token, remember = true) {
  if (remember) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } else {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

function clearAuthTokens() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_SESSION_KEY);
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}

/**
 * Centralized API Client
 * Supports: GET, POST, PUT, DELETE
 * Automatically attaches Authorization: Bearer <JWT>
 * Handles 401 Unauthorized globally by clearing credentials
 */
const apiClient = {
  async request(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;

    const headers = Object.assign({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }, options.headers || {});

    const token = getStoredAuthToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method: (options.method || 'GET').toUpperCase(),
      headers
    };

    if (options.body && config.method !== 'GET' && config.method !== 'HEAD') {
      config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    let response;
    try {
      response = await fetch(url, config);
    } catch (networkErr) {
      const err = new Error(`Connection to backend failed at ${API_BASE}. Please verify that the Spring Boot server is running.`);
      err.status = 0;
      err.isNetworkError = true;
      throw err;
    }

    // 401 Unauthorized: token expired or invalid credentials
    if (response.status === 401) {
      if (token) {
        clearAuthTokens();
      }
      let errPayload = null;
      try { errPayload = await response.json(); } catch (_) {}
      const err = new Error((errPayload && errPayload.message) || 'Unauthorized: Invalid credentials or session expired.');
      err.status = 401;
      err.data = errPayload;
      throw err;
    }

    if (!response.ok) {
      let errPayload = null;
      try { errPayload = await response.json(); } catch (_) {}
      const msg = (errPayload && errPayload.message) || `Request failed with HTTP status ${response.status}`;
      const err = new Error(msg);
      err.status = response.status;
      err.data = errPayload;
      throw err;
    }

    if (response.status === 204) {
      return null;
    }

    try {
      return await response.json();
    } catch (_) {
      return null;
    }
  },

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  },

  post(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'POST', body, headers });
  },

  put(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'PUT', body, headers });
  },

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
};
window.apiClient = apiClient;

// ── CANONICAL ACADEMIC DATA SERVICE & ADAPTER LAYER (PHASE 7C.2) ──
const AcademicDataService = {
  isLoaded: false,
  isLoading: false,

  /**
   * STEP 8 Adapter: StudentDto -> Canonical Frontend Student Record
   * Preserves roll number as authoritative identity and keeps Section A historical snapshots intact.
   */
  adaptStudent(dto, index = 0) {
    const attended = (dto.attendance && dto.attendance.attendedLectures !== undefined) ? dto.attendance.attendedLectures : 0;
    const total = (dto.attendance && dto.attendance.totalLectures !== undefined) ? dto.attendance.totalLectures : 0;
    const absent = Math.max(0, total - attended);
    const pct = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : null;
    const pctDisplay = pct !== null ? `${pct}%` : '--';
    const status = total > 0 ? (pct >= ATTENDANCE_THRESHOLD ? 'COMPLIANT' : 'BELOW THRESHOLD') : 'NO RECORDS';
    const risk = total > 0 ? calculateRisk(pct) : 'PENDING';

    // Preserve historical attendance snapshot if available in existing dataset (Section A)
    const existingRaw = (typeof RAW_STUDENTS !== 'undefined' && RAW_STUDENTS.length > 0)
      ? RAW_STUDENTS.find(rs => (rs.rollNumber || rs.roll) === dto.rollNumber)
      : ((typeof AUTHORITATIVE_STUDENTS !== 'undefined')
          ? AUTHORITATIVE_STUDENTS.find(rs => (rs.rollNumber || rs.roll) === dto.rollNumber)
          : null);
    const historicalSnapshot = dto.historicalSnapshot || (existingRaw && existingRaw.historicalSnapshot) || null;
    const sno = (existingRaw && existingRaw.sno) ? existingRaw.sno : (dto.sno || (index + 1));
    const studentId = dto.studentId || (existingRaw && existingRaw.studentId) || dto.rollNumber;
    const enrollmentNumber = dto.enrollmentNumber || (existingRaw && existingRaw.enrollmentNumber) || null;

    return {
      ...dto,
      id: dto.id,
      studentId,
      sno,
      roll: dto.rollNumber,
      rollNumber: dto.rollNumber,
      name: dto.name,
      sem: dto.semester || 3,
      semester: dto.semester || 3,
      sec: dto.section,
      section: dto.section,
      dept: dto.department || 'CSE',
      department: dto.department || 'CSE',
      enrollmentNumber,
      enrollmentStatus: dto.enrollmentStatus || 'verified',
      admissionType: dto.admissionType || 'regular',
      attended,
      absent,
      total,
      pct,
      pctDisplay,
      risk,
      status,
      historicalSnapshot,
      safeAbsences: total > 0 ? calculatePermissibleAbsences(attended, total) : 0,
      sessionsNeeded: total > 0 ? calculateSessionsNeededToReachThreshold(attended, total) : 0
    };
  },

  /**
   * STEP 8 Adapter: FacultyDto -> Canonical Frontend Faculty Record
   * Maps 5 primary teaching faculty correctly; ensures HOD Dr. Anand Tamrakar remains HOD and not teaching faculty.
   */
  adaptFaculty(dto) {
    const normId = (dto.facultyCode || '').replace('_', '-');
    const primarySubject = (dto.assignedSubjects && dto.assignedSubjects[0]) || 'Operating System';
    const initials = (dto.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const shortCodeMap = {
      'faculty_os': 'DS',
      'faculty_dm': 'PS',
      'faculty_oops': 'VC',
      'faculty_web': 'SS',
      'faculty_de': 'NK'
    };
    const subjectShortMap = {
      'faculty_os': 'OS',
      'faculty_dm': 'DM',
      'faculty_oops': 'OOPS',
      'faculty_web': 'WT',
      'faculty_de': 'DELD'
    };
    const cleanSubjectMap = {
      'faculty_os': 'Operating System',
      'faculty_dm': 'Discrete Mathematics',
      'faculty_oops': 'OOPS in C++',
      'faculty_web': 'Web Technology',
      'faculty_de': 'Digital Electronics'
    };

    const finalSubject = cleanSubjectMap[dto.facultyCode] || primarySubject;
    const finalShortCode = shortCodeMap[dto.facultyCode] || initials;
    const finalSubjectCodeShort = subjectShortMap[dto.facultyCode] || 'CSE';

    return {
      id: normId,
      facultyId: dto.id,
      facultyCode: dto.facultyCode,
      name: dto.name,
      email: dto.email,
      role: dto.role,
      designation: dto.designation || 'Assistant Professor',
      department: dto.department || 'CSE',
      subjectName: finalSubject,
      subjectId: finalSubject.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      subjectCodeShort: finalSubjectCodeShort,
      shortCode: finalShortCode,
      assignedSubject: finalSubject,
      assignedSubjectId: dto.id,
      assignedSubjects: dto.assignedSubjects || [finalSubject],
      assignedSections: dto.assignedSections || ['A', 'B'],
      sectionAllocationStatus: (dto.assignedSections && dto.assignedSections.length > 0)
        ? `Sections ${dto.assignedSections.join(', ')} Confirmed (Sections C, D Pending)`
        : 'Section allocation pending'
    };
  },

  /**
   * STEP 8 Adapter: TimetableDto -> Canonical Frontend Timetable Entry
   * Preserves published tt-b-wed-55 entry exactly as supplied by backend without rewriting Anand Sir's conflict.
   */
  adaptTimetableEntry(dto) {
    const initials = (dto.facultyName || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const cleanPeriod = (dto.period || '').replace(/\?+/g, '–');
    return {
      id: dto.timetableCode || `tt-${dto.id}`,
      timetableCode: dto.timetableCode,
      section: dto.section,
      day: dto.day,
      dayIndex: dto.dayIndex,
      period: cleanPeriod,
      periodLabel: `Period ${cleanPeriod}`,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      startTime: dto.startTime,
      endTime: dto.endTime,
      timeDisplay: dto.timeDisplay || `${dto.startTime} – ${dto.endTime}`,
      subject: dto.subjectName,
      subjectName: dto.subjectName,
      subjectCodeShort: dto.subjectCodeShort,
      subjectKey: (dto.subjectName || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
      faculty: dto.facultyName,
      facultyName: dto.facultyName,
      facultyShort: initials,
      facultyId: dto.facultyId,
      type: dto.type || 'lecture',
      room: dto.room || 'Room 201',
      effectiveDate: dto.effectiveDate || '17/08/2026'
    };
  },

  /**
   * Centralized Academic Data loader connecting to all Step 3-7 REST endpoints:
   * - GET /api/students (or by section)
   * - GET /api/faculty
   * - GET /api/subjects?primaryOnly=true
   * - GET /api/timetable?section=A / B / C / D
   */
  async loadAllAcademicData() {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      // 1. Fetch Authoritative Students (GET /api/students)
      const studentsData = await apiClient.get('/students');
      if (Array.isArray(studentsData) && studentsData.length > 0) {
        STUDENTS.length = 0;
        studentsData.forEach((s, idx) => STUDENTS.push(this.adaptStudent(s, idx)));

        // Rebuild student lookup map in-place
        for (const k in STUDENT_MAP) delete STUDENT_MAP[k];
        STUDENTS.forEach(s => {
          if (s.roll) STUDENT_MAP[s.roll] = s;
          if (s.id !== undefined) STUDENT_MAP[s.id] = s;
          if (s.studentId) STUDENT_MAP[s.studentId] = s;
        });
        console.log(`[AcademicDataService] Loaded ${STUDENTS.length} authoritative students from Spring Boot`);
      }

      // 2. Fetch Authoritative Faculty (GET /api/faculty)
      const facultyData = await apiClient.get('/faculty');
      if (Array.isArray(facultyData) && facultyData.length > 0) {
        AcademicDataService.allFaculty = facultyData;
        if (typeof AUTHORITATIVE_FACULTY !== 'undefined') {
          AUTHORITATIVE_FACULTY.length = 0;
          // Step 4: Verify 13 faculty exist; map 5 primary teaching faculty; Anand Sir remains HOD
          const primaryFacultyCodes = ['faculty_os', 'faculty_dm', 'faculty_oops', 'faculty_web', 'faculty_de'];
          facultyData
            .filter(f => primaryFacultyCodes.includes(f.facultyCode))
            .forEach(f => {
              AUTHORITATIVE_FACULTY.push(this.adaptFaculty(f));
            });
        }
        console.log(`[AcademicDataService] Loaded ${facultyData.length} faculty from Spring Boot (teaching staff: ${AUTHORITATIVE_FACULTY.length})`);
      }

      // 3. Fetch Primary Subjects (GET /api/subjects?primaryOnly=true)
      const subjectsData = await apiClient.get('/subjects?primaryOnly=true');
      if (Array.isArray(subjectsData) && subjectsData.length > 0) {
        OFFICIAL_SUBJECTS.length = 0;
        subjectsData.forEach(s => OFFICIAL_SUBJECTS.push(s.name));
        console.log(`[AcademicDataService] Loaded ${subjectsData.length} primary subjects from Spring Boot`);
      }

      // 4. Fetch Timetable Entries (GET /api/timetable?section=A & section=B)
      const [ttA, ttB, ttC, ttD] = await Promise.all([
        apiClient.get('/timetable?section=A').catch(() => []),
        apiClient.get('/timetable?section=B').catch(() => []),
        apiClient.get('/timetable?section=C').catch(() => []),
        apiClient.get('/timetable?section=D').catch(() => [])
      ]);

      if (Array.isArray(ttA) && Array.isArray(ttB)) {
        if (typeof TIMETABLE_ENTRIES !== 'undefined') {
          TIMETABLE_ENTRIES.length = 0;
          ttA.forEach(e => TIMETABLE_ENTRIES.push(this.adaptTimetableEntry(e)));
          ttB.forEach(e => TIMETABLE_ENTRIES.push(this.adaptTimetableEntry(e)));
        }
        console.log(`[AcademicDataService] Loaded ${TIMETABLE_ENTRIES.length} timetable entries (Sec A: ${ttA.length}, Sec B: ${ttB.length}, Sec C: ${ttC.length}, Sec D: ${ttD.length})`);
      }

      this.isLoaded = true;

      // Re-render UI components with authoritative backend data
      if (typeof renderStudents === 'function') renderStudents(STUDENTS);
      if (typeof updateFacultyDashboardLiveMetrics === 'function') updateFacultyDashboardLiveMetrics();
      if (typeof renderHodOverview === 'function') renderHodOverview();
      if (typeof renderHodMasterTimetable === 'function') renderHodMasterTimetable(typeof CURRENT_DASHBOARD_SECTION !== 'undefined' ? CURRENT_DASHBOARD_SECTION : 'A');
      if (typeof renderFacultySchedule === 'function' && typeof CURRENT_SCHEDULE_DAY !== 'undefined') {
        renderFacultySchedule(CURRENT_SCHEDULE_DAY);
      }
      if (typeof updateCurrentAndNextClassBanner === 'function') updateCurrentAndNextClassBanner();
      if (typeof refreshIcons === 'function') refreshIcons();

    } catch (err) {
      console.warn('[AcademicDataService] Backend read failed, keeping static fallback:', err);
    } finally {
      this.isLoading = false;
    }
  },

  /**
   * Section-filtered student retrieval (GET /api/students/section/{section})
   */
  async loadStudentsBySection(section) {
    if (!section || section === 'All') {
      const data = await apiClient.get('/students');
      return (data || []).map((s, idx) => this.adaptStudent(s, idx));
    }
    const data = await apiClient.get(`/students/section/${section}`);
    return (data || []).map((s, idx) => this.adaptStudent(s, idx));
  },

  /**
   * Phase 7C.4A: Fetch sessions for a faculty member from Spring Boot (GET /api/sessions/faculty/{facultyId})
   * Syncs completed sessions into SESSIONS_DATA.
   */
  async loadFacultySessions(facultyId) {
    if (!facultyId) return [];
    let cleanId = facultyId;
    if (typeof facultyId === 'string') {
      const parsed = parseInt(facultyId);
      if (!isNaN(parsed)) cleanId = parsed;
      else {
        const norm = facultyId.replace('_', '-');
        const match = (typeof AUTHORITATIVE_FACULTY !== 'undefined') ? AUTHORITATIVE_FACULTY.find(f => f.id === norm) : null;
        cleanId = (match && match.facultyId) ? match.facultyId : 1;
      }
    }
    try {
      const data = await apiClient.get(`/sessions/faculty/${cleanId}`);
      if (Array.isArray(data)) {
        const completedOnly = data.filter(s => (s.status || '').toUpperCase() === 'COMPLETED');
        completedOnly.forEach(backendSess => {
          const existingIdx = SESSIONS_DATA.findIndex(s => s.id === backendSess.id);
          const mapped = {
            id: backendSess.id,
            lectureNo: backendSess.lectureNumber,
            lectureNumber: backendSess.lectureNumber,
            lectureNoDisplay: `Lecture No. ${backendSess.lectureNumber}`,
            course: backendSess.subjectName,
            subject: backendSess.subjectName,
            subjectId: backendSess.subjectId,
            subjectName: backendSess.subjectName,
            subjectCodeShort: backendSess.subjectCode,
            dept: 'CSE',
            sem: backendSess.semester || 3,
            semester: backendSess.semester || 3,
            sec: backendSess.section,
            section: backendSess.section,
            room: 'Classroom 301',
            time: backendSess.startedAt ? new Date(backendSess.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '09:00 AM',
            date: backendSess.date,
            completedAt: backendSess.completedAt ? new Date(backendSess.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '09:50 AM',
            faculty: backendSess.facultyName,
            facultyName: backendSess.facultyName,
            facultyId: backendSess.facultyId,
            total: backendSess.totalRostered || 0,
            present: backendSess.presentCount || 0,
            absent: backendSess.absentCount || 0,
            pct: (backendSess.totalRostered > 0) 
              ? Number(((backendSess.presentCount / backendSess.totalRostered) * 100).toFixed(1)) 
              : null,
            status: 'completed'
          };
          if (existingIdx >= 0) {
            SESSIONS_DATA[existingIdx] = mapped;
          } else {
            SESSIONS_DATA.push(mapped);
          }
        });
        return completedOnly;
      }
    } catch (err) {
      console.warn('[AcademicDataService] loadFacultySessions error:', err);
    }
    return [];
  },

  /**
   * Phase 7C.4A: Fetch individual student attendance summary (GET /api/attendance/summary/student/{studentId})
   */
  async loadStudentSummary(studentId) {
    if (!studentId) return null;
    try {
      return await apiClient.get(`/attendance/summary/student/${studentId}`);
    } catch (err) {
      console.warn(`[AcademicDataService] loadStudentSummary failed for student ${studentId}:`, err);
      return null;
    }
  },

  /**
   * Phase 7C.4A: Fetch individual student attendance history (GET /api/attendance/history/student/{studentId})
   */
  async loadStudentHistory(studentId) {
    if (!studentId) return [];
    try {
      const data = await apiClient.get(`/attendance/history/student/${studentId}`);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn(`[AcademicDataService] loadStudentHistory failed for student ${studentId}:`, err);
      return [];
    }
  },

  /**
   * Phase 7C.4A: Fetch section attendance summary (GET /api/attendance/summary/section/{sectionIdOrName})
   */
  async loadSectionSummary(sectionParam, courseId = null) {
    if (!sectionParam) return null;
    try {
      const query = courseId ? `?courseId=${courseId}` : '';
      return await apiClient.get(`/attendance/summary/section/${sectionParam}${query}`);
    } catch (err) {
      console.warn(`[AcademicDataService] loadSectionSummary failed for section ${sectionParam}:`, err);
      return null;
    }
  }
};
window.AcademicDataService = AcademicDataService;

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
  'Object Oriented Programming in C++': 'Vaibhav Chandrakar',
  'Web Technology': 'Suman K. Swarnkar',
  'Digital Electronics': 'Navdeep Khare'
};

function getFacultyForSubject(subjectName) {
  if (!subjectName) return 'Devbrat Sahu';
  const lower = subjectName.toLowerCase();
  if (lower.includes('discrete') || lower.includes('dm')) return 'Pranjali Sharma';
  if (lower.includes('oops') || lower.includes('object oriented') || lower.includes('c++')) return 'Vaibhav Chandrakar';
  if (lower.includes('web') || lower.includes('wt')) return 'Suman K. Swarnkar';
  if (lower.includes('digital') || lower.includes('deld') || lower.includes('electronics')) return 'Navdeep Khare';
  if (lower.includes('operating') || lower.includes('os')) return 'Devbrat Sahu';
  for (const [sub, fac] of Object.entries(FACULTY_SUBJECT_MAP)) {
    if (lower.includes(sub.toLowerCase())) {
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

// ── PHASE 8: FACULTY-FIRST SIMPLIFIED DASHBOARD & WATCH ATTENDANCE ENGINE ──

/**
 * Requirement 13: Real dynamic greeting generated from local time
 * Time ranges:
 *   05:00–11:59 -> Good morning
 *   12:00–16:59 -> Good afternoon
 *   17:00–20:59 -> Good evening
 *   21:00–04:59 -> Good evening
 */
function getDynamicGreeting(facultyName) {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const totalMins = h * 60 + m;

  let greetingWord = 'Good evening';
  if (totalMins >= 5 * 60 && totalMins < 12 * 60) {
    greetingWord = 'Good morning';
  } else if (totalMins >= 12 * 60 && totalMins < 17 * 60) {
    greetingWord = 'Good afternoon';
  } else if (totalMins >= 17 * 60 && totalMins < 21 * 60) {
    greetingWord = 'Good evening';
  } else {
    greetingWord = 'Good evening';
  }

  let formattedName = 'Sir';
  if (facultyName) {
    const raw = typeof facultyName === 'string' ? facultyName : (facultyName.name || facultyName.facultyName || '');
    if (raw.includes('Devbrat')) formattedName = 'Devbrat Sir';
    else if (raw.includes('Pranjali')) formattedName = 'Pranjali Ma\'am';
    else if (raw.includes('Vaibhav')) formattedName = 'Vaibhav Sir';
    else if (raw.includes('Suman')) formattedName = 'Suman Sir';
    else if (raw.includes('Navdeep')) formattedName = 'Navdeep Sir';
    else if (raw.includes('Anand')) formattedName = 'Anand Sir';
    else {
      const clean = raw.replace(/^(Dr\.|Mr\.|Mrs\.|Prof\.)\s*/i, '').trim();
      const first = clean.split(' ')[0];
      formattedName = first ? `${first} Sir` : 'Sir';
    }
  }

  return `${greetingWord}, ${formattedName}`;
}

function updateDashboardGreeting() {
  const titleEl = document.getElementById('dash-greeting-title');
  if (!titleEl) return;
  const facName = (CURRENT_USER && (CURRENT_USER.facultyName || CURRENT_USER.name)) || 'Devbrat Sahu';
  titleEl.textContent = getDynamicGreeting(facName);
}

// Auto-refresh dynamic greeting across time boundaries without requiring page reload
if (typeof window !== 'undefined' && !window._dashGreetingTimer) {
  window._dashGreetingTimer = setInterval(() => {
    updateDashboardGreeting();
  }, 60000);
}

/**
 * Match an attendance session to a scheduled slot
 */
function findSessionForSlot(slot, targetDateStr = null) {
  if (!slot) return null;
  const dateStr = targetDateStr || new Date().toISOString().split('T')[0];
  return (SESSIONS_DATA || []).find(s => {
    if (s.status !== 'completed') return false;
    const secMatch = (s.sec || s.section) === slot.section;
    const subjMatch = (s.course === slot.subjectName || s.subject === slot.subjectName || s.subjectCodeShort === slot.subjectCodeShort);
    const periodMatch = (s.period === slot.period || s.period === `Period ${slot.period}` || s.timetableEntryId === slot.id);
    const dateMatch = !s.date || s.date === dateStr || s.date === 'Today';
    return secMatch && subjMatch && (periodMatch || dateMatch);
  });
}

/**
 * Requirement 4 & 5: Render today's scheduled lectures and visualize 7-period capacity
 */
function renderTodayLectures(selectedDay) {
  if (!CURRENT_USER || CURRENT_USER.role !== 'faculty') return;

  const now = new Date();
  const day = selectedDay || CURRENT_SCHEDULE_DAY || getSystemDayOfWeek(now);
  const facName = CURRENT_USER.facultyName;

  // Day badge & date display
  const dayBadge = document.getElementById('dash-today-day-badge');
  if (dayBadge) {
    const dateFormatted = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    dayBadge.textContent = `${day} · ${dateFormatted}`;
  }

  // Get timetable entries for today
  const entries = getTimetableEntriesForFaculty(facName, day, null)
    .sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));

  const slotsBadge = document.getElementById('dash-today-slots-badge');
  if (slotsBadge) {
    slotsBadge.textContent = `${entries.length} Scheduled Slot${entries.length === 1 ? '' : 's'}`;
  }

  // Populate Daily Lecture Capacity Visualizer Pills [1] [2] [3] [4] [5] [6] [7]
  const capacityContainer = document.getElementById('daily-capacity-pills');
  if (capacityContainer) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const periodMap = {
      1: ['I', 9 * 60, 9 * 60 + 50],
      2: ['II', 9 * 60 + 50, 10 * 60 + 40],
      3: ['III', 10 * 60 + 40, 11 * 60 + 30],
      4: ['IV', 11 * 60 + 30, 12 * 60 + 20],
      5: ['V', 13 * 60 + 10, 14 * 60],
      6: ['VI', 14 * 60, 14 * 60 + 50],
      7: ['VII', 14 * 60 + 50, 15 * 60 + 40]
    };

    let pillsHtml = '';
    for (let p = 1; p <= 7; p++) {
      const [roman, pStart, pEnd] = periodMap[p];
      const hasSlot = entries.find(e => {
        if (e.period === roman) return true;
        if (e.period === 'III–IV' && (p === 3 || p === 4)) return true;
        return false;
      });

      let pillClass = 'capacity-pill free';
      let pillTitle = `Period ${p}: Free`;
      if (hasSlot) {
        const completedSess = findSessionForSlot(hasSlot);
        if (completedSess) {
          pillClass = 'capacity-pill completed';
          pillTitle = `Period ${p}: ${hasSlot.subjectCodeShort}-${hasSlot.section} (Completed)`;
        } else if (pStart <= nowMin && nowMin < pEnd) {
          pillClass = 'capacity-pill current';
          pillTitle = `Period ${p}: ${hasSlot.subjectCodeShort}-${hasSlot.section} (Current)`;
        } else {
          pillClass = 'capacity-pill scheduled';
          pillTitle = `Period ${p}: ${hasSlot.subjectCodeShort}-${hasSlot.section} (Scheduled)`;
        }
      }
      pillsHtml += `<div class="${pillClass}" title="${escapeHtml(pillTitle)}">${p}</div>`;
    }
    capacityContainer.innerHTML = pillsHtml;
  }

  // Populate Today's Lecture Cards Grid
  const grid = document.getElementById('today-lectures-grid');
  if (!grid) return;

  if (entries.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 32px 20px; text-align: center; background: var(--surface-muted); border-radius: var(--radius-md); border: 1px dashed var(--border); color: var(--text-muted); font-size: 13.5px;">
        <i data-lucide="calendar-check" class="icon-md" style="margin-bottom: 8px; display: inline-block;"></i>
        <div style="font-size: 15px; font-weight: 600; color: var(--text-primary);">No Scheduled Lectures for Today</div>
        <div style="margin-top: 4px;">You have no instructional classes configured for <strong>${day}</strong> in the departmental timetable.</div>
        <button class="btn btn-outline btn-sm" onclick="openTimetableModalOrView()" style="margin-top: 14px; display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="calendar" class="icon-xs"></i>
          <span>View Weekly Timetable</span>
        </button>
      </div>
    `;
    refreshIcons();
    return;
  }

  const nowMin = now.getHours() * 60 + now.getMinutes();

  grid.innerHTML = entries.map((e, index) => {
    const sMin = timeStringToMinutes(e.startTime);
    const eMin = timeStringToMinutes(e.endTime);
    const completedSess = findSessionForSlot(e);
    const isCompleted = !!completedSess;
    const isCurrent = !isCompleted && (sMin <= nowMin && nowMin < eMin);

    let cardStateClass = 'state-upcoming';
    let badgeHtml = `<span class="badge" style="background: var(--surface-muted); color: var(--text-secondary); border: 1px solid var(--border); font-size: 11px;">UPCOMING</span>`;
    let actionHtml = '';

    if (isCompleted) {
      cardStateClass = 'state-completed';
      const presCount = completedSess ? completedSess.present : 0;
      const totCount = completedSess ? completedSess.total : (e.section === 'A' ? 60 : 59);
      badgeHtml = `<span class="badge" style="background: var(--success-subtle); color: var(--success); border: 1px solid var(--success-border); font-size: 11px; font-weight: 700;">COMPLETED</span>`;
      actionHtml = `
        <div class="slot-completed-badge">
          <i data-lucide="check-circle-2" class="icon-xs"></i>
          <span>Completed (${presCount}/${totCount} Present)</span>
        </div>
      `;
    } else if (isCurrent) {
      cardStateClass = 'state-current';
      badgeHtml = `<span class="badge" style="background: var(--primary-subtle); color: var(--primary); border: 1px solid var(--primary-border); font-size: 11px; font-weight: 700;">CURRENT LECTURE</span>`;
      actionHtml = `
        <button type="button" class="btn btn-primary btn-take-lecture" onclick="startAttendanceFromTimetable('${escapeHtml(e.subjectName)}', '${escapeHtml(e.section)}', 'Period ${escapeHtml(e.period)}', '${escapeHtml(e.timeDisplay)}')">
          <i data-lucide="check-square" class="icon-xs"></i>
          <span>Take Attendance &rarr;</span>
        </button>
      `;
    } else {
      cardStateClass = 'state-upcoming';
      actionHtml = `
        <button type="button" class="btn btn-outline btn-take-lecture" onclick="startAttendanceFromTimetable('${escapeHtml(e.subjectName)}', '${escapeHtml(e.section)}', 'Period ${escapeHtml(e.period)}', '${escapeHtml(e.timeDisplay)}')">
          <i data-lucide="check-square" class="icon-xs"></i>
          <span>Take Attendance</span>
        </button>
      `;
    }

    return `
      <div class="today-lecture-card ${cardStateClass}">
        <div>
          <div class="lecture-card-top">
            <span class="lecture-slot-pill">[${index + 1}] Period ${escapeHtml(e.period)} &middot; ${escapeHtml(e.timeDisplay)}</span>
            ${badgeHtml}
          </div>
          <h4 class="lecture-subject-title">${escapeHtml(e.subjectName)}</h4>
          <div class="lecture-meta-line">
            <span>Section <strong>${escapeHtml(e.section)}</strong></span>
            <span>&middot;</span>
            <span>Room: <strong>${escapeHtml(e.room)}</strong></span>
            <span>&middot;</span>
            <span style="text-transform: capitalize;">${escapeHtml(e.type)}</span>
          </div>
        </div>
        <div class="lecture-action-wrap">
          ${actionHtml}
        </div>
      </div>
    `;
  }).join('');

  refreshIcons();
}

/**
 * Requirement 3 & 6: Fastest 1-click primary Take Attendance launcher
 */
function handlePrimaryTakeAttendance() {
  if (!CURRENT_USER || CURRENT_USER.role !== 'faculty') {
    showPage('take-attendance', null);
    return;
  }

  const now = new Date();
  const day = CURRENT_SCHEDULE_DAY || getSystemDayOfWeek(now);
  const entries = getTimetableEntriesForFaculty(CURRENT_USER.facultyName, day, null)
    .sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));

  const nowMin = now.getHours() * 60 + now.getMinutes();

  // 1. Look for currently running slot that is uncompleted
  const currentSlot = entries.find(e => {
    const sMin = timeStringToMinutes(e.startTime);
    const eMin = timeStringToMinutes(e.endTime);
    return sMin <= nowMin && nowMin < eMin && !findSessionForSlot(e);
  });

  if (currentSlot) {
    startAttendanceFromTimetable(currentSlot.subjectName, currentSlot.section, `Period ${currentSlot.period}`, currentSlot.timeDisplay);
    return;
  }

  // 2. Look for next uncompleted upcoming slot
  const nextSlot = entries.find(e => {
    const sMin = timeStringToMinutes(e.startTime);
    return sMin > nowMin && !findSessionForSlot(e);
  });

  if (nextSlot) {
    startAttendanceFromTimetable(nextSlot.subjectName, nextSlot.section, `Period ${nextSlot.period}`, nextSlot.timeDisplay);
    return;
  }

  // 3. Fallback: first uncompleted slot today
  const anyPendingSlot = entries.find(e => !findSessionForSlot(e));
  if (anyPendingSlot) {
    startAttendanceFromTimetable(anyPendingSlot.subjectName, anyPendingSlot.section, `Period ${anyPendingSlot.period}`, anyPendingSlot.timeDisplay);
    return;
  }

  // If all completed or no slots, open workspace
  showPage('take-attendance', null);
}

/**
 * Requirement 8, 11, 12: Watch Attendance in plain academic language
 */
let CURRENT_WATCH_SECTION = 'A';

function onWatchSectionChange(sec) {
  CURRENT_WATCH_SECTION = sec;
  renderWatchAttendancePage(sec);
}

function renderWatchAttendancePage(selectedSec) {
  const sec = selectedSec || CURRENT_WATCH_SECTION || 'A';
  CURRENT_WATCH_SECTION = sec;

  const subj = (CURRENT_USER && CURRENT_USER.subjectName) || 'Operating System';
  const fac = (CURRENT_USER && CURRENT_USER.facultyName) || 'Devbrat Sahu';

  const subjTitle = document.getElementById('watch-subject-title');
  const facBadge = document.getElementById('watch-faculty-badge');
  const secSelect = document.getElementById('watch-section-select');
  const secTitle = document.getElementById('watch-roster-sec-title');

  if (subjTitle) subjTitle.textContent = subj;
  if (facBadge) facBadge.textContent = fac;
  if (secSelect && secSelect.value !== sec) secSelect.value = sec;
  if (secTitle) secTitle.textContent = sec;

  const metrics = calculateLiveSectionMetrics(subj, sec);

  const statPct = document.getElementById('watch-stat-pct');
  const statConducted = document.getElementById('watch-stat-conducted');
  const statPresent = document.getElementById('watch-stat-present');
  const statAbsent = document.getElementById('watch-stat-absent');
  const statRisk = document.getElementById('watch-stat-risk');
  const statEnrolled = document.getElementById('watch-stat-enrolled');

  if (statEnrolled) statEnrolled.textContent = metrics.studentStats.length;
  if (statPct) statPct.textContent = metrics.avgPct !== null ? `${metrics.avgPct}%` : '—';
  if (statConducted) statConducted.textContent = metrics.conductedCount;
  if (statPresent) statPresent.textContent = metrics.presentToday !== null ? metrics.presentToday : (metrics.conductedCount > 0 ? metrics.studentStats.reduce((a, s) => a + s.attended, 0) : 0);
  if (statAbsent) statAbsent.textContent = metrics.absentToday !== null ? metrics.absentToday : (metrics.conductedCount > 0 ? metrics.studentStats.reduce((a, s) => a + s.absent, 0) : 0);
  if (statRisk) statRisk.textContent = metrics.atRiskCount !== null ? metrics.atRiskCount : 0;

  renderWatchStudentsTable(metrics.studentStats, sec);
  renderWatchSessionsList(subj, sec);
  refreshIcons();
}

function renderWatchStudentsTable(studentStats, sec) {
  const tbody = document.getElementById('watch-student-table-body');
  const countBadge = document.getElementById('watch-roster-count-badge');
  if (countBadge) countBadge.textContent = `${studentStats.length} Students`;
  if (!tbody) return;

  if (studentStats.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">No students enrolled in Section ${sec}.</td></tr>`;
    return;
  }

  tbody.innerHTML = studentStats.map((s, idx) => {
    const isCompliant = s.pct !== null ? s.pct >= ATTENDANCE_THRESHOLD : true;
    const pctDisplay = s.pct !== null ? `${s.pct}%` : '—';
    const attendedDisplay = s.total > 0 ? `${s.attended} / ${s.total}` : '— / 0';
    const statusText = s.total === 0 ? 'Pending Sessions' : (isCompliant ? 'Eligible (≥ 75%)' : 'Below 75%');
    const statusClass = s.total === 0 ? 'badge' : (isCompliant ? 'badge-ok' : 'badge-risk');

    return `
      <tr>
        <td style="color: var(--text-muted); font-weight: 500;">${idx + 1}</td>
        <td>
          <button type="button" class="student-link-btn" onclick="openStudentProfile(${s.id || `'${s.roll}'`})" style="background: none; border: none; padding: 0; color: var(--text-primary); font-weight: 600; cursor: pointer; text-align: left;">
            ${escapeHtml(s.name)}
          </button>
        </td>
        <td><code>${escapeHtml(s.roll)}</code></td>
        <td style="font-weight: 600;">${attendedDisplay}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="color: ${s.pct !== null ? (isCompliant ? 'var(--text-primary)' : 'var(--danger)') : 'var(--text-muted)'}; min-width: 44px;">${pctDisplay}</strong>
            ${s.pct !== null ? `<div style="width: 60px; height: 6px; background: var(--surface-muted); border-radius: var(--radius-full); overflow: hidden; border: 1px solid var(--border);"><div style="height: 100%; width: ${s.pct}%; background: ${isCompliant ? 'var(--success)' : 'var(--danger)'};"></div></div>` : ''}
          </div>
        </td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td style="text-align: right;">
          <button class="btn btn-outline btn-xs" onclick="openStudentProfile(${s.id || `'${s.roll}'`})" style="gap: 4px; padding: 4px 8px;">
            <i data-lucide="eye" class="icon-xs"></i>
            <span>Inspect</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderWatchSessionsList(subj, sec) {
  const tbody = document.getElementById('watch-sessions-table-body');
  if (!tbody) return;

  const completed = (SESSIONS_DATA || []).filter(s =>
    s.status === 'completed' &&
    (s.sec === sec || s.section === sec) &&
    (s.subject === subj || s.course === subj || s.subjectName === subj)
  );

  if (completed.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">No attendance sessions recorded yet for ${escapeHtml(subj)} Section ${sec}.</td></tr>`;
    return;
  }

  tbody.innerHTML = completed.map(s => {
    const pct = s.pct !== undefined ? `${s.pct}%` : '—';
    return `
      <tr>
        <td><strong>${escapeHtml(s.date || 'Today')}</strong> <span style="color: var(--text-muted); font-size: 12px;">(${escapeHtml(s.time || '')})</span></td>
        <td><span class="badge" style="background: var(--surface-muted); border: 1px solid var(--border); font-size: 11px;">Period ${escapeHtml(s.period || 'I')}</span></td>
        <td><strong>Lecture ${escapeHtml(s.lectureNumber || s.lectureNo || 1)}</strong></td>
        <td style="color: var(--success); font-weight: 600;">${s.present || 0}</td>
        <td style="color: var(--danger); font-weight: 600;">${s.absent || 0}</td>
        <td><strong>${pct}</strong></td>
        <td><span class="badge badge-ok">COMPLETED</span></td>
      </tr>
    `;
  }).join('');
}

function filterWatchStudents(searchVal) {
  const query = (searchVal !== undefined ? searchVal : (document.getElementById('watch-roster-search')?.value || '')).toLowerCase().trim();
  const filterType = document.getElementById('watch-roster-filter')?.value || 'all';
  const sec = CURRENT_WATCH_SECTION || 'A';
  const subj = (CURRENT_USER && CURRENT_USER.subjectName) || 'Operating System';
  const metrics = calculateLiveSectionMetrics(subj, sec);

  let filtered = metrics.studentStats;
  if (query) {
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.roll.toLowerCase().includes(query)
    );
  }
  if (filterType === 'compliant') {
    filtered = filtered.filter(s => s.pct !== null && s.pct >= ATTENDANCE_THRESHOLD);
  } else if (filterType === 'defaulter') {
    filtered = filtered.filter(s => s.pct !== null && s.pct < ATTENDANCE_THRESHOLD);
  }

  renderWatchStudentsTable(filtered, sec);
  refreshIcons();
}

/**
 * Requirement 10: Student Attendance Visualizations
 */
function renderStudentAttendanceVisualizations(student, livePct, liveAttendedCount, liveMissedCount, totalCompleted) {
  // A. Linear Progress Bar & 5-stat summary
  const pctText = document.getElementById('sp-vis-pct-text');
  const progressBar = document.getElementById('sp-vis-progress-bar');
  const ratioText = document.getElementById('sp-vis-classes-ratio');
  const complianceBadge = document.getElementById('sp-vis-compliance-text');
  const conductedEl = document.getElementById('sp-main-conducted');

  const isCompliant = livePct !== null && livePct >= ATTENDANCE_THRESHOLD;

  if (conductedEl) conductedEl.textContent = totalCompleted;
  if (pctText) pctText.textContent = livePct !== null ? `${livePct}%` : '--';
  if (progressBar) {
    progressBar.style.width = livePct !== null ? `${livePct}%` : '0%';
    progressBar.className = `linear-progress-fill ${totalCompleted === 0 ? '' : (isCompliant ? 'status-ok' : 'status-low')}`;
  }
  if (ratioText) {
    ratioText.textContent = totalCompleted > 0 ? `${liveAttendedCount} / ${totalCompleted}` : '-- / 0';
  }
  if (complianceBadge) {
    if (totalCompleted === 0) {
      complianceBadge.textContent = 'Pre-Commencement';
      complianceBadge.className = 'badge';
    } else if (isCompliant) {
      complianceBadge.textContent = 'Eligible (≥ 75%)';
      complianceBadge.className = 'badge badge-ok';
    } else {
      complianceBadge.textContent = 'Below Threshold (< 75%)';
      complianceBadge.className = 'badge badge-risk';
    }
  }

  // B. Present vs Absent Visual Breakdown & Percentages
  const presEl = document.getElementById('sp-vis-present-count');
  const absEl = document.getElementById('sp-vis-absent-count');
  const presBar = document.getElementById('sp-vis-ratio-present-bar');
  const absBar = document.getElementById('sp-vis-ratio-absent-bar');
  const presPctEl = document.getElementById('sp-vis-present-pct');
  const absPctEl = document.getElementById('sp-vis-absent-pct');

  if (presEl) presEl.textContent = liveAttendedCount;
  if (absEl) absEl.textContent = liveMissedCount;

  if (totalCompleted > 0) {
    const presPct = Math.round((liveAttendedCount / totalCompleted) * 100);
    const absPct = 100 - presPct;
    if (presBar) presBar.style.width = `${presPct}%`;
    if (absBar) absBar.style.width = `${absPct}%`;
    if (presPctEl) presPctEl.textContent = `${presPct}%`;
    if (absPctEl) absPctEl.textContent = `${absPct}%`;
  } else {
    if (presBar) presBar.style.width = '0%';
    if (absBar) absBar.style.width = '0%';
    if (presPctEl) presPctEl.textContent = '0%';
    if (absPctEl) absPctEl.textContent = '0%';
  }

  // C. Monthly Attendance Breakdown (July, August, September, October, November, December)
  const months = [
    { name: 'July', short: 'Jul', monthNum: 7 },
    { name: 'August', short: 'Aug', monthNum: 8 },
    { name: 'September', short: 'Sep', monthNum: 9 },
    { name: 'October', short: 'Oct', monthNum: 10 },
    { name: 'November', short: 'Nov', monthNum: 11 },
    { name: 'December', short: 'Dec', monthNum: 12 }
  ];

  const sectionSessions = (SESSIONS_DATA || []).filter(s => s.status === 'completed' && s.sec === student.sec);
  const hasHistory = Array.isArray(student._history) && student._history.length > 0;

  const monthlyStats = months.map(m => {
    let conducted = 0;
    let attended = 0;

    if (hasHistory) {
      const monthRecords = student._history.filter(h => {
        if (!h.date) return false;
        const d = new Date(h.date);
        return !isNaN(d.getTime()) ? (d.getMonth() + 1 === m.monthNum) : false;
      });
      conducted = monthRecords.length;
      attended = monthRecords.filter(h => (h.status || '').toUpperCase() === 'PRESENT').length;
    } else {
      const monthSessions = sectionSessions.filter(s => {
        if (!s.date) return false;
        const d = new Date(s.date);
        return !isNaN(d.getTime()) ? (d.getMonth() + 1 === m.monthNum) : false;
      });
      conducted = monthSessions.length;
      monthSessions.forEach(sess => {
        const liveRec = (typeof LIVE_ATTENDANCE_RECORDS !== 'undefined')
          ? LIVE_ATTENDANCE_RECORDS.find(r => r.id === sess.id || (r.lectureNo === sess.lectureNo && r.subject === sess.subject && r.sec === sess.sec))
          : null;
        if (liveRec && liveRec.studentRecords) {
          const sr = liveRec.studentRecords.find(r => r.roll === student.roll || r.studentId === student.roll);
          if (sr && (sr.status || '').toUpperCase() === 'PRESENT') attended++;
        }
      });
    }

    const pct = conducted > 0 ? Number(((attended / conducted) * 100).toFixed(1)) : null;
    return { name: m.name, short: m.short, conducted, attended, pct };
  });

  // Attendance Trend (Requirement C6)
  const trendBadge = document.getElementById('sp-attendance-trend-badge');
  if (trendBadge) {
    const activeMonths = monthlyStats.filter(m => m.conducted > 0);
    if (activeMonths.length >= 2) {
      const latest = activeMonths[activeMonths.length - 1];
      const prev = activeMonths[activeMonths.length - 2];
      const diff = Number((latest.pct - prev.pct).toFixed(1));
      if (diff > 0) {
        trendBadge.textContent = `Trend: Improving (+${diff}% vs ${prev.name})`;
        trendBadge.className = 'badge badge-ok';
      } else if (diff < 0) {
        trendBadge.textContent = `Trend: Declining (${diff}% vs ${prev.name})`;
        trendBadge.className = 'badge badge-risk';
      } else {
        trendBadge.textContent = `Trend: Steady (${latest.pct}%)`;
        trendBadge.className = 'badge';
      }
    } else if (activeMonths.length === 1) {
      trendBadge.textContent = `Trend: ${activeMonths[0].name} baseline (${activeMonths[0].pct}%)`;
      trendBadge.className = 'badge';
    } else {
      trendBadge.textContent = 'Attendance Trend: Pre-Commencement';
      trendBadge.className = 'badge';
    }
  }

  const monthlyGrid = document.getElementById('sp-monthly-attendance-grid');
  if (monthlyGrid) {
    monthlyGrid.innerHTML = monthlyStats.map(m => {
      const pctDisplay = m.pct !== null ? `${m.pct}%` : '—';
      const countsDisplay = m.conducted > 0 ? `${m.attended} / ${m.conducted} Attended` : 'No attendance recorded';

      return `
        <div class="monthly-card">
          <div class="monthly-name">${m.name}</div>
          <div class="monthly-pct" style="color: ${m.pct !== null ? (m.pct >= ATTENDANCE_THRESHOLD ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)'};">${pctDisplay}</div>
          <div class="monthly-counts">${countsDisplay}</div>
        </div>
      `;
    }).join('');
  }

  // D. Real Chart.js Bar Graph (sp-monthly-bar-chart)
  const emptyStateEl = document.getElementById('sp-chart-empty-state');
  const canvasWrapEl = document.getElementById('sp-chart-canvas-wrap');
  const chartCanvas = document.getElementById('sp-monthly-bar-chart');

  if (window.myStudentMonthlyBarChart) {
    window.myStudentMonthlyBarChart.destroy();
    window.myStudentMonthlyBarChart = null;
  }

  if (totalCompleted === 0) {
    if (emptyStateEl) emptyStateEl.style.display = 'block';
    if (canvasWrapEl) canvasWrapEl.style.display = 'none';
  } else {
    if (emptyStateEl) emptyStateEl.style.display = 'none';
    if (canvasWrapEl) canvasWrapEl.style.display = 'block';

    if (chartCanvas && typeof Chart !== 'undefined') {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const textColor = isDark ? '#94a3b8' : '#64748b';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

      const chartLabels = monthlyStats.map(m => m.short);
      const chartValues = monthlyStats.map(m => m.pct !== null ? m.pct : 0);
      const chartColors = monthlyStats.map(m => {
        if (m.pct === null) return isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(203, 213, 225, 0.4)';
        return m.pct >= ATTENDANCE_THRESHOLD ? '#10b981' : '#ef4444';
      });
      const chartBorders = monthlyStats.map(m => {
        if (m.pct === null) return isDark ? '#475569' : '#cbd5e1';
        return m.pct >= ATTENDANCE_THRESHOLD ? '#059669' : '#dc2626';
      });

      const ctx = chartCanvas.getContext('2d');
      window.myStudentMonthlyBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [{
            label: 'Monthly Attendance %',
            data: chartValues,
            backgroundColor: chartColors,
            borderColor: chartBorders,
            borderWidth: 1.5,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const idx = context.dataIndex;
                  const stat = monthlyStats[idx];
                  if (stat.conducted === 0) return 'No sessions conducted';
                  return `${stat.pct}% (${stat.attended}/${stat.conducted} attended)`;
                }
              }
            }
          },
          scales: {
            y: {
              min: 0,
              max: 100,
              grid: { color: gridColor },
              ticks: {
                callback: v => v + '%',
                font: { family: 'Inter', size: 11 },
                color: textColor
              }
            },
            x: {
              grid: { display: false },
              ticks: {
                font: { family: 'Inter', size: 12, weight: '500' },
                color: textColor
              }
            }
          }
        }
      });
    }
  }
}

/**
 * PHASE 8.1: WEEKLY TIMETABLE ENGINE (AUTHORITATIVE & DYNAMIC)
 */
let CURRENT_TIMETABLE_VIEW_MODE = 'grid'; // 'grid' | 'day'
let CURRENT_TIMETABLE_FILTER = 'mine';    // 'mine' | 'all'
let CURRENT_MODAL_SCHEDULE_DAY = 'Monday';

function isFacultySlotAssigned(entry, faculty) {
  if (!entry) return false;
  const fac = faculty || CURRENT_USER;
  if (!fac) return false;
  const facName = (fac.facultyName || fac.name || '').trim();
  const facShort = (fac.shortCode || fac.facultyShort || '').trim();
  const facId = String(fac.facultyId || fac.id || '').trim();

  // 1. Match by short code (e.g. DS, PS, VC, SS, NK)
  if (entry.facultyShort && facShort && entry.facultyShort.toUpperCase() === facShort.toUpperCase()) return true;

  // 2. Match by faculty ID
  if (entry.facultyId && facId && (entry.facultyId === facId || entry.facultyId === `faculty-${facId}` || String(entry.facultyId).replace('faculty-', '') === facId)) return true;

  // 3. Match by faculty name (case-insensitive, ignoring honorific titles)
  if (entry.facultyName && facName) {
    const cleanEntry = entry.facultyName.toLowerCase().replace(/^(dr\.|mr\.|mrs\.|prof\.)\s*/i, '').trim();
    const cleanFac = facName.toLowerCase().replace(/^(dr\.|mr\.|mrs\.|prof\.)\s*/i, '').trim();
    if (cleanEntry === cleanFac || (cleanFac.length > 3 && cleanEntry.includes(cleanFac)) || (cleanEntry.length > 3 && cleanFac.includes(cleanEntry))) {
      return true;
    }
  }
  return false;
}

function switchTimetableViewMode(mode) {
  CURRENT_TIMETABLE_VIEW_MODE = mode;
  const btnGrid = document.getElementById('tt-btn-view-grid');
  const btnDay = document.getElementById('tt-btn-view-day');
  const gridView = document.getElementById('tt-modal-grid-view');
  const dayView = document.getElementById('tt-modal-day-view');

  if (btnGrid) btnGrid.classList.toggle('active', mode === 'grid');
  if (btnDay) btnDay.classList.toggle('active', mode === 'day');

  if (mode === 'grid') {
    if (gridView) gridView.style.display = 'block';
    if (dayView) dayView.style.display = 'none';
    renderWeeklyTimetableGrid();
  } else {
    if (gridView) gridView.style.display = 'none';
    if (dayView) dayView.style.display = 'block';
    selectModalScheduleDay(CURRENT_MODAL_SCHEDULE_DAY);
  }
  refreshIcons();
}

function onTimetableFilterChange(filterVal) {
  CURRENT_TIMETABLE_FILTER = filterVal;
  if (CURRENT_TIMETABLE_VIEW_MODE === 'grid') {
    renderWeeklyTimetableGrid();
  } else {
    selectModalScheduleDay(CURRENT_MODAL_SCHEDULE_DAY);
  }
}

function renderWeeklyTimetableGrid() {
  const container = document.getElementById('tt-modal-grid-view');
  if (!container) return;

  if (typeof TIMETABLE_ENTRIES === 'undefined' || TIMETABLE_ENTRIES.length === 0) {
    container.innerHTML = `
      <div style="padding: 32px; text-align: center; color: var(--text-muted); font-size: 13.5px;">
        <i data-lucide="calendar-off" class="icon-md" style="margin-bottom: 8px; display: inline-block;"></i>
        <div>No timetable data loaded yet. Connecting to authoritative academic repository...</div>
      </div>
    `;
    refreshIcons();
    return;
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periods = [
    { id: 'I', label: 'Period I', time: '09:00 – 09:50' },
    { id: 'II', label: 'Period II', time: '09:50 – 10:40' },
    { id: 'III', label: 'Period III', time: '10:40 – 11:30' },
    { id: 'IV', label: 'Period IV', time: '11:30 – 12:20' },
    { id: 'V', label: 'Period V', time: '13:00 – 13:50' },
    { id: 'VI', label: 'Period VI', time: '13:50 – 14:40' },
    { id: 'VII', label: 'Period VII', time: '14:40 – 15:20' },
    { id: 'VIII', label: 'Period VIII', time: '15:20 – 16:00' }
  ];

  let tableHtml = `
    <table class="tt-grid-table">
      <thead>
        <tr>
          <th>Period</th>
          ${days.map(d => `<th>${d.slice(0, 3).toUpperCase()}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  periods.forEach(p => {
    tableHtml += `
      <tr>
        <td>
          <div class="tt-grid-period-lbl">${p.id}</div>
          <div class="tt-grid-time-lbl">${p.time}</div>
        </td>
    `;

    days.forEach(day => {
      let slots = TIMETABLE_ENTRIES.filter(e => {
        if (e.day.toLowerCase() !== day.toLowerCase()) return false;
        const pId = p.id;
        const ep = (e.period || '').replace(/[–—]/g, '-');
        if (ep === pId) return true;
        if (ep === 'III-IV' && (pId === 'III' || pId === 'IV')) return true;
        if (ep === 'V-VI' && (pId === 'V' || pId === 'VI')) return true;
        if (ep === 'VI-VII' && (pId === 'VI' || pId === 'VII')) return true;
        if (ep === 'VII-VIII' && (pId === 'VII' || pId === 'VIII')) return true;
        return false;
      });

      if (CURRENT_TIMETABLE_FILTER === 'mine') {
        slots = slots.filter(e => isFacultySlotAssigned(e, CURRENT_USER));
      }

      if (slots.length === 0) {
        tableHtml += `<td><div class="tt-slot-empty">—</div></td>`;
      } else {
        const slotCellsHtml = slots.map(slot => {
          const isMine = isFacultySlotAssigned(slot, CURRENT_USER);

          if (isMine) {
            return `
              <div class="tt-slot-card-mine">
                <div>
                  <span class="tt-badge-mine"><i data-lucide="check" style="width:10px;height:10px;"></i> YOUR CLASS</span>
                  <div class="tt-slot-subj-mine">${escapeHtml(slot.subjectName || slot.subjectCodeShort)}</div>
                  <div class="tt-slot-sec-mine">Section ${escapeHtml(slot.section)} &middot; ${escapeHtml(slot.type)}</div>
                  <div class="tt-slot-meta-mine">${escapeHtml(slot.room || 'Classroom')}</div>
                </div>
                <button type="button" class="btn-tt-take" onclick="closeTimetableModal(); startAttendanceFromTimetable('${escapeHtml(slot.subjectName)}', '${escapeHtml(slot.section)}', 'Period ${escapeHtml(slot.period)}', '${escapeHtml(slot.timeDisplay)}')">
                  <i data-lucide="check-square" style="width:11px;height:11px;"></i>
                  <span>Take &rarr;</span>
                </button>
              </div>
            `;
          } else {
            return `
              <div class="tt-slot-card-other" title="Taught by ${escapeHtml(slot.facultyName || slot.facultyShort)}">
                <div class="tt-slot-subj-other">${escapeHtml(slot.subjectName || slot.subjectCodeShort)}</div>
                <div class="tt-slot-sec-other">Sec ${escapeHtml(slot.section)} &middot; ${escapeHtml(slot.room || '')}</div>
                <div class="tt-slot-fac-other">${escapeHtml(slot.facultyName || slot.facultyShort)}</div>
              </div>
            `;
          }
        }).join('');

        tableHtml += `<td>${slotCellsHtml}</td>`;
      }
    });

    tableHtml += `</tr>`;
  });

  tableHtml += `</tbody></table>`;
  container.innerHTML = tableHtml;
  refreshIcons();
}

function selectModalScheduleDay(day) {
  CURRENT_MODAL_SCHEDULE_DAY = day;
  document.querySelectorAll('#tt-modal-day-tabs .sched-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.day === day);
  });

  const listEl = document.getElementById('tt-modal-schedule-list');
  if (!listEl) return;

  if (typeof TIMETABLE_ENTRIES === 'undefined') {
    listEl.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">Timetable data loading...</div>`;
    return;
  }

  let entries = TIMETABLE_ENTRIES.filter(e => e.day.toLowerCase() === day.toLowerCase())
    .sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));

  if (CURRENT_TIMETABLE_FILTER === 'mine') {
    entries = entries.filter(e => isFacultySlotAssigned(e, CURRENT_USER));
  }

  const facName = (CURRENT_USER && CURRENT_USER.facultyName) || 'Faculty Member';

  if (entries.length === 0) {
    listEl.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; background: var(--surface-muted); border-radius: var(--radius-sm); border: 1px dashed var(--border); color: var(--text-muted); font-size: 13px;">
        <i data-lucide="calendar-off" class="icon-sm" style="margin-bottom: 6px; display: inline-block;"></i>
        <div>No instructional classes scheduled ${CURRENT_TIMETABLE_FILTER === 'mine' ? `for <strong>${escapeHtml(facName)}</strong>` : ''} on <strong>${day}</strong>.</div>
      </div>
    `;
    refreshIcons();
    return;
  }

  listEl.innerHTML = entries.map(e => {
    const isMine = isFacultySlotAssigned(e, CURRENT_USER);

    if (isMine) {
      return `
        <div class="card" style="padding: 16px; border: 2px solid var(--primary); background: var(--primary-subtle); border-radius: var(--radius-md);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="tt-badge-mine"><i data-lucide="check" style="width:10px;height:10px;"></i> YOUR CLASS</span>
            <span class="badge" style="background: var(--surface); border: 1px solid var(--border); font-size: 11px;">Sec ${escapeHtml(e.section)}</span>
          </div>
          <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-top: 6px;">${escapeHtml(e.subjectName)}</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Period ${escapeHtml(e.period)} (${escapeHtml(e.timeDisplay)}) &middot; Room: <strong>${escapeHtml(e.room)}</strong></div>
          <button class="btn btn-primary btn-sm" onclick="closeTimetableModal(); startAttendanceFromTimetable('${escapeHtml(e.subjectName)}', '${escapeHtml(e.section)}', 'Period ${escapeHtml(e.period)}', '${escapeHtml(e.timeDisplay)}')" style="margin-top: 12px; width: 100%; justify-content: center; gap: 6px;">
            <i data-lucide="check-square" class="icon-xs"></i>
            <span>Take Attendance &rarr;</span>
          </button>
        </div>
      `;
    } else {
      return `
        <div class="card" style="padding: 14px 16px; border: 1px solid var(--border); background: var(--surface-muted); opacity: 0.82;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="badge" style="background: var(--surface); border: 1px solid var(--border); font-size: 11px; color: var(--text-secondary);">Period ${escapeHtml(e.period)} (${escapeHtml(e.timeDisplay)})</span>
            <span class="badge" style="background: var(--surface); border: 1px solid var(--border); font-size: 11px;">Sec ${escapeHtml(e.section)}</span>
          </div>
          <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-top: 6px;">${escapeHtml(e.subjectName)}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Faculty: <strong>${escapeHtml(e.facultyName || e.facultyShort)}</strong> &middot; Room: ${escapeHtml(e.room)}</div>
        </div>
      `;
    }
  }).join('');

  refreshIcons();
}

function openTimetableModalOrView(day) {
  const modal = document.getElementById('timetable-modal-overlay');
  if (!modal) return;
  const targetDay = day || CURRENT_SCHEDULE_DAY || getSystemDayOfWeek();
  CURRENT_MODAL_SCHEDULE_DAY = targetDay;
  modal.style.display = 'flex';

  const subEl = document.getElementById('tt-modal-fac-subtitle');
  const countBadge = document.getElementById('tt-modal-slots-count-badge');
  if (CURRENT_USER) {
    if (subEl) subEl.textContent = `${CURRENT_USER.facultyName} · ${CURRENT_USER.subjectName} · Department of CSE`;
    if (countBadge && typeof TIMETABLE_ENTRIES !== 'undefined') {
      const myWeeklySlots = TIMETABLE_ENTRIES.filter(e => isFacultySlotAssigned(e, CURRENT_USER)).length;
      countBadge.textContent = `${myWeeklySlots} Weekly Teaching Slots`;
    }
  }

  // Choose appropriate view based on screen width
  if (window.innerWidth < 768) {
    switchTimetableViewMode('day');
  } else {
    switchTimetableViewMode(CURRENT_TIMETABLE_VIEW_MODE || 'grid');
  }
  refreshIcons();
}

function closeTimetableModal() {
  const modal = document.getElementById('timetable-modal-overlay');
  if (modal) modal.style.display = 'none';
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
        if ((sr.status || '').toLowerCase() === 'present') {
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

  const currentLecture = ACTIVE_LECTURE && 
    (ACTIVE_LECTURE.subject === subjectName || ACTIVE_LECTURE.subjectName === subjectName) && 
    (ACTIVE_LECTURE.section === section || ACTIVE_LECTURE.sec === section) &&
    ACTIVE_LECTURE.status === 'recording'
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
  const isRecording = ACTIVE_LECTURE && 
    (ACTIVE_LECTURE.subject === subj || ACTIVE_LECTURE.subjectName === subj) && 
    (ACTIVE_LECTURE.section === sec || ACTIVE_LECTURE.sec === sec) && 
    ACTIVE_LECTURE.status === 'recording';
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
  if (ATTENDANCE_STATE.status === 'loaded') {
    renderAttendanceView();
  }
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

  const isRecording = ACTIVE_LECTURE && 
    (ACTIVE_LECTURE.subject === subj || ACTIVE_LECTURE.subjectName === subj) && 
    (ACTIVE_LECTURE.section === sec || ACTIVE_LECTURE.sec === sec) && 
    ACTIVE_LECTURE.status === 'recording';
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

  // Phase 8: Refresh Today's Lectures & Capacity Visualizer
  renderTodayLectures(CURRENT_SCHEDULE_DAY);
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
    attendance: 'Watch Attendance',
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
    updateDashboardGreeting();
    renderTodayLectures(CURRENT_SCHEDULE_DAY);
    initCharts();
  }
  if (pageId === 'attendance') {
    renderWatchAttendancePage();
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

  // Close collapsible sidebar on navigation
  toggleSidebar(false);
}

function toggleSidebar(forceState) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isOpen = sidebar ? sidebar.classList.contains('open') : false;
  const shouldOpen = typeof forceState === 'boolean' ? forceState : !isOpen;

  if (sidebar) {
    if (shouldOpen) sidebar.classList.add('open');
    else sidebar.classList.remove('open');
  }
  if (overlay) {
    if (shouldOpen) {
      overlay.classList.add('open');
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('open');
      overlay.classList.remove('active');
    }
  }
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
async function renderAttendanceOverviewPage() {
  const token = getStoredAuthToken();
  if (token && CURRENT_USER && CURRENT_USER.facultyId) {
    try {
      await AcademicDataService.loadFacultySessions(CURRENT_USER.facultyId);
    } catch (e) {
      console.warn('Failed to load faculty sessions for overview:', e);
    }
  }

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

async function loadStudentsAction() {
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
  const nowTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Resolve subject code and IDs from authoritative curriculum
  const cleanSubjectMap = {
    'Operating System': { code: 'OS', id: 1 },
    'Discrete Mathematics': { code: 'DM', id: 2 },
    'OOPS in C++': { code: 'OOPS', id: 3 },
    'Object Oriented Programming in C++': { code: 'OOPS', id: 3 },
    'Web Technology': { code: 'WT', id: 4 },
    'Digital Electronics': { code: 'DELD', id: 5 }
  };
  const resolvedSubj = cleanSubjectMap[effectiveSubject] || {
    code: (CURRENT_USER && CURRENT_USER.subjectCodeShort) || 'OS',
    id: (CURRENT_USER && CURRENT_USER.assignedSubjectId) || 1
  };
  const subjectShort = resolvedSubj.code;
  const subjectId = resolvedSubj.id;
  const secMap = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
  const sectionId = secMap[sec] || 1;

  // Resolve timetable entry
  const ttEntry = (typeof TIMETABLE_ENTRIES !== 'undefined' ? TIMETABLE_ENTRIES : []).find(e =>
    e.section === sec && (e.subjectName === effectiveSubject || e.subjectCodeShort === subjectShort)
  ) || null;

  ATTENDANCE_STATE.status = 'loading';
  renderAttendanceView();
  updateTakeAttendanceHeader();
  updateFacultyDashboardLiveMetrics();

  const token = getStoredAuthToken();

  if (token) {
    try {
      const sessionReq = {
        facultyCode: (CURRENT_USER && (CURRENT_USER.facultyCode || CURRENT_USER.userId)) || undefined,
        facultyId: (CURRENT_USER && typeof CURRENT_USER.facultyId === 'number') ? CURRENT_USER.facultyId : undefined,
        subjectCodeShort: subjectShort,
        subjectId: subjectId,
        section: sec,
        sectionId: sectionId,
        sessionDate: date,
        timetableCode: ttEntry ? ttEntry.timetableCode : undefined,
        timetableEntryId: ttEntry && typeof ttEntry.id === 'number' ? ttEntry.id : undefined,
        startTime: ttEntry ? ttEntry.startTime : '09:00 AM',
        endTime: ttEntry ? ttEntry.endTime : '09:50 AM'
      };

      const sessionDto = await apiClient.post('/sessions/start', sessionReq);
      if (!sessionDto || !sessionDto.id) {
        throw new Error('Failed to create session on backend: Missing session ID');
      }

      // Authoritative section roster from backend
      let roster = [];
      try {
        roster = await AcademicDataService.loadStudentsBySection(sec);
      } catch (_) {}
      if (!roster || roster.length === 0) {
        roster = getRosterForClass(dept, sem, sec);
      }

      ACTIVE_LECTURE = {
        id: sessionDto.id,
        sessionId: sessionDto.id,
        backendSessionId: sessionDto.id,
        subject: sessionDto.subjectName || effectiveSubject,
        subjectName: sessionDto.subjectName || effectiveSubject,
        subjectId: sessionDto.subjectId || subjectId,
        subjectCodeShort: sessionDto.subjectCode || subjectShort,
        faculty: sessionDto.facultyName || faculty,
        facultyId: sessionDto.facultyId || facultyId,
        facultyCode: sessionDto.facultyCode,
        section: sessionDto.section || sec,
        sec: sessionDto.section || sec,
        semester: sessionDto.semester || parseInt(sem) || 3,
        date: sessionDto.date || date,
        timetableEntryId: ttEntry ? ttEntry.id : null,
        period: ttEntry ? ttEntry.period : 'I',
        periodStart: ttEntry ? ttEntry.periodStart : 1,
        periodEnd: ttEntry ? ttEntry.periodEnd : 1,
        startTime: ttEntry ? ttEntry.startTime : '09:00 AM',
        endTime: ttEntry ? ttEntry.endTime : '09:50 AM',
        lectureNumber: sessionDto.lectureNumber,
        lectureNo: sessionDto.lectureNumber,
        status: 'recording',
        completedAt: null,
        startedAt: sessionDto.startedAt ? new Date(sessionDto.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : nowTimeStr,
        startTimeTs: Date.now()
      };

      ATTENDANCE_STATE.classInfo = {
        date: sessionDto.date || date,
        dept,
        deptName: deptNameMap[dept] || dept,
        sem: String(sessionDto.semester || sem),
        sec: sessionDto.section || sec,
        subject: sessionDto.subjectName || effectiveSubject,
        faculty: sessionDto.facultyName || faculty,
        lectureNumber: sessionDto.lectureNumber,
        lectureNoDisplay: `Lecture No. ${sessionDto.lectureNumber}`
      };

      ATTENDANCE_STATE.students = roster.map(s => ({
        ...s,
        status: 'pending'
      }));
      ATTENDANCE_STATE.searchQuery = '';
      ATTENDANCE_STATE.status = 'loaded';

      renderAttendanceView();
      updateTakeAttendanceHeader();
      updateFacultyDashboardLiveMetrics();
      showToast(`Lecture No. ${sessionDto.lectureNumber} started: ${ATTENDANCE_STATE.students.length} students rostered (Recording)`);
      refreshIcons();

    } catch (err) {
      console.error('Failed to start attendance session:', err);
      ATTENDANCE_STATE.status = 'initial';
      ACTIVE_LECTURE = null;
      renderAttendanceView();
      updateTakeAttendanceHeader();
      showToast(err.message || 'Failed to start session on backend', 'danger');
      return;
    }
  } else {
    // Offline / Demo evaluation fallback
    const lectureNo = getNextLectureNumber(effectiveSubject, sec);
    ACTIVE_LECTURE = {
      id: `sess-${Date.now()}`,
      subject: effectiveSubject,
      subjectName: effectiveSubject,
      subjectId: (CURRENT_USER && CURRENT_USER.subjectId) || 'operating-system',
      subjectCodeShort: (CURRENT_USER && CURRENT_USER.subjectCodeShort) || 'OS',
      faculty: faculty,
      facultyId: facultyId,
      facultyName: faculty,
      section: sec,
      sec: sec,
      semester: parseInt(sem) || 3,
      date: date,
      timetableEntryId: ttEntry ? ttEntry.id : null,
      period: ttEntry ? ttEntry.period : 'I',
      periodStart: ttEntry ? ttEntry.periodStart : 1,
      periodEnd: ttEntry ? ttEntry.periodEnd : 1,
      startTime: ttEntry ? ttEntry.startTime : '09:00 AM',
      endTime: ttEntry ? ttEntry.endTime : '09:50 AM',
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

    setTimeout(() => {
      ATTENDANCE_STATE.students = getRosterForClass(dept, sem, sec);
      ATTENDANCE_STATE.searchQuery = '';
      ATTENDANCE_STATE.status = 'loaded';
      renderAttendanceView();
      updateTakeAttendanceHeader();
      updateFacultyDashboardLiveMetrics();
      showToast(`Lecture No. ${lectureNo} started: ${ATTENDANCE_STATE.students.length} students rostered (Recording)`);
      refreshIcons();
    }, 200);
  }
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


/**
 * Phase 6.1: Calculate live attendance statistics for an individual student for a specific subject and section.
 * Strictly scoped to completed live sessions in SESSIONS_DATA / LIVE_ATTENDANCE_RECORDS.
 * Do NOT count recording sessions, cancelled sessions, historical Section-A snapshot, or timetable slots.
 */
function getStudentLiveAttendanceForSubjectAndSection(roll, subject, section) {
  const completedSessions = SESSIONS_DATA.filter(s =>
    s.status === 'completed' &&
    (s.sec === section || s.section === section) &&
    (s.course === subject || s.subject === subject || s.subjectName === subject)
  );

  const conductedLectures = completedSessions.length;
  if (conductedLectures === 0) {
    return {
      conducted: 0,
      attended: 0,
      displayCount: '— / 0',
      pct: null,
      pctDisplay: '--',
      lastPresentDate: 'Pending Session'
    };
  }

  let attendedLectures = 0;
  let lastPresentDate = null;

  // Scan sessions (SESSIONS_DATA is unshifted, so index 0 is newest)
  completedSessions.forEach(sess => {
    const liveRec = (typeof LIVE_ATTENDANCE_RECORDS !== 'undefined')
      ? LIVE_ATTENDANCE_RECORDS.find(r => r.id === sess.id || (r.lectureNo === sess.lectureNo && r.subject === sess.subject && r.sec === sess.sec))
      : null;

    if (liveRec && liveRec.studentRecords) {
      const sr = liveRec.studentRecords.find(r => r.roll === roll || r.studentId === roll);
      if (sr && (sr.status || '').toUpperCase() === 'PRESENT') {
        attendedLectures++;
        if (!lastPresentDate) {
          lastPresentDate = sess.date || 'Today';
        }
      }
    }
  });

  const pct = Number(((attendedLectures / conductedLectures) * 100).toFixed(1));

  return {
    conducted: conductedLectures,
    attended: attendedLectures,
    displayCount: `${attendedLectures} / ${conductedLectures}`,
    pct: pct,
    pctDisplay: `${pct}%`,
    lastPresentDate: lastPresentDate || 'No Attendance Yet'
  };
}
window.getStudentLiveAttendanceForSubjectAndSection = getStudentLiveAttendanceForSubjectAndSection;

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

    <!-- Student Attendance Table (Phase 6.1: 8 Columns including LECTURES ATTENDED) -->
    <div class="att-table-wrapper ${isMarkPresent ? 'mode-present-active' : 'mode-absent-active'}">
      <table class="att-table" id="att-students-table">
        <thead>
          <tr>
            <th style="width: 45px;">#</th>
            <th style="width: 130px;">Roll Number</th>
            <th>Student Name</th>
            <th style="width: 110px;">Attendance %</th>
            <th style="width: 140px;">Lectures Attended</th>
            <th style="width: 120px;">Last Present</th>
            <th style="width: 140px; text-align: center;">Status</th>
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
        <td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">
          No enrolled students match your search filter.
        </td>
      </tr>
    `;
  }

  const info = ATTENDANCE_STATE.classInfo || {};
  const currentSubject = (CURRENT_USER && CURRENT_USER.role === 'faculty')
    ? CURRENT_USER.subjectName
    : (info.subject || 'Operating System');
  const currentSec = info.sec || 'A';

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

    const liveStats = getStudentLiveAttendanceForSubjectAndSection(s.roll, currentSubject, currentSec);

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
        <td>
          <span style="font-weight: 600; color: ${liveStats.pct !== null ? (liveStats.pct >= ATTENDANCE_THRESHOLD ? 'var(--text-primary)' : 'var(--danger)') : 'var(--text-muted)'};">
            ${liveStats.pctDisplay}
          </span>
        </td>
        <td>
          <span style="font-weight: 600; color: var(--text-primary); font-family: monospace; font-size: 13px;">
            ${liveStats.displayCount}
          </span>
        </td>
        <td style="color: var(--text-secondary); font-size: 13px;">
          ${escapeHtml(liveStats.lastPresentDate)}
        </td>
        <td style="text-align: center;" id="badge-td-${s.id}">
          <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            ${statusBadge}
            <div style="display: inline-flex; gap: 3px;" onclick="event.stopPropagation()">
              <button type="button" class="att-quick-mark-btn ${s.status === 'present' ? 'att-quick-p active' : 'btn-outline'}" onclick="setStudentAttendanceStatus('${escapeHtml(s.roll)}', 'present')" title="Mark Present">P</button>
              <button type="button" class="att-quick-mark-btn ${s.status === 'absent' ? 'att-quick-a active' : 'btn-outline'}" onclick="setStudentAttendanceStatus('${escapeHtml(s.roll)}', 'absent')" title="Mark Absent">A</button>
            </div>
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
        <button class="btn btn-primary" onclick="showPage('dashboard', null)">
          <i data-lucide="home" class="icon-sm"></i>
          <span>Back to Dashboard</span>
        </button>
        <button class="btn btn-outline" onclick="resetAttendanceAction()">
          <i data-lucide="plus" class="icon-sm"></i>
          <span>Record Another Class</span>
        </button>
        <button class="btn btn-outline" onclick="showPage('attendance', null)">
          <i data-lucide="eye" class="icon-sm"></i>
          <span>Watch Attendance</span>
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

async function saveAttendanceAction() {
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

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const completedDate = ATTENDANCE_STATE.classInfo.date || 'Today';

  const token = getStoredAuthToken();
  const isBackendSession = typeof ACTIVE_LECTURE.id === 'number';
  let backendResponse = null;

  if (token && isBackendSession) {
    const submissionPayload = {
      facultyId: (typeof CURRENT_USER.facultyId === 'number') ? CURRENT_USER.facultyId : undefined,
      facultyCode: CURRENT_USER.facultyCode || undefined,
      records: ATTENDANCE_STATE.students.map(s => ({
        studentId: (typeof s.id === 'number') ? s.id : undefined,
        rollNumber: s.roll || s.rollNumber,
        status: (s.status === 'present' ? 'PRESENT' : 'ABSENT')
      }))
    };

    try {
      backendResponse = await apiClient.post(`/sessions/${ACTIVE_LECTURE.id}/submit`, submissionPayload);
      if (!backendResponse || backendResponse.status !== 'SUCCESS') {
        throw new Error((backendResponse && backendResponse.message) || 'Backend submission returned failure');
      }
    } catch (err) {
      console.error('Attendance submission failed on backend:', err);
      showToast(err.message || 'Attendance submission failed on server. Roster preserved.', 'danger');
      // STEP 16: Never simulate local success when backend returns error!
      return;
    }
  }

  // ONLY after backend returns successful submission (or offline demo):
  const actualSessionId = (backendResponse && backendResponse.sessionId) || ACTIVE_LECTURE.id;
  const actualLectureNo = (backendResponse && backendResponse.lectureNumber) || ACTIVE_LECTURE.lectureNumber || getNextLectureNumber(effectiveSubject, sectionName);
  const lectureNoDisplay = `Lecture No. ${actualLectureNo}`;

  const finalPresentCount = (backendResponse && backendResponse.presentCount !== undefined) ? backendResponse.presentCount : metrics.presentCount;
  const finalAbsentCount = (backendResponse && backendResponse.absentCount !== undefined) ? backendResponse.absentCount : metrics.absentCount;
  const finalTotal = (backendResponse && backendResponse.totalRecorded !== undefined) ? backendResponse.totalRecorded : metrics.total;
  const finalPct = finalTotal > 0 ? Number(((finalPresentCount / finalTotal) * 100).toFixed(1)) : metrics.presentPct;

  const newSessionRecord = {
    id: actualSessionId,
    lectureNo: actualLectureNo,
    lectureNumber: actualLectureNo,
    lectureNoDisplay,
    course: effectiveSubject,
    subject: effectiveSubject,
    subjectId: ACTIVE_LECTURE.subjectId || (CURRENT_USER && CURRENT_USER.subjectId) || 1,
    subjectName: effectiveSubject,
    subjectCodeShort: ACTIVE_LECTURE.subjectCodeShort || (CURRENT_USER && CURRENT_USER.subjectCodeShort) || 'OS',
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
    total: finalTotal,
    present: finalPresentCount,
    absent: finalAbsentCount,
    pct: finalPct,
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
    total: finalTotal,
    present: finalPresentCount,
    absent: finalAbsentCount,
    pct: finalPct,
    time: timeStr
  };

  ATTENDANCE_STATE.status = 'saved';
  renderAttendanceView();

  updateFacultyDashboardLiveMetrics();
  updateTakeAttendanceHeader();

  showToast(`Attendance recorded: Lecture ${actualLectureNo} (${finalPresentCount} Present, ${finalAbsentCount} Absent)`);
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
    ATTENDANCE_STATE.searchQuery = '';
  }

  renderSessions();
  renderRecentAttendanceLogs();
  updateFacultyDashboardLiveMetrics();
  updateTakeAttendanceHeader();
  renderAttendanceView();

  if (CURRENT_USER && CURRENT_USER.role === 'student') {
    renderStudentDashboard(CURRENT_USER.roll);
  }
  if (CURRENT_USER && CURRENT_USER.role === 'hod') {
    renderHodOverview();
    renderHodMasterTimetable('A');
  }
}
window.resetLiveAttendanceState = resetLiveAttendanceState;

function editCurrentAttendance() {
  ATTENDANCE_STATE.status = 'loaded';
  renderAttendanceView();
}

// ── 9. FULL-SCREEN STUDENT PROFILE & DETAIL ENGINE ───────────
async function openStudentProfile(studentIdOrRoll) {
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

  // Phase 7C.4A: Authoritative Backend Live Attendance metrics on profile
  let backendSummary = null;
  let studentHistory = [];
  const token = getStoredAuthToken();
  if (token && student.id && typeof AcademicDataService !== 'undefined') {
    if (AcademicDataService.loadStudentSummary) {
      try {
        backendSummary = await AcademicDataService.loadStudentSummary(student.id);
      } catch (err) {
        console.warn('Backend student summary read failed in profile:', err);
      }
    }
    if (AcademicDataService.loadStudentHistory) {
      try {
        studentHistory = await AcademicDataService.loadStudentHistory(student.id);
      } catch (err) {
        console.warn('Backend student history read failed in profile:', err);
      }
    }
  }
  student._history = studentHistory;

  let totalCompleted = 0;
  let liveAttendedCount = 0;
  let liveMissedCount = 0;
  let livePct = null;

  if (backendSummary) {
    totalCompleted = backendSummary.completedEligibleSessions || 0;
    liveAttendedCount = backendSummary.attendedSessions || 0;
    liveMissedCount = Math.max(0, totalCompleted - liveAttendedCount);
    livePct = backendSummary.overallPercentage;
  } else {
    const sectionCompleted = SESSIONS_DATA.filter(s => s.status === 'completed' && s.sec === student.sec);
    totalCompleted = sectionCompleted.length;
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
    livePct = totalCompleted > 0 ? Number(((liveAttendedCount / totalCompleted) * 100).toFixed(1)) : null;
  }

  const spTotal = document.getElementById('sp-total-held');
  const spAtt = document.getElementById('sp-attended');
  const spAbs = document.getElementById('sp-absent');
  const spPct = document.getElementById('sp-pct');

  if (spTotal) spTotal.textContent = totalCompleted;
  if (spAtt) spAtt.textContent = liveAttendedCount;
  if (spAbs) spAbs.textContent = liveMissedCount;
  if (spPct) spPct.textContent = livePct !== null ? `${livePct}%` : '--';

  const spMainConducted = document.getElementById('sp-main-conducted');
  if (spMainConducted) spMainConducted.textContent = totalCompleted;

  const spStatusBadge = document.getElementById('sp-status-badge');
  if (spStatusBadge) {
    if (totalCompleted === 0) {
      spStatusBadge.textContent = 'PRE-COMMENCEMENT';
      spStatusBadge.className = 'badge';
    } else if (livePct >= ATTENDANCE_THRESHOLD) {
      spStatusBadge.textContent = 'GOOD ATTENDANCE (≥ 75%)';
      spStatusBadge.className = 'badge badge-ok';
    } else {
      spStatusBadge.textContent = 'BELOW 75%';
      spStatusBadge.className = 'badge badge-risk';
    }
  }

  const sessHistContainer = document.getElementById('sp-session-history-container');
  if (sessHistContainer) {
    if (studentHistory && studentHistory.length > 0) {
      sessHistContainer.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Lecture No.</th>
                <th>Course / Subject</th>
                <th>Period</th>
                <th>Faculty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${studentHistory.map(h => {
                const isPres = (h.status || '').toUpperCase() === 'PRESENT';
                return `
                  <tr>
                    <td><strong>${escapeHtml(h.date || '—')}</strong></td>
                    <td>Lecture No. ${escapeHtml(h.lectureNumber || '—')}</td>
                    <td>${escapeHtml(h.courseName || '—')}</td>
                    <td>${escapeHtml(h.period || '—')}</td>
                    <td>${escapeHtml(h.facultyName || 'Faculty')}</td>
                    <td>
                      <span class="badge ${isPres ? 'badge-ok' : 'badge-risk'}">
                        ${isPres ? 'PRESENT' : 'ABSENT'}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      sessHistContainer.innerHTML = `
        <div style="padding: 28px 20px; text-align: center; color: var(--text-muted); font-size: 13.5px; background: var(--surface-muted); border-radius: var(--radius-md); border: 1px dashed var(--border);">
          No lecture sessions conducted yet for 3rd Semester 2026.
        </div>
      `;
    }
  }

  // Populate Course Modules with 5 official subjects
  const coursesBody = document.getElementById('sp-courses-body');
  if (coursesBody) {
    if (backendSummary && backendSummary.courses && backendSummary.courses.length > 0) {
      coursesBody.innerHTML = backendSummary.courses.map(c => {
        const fac = getFacultyForSubject(c.courseName);
        const sCompleted = c.totalCompleted || 0;
        const sAttended = c.attended || 0;
        const sPct = c.percentage;
        const sPctDisplay = sPct !== null ? `${sPct}%` : '--';
        const isEligible = sPct !== null && sPct >= ATTENDANCE_THRESHOLD;

        return `
          <tr>
            <td><strong>${escapeHtml(c.courseName)}</strong></td>
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
    } else {
      const sectionCompleted = SESSIONS_DATA.filter(s => s.status === 'completed' && s.sec === student.sec);
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
  }

  // Phase 8 Requirement 10: Render Student Attendance Visualizations
  renderStudentAttendanceVisualizations(student, livePct, liveAttendedCount, liveMissedCount, totalCompleted);

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
async function renderSessions() {
  const grid = document.getElementById('sessions-grid');
  if (!grid) return;

  const token = getStoredAuthToken();
  if (token && CURRENT_USER && CURRENT_USER.facultyId) {
    try {
      await AcademicDataService.loadFacultySessions(CURRENT_USER.facultyId);
    } catch (e) {
      console.warn('Failed to load faculty sessions:', e);
    }
  }

  const completedSessions = (SESSIONS_DATA || []).filter(s => (s.status || '').toLowerCase() === 'completed');

  if (completedSessions.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; color: var(--text-muted); background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius-md);">
        <i data-lucide="calendar" class="icon-md" style="margin-bottom: 8px; opacity: 0.5;"></i>
        <div style="font-weight: 600; font-size: 14px; color: var(--text-primary); margin-bottom: 4px;">No Live Sessions Recorded</div>
        <div>No instructional lectures have been completed yet for this term. Recorded sessions will appear here.</div>
      </div>
    `;
    refreshIcons();
    return;
  }
  grid.innerHTML = completedSessions.map(s => `
    <div class="session-card">
      <div class="session-card-header">
        <div>
          <div class="session-card-title">${escapeHtml(s.course || s.subjectName || s.subject)}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            ${escapeHtml(s.dept || 'CSE')} · Semester ${s.sem || s.semester || 3} (Section ${s.sec || s.section || 'A'})
          </div>
        </div>
        <span class="badge badge-completed">COMPLETED</span>
      </div>
      <div class="session-card-meta">
        <div class="session-meta-row"><i data-lucide="hash" class="icon-sm"></i> ${escapeHtml(s.lectureNoDisplay || `Lecture No. ${s.lectureNumber || s.lectureNo || 1}`)} &middot; Period ${escapeHtml(s.period || 'I')}</div>
        <div class="session-meta-row"><i data-lucide="clock" class="icon-sm"></i> ${escapeHtml(s.time || s.completedAt || '09:00 AM')} &middot; ${escapeHtml(s.room || 'Classroom 301')}</div>
        <div class="session-meta-row"><i data-lucide="user" class="icon-sm"></i> Faculty: ${escapeHtml(s.facultyName || s.faculty || 'Devbrat Sahu')}</div>
        <div class="session-meta-row"><i data-lucide="check-circle-2" class="icon-sm"></i> Present: <strong>${s.present || 0}/${s.total || 0}</strong> &middot; Attendance Rate: <strong style="color: var(--primary);">${s.pct !== undefined && s.pct !== null ? s.pct + '%' : '--'}</strong></div>
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
    closeTimetableModal();
    toggleSidebar(false);
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

async function handleLoginSubmit(event) {
  if (event) event.preventDefault();
  const username = (document.getElementById('login-username').value || '').trim();
  const password = (document.getElementById('login-password').value || '').trim();
  const rememberCheckbox = document.getElementById('login-remember');
  const remember = rememberCheckbox ? rememberCheckbox.checked : true;
  const errEl = document.getElementById('login-error-msg');
  const submitBtn = document.getElementById('login-submit-btn');

  if (!username || !password) {
    if (errEl) {
      errEl.textContent = 'Please enter both Institutional User ID and Password.';
      errEl.style.display = 'block';
    }
    return;
  }

  if (errEl) {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }

  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="att-spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:8px;vertical-align:middle;"></span> Authenticating...';
  }

  try {
    // ── STEP 3: POST /api/auth/login ──
    const loginRes = await apiClient.post('/auth/login', { username, password });

    if (!loginRes || !loginRes.token) {
      throw new Error('Authentication failed: Missing token from backend response.');
    }

    // Persist JWT token in local/session storage using canonical key 'smartattend_token'
    setStoredAuthToken(loginRes.token, remember);

    // Sync academic read APIs with authenticated context
    try {
      await AcademicDataService.loadAllAcademicData();
    } catch (e) {
      console.warn('Academic data sync on login encountered an issue:', e);
    }

    // ── STEP 4: GET /api/auth/me verification ──
    const meProfile = await apiClient.get('/auth/me');
    if (!meProfile || !meProfile.role) {
      throw new Error('Failed to verify user profile via /api/auth/me');
    }

    // Determine normalized role directly from backend response (STUDENT, FACULTY, HOD)
    const backendRole = (meProfile.role || loginRes.role || '').toLowerCase();

    let sessionData = null;

    if (backendRole === 'student') {
      const studentRoll = meProfile.username || loginRes.rollNumber || username;
      const foundStu = (typeof STUDENTS !== 'undefined' ? STUDENTS : []).find(s => s.roll === studentRoll) || null;
      sessionData = {
        role: 'student',
        userId: studentRoll,
        displayName: meProfile.displayName || (foundStu && foundStu.name) || studentRoll,
        dept: (foundStu && foundStu.dept) || 'CSE',
        roll: studentRoll,
        sem: (foundStu && foundStu.sem) || 3,
        sec: (foundStu && foundStu.sec) || 'A',
        isBackendAuthenticated: true
      };
    } else if (backendRole === 'hod') {
      sessionData = {
        role: 'hod',
        userId: meProfile.username || 'hod_cse',
        displayName: meProfile.displayName || 'Dr. Anand Tamrakar',
        name: meProfile.displayName || 'Dr. Anand Tamrakar',
        department: 'Computer Science & Engineering',
        institution: 'SSIPMT, Raipur',
        isBackendAuthenticated: true
      };
    } else {
      // faculty
      const facCode = loginRes.facultyCode || meProfile.username || 'faculty_os';
      const normId = facCode.replace('_', '-');
      const matchedFac = (typeof AUTHORITATIVE_FACULTY !== 'undefined' ? AUTHORITATIVE_FACULTY : [])
        .find(f => f.id === normId || f.id.replace('-', '_') === facCode || f.name === meProfile.displayName) || null;

      sessionData = {
        role: 'faculty',
        userId: facCode,
        facultyId: meProfile.facultyId || (matchedFac && matchedFac.id) || facCode,
        facultyName: meProfile.displayName || (matchedFac && matchedFac.name) || 'Faculty Member',
        name: meProfile.displayName || (matchedFac && matchedFac.name) || 'Faculty Member',
        displayName: meProfile.displayName || (matchedFac && matchedFac.name) || 'Faculty Member',
        subjectName: (matchedFac && matchedFac.subjectName) || 'Operating System',
        subjectId: matchedFac && matchedFac.subjectId,
        subjectCodeShort: (matchedFac && matchedFac.subjectCodeShort) || 'OS',
        shortCode: (matchedFac && matchedFac.shortCode) || 'DS',
        assignedSections: (matchedFac && matchedFac.assignedSections) || ['A', 'B'],
        sectionAllocationStatus: (matchedFac && matchedFac.sectionAllocationStatus) || 'Sections A, B Confirmed (Sections C, D Pending)',
        dept: 'CSE',
        isBackendAuthenticated: true
      };
    }

    if (remember) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
    } else {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
      localStorage.removeItem(AUTH_SESSION_KEY);
    }

    if (errEl) errEl.style.display = 'none';
    applySessionUI(sessionData);
    showToast(`Signed in as ${sessionData.displayName} (${sessionData.role.toUpperCase()})`);

  } catch (err) {
    console.error('handleLoginSubmit error:', err);

    // If network connection error, support offline demo mode for evaluation accounts
    if (err.isNetworkError) {
      console.warn('Backend unavailable; checking evaluation demo accounts...');
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
        const sessionData = {
          role: matchedDemo.role,
          userId: matchedDemo.id,
          displayName: matchedDemo.name,
          dept: matchedDemo.dept,
          roll: matchedDemo.roll || null,
          sem: matchedDemo.sem || null,
          sec: matchedDemo.sec || null,
          assignedSubject: matchedDemo.assignedSubject || null,
          isBackendAuthenticated: false
        };
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
        if (errEl) errEl.style.display = 'none';
        applySessionUI(sessionData);
        showToast(`Offline Demo Mode: Signed in as ${sessionData.displayName} (${sessionData.role.toUpperCase()})`);
        return;
      }
    }

    // Specific error messages
    let msg = 'Invalid credentials. Please verify your Institutional User ID and password.';
    if (err.status === 401) {
      msg = 'Invalid credentials. Please verify your Institutional User ID and password.';
    } else if (err.status === 403) {
      msg = 'Access Denied: You do not have permissions for this portal.';
    } else if (err.status === 400) {
      msg = err.message || 'Invalid request format.';
    } else if (err.status === 404) {
      msg = 'Authentication endpoint not found (404).';
    } else if (err.isNetworkError || err.status === 0) {
      msg = 'Unable to connect to backend at http://localhost:8080/api. Ensure Spring Boot is running.';
    } else if (err.status >= 500) {
      msg = `Server error (${err.status}). Please try again later.`;
    }

    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = 'block';
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
      refreshIcons();
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
  clearAuthTokens();
  CURRENT_USER = null;
  document.body.classList.remove('app-mode');
  document.body.classList.add('landing-mode');
  const pInput = document.getElementById('login-password');
  const errEl = document.getElementById('login-error-msg');
  if (pInput) pInput.value = '';
  if (errEl) {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }
  showToast('Signed out of SmartAttend');
  refreshIcons();
}

function switchSession(roleKey) {
  const account = DEMO_ACCOUNTS[roleKey] || DEMO_ACCOUNTS.faculty;
  let sessionData;
  if (roleKey === 'student') {
    sessionData = {
      role: 'student',
      userId: account.id,
      displayName: account.name,
      roll: account.id,
      dept: 'CSE',
      sem: 3,
      sec: 'A'
    };
  } else if (roleKey === 'hod') {
    sessionData = {
      role: 'hod',
      name: 'Anand Sir',
      userId: account.id,
      displayName: 'Anand Sir',
      department: 'Computer Science & Engineering',
      institution: 'SSIPMT, Raipur'
    };
  } else {
    // faculty
    const facId = (account.facultyId || account.id || 'faculty-os').replace('_', '-');
    const fac = AUTHORITATIVE_FACULTY.find(f => f.id === facId || f.name === account.name) || AUTHORITATIVE_FACULTY[0];
    sessionData = {
      role: 'faculty',
      userId: fac.id,
      facultyId: fac.id,
      facultyName: fac.name,
      name: fac.name,
      displayName: fac.name,
      subjectName: fac.subjectName,
      subjectId: fac.subjectId,
      subjectCodeShort: fac.subjectCodeShort || 'OS',
      shortCode: fac.shortCode || 'DS',
      assignedSections: ['A', 'B'],
      sectionAllocationStatus: 'Sections A, B Confirmed (Sections C, D Pending)'
    };
  }
  applySessionUI(sessionData);
  return sessionData;
}
window.switchSession = switchSession;

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
    CURRENT_USER = {
      role: 'student',
      name: session.displayName || 'Aryansh Sharma',
      displayName: session.displayName || 'Aryansh Sharma',
      roll: session.roll || '303302225048',
      dept: 'CSE',
      sem: 3,
      sec: 'A'
    };
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
    CURRENT_USER = {
      role: 'hod',
      name: 'Anand Sir',
      displayName: 'Anand Sir',
      department: 'Computer Science & Engineering',
      institution: 'SSIPMT, Raipur'
    };
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
    const normId = String(session.facultyCode || session.userId || session.facultyId || 'faculty-os').replace('_', '-');
    const faculty = AUTHORITATIVE_FACULTY.find(f => f.id === normId || f.id.replace('-', '_') === normId || f.name === session.displayName || f.name === session.facultyName) || AUTHORITATIVE_FACULTY[0];

    CURRENT_USER = {
      role: 'faculty',
      id: faculty.id,
      facultyId: faculty.facultyId || 1,
      facultyCode: faculty.facultyCode || 'faculty_os',
      facultyName: faculty.name,
      subjectId: faculty.subjectId,
      subjectName: faculty.subjectName,
      subjectCodeShort: faculty.subjectCodeShort || 'OS',
      shortCode: faculty.shortCode || 'DS',
      assignedSections: faculty.assignedSections || ['A', 'B'],
      sectionAllocationStatus: faculty.sectionAllocationStatus || 'Sections A, B Confirmed (Sections C, D Pending)'
    };

    // Step 6: Dynamic allocations query (GET /api/faculty/{id}/allocations)
    const backendFacId = faculty.facultyId || (typeof session.facultyId === 'number' ? session.facultyId : null);
    if (backendFacId) {
      apiClient.get(`/faculty/${backendFacId}/allocations`).then(allocations => {
        if (Array.isArray(allocations) && allocations.length > 0) {
          const confirmedSecs = [...new Set(allocations.map(a => a.sectionName || a.section))].filter(Boolean);
          if (confirmedSecs.length > 0) {
            CURRENT_USER.assignedSections = confirmedSecs;
            CURRENT_USER.sectionAllocationStatus = `Sections ${confirmedSecs.join(', ')} Confirmed (Sections C, D Pending)`;
            const dashSecStatus = document.getElementById('dash-fac-sec-status');
            if (dashSecStatus) dashSecStatus.textContent = CURRENT_USER.sectionAllocationStatus;
          }
        }
      }).catch(err => {
        console.warn('Could not fetch faculty allocations from backend:', err);
      });

      AcademicDataService.loadFacultySessions(backendFacId).then(() => {
        updateFacultyDashboardLiveMetrics();
      }).catch(err => {
        console.warn('Could not sync faculty sessions:', err);
      });
    }

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
    updateDashboardGreeting();
    renderTodayLectures(CURRENT_SCHEDULE_DAY);
    renderWatchAttendancePage('A');
    showPage('dashboard', document.querySelector('#nav-group-faculty [data-page="dashboard"]'));
    initCharts();
  }
  refreshIcons();
}

async function initAuth() {
  if (typeof AcademicDataService !== 'undefined' && !AcademicDataService.isLoaded) {
    try {
      await AcademicDataService.loadAllAcademicData();
    } catch (_) {}
  }
  const token = getStoredAuthToken();
  const sessionStr = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY);

  if (token) {
    try {
      // Authoritatively verify token with GET /api/auth/me
      const me = await apiClient.get('/auth/me');
      if (me && me.role) {
        const backendRole = (me.role || '').toLowerCase();
        let session = null;

        if (backendRole === 'student') {
          const studentRoll = me.username;
          const foundStu = (typeof STUDENTS !== 'undefined' ? STUDENTS : []).find(s => s.roll === studentRoll) || null;
          session = {
            role: 'student',
            userId: studentRoll,
            displayName: me.displayName || (foundStu && foundStu.name) || studentRoll,
            dept: (foundStu && foundStu.dept) || 'CSE',
            roll: studentRoll,
            sem: (foundStu && foundStu.sem) || 3,
            sec: (foundStu && foundStu.sec) || 'A',
            isBackendAuthenticated: true
          };
        } else if (backendRole === 'hod') {
          session = {
            role: 'hod',
            userId: me.username || 'hod_cse',
            displayName: me.displayName || 'Dr. Anand Tamrakar',
            name: me.displayName || 'Dr. Anand Tamrakar',
            department: 'Computer Science & Engineering',
            institution: 'SSIPMT, Raipur',
            isBackendAuthenticated: true
          };
        } else {
          // faculty
          const facCode = me.username || 'faculty_os';
          const normId = facCode.replace('_', '-');
          const matchedFac = (typeof AUTHORITATIVE_FACULTY !== 'undefined' ? AUTHORITATIVE_FACULTY : [])
            .find(f => f.id === normId || f.id.replace('-', '_') === facCode || f.name === me.displayName) || null;

          session = {
            role: 'faculty',
            userId: facCode,
            facultyId: me.facultyId || (matchedFac && matchedFac.id) || facCode,
            facultyName: me.displayName || (matchedFac && matchedFac.name) || 'Faculty Member',
            name: me.displayName || (matchedFac && matchedFac.name) || 'Faculty Member',
            displayName: me.displayName || (matchedFac && matchedFac.name) || 'Faculty Member',
            subjectName: (matchedFac && matchedFac.subjectName) || 'Operating System',
            subjectId: matchedFac && matchedFac.subjectId,
            subjectCodeShort: (matchedFac && matchedFac.subjectCodeShort) || 'OS',
            shortCode: (matchedFac && matchedFac.shortCode) || 'DS',
            assignedSections: (matchedFac && matchedFac.assignedSections) || ['A', 'B'],
            sectionAllocationStatus: (matchedFac && matchedFac.sectionAllocationStatus) || 'Sections A, B Confirmed (Sections C, D Pending)',
            dept: 'CSE',
            isBackendAuthenticated: true
          };
        }

        // Cache refreshed profile
        if (localStorage.getItem(AUTH_TOKEN_KEY)) {
          localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
        } else {
          sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
        }

        applySessionUI(session);
        return;
      } else {
        clearAuthTokens();
      }
    } catch (err) {
      console.warn('Authentication verification via /me failed:', err);
      // Clear token & session if unauthorized / invalid
      clearAuthTokens();
      // If network error occurred, check if there was a cached offline demo session
      if (err.isNetworkError && sessionStr) {
        try {
          const cachedSession = JSON.parse(sessionStr);
          if (cachedSession && cachedSession.role && !cachedSession.isBackendAuthenticated) {
            applySessionUI(cachedSession);
            return;
          }
        } catch (_) {}
      }
    }
  } else if (sessionStr) {
    // No token, check if there is an active offline demo session
    try {
      const session = JSON.parse(sessionStr);
      if (session && session.role && !session.isBackendAuthenticated) {
        applySessionUI(session);
        return;
      }
    } catch (e) {
      clearAuthTokens();
    }
  }

  // Not authenticated -> return to landing
  clearAuthTokens();
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
      const subjSessions = SESSIONS_DATA.filter(s => s.status === 'completed' && (s.subject === subj || s.course === subj || s.subjectName === subj));
      const sCompleted = subjSessions.length;
      let sPresents = 0;
      let sTotalMarks = 0;
      subjSessions.forEach(s => {
        sPresents += (s.present || 0);
        sTotalMarks += (s.total || 0);
      });
      const sAvg = sTotalMarks > 0 ? Number(((sPresents / sTotalMarks) * 100).toFixed(1)) : null;

      return `
        <tr>
          <td><strong>${escapeHtml(subj)}</strong> <span style="font-size:11px; color:var(--text-muted);">(Core Module)</span></td>
          <td><strong>${escapeHtml(fac)}</strong></td>
          <td>${sCompleted} sessions</td>
          <td><span style="font-weight:700; color: ${sAvg !== null ? 'var(--text-primary)' : 'var(--text-muted)'};">${sAvg !== null ? sAvg + '%' : '--'}</span></td>
          <td><span class="badge" style="background:var(--surface-muted); color:var(--text-secondary); border:1px solid var(--border);">${sPresents} / ${sTotalMarks} marks</span></td>
          <td>
            <span class="badge ${sAvg === null ? '' : (sAvg >= ATTENDANCE_THRESHOLD ? 'badge-ok' : 'badge-risk')}" style="${sAvg === null ? 'background:var(--surface-muted); color:var(--text-secondary); border:1px solid var(--border);' : ''}">
              ${sAvg === null ? 'PENDING' : (sAvg >= ATTENDANCE_THRESHOLD ? 'COMPLIANT' : 'WATCH')}
            </span>
          </td>
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



async function renderStudentDashboard(roll) {
  let student = null;
  if (roll) {
    student = (STUDENTS || []).find(s => s.roll === roll || s.studentId === roll || s.id === roll);
  } else if (CURRENT_USER && CURRENT_USER.role === 'student') {
    student = (STUDENTS || []).find(s => s.id === CURRENT_USER.studentId || s.roll === CURRENT_USER.rollNumber || s.roll === CURRENT_USER.userId);
  }
  if (!student) student = (STUDENTS || [])[0];
  if (!student) return;

  const welcomeTitle = document.getElementById('stu-welcome-title');
  const welcomeSub = document.getElementById('stu-welcome-subtitle');
  if (welcomeTitle) welcomeTitle.textContent = `Good morning, ${student.name.split(' ')[0]}`;
  if (welcomeSub) welcomeSub.textContent = `Roll No: ${student.roll} · S.No #${student.sno || '—'} · Computer Science & Engineering · Semester ${student.sem} (Section ${student.sec})`;

  // Phase 7C.4A: Authoritative Student Attendance Summary & History from Spring Boot
  let backendSummary = null;
  let backendHistory = null;
  const token = getStoredAuthToken();

  if (token && student.id && typeof AcademicDataService !== 'undefined') {
    try {
      const [sumRes, histRes] = await Promise.allSettled([
        AcademicDataService.loadStudentSummary(student.id),
        AcademicDataService.loadStudentHistory(student.id)
      ]);
      if (sumRes.status === 'fulfilled') backendSummary = sumRes.value;
      if (histRes.status === 'fulfilled') backendHistory = histRes.value;
    } catch (e) {
      console.warn('Backend student attendance read failed:', e);
    }
  }

  let totalCompleted = 0;
  let attendedCount = 0;
  let missedCount = 0;
  let livePct = null;
  let coursesList = null;
  let historyRows = [];

  if (backendSummary) {
    totalCompleted = backendSummary.completedEligibleSessions || 0;
    attendedCount = backendSummary.attendedSessions || 0;
    missedCount = Math.max(0, totalCompleted - attendedCount);
    livePct = backendSummary.overallPercentage;
    coursesList = backendSummary.courses;
  } else {
    // Fallback to local calculation
    const sectionCompleted = SESSIONS_DATA.filter(s => s.status === 'completed' && s.sec === student.sec);
    totalCompleted = sectionCompleted.length;
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
    livePct = totalCompleted > 0 ? Number(((attendedCount / totalCompleted) * 100).toFixed(1)) : null;
  }

  if (backendHistory && Array.isArray(backendHistory) && backendHistory.length > 0) {
    historyRows = backendHistory.map(h => ({
      date: h.date,
      time: h.time || (h.markedAt ? new Date(h.markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'),
      markedAt: h.markedAt ? new Date(h.markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : (h.time || '—'),
      subject: h.courseName || h.courseCodeShort,
      lectureNo: h.lectureNumber || 1,
      period: h.period || 'I',
      faculty: h.facultyName || 'Faculty',
      room: h.room || 'Classroom 301',
      status: (h.status || '').toUpperCase() === 'PRESENT' ? 'PRESENT' : 'ABSENT'
    }));
  }

  // Update compliance banner
  const bannerEl = document.getElementById('stu-compliance-banner');
  if (bannerEl) {
    if (totalCompleted === 0) {
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
      const isCompliant = livePct !== null && livePct >= ATTENDANCE_THRESHOLD;
      const margin = livePct !== null ? (livePct - ATTENDANCE_THRESHOLD).toFixed(1) : 0;
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
                ? `Your aggregate attendance rate of <strong>${livePct}%</strong> complies with criteria. Safety margin: <strong>+${margin}%</strong>.`
                : `Your attendance rate of <strong>${livePct}%</strong> is below the 75% threshold.`
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

  // Dynamic Academic Advisory
  const advEl = document.getElementById('stu-advisory-desc');
  if (advEl) {
    if (totalCompleted === 0) {
      advEl.innerHTML = `<strong>Term Advisory:</strong> Departmental lectures for 3rd Semester 2026 are preparing to commence. Attend all upcoming instructional sessions in your 5 core modules (<strong>Operating System, Discrete Mathematics, OOPS in C++, Web Technology, Digital Electronics</strong>) to build a solid compliance record early in the term.`;
    } else if (livePct !== null && livePct >= ATTENDANCE_THRESHOLD) {
      advEl.innerHTML = `Based on your attendance consistency over <strong>${totalCompleted} completed instructional sessions</strong>, you maintain an aggregate safety margin above the 75% threshold.`;
    } else {
      advEl.innerHTML = `<strong>Attention Required:</strong> Your current attendance is below the 75% threshold. Regular attendance is required before semester examination registration.`;
    }
  }

  // Update 5 Core Subject Breakdown
  const subjContainer = document.getElementById('stu-subjects-container');
  if (subjContainer) {
    if (coursesList && coursesList.length > 0) {
      subjContainer.innerHTML = coursesList.map((c, idx) => {
        const fac = getFacultyForSubject(c.courseName);
        const sCompleted = c.totalCompleted || 0;
        const sAttended = c.attended || 0;
        const sPct = c.percentage;
        const sPctDisplay = sPct !== null ? `${sPct}%` : '--';
        const isEligible = sPct !== null && sPct >= ATTENDANCE_THRESHOLD;

        return `
          <div class="card" style="padding: 16px; border: 1px solid var(--border); background: var(--surface);">
            <div style="font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase;">${escapeHtml(c.courseName)}</div>
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
    } else {
      const sectionCompleted = SESSIONS_DATA.filter(s => s.status === 'completed' && s.sec === student.sec);
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
          <td><code>${escapeHtml(r.markedAt || r.time)}</code></td>
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
window.addEventListener('DOMContentLoaded', async () => {
  try {
    if (typeof AcademicDataService !== 'undefined') {
      await AcademicDataService.loadAllAcademicData();
    }
  } catch (err) {
    console.warn('[SmartAttend] Backend data load failed, using fallback:', err);
  }
  await initAuth();
  updateDate();
  updateDashboardGreeting();
  renderTodayLectures(CURRENT_SCHEDULE_DAY);
  renderStudents(STUDENTS);
  renderRecentAttendanceLogs();
  renderSessions();
  generateReport();
  validateAcademicUniverse();
  refreshIcons();
});
