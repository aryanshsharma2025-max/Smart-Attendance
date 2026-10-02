# SYNAPSE — PHASE 2: AUTHENTICATION STATE AUDIT
**Authoritative Forensic Audit & Invariant Analysis**  
**Date:** October 2, 2026  
**System:** Smart Attendance Management System (SSIPMT Raipur — CSE Department)  
**Corpus / Context:** Phase 2 Authentication State Hardening

---

## 1. EXECUTIVE SUMMARY

The objective of Phase 2 is to eliminate competing, synthetic, and offline authentication states from the SmartAttend system, establishing **one single authoritative authentication state** anchored exclusively by a valid backend JWT.

This audit inspects every touchpoint across the frontend (`app.js`, `index.html`, `style.css`) and backend (`SecurityConfig.java`, `JwtTokenProvider.java`, `JwtAuthenticationFilter.java`, `AuthController.java`, `SessionController.java`, `AuthService.java`) where authentication state is created, restored, cached, cleared, assumed, bypassed, synthesized, or displayed.

### Baseline Finding
The system currently suffers from **authentication state divergence**. While the backend (Spring Boot 3 + MySQL 8.0) strictly validates JWT tokens via `JwtAuthenticationFilter` and `@PreAuthorize`, the frontend maintains three separate, competing representations of authentication:
1. Authoritative Backend JWT (`localStorage['smartattend_token']` / `sessionStorage['smartattend_token']`)
2. Cached Profile / Pseudo-Session (`localStorage['smartattend_session']` / `sessionStorage['smartattend_session']`)
3. In-Memory Identity (`CURRENT_USER` in `app.js`, statically initialized to a faculty identity)

In addition, multiple legacy pilot / demo paths exist that allow the frontend UI to transition into an "authenticated" state without any interaction with the backend or acquisition of a JWT.

---

## 2. TRACE OF KEY ARTIFACTS & MECHANISMS

### 2.1 `CURRENT_USER`
- **Definition:** `app.js` (line 650):
  ```javascript
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
  ```
- **Nature:** Statically initialized at module load. Prior to any authentication check or network request, `CURRENT_USER` is already populated with a fully configured faculty profile for Devbrat Sahu.
- **Mutations:**
  - `selectFacultyProfile(facultyId)` (lines 5077–5084): Mutates `CURRENT_USER` to any selected faculty profile without checking or issuing a token.
  - `applySessionUI(session)` (lines 5187, 5206, 5234): Overwrites `CURRENT_USER` with student, HOD, or faculty identity based on the provided session object.
  - `doSignOut()` (line 5106): Explicitly sets `CURRENT_USER = null;`.
  - Step 6 Allocations callback (line 2555): Updates `CURRENT_USER.assignedSections`.
- **References:** Referenced 40+ times across `app.js` to determine faculty name, subject, timetable slot ownership, dashboard cards, header greetings, and attendance session creation parameters (e.g. lines 808, 818, 867, 878, 888, 999, 1030, 1188, 1248, 1363, 1653, 1745, 1837, 1905, 1970, 2107, 2150, 2163, 2227, 2463, 2555, 2657, 2703, 3524, 4300, 5234).
- **Vulnerability:** When a user visits the app for the first time or when unauthenticated, `CURRENT_USER` is non-null. In `initAuth()`, when the user is determined to be unauthenticated, `CURRENT_USER` is **never reset to null**.

### 2.2 `smartattend_token` (`AUTH_TOKEN_KEY`)
- **Definition:** `app.js` (line 11): `const AUTH_TOKEN_KEY = 'smartattend_token';`
- **Creation:** `handleLoginSubmit` (line 4896) via `setStoredAuthToken(loginRes.token, remember)`.
- **Storage:** Persisted in `localStorage` if `remember == true`, or `sessionStorage` if `remember == false`.
- **Retrieval:** `getStoredAuthToken()` (lines 17–19):
  ```javascript
  function getStoredAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY) || null;
  }
  ```
