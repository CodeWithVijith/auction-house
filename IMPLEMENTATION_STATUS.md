# Implementation status

Updated: 16 October 2026 (Asia/Calcutta).

## Delivery

All core requirements F01-F20 are implemented. No core feature remains pending. The original execution plan and previous JavaScript application files are retained; the active application now enters through the root index.html and src/main.tsx. No public deployment, paid service, credentials, or unrelated source edits were introduced.

Production full-stack work has started from `AUCTION_HOUSE_FULL_STACK_PRODUCT_PLAN.md`. The first server vertical slice now includes a Fastify API, PostgreSQL migration and repository, Argon2 password verification, HTTP-only sessions, CSRF protection, organization and role authorization, health/login/logout/current-user endpoints, and organization-scoped event creation/listing. The browser-local auction remains operational while later phases connect its complete auction workflow to the API.

## Production backend milestone 1

- PostgreSQL foundation tables for organizations, users, memberships, sessions, and auction events.
- Admin bootstrap command with Argon2 password hashing and transactional organization creation.
- Secure session cookies, server-side expiry checks, CSRF tokens, and logout invalidation.
- `ADMIN`, `ORGANIZER`, `OPERATOR`, and `VIEWER` role model; event creation limited to administrators and organizers.
- Organization-scoped event reads and writes.
- Local PostgreSQL Compose service, migration/bootstrap commands, API launch commands, and Vite `/api` proxy.
- API integration tests cover unauthenticated access, invalid credentials, CSRF rejection, role rejection, event creation/listing, and session destruction.

## Completed phases

- **0 - Foundation:** React + TypeScript + Vite, normal React Router routes, current dependencies and lockfile, Node 22.12+ baseline, run/check scripts, documentation. Existing fixtures and dark/gold visual direction reused.
- **1 - Domain and persistence:** safe integer points/paise; schemas and snapshot validation; authoritative allocation selectors; immutable outcome/correction history; atomic Dexie transactions and revision checks; explicit legacy migration; recoverable storage errors without sample replacement.
- **2 - Interface:** top navigation, team logos/marks, collapsible independent rail preference, accessible modal dialogs, dark/gold stage, viewport sizing, internal panel/table scrolling, narrow-width team cards, system font fallbacks.
- **3 - Management/import:** XLSX and CSV adapter using official SheetJS CE 0.20.3; worksheet and header selection; editable aliases; normalized previews; strict row validation; collision-free codes; upload/row limits; selective retention; generated sample files; teams, squads, budgets, capacity, validated logos, player management, event/unit/card preferences, confirmed reset controls.
- **4 - Live auction:** unbiased crypto selection persisted before the anonymous wheel animates; reduced-motion support; recovered current player; reviewed/confirmed sold and unsold saves; budgets and squad guards; duplicate prevention; automatic/manual progression and canceled route/stale-state timers.
- **5 - Rounds/results:** immutable retry eligibility lists; repeated unsold rounds; preserved sales/budgets/history; current/pending retry status; searchable/filterable final results; refund-before-validation sale corrections with old/new review and audit history.
- **6 - Excel:** five real sheets; effective allocations, original attempts and corrections; timestamps and name snapshots; team counts/limits and budgets; numeric INR/point formats; literal text safety; sanitized filename; completed-round gating; workbook read-back tests.
- **7 - Verification:** unit/integration/export tests; actual Chromium browser workflows; desktop/mobile screenshots and inspection; production preview smoke; lint/build/format checks; README and dependency/license documentation.

## Requested UI adjustments

Removed the three-line event heading above the live stage. Round information appears directly beside the stage status, including PLAYER ON THE BLOCK. Removed the visible revealed-player message; announcements remain available to screen readers. Fixed mojibake separators. Desktop auction content fits viewport height; narrow screens and management views use appropriate internal scrolling without horizontal page overflow. All four sample teams and active controls fit the 1366x768 laptop view.

## Actual verification results

- `npm.cmd test`: **36 tests passed** (API authentication/authorization/CSRF/static routing, domain, exact money, retry fixtures, correction/refund invariants, privacy, workbook read-back, repository transactions, stale revisions, storage failure rollback, migration/recovery).
- `npm.cmd run test:e2e`: **10 tests passed** in Chromium. Includes the entire three-round fixture, corrections and downloaded workbook read-back, refresh during selection, sidebar preservation, real XLSX upload, invalid upload retention, mapping/title rows, team/player setup, budgets/caps/unit lock, auto-next cancellation, multiple tabs, image validation/fallback, INR precision, keyboard Escape/canceled review, reset and empty setup.
- Responsive browser checks cover every route at **320x568, 360x640, 390x844, 768x1024, 844x390, 1280x600, 1366x768, and 1920x1080**; dialogs stay in viewport; desktop Auction has no document-height overflow. Final sidebar sizing was additionally inspected against the production build.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: TypeScript and Vite production build passed, with route/spreadsheet code splitting and no chunk-size warning.
- Prettier check on the active source/config/tests: passed.
- `git diff --check`: passed (only Git's informational Windows line-ending notices).
- `npm.cmd run samples`: generated the public XLSX/CSV samples and copied the SheetJS Apache 2.0 license.
- `node scripts/test.mjs`: original legacy regression checks also passed; these are additional to the modern browser tests.
- Production preview: all seven direct routes returned successfully, rendered without horizontal overflow, persisted/revealed a random selection, and produced no browser errors. Desktop screenshot inspected.
- Installed dependency tree is consistent. npm installation audit reported zero vulnerabilities. Tested with Node 24.20.0 and npm 11.19.0.

Browser screenshots/traces are in ignored test-results/; production screenshots are in ignored test-output/. Tests use isolated browser contexts and do not overwrite a user's saved auction. The browser test's deterministic random provider exists only in the test harness.

## Remaining work and limitations

No remaining core implementation work. The agreed baseline remains browser-local: no backend, login, online bids/payments, multi-device synchronization, or JSON backup/restore. Clearing site data removes the current event. The retained legacy local-storage copy is a migration recovery copy, not a supported backup interface.

Legacy history cannot recover original names that the old app never recorded; migration uses available player/team names while preserving all known attempts and correction values. Unsupported or inconsistent legacy data is preserved and reported instead of silently replaced.

The reference website could not be fetched, so the explicit reference layout requirements were used. Workbook contents and numeric/text cell types were verified with SheetJS read-back; desktop Microsoft Excel/LibreOffice was not launched. Browser verification used Chromium, not every browser engine. These limits do not add external services or imply cloud persistence.

## Launch

```powershell
npm.cmd install
npm.cmd run dev
```

Open the printed loopback URL (normally http://127.0.0.1:5173). `npm.cmd run preview` serves the built application at http://127.0.0.1:4173. A future static host needs an index.html history fallback for direct routes. See README.md for the complete organizer flow and recovery notes.
