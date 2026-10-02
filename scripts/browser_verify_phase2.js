/**
 * SYNAPSE PHASE 2: REAL BROWSER VERIFICATION (STEPS 1-13)
 * Uses real Google Chrome via Chrome DevTools Protocol (CDP) on http://localhost:8080/
 */

const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:8080/';
const CDP_PORT = 9222;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = err => reject(err);
      this.ws.onmessage = evt => {
        const msg = JSON.parse(evt.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) rej(msg.error);
          else res(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = ++this.id;
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runBrowserVerification() {
  console.log('='.repeat(70));
  console.log(' SYNAPSE PHASE 2: REAL BROWSER VERIFICATION (STEPS 1-13)');
  console.log(' Target Application:', APP_URL);
  console.log(' Browser Engine: Google Chrome (Headless)');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;
  function report(step, title, cond, detail = '') {
    if (cond) {
      console.log(`[PASS] Step ${step}: ${title}`);
      passed++;
    } else {
      console.log(`[FAIL] Step ${step}: ${title} -> ${detail}`);
      failed++;
    }
  }

  // 1. Launch Chrome
  console.log('\n[LAUNCH] Starting Chrome in headless mode with remote debugging...');
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=C:\\Users\\Aryansh\\AppData\\Local\\Temp\\chrome_phase2_test',
    APP_URL
  ]);

  let cdp = null;
  try {
    // Wait for CDP endpoint to become ready
    let targets = null;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      try {
        targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
        if (targets && targets.length > 0) break;
      } catch (_) {}
    }

    if (!targets || targets.length === 0) {
      throw new Error('Failed to connect to Chrome DevTools Protocol.');
    }

    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log('[CONNECTED] Chrome DevTools Protocol session established.');

    // ── STEP 1: Open application with cleared storage ──
    await cdp.eval(`
      localStorage.clear();
      sessionStorage.clear();
      location.href = '${APP_URL}';
    `);
    await sleep(2000);

    // ── STEP 2: Confirm unauthenticated state ──
    const step2 = await cdp.eval(`({
      token: localStorage.getItem('smartattend_token'),
      session: localStorage.getItem('smartattend_session'),
      currentUser: CURRENT_USER,
      bodyLanding: document.body.classList.contains('landing-mode'),
      bodyApp: document.body.classList.contains('app-mode'),
      landingVisible: window.getComputedStyle(document.getElementById('landing-screen')).display !== 'none',
      appShellHidden: window.getComputedStyle(document.getElementById('app-shell')).display === 'none'
    })`);

    report(1, 'Open application with cleared storage', step2.token === null && step2.session === null);
    report(2, 'Confirm unauthenticated state',
      step2.currentUser === null &&
      step2.bodyLanding === true &&
      step2.bodyApp === false &&
      step2.landingVisible === true &&
      step2.appShellHidden === true,
      JSON.stringify(step2)
    );

    // ── STEP 3: Login using the existing test faculty account ──
    console.log('\n[LOGIN] Submitting real credentials for faculty_os...');
    const loginResult = await cdp.eval(`
      (async () => {
        document.getElementById('login-username').value = 'faculty_os';
        document.getElementById('login-password').value = 'demo123';
        await handleLoginSubmit();
        return {
          token: localStorage.getItem('smartattend_token'),
          session: JSON.parse(localStorage.getItem('smartattend_session') || 'null')
        };
      })()
    `);

    report(3, 'Login using faculty_os / demo123 (JWT stored)',
      Boolean(loginResult.token) && loginResult.token.length > 30,
      `Token: ${loginResult.token ? loginResult.token.slice(0, 20) + '...' : null}`
    );

    // ── STEP 4: Confirm dashboard identity ──
    await sleep(500);
    const step4 = await cdp.eval(`({
      currentUser: CURRENT_USER,
      bodyApp: document.body.classList.contains('app-mode'),
      bodyLanding: document.body.classList.contains('landing-mode'),
      sidebarName: document.getElementById('sidebar-user-name')?.textContent,
      greetingTitle: document.getElementById('dash-greeting-title')?.textContent,
      subjectName: document.getElementById('dash-fac-subject')?.textContent
    })`);

    report(4, 'Confirm dashboard identity (Devbrat Sahu - Operating System)',
      step4.currentUser !== null &&
      step4.currentUser.role === 'faculty' &&
      step4.currentUser.facultyName === 'Devbrat Sahu' &&
      step4.bodyApp === true &&
      step4.bodyLanding === false &&
      step4.sidebarName === 'Devbrat Sahu' &&
      step4.subjectName === 'Operating System',
      JSON.stringify(step4)
    );

    // ── STEP 5: Reload page ──
    console.log('\n[RELOAD] Reloading page to test JWT restoration...');
    await cdp.send('Page.reload');
    await sleep(2000);

    // ── STEP 6: Confirm authentication survives ──
    const step6 = await cdp.eval(`({
      token: localStorage.getItem('smartattend_token'),
      currentUser: CURRENT_USER,
      bodyApp: document.body.classList.contains('app-mode'),
      sidebarName: document.getElementById('sidebar-user-name')?.textContent,
      greetingTitle: document.getElementById('dash-greeting-title')?.textContent
    })`);

    report(5, 'Page reload completed', true);
    report(6, 'Confirm authentication survives refresh (JWT restored & validated via /me)',
      Boolean(step6.token) &&
      step6.currentUser !== null &&
      step6.currentUser.facultyName === 'Devbrat Sahu' &&
      step6.bodyApp === true &&
      step6.sidebarName === 'Devbrat Sahu',
      JSON.stringify(step6)
    );

    // ── STEP 7: Enter Take Attendance ──
    console.log('\n[NAVIGATE] Entering Take Attendance workspace...');
    await cdp.eval(`showPage('take-attendance');`);
    await sleep(500);

    const step7 = await cdp.eval(`({
      pageActive: document.getElementById('page-take-attendance')?.classList.contains('active'),
      subjectSelect: document.getElementById('att-subject')?.value
    })`);

    report(7, 'Enter Take Attendance page',
      step7.pageActive === true,
      JSON.stringify(step7)
    );

    // ── STEP 8: Confirm Load Students works ──
    console.log('[ACTION] Triggering Load Students (creating real backend session)...');
    const step8 = await cdp.eval(`
      (async () => {
        document.getElementById('att-section').value = 'A';
        await loadStudentsAction();
        return {
          status: ATTENDANCE_STATE.status,
          studentsCount: ATTENDANCE_STATE.students.length,
          activeLecture: ACTIVE_LECTURE,
          lectureNo: ACTIVE_LECTURE ? ACTIVE_LECTURE.lectureNumber : null,
          isBackendId: ACTIVE_LECTURE ? typeof ACTIVE_LECTURE.id === 'number' : false
        };
      })()
    `);

    report(8, 'Confirm Load Students works (Real Backend Session Created)',
      step8.status === 'loaded' &&
      step8.studentsCount === 60 &&
      step8.isBackendId === true &&
      step8.lectureNo >= 1,
      JSON.stringify(step8)
    );

    // ── STEP 9: Logout ──
    console.log('\n[LOGOUT] Performing sign out...');
    await cdp.eval(`doSignOut();`);
    await sleep(500);

    report(9, 'Logout action completed', true);

    // ── STEP 10: Confirm authenticated actions are no longer available ──
    const step10 = await cdp.eval(`({
      token: getStoredAuthToken(),
      session: localStorage.getItem('smartattend_session'),
      currentUser: CURRENT_USER,
      bodyLanding: document.body.classList.contains('landing-mode'),
      bodyApp: document.body.classList.contains('app-mode')
    })`);

    // Attempt to bypass router
    await cdp.eval(`showPage('take-attendance');`);
    const afterBypass = await cdp.eval(`({
      bodyLanding: document.body.classList.contains('landing-mode'),
      bodyApp: document.body.classList.contains('app-mode'),
      pageActive: document.getElementById('page-take-attendance')?.classList.contains('active')
    })`);

    report(10, 'Confirm authenticated actions are no longer available (Guarded & Evicted)',
      step10.token === null &&
      step10.currentUser === null &&
      step10.bodyLanding === true &&
      step10.bodyApp === false &&
      afterBypass.bodyLanding === true &&
      afterBypass.bodyApp === false,
      JSON.stringify({ step10, afterBypass })
    );

    // ── STEP 11: Clear token / simulate invalid token ──
    console.log('\n[SIMULATE] Injecting invalid token and bogus session...');
    await cdp.eval(`
      localStorage.setItem('smartattend_token', 'invalid_tampered_jwt_signature_401');
      localStorage.setItem('smartattend_session', JSON.stringify({
        role: 'faculty',
        displayName: 'Fake Stale Faculty',
        isBackendAuthenticated: false
      }));
    `);

    report(11, 'Simulate invalid token and bogus session injected', true);

    // ── STEP 12: Reload ──
    console.log('[RELOAD] Reloading page to test eviction of invalid credentials...');
    await cdp.send('Page.reload');
    await sleep(2000);

    report(12, 'Page reload with invalid token completed', true);

    // ── STEP 13: Confirm login state is restored rather than fake faculty state ──
    const step13 = await cdp.eval(`({
      token: getStoredAuthToken(),
      session: localStorage.getItem('smartattend_session'),
      currentUser: CURRENT_USER,
      bodyLanding: document.body.classList.contains('landing-mode'),
      bodyApp: document.body.classList.contains('app-mode'),
      landingVisible: window.getComputedStyle(document.getElementById('landing-screen')).display !== 'none',
      appShellHidden: window.getComputedStyle(document.getElementById('app-shell')).display === 'none'
    })`);

    report(13, 'Confirm login state restored rather than fake faculty state (Invalid token purged)',
      step13.token === null &&
      step13.session === null &&
      step13.currentUser === null &&
      step13.bodyLanding === true &&
      step13.bodyApp === false &&
      step13.landingVisible === true &&
      step13.appShellHidden === true,
      JSON.stringify(step13)
    );

  } finally {
    if (cdp) cdp.close();
    chromeProc.kill('SIGTERM');
  }

  console.log('\n' + '='.repeat(70));
  console.log(` REAL BROWSER VERIFICATION RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(70));

  if (failed > 0) process.exit(1);
}

runBrowserVerification().catch(err => {
  console.error('[BROWSER ERROR]', err);
  process.exit(1);
});