- **Consumers:**
  - `apiClient.request` (line 54): Injected into `Authorization: Bearer <token>`.
  - `renderAttendanceOverviewPage` (line 2462): Checks token before syncing faculty sessions.
  - `loadStudentsAction` (line 2698): Checks token before creating session on backend.
  - `submitAttendanceSession` (line 3518): Checks token before calling `/sessions/{id}/submit`.
  - `openStudentDetailModal` (line 3830): Checks token before fetching student summary.
  - `renderSessions` (line 4299): Checks token before loading faculty sessions.
  - `initAuth` (line 5351): Used to verify session with `GET /api/auth/me`.
  - Student detail modal (line 5823): Checks token before fetching student history.

### 2.3 `smartattend_session` (`AUTH_SESSION_KEY`)
- **Definition:** `app.js` (line 12): `const AUTH_SESSION_KEY = 'smartattend_session';`
- **Creation / Storage:**
  - `handleLoginSubmit` (lines 4965, 4967): Stores backend user profile upon valid login (`isBackendAuthenticated: true`).
  - `handleLoginSubmit` (line 5009): Stores simulated demo profile upon backend network error (`isBackendAuthenticated: false`).
  - `selectFacultyProfile` (line 5099): Stores simulated faculty profile directly into `localStorage` with no backend call.
  - `initAuth` (lines 5412, 5414): Refreshes cached profile from `GET /api/auth/me`.
- **Retrieval:**
  - `initAuth` (line 5352): Read on startup.
- **Flaw:** Lines 5437–5448 in `initAuth()` explicitly allow `smartattend_session` to authenticate the UI when NO token exists:
  ```javascript
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
  ```
  If `sessionStr` is present without a token, the UI renders the full authenticated dashboard!

### 2.4 `getStoredAuthToken()` and `clearAuthTokens()`
- **`clearAuthTokens()`** (lines 31–36):
  ```javascript
  function clearAuthTokens() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  }
  ```
- **Calls to `clearAuthTokens()`:**
  - `apiClient.request` (line 81) on 401 response.
  - `doSignOut` (line 5105).
  - `initAuth` (lines 5420, 5425, 5446, 5451).
- **Flaw in 401 handling:** When `clearAuthTokens()` is invoked by `apiClient.request` upon receiving an HTTP 401, **it does not reset the UI**. It does not call `doSignOut()`, does not set `CURRENT_USER = null`, and does not switch `document.body` classes from `app-mode` to `landing-mode`. The user remains on the active page, visually appearing logged in until they take an action that explicitly fails.

### 2.5 `initAuth()`
- **Location:** `app.js` (lines 5345–5456).
- **Execution:** Invoked at DOM ready inside `DOMContentLoaded` listener (line 6147).
- **Control Flow:**
  1. Attempts `AcademicDataService.loadAllAcademicData()`.
  2. Reads `token = getStoredAuthToken()` and `sessionStr = localStorage.getItem(AUTH_SESSION_KEY) || ...`.
  3. If `token`:
     - Calls `GET /api/auth/me`.
     - On 200: Maps role (student, hod, faculty), sets `isBackendAuthenticated: true`, caches in `smartattend_session`, and calls `applySessionUI(session)`.
     - On failure (401 / expired / invalid): calls `clearAuthTokens()`. If network error and cached offline demo session exists, boots offline demo UI.
  4. If no `token`:
     - Checks if `sessionStr` exists with `!session.isBackendAuthenticated`. If so, boots offline demo UI!
  5. If completely unauthenticated:
     - Calls `clearAuthTokens()`.
     - Removes `app-mode`, adds `landing-mode` to `document.body`.
     - Calls `setLoginRole('faculty')`.
     - **OMISSION:** Does not set `CURRENT_USER = null;`.

