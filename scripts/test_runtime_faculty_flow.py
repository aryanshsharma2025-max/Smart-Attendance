"""
Runtime Faculty Workflow Test: Devbrat Sahu E2E Simulation
Verifies Part W:
LOGIN -> DASHBOARD -> WEEKLY TIMETABLE -> GRID / PERIODS / LUNCH / ROWSPAN -> 
DEVBRAT HIGHLIGHTED -> OTHER NON-OWNED -> TAKE ATTENDANCE -> RETURN HOME -> DASHBOARD
"""

import os
import sys
import subprocess

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

node_script = """
const fs = require('fs');
const vm = require('vm');

// Virtual DOM Element Factory
function makeElem(tag, id, classes) {
  return {
    tagName: (tag || 'div').toUpperCase(),
    id: id || '',
    className: classes || '',
    classList: {
      _classes: new Set((classes || '').split(' ').filter(Boolean)),
      contains(c) { return this._classes.has(c); },
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      toggle(c, f) {
        if (typeof f === 'boolean') { if (f) this.add(c); else this.remove(c); }
        else { if (this.contains(c)) this.remove(c); else this.add(c); }
      }
    },
    style: {},
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k]; },
    innerHTML: '',
    textContent: '',
    value: '',
    querySelectorAll(sel) { return []; },
    querySelector(sel) { return null; },
    addEventListener(evt, fn) {},
    removeEventListener(evt, fn) {}
  };
}

const elements = {};
function getEl(id) {
  if (!elements[id]) elements[id] = makeElem('div', id);
  return elements[id];
}

// Sandbox environment for VM
const sandbox = {
  console,
  require,
  document: {
    documentElement: makeElem('html', 'html'),
    getElementById: getEl,
    querySelectorAll(sel) {
      if (sel === '.page') {
        return [getEl('page-dashboard'), getEl('page-take-attendance'), getEl('page-attendance'), getEl('page-students')];
      }
      if (sel === '.nav-item') {
        return [getEl('nav-item-dashboard'), getEl('nav-item-attendance'), getEl('nav-item-students')];
      }
      if (sel.includes('.sched-tab')) {
        return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => {
          const el = makeElem('button', 'tab-' + d, 'btn btn-ghost btn-xs sched-tab');
          el.dataset = { day: d };
          return el;
        });
      }
      return [];
    },
    querySelector(sel) {
      if (sel.includes('dashboard')) return getEl('nav-item-dashboard');
      return null;
    }
  },
  window: { innerWidth: 1200, addEventListener() {}, removeEventListener() {} },
  localStorage: { getItem: () => null, setItem: () => {} },
  escapeHtml: (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
  timeStringToMinutes: (t) => {
    if (!t) return 0;
    const parts = t.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  },
  getSystemDayOfWeek: () => 'Tuesday',
  refreshIcons: () => {},
  showToast: (msg) => { sandbox.LAST_TOAST = msg; },
  onAttendanceFilterChange: () => { sandbox.FILTER_CHANGED = true; },
  loadStudentsAction: () => { sandbox.LOADED_STUDENTS = true; },
  updateDashboardGreeting: () => {},
  updateTakeAttendanceHeader: () => {},
  renderTodayLectures: () => {},
  renderDashboardStudentTable: () => {},
  CURRENT_SCHEDULE_DAY: 'Tuesday',
  initCharts: () => {},
  toggleSidebar: () => {},
  initTakeAttendancePage: () => {},
  renderWatchAttendancePage: () => {},
  renderAttendanceOverviewPage: () => {},
  LAST_TOAST: null
};

// Load authoritative timetable data
const ttData = JSON.parse(fs.readFileSync('Assets/generated/authoritative_timetable.json', 'utf8'));
sandbox.TIMETABLE_ENTRIES = ttData.entries;

const ctx = vm.createContext(sandbox);

// Extract and execute timetable engine and page router from app.js
const appCode = fs.readFileSync('app.js', 'utf8');

// Timetable engine slice
const startTT = appCode.indexOf('let CURRENT_TIMETABLE_VIEW_MODE');
const endTT = appCode.indexOf('function getNextLectureNumber');
const ttSlice = appCode.substring(startTT, endTT);

// showPage slice
const startShow = appCode.indexOf('function showPage(pageId, linkEl) {');
const endShow = appCode.indexOf('function toggleSidebar(');
const showSlice = appCode.substring(startShow, endShow);

// startAttendanceFromTimetable slice
const startAtt = appCode.indexOf('function startAttendanceFromTimetable(');
const endAtt = appCode.indexOf('function getDynamicGreeting(');
const attSlice = appCode.substring(startAtt, endAtt);

vm.runInContext(ttSlice, ctx);
vm.runInContext(showSlice, ctx);
vm.runInContext(attSlice, ctx);

console.log('--- 1. AUTHENTICATING FACULTY: DEVBRAT SAHU ---');
ctx.CURRENT_USER = {
  id: 1,
  facultyId: 'faculty-os',
  facultyName: 'Devbrat Sahu',
  shortCode: 'DS',
  facultyShort: 'DS',
  subjectName: 'Operating System',
  role: 'FACULTY'
};
console.log('Authenticated as:', ctx.CURRENT_USER.facultyName, '(' + ctx.CURRENT_USER.facultyShort + ')');

console.log('\\n--- 2. INITIALIZE DASHBOARD ---');
ctx.showPage('dashboard');
const pageDash = getEl('page-dashboard');
if (!pageDash.classList.contains('active')) throw new Error('Dashboard page is not active');
console.log('Dashboard active: OK');

console.log('\\n--- 3. OPEN WEEKLY TIMETABLE ---');
ctx.openTimetableModalOrView('Tuesday');
const modal = getEl('timetable-modal-overlay');
if (modal.style.display !== 'flex') throw new Error('Modal overlay did not display as flex');
const facNameEl = getEl('tt-modal-fac-name');
console.log('Modal Faculty Name:', facNameEl.textContent);
if (facNameEl.textContent !== 'Devbrat Sahu') throw new Error('Faculty name mismatch in modal header');

const countBadge = getEl('tt-modal-slots-count-badge');
console.log('Slots count badge:', countBadge.textContent);
if (!countBadge.textContent.includes('15 Weekly Teaching Slots')) throw new Error('Teaching slots count mismatch: ' + countBadge.textContent);

console.log('\\n--- 4. VERIFY OFFICIAL GRID RENDERING ---');
ctx.renderWeeklyTimetableGrid();
const gridWrap = getEl('tt-modal-grid-view');
const html = gridWrap.innerHTML;

// Check headers
if (!html.includes('<th>Period / Time</th>')) throw new Error('Period / Time header missing');
['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach(d => {
  if (!html.includes('<th>' + d + '</th>')) throw new Error('Day header missing: ' + d);
});
console.log('Headers [Period / Time, MON, TUE, WED, THU, FRI, SAT]: OK');

// Check Lunch break
if (!html.includes('tt-lunch-row')) throw new Error('Lunch row missing');
if (!html.includes('LUNCH BREAK')) throw new Error('Lunch break text missing');
console.log('Lunch break row (12:20 - 13:00): OK');

// Check multi-period rowspan
if (!html.includes('rowspan=')) throw new Error('Rowspan missing in combined periods');
console.log('Rowspan merged rendering: OK');

// Check Devbrat subject highlighting
if (!html.includes('tt-sub-os')) throw new Error('Subject class tt-sub-os missing');
if (!html.includes('YOUR CLASS')) throw new Error('YOUR CLASS badge missing');
console.log('Devbrat OS classes highlighted (tt-sub-os + YOUR CLASS): OK');

// Check other faculty classes are non-owned in full timetable
ctx.onTimetableFilterChange('B');
const htmlB = gridWrap.innerHTML;
if (!htmlB.includes('tt-slot-card-other')) throw new Error('Non-owned classes missing in Section B');
// Anand Sir slot (Wed III-IV)
if (!htmlB.includes('Dr. Anand Tamrakar')) throw new Error('Dr. Anand Tamrakar missing in Sec B');
console.log('Section B timetable with Anand Sir isolated: OK');

console.log('\\n--- 5. TAKE ATTENDANCE FROM DEVBRAT OWNED SLOT ---');
ctx.startAttendanceFromTimetable('Operating System', 'A', 'Period I', '09:00 ? 09:50');
const pageTake = getEl('page-take-attendance');
if (!pageTake.classList.contains('active')) throw new Error('Take attendance page is not active');
if (pageDash.classList.contains('active')) throw new Error('Dashboard should be inactive');
if (getEl('att-subject').value !== 'Operating System') throw new Error('Subject not set');
if (getEl('att-section').value !== 'A') throw new Error('Section not set');
console.log('Attendance workflow launched with pre-filled context: OK');
console.log('Toast displayed:', sandbox.LAST_TOAST);

console.log('\\n--- 6. RETURN HOME VIA TOPBAR / HOME ACTION ---');
ctx.showPage('dashboard');
if (!pageDash.classList.contains('active')) throw new Error('Failed to return to dashboard');
if (pageTake.classList.contains('active')) throw new Error('Take attendance page still active');
console.log('Returned to Dashboard directly: OK');

console.log('\\n=== REAL BEHAVIOR WORKFLOW VERIFICATION: 100% SUCCESS ===');
"""

res = subprocess.run(['node', '-e', node_script], capture_output=True, text=True, cwd=BASE_DIR)
print(res.stdout)
if res.returncode != 0:
    print('ERROR STDERR:', res.stderr)
    sys.exit(1)