### 2.6 Login Flow (`POST /api/auth/login` and `GET /api/auth/me`)
- **Frontend:**
  - `handleLoginSubmit(event)` (lines 4859–5044) bound to `#login-form`.
  - Calls `apiClient.post('/auth/login', { username, password })`.
  - Backend returns `{ token, tokenType, userId, username, displayName, role, facultyId, facultyCode, studentId, rollNumber }`.
  - Stores JWT via `setStoredAuthToken(loginRes.token, remember)`.
  - Triggers `AcademicDataService.loadAllAcademicData()`.
  - Calls `apiClient.get('/auth/me')` to authoritatively verify principal.
  - Builds `sessionData`, writes to `smartattend_session`, calls `applySessionUI(sessionData)`.
  - **Offline Fallback Flaw (lines 4979–5015):** If `err.isNetworkError`, it falls back to `DEMO_ACCOUNTS`, creates an unauthenticated session, saves it to `localStorage`, and calls `applySessionUI()`.
- **Backend:**
  - `AuthController.login` -> `AuthService.login`:
    - Checks `userRepository.findByUsername(username)`.
    - Validates active status and BCrypt password hash.
    - Generates HS256 JWT via `JwtTokenProvider.generateToken(principal)`.
  - `AuthController.getCurrentUser`:
    - Reads `@AuthenticationPrincipal UserDetails userDetails`.
    - If `userDetails == null`, returns `401 UNAUTHORIZED`.
    - If valid, returns `UserDto`.

### 2.7 Logout Flow
- **Frontend:** `doSignOut()` (lines 5104–5118):
  - Calls `clearAuthTokens()`.
  - Sets `CURRENT_USER = null`.
  - Removes `app-mode`, adds `landing-mode`.
  - Resets password input and error message.
  - Shows toast 'Signed out of SmartAttend'.
- **Gap:** Does not invalidate or guard against in-flight promises or background intervals that might attempt calls using stale closures.

### 2.8 Offline / Demo Authentication & Faculty Synthesis
- **Path 1: Public Faculty Profile Card Selection:**
  - In `index.html` (lines 40, 97, 252, 280, 308, 336, 364), buttons labelled "Faculty Area" and "Enter Faculty Profile" call `selectFacultyProfile('faculty-os')`.
  - `selectFacultyProfile` (lines 5072–5102) immediately configures `CURRENT_USER`, writes `smartattend_session` to `localStorage`, and calls `applySessionUI(sessionData)`.
  - The user bypasses login entirely and enters the faculty workspace with no JWT.
- **Path 2: Demo Session Switcher:**
  - `switchSession(roleKey)` (lines 5120–5164) constructs mock sessions from `DEMO_ACCOUNTS` and calls `applySessionUI(sessionData)`.
- **Path 3: Network Failure Login Fallback:**
  - `handleLoginSubmit` (lines 4979–5015) logs in with `DEMO_ACCOUNTS` if the backend connection fails.
- **Path 4: Offline Session Simulation in Take Attendance:**
  - In `loadStudentsAction()` (lines 2793–2830), when `!token`:
    ```javascript
    // Offline / Demo evaluation fallback
    const lectureNo = getNextLectureNumber(effectiveSubject, sec);
    ACTIVE_LECTURE = {
      id: `sess-${Date.now()}`,
      ...
    };
    ```
    This synthesizes an active session and allows taking attendance without backend authentication.
- **Path 5: Offline Attendance Submission Simulation:**
  - In `submitAttendanceSession()` (lines 3518–3549), when `!token`, local state simulates successful lecture completion.

### 2.9 Authentication Guards and Page Initialization
- **DOM Ready Race Condition:**
  In `app.js` (lines 6139–6157):
  ```javascript
  window.addEventListener('DOMContentLoaded', async () => {
    try {
      if (typeof AcademicDataService !== 'undefined') {
        await AcademicDataService.loadAllAcademicData();
      }
    } catch (err) {
      console.warn('[SmartAttend] Backend data load failed, using fallback:', err);
    }
    await initAuth();
    ...
  ```
  `AcademicDataService.loadAllAcademicData()` fires network requests (`/roster`, `/courses`, etc.) **before** `initAuth()` runs.
- **CSS Default Visibility:**
  In `index.html`: `<body>` has no class attribute.
  In `style.css` (lines 1843–1863):
  - `.landing-screen { display: none; }`
  - `body.landing-mode #landing-screen { display: block; }`
  - `body.landing-mode #app-shell { display: none !important; }`
  - `body.app-mode #landing-screen { display: none !important; }`
  - `body.app-mode #app-shell { display: block; }`
  When `<body>` has no class, `#landing-screen` is hidden (`display: none`), while `#app-shell` is visible!
  Consequently, during page load and while `loadAllAcademicData()` is awaiting network responses, the authenticated app-shell is displayed on screen by default!
- **Navigation Guard:**
  `showPage(pageId, linkEl)` (lines 2355–2415) has zero authentication checks. Any call to `showPage('dashboard')` or `showPage('take-attendance')` activates the page DOM without verifying whether a valid JWT exists.

---

## 3. STATE CLASSIFICATION MATRIX

| Location / Mechanism | Nature | Authoritative? | Can Exist Without JWT? | Risks / Failure Modes |
| :--- | :--- | :--- | :--- | :--- |
| `localStorage['smartattend_token']` | Backend JWT | **YES** (Authoritative) | No | Expired token if unrefreshed |
| `sessionStorage['smartattend_token']` | Backend JWT | **YES** (Authoritative) | No | Expired token if unrefreshed |
| `localStorage['smartattend_session']` | Cached profile JSON | **NO** (Competing) | **YES** (Created by `selectFacultyProfile` & demo fallback) | Overrides missing JWT, fools `initAuth()` |
| `sessionStorage['smartattend_session']` | Cached profile JSON | **NO** (Competing) | **YES** | Same as above |
| `CURRENT_USER` in `app.js` | In-memory Object | **NO** (Competing) | **YES** (Hardcoded default Devbrat Sahu at line 650) | Supplies fake faculty identity to UI components |
| `selectFacultyProfile()` | Synthetic bypass | **NO** (Fake) | **YES** | Allows direct dashboard access from landing page |
| `switchSession()` | Synthetic bypass | **NO** (Fake) | **YES** | Bypasses all backend auth |
| `loadStudentsAction` fallback | Synthetic fallback | **NO** (Fake) | **YES** | Allows offline attendance recording |
| `submitAttendanceSession` fallback | Synthetic fallback | **NO** (Fake) | **YES** | Simulates successful attendance submission |
| `#app-shell` HTML default | CSS / DOM structure | **NO** (Default leak) | **YES** (Shown before `initAuth()` resolves) | Visual flash of authenticated dashboard |

---

## 4. ANSWERS TO MANDATORY AUDIT QUESTIONS (A–K)

### A. What is the authoritative authentication state currently?
In theory and backend enforcement, the authoritative credential is the Spring Boot HMAC-SHA256 JWT stored under key `smartattend_token` (in `localStorage` or `sessionStorage`). However, in the frontend, this authority is compromised because `smartattend_session`, `CURRENT_USER`, and `selectFacultyProfile()` can independently trigger `applySessionUI()` and make the UI behave as if authenticated.

### B. Can CURRENT_USER become populated without a valid JWT?
**YES.**
1. At script load time, line 650 explicitly initializes `CURRENT_USER` with the full Devbrat Sahu faculty profile.
2. Clicking any faculty profile in the landing page "Faculty Area" executes `selectFacultyProfile()`, which populates `CURRENT_USER` without a token.
3. In `initAuth()`, when a user is unauthenticated, `CURRENT_USER` is never reset to `null`.
4. In `switchSession()`, demo accounts populate `CURRENT_USER` via `applySessionUI()`.

### C. Can smartattend_session exist without a valid JWT?
**YES.**
1. `selectFacultyProfile()` writes `localStorage.setItem('smartattend_session', JSON.stringify(sessionData))` without contacting the backend or receiving a JWT.
2. `handleLoginSubmit()` network failure fallback writes `smartattend_session` for demo accounts.
3. If a token expires and is cleared from storage while `smartattend_session` is retained or recreated, it exists without a valid JWT.

### D. Can offline/demo mode make the UI appear authenticated?
**YES.**
1. Clicking "Faculty Area" -> "Enter Faculty Profile" directly calls `applySessionUI()` and transitions the body to `app-mode`.
2. Calling `switchSession('faculty')` switches the UI into the faculty dashboard.
3. In `handleLoginSubmit()`, entering demo credentials while the backend is unavailable activates offline demo mode and displays the authenticated dashboard.
4. In `initAuth()`, if `smartattend_session` is present with `!session.isBackendAuthenticated`, it restores the demo session into the UI.

### E. What happens after page refresh?
- **With a valid JWT:** `initAuth()` calls `GET /api/auth/me`. If HTTP 200 is returned, the profile is updated and `applySessionUI()` maintains the session. However, during the async window before `initAuth()` resolves (while `loadAllAcademicData()` executes), the app shell is visible because `<body>` has no class, displaying the initial hardcoded Devbrat Sahu dashboard.
- **Without a JWT:**
  1. `<body>` begins with no class, temporarily rendering `#app-shell`.
  2. If `smartattend_session` exists from a previous demo profile, `initAuth()` revives the fake authenticated session!
  3. If no `smartattend_session` exists, `initAuth()` adds `landing-mode` to `<body>`, but leaves `CURRENT_USER` populated with the hardcoded Devbrat Sahu object. All subsequently called DOM initializers run using this fake faculty identity.

### F. What happens after JWT expiration?
- **During an active session:** An API request receives HTTP 401. `apiClient` catches the 401 and calls `clearAuthTokens()`, which deletes the token from storage. However, **`apiClient` does not reset the UI or `CURRENT_USER`**. The dashboard remains fully displayed. When the faculty member clicks "Load Students", `loadStudentsAction()` sees `!token` and falls back to offline demo simulation, creating `sess-${Date.now()}`.
- **Upon subsequent page refresh:** `initAuth()` calls `GET /api/auth/me` with no token (or an expired token). Backend returns 401. `initAuth()` clears storage, removes `app-mode`, and adds `landing-mode`.

### G. What happens when /api/auth/me returns 401?
In `initAuth()`:
1. `apiClient.get('/auth/me')` throws an error with `status: 401`.
2. The `catch` block catches the error and calls `clearAuthTokens()`.
3. Execution falls through to lines 5450–5456:
   - `clearAuthTokens()` is called again.
   - `document.body.classList.remove('app-mode')`.
   - `document.body.classList.add('landing-mode')`.
   - `setLoginRole('faculty')`.
4. **CRITICAL GAP:** `CURRENT_USER` is **not** set to `null`. It retains whatever object was in memory (or the initial Devbrat Sahu object).

### H. What happens when another authenticated API endpoint returns 401?
(e.g., `POST /api/sessions/start`, `POST /api/sessions/{id}/submit`):
1. `apiClient.request()` receives status 401.
2. It executes:
   ```javascript
   if (response.status === 401) {
     if (token) {
       clearAuthTokens();
     }
     ...
     throw err;
   }
   ```
3. Storage keys `smartattend_token` and `smartattend_session` are purged.
4. The error is thrown to the calling function, which shows a toast message.
5. **The UI is NEVER redirected or cleared.** The user is left staring at the authenticated dashboard with `CURRENT_USER` intact, leading directly to the historical failure where clicking "Take Attendance" or "Load Students" fails with confusing errors or enters offline simulation.

### I. What happens after logout?
`doSignOut()`:
1. Calls `clearAuthTokens()` (removes token and session from storage).
2. Sets `CURRENT_USER = null;`.
3. Sets `document.body.classList.remove('app-mode')` and `document.body.classList.add('landing-mode')`.
4. Clears the password input.
5. Displays a toast.
The user is returned to the landing page. However, if the page is refreshed, the issues described in Question E reoccur.

### J. Can Take Attendance ever be reached without a valid JWT?
**YES.**
1. Clicking "Faculty Area" on the landing page opens the profile cards. Clicking "Enter Faculty Profile" calls `selectFacultyProfile()`, which puts the user into the faculty dashboard without a token. From there, clicking "Take Attendance" opens the attendance workspace.
2. Calling `handlePrimaryTakeAttendance()` directly when unauthenticated routes directly to `showPage('take-attendance')`.
3. In `loadStudentsAction()`, when `token` is null, execution branches to lines 2793–2830 ("Offline / Demo evaluation fallback"), creating a synthetic lecture and roster.

### K. Are there any paths that visually show an authenticated faculty dashboard without backend authentication?
**YES. All of the following paths cause this:**
1. **Initial HTML/CSS Default:** `<body>` lacks `landing-mode` class in `index.html`. CSS default displays `#app-shell` and hides `.landing-screen` during load until JS executes.
2. **`CURRENT_USER` static initialization:** Hardcoded at line 650 to Devbrat Sahu.
3. **Public Landing Faculty Profile Cards:** Buttons in `#landing-faculty-view` invoke `selectFacultyProfile()`, which sets `app-mode` and activates the dashboard without backend authentication.
4. **Offline Demo Session Persistence:** If `smartattend_session` is saved without a token, `initAuth()` restores it on refresh.
5. **API 401 Token Purge without UI Purge:** `apiClient` wipes the token on 401 but leaves the dashboard displayed.
6. **Network Failure Login Fallback:** `handleLoginSubmit()` falls back to `DEMO_ACCOUNTS` and logs the user into the dashboard.

---

## 5. ROOT CAUSE SUMMARY & SPECIFICATION FOR MINIMAL FIX

### Root Cause 1: Static and Persistent Dummy Identity
- `let CURRENT_USER = { ... }` statically defaults to Devbrat Sahu instead of `null`.
- `initAuth()` does not reset `CURRENT_USER = null` when unauthenticated.
- `selectFacultyProfile()` manufactures `CURRENT_USER` and `smartattend_session` without backend auth.

### Root Cause 2: Competing Authentication Sources
- `smartattend_session` is treated by `initAuth()` as an independent credential when no JWT exists (`!session.isBackendAuthenticated`).
- `smartattend_session` must ONLY be a subordinate UI cache of the verified JWT identity. If no valid JWT exists, `smartattend_session` must be ignored and purged.

### Root Cause 3: Default DOM & CSS Shell State
- `index.html` has `<body>` without `class="landing-mode"`.
- `style.css` hides `.landing-screen` by default and shows `#app-shell`.
- Default must be `landing-mode` on `<body>`, ensuring no authenticated shell can ever be seen before authentication is authoritatively confirmed.

### Root Cause 4: Passive 401 Handling
- `apiClient` clears storage keys on 401 but does not trigger a session eviction / redirect to landing.
- On 401, the system must trigger full session eviction (`doSignOut()` or `handleSessionExpired()`), returning the UI to the login state immediately.

### Root Cause 5: Offline / Demo Bypasses
- Landing page "Faculty Area" profile buttons must not bypass authentication. In a hardened faculty build, entering a faculty workspace requires authenticating with the faculty's credentials.
- `loadStudentsAction()` and `submitAttendanceSession()` must require a valid JWT. If no token exists, they must reject the action and direct to login, never synthesizing mock sessions (`sess-${Date.now()}`).
- `handleLoginSubmit()` must never fall back to fake offline sessions.

---

## 6. STOP POINT STATEMENT

As mandated by **PHASE 2 — STEP 1: READ-ONLY AUDIT**, this audit is complete and documented before changing any code.

**No application files have been modified.**  
Awaiting authorization to proceed to **PHASE 2 — STEP 2: IMPLEMENTATION**.
