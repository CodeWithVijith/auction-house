# Auction House

A complete organizer-operated player auction using React, TypeScript, Vite, React Router, Zustand preferences, Zod validation, Dexie/IndexedDB persistence, and real SheetJS Excel import/export.

## Run on Windows

Requires **Node.js 22.12+** and npm.

```powershell
Set-Location 'C:\Users\vijit\Documents\GitHub\auction-house'
npm.cmd install
npm.cmd run dev
```

Open the URL printed by Vite, normally **http://127.0.0.1:5173**. The server binds to loopback. Use `npm` instead of `npm.cmd` if your PowerShell policy permits it. `npm ci` reproduces the lockfile. Keep the same host and port to resume the same event.

## Organizer workflow

1. Review the six fictional sample players and four teams, or choose **Settings > New empty event**. Reset actions require confirmation.
2. Keep registration in Google Forms. Download its responses as `.xlsx` or UTF-8 `.csv`, then open **Import**. Sample downloads include deliberately excluded contact and jersey columns.
3. Choose the worksheet and header row, map fields, and review the normalized preview. All errors must be fixed before replacing the roster. Limits: **8 MB and 1,000 players**. Names are required; codes are unique ignoring case; missing codes are generated without collisions; optional ages are integers from 0-120; photo URLs use HTTP/HTTPS. Unmapped values are discarded and never enter snapshots or exports.
4. Manage branded teams, starting budgets, squad capacities, and squads. PNG/JPEG/WebP logos must decode successfully and be at most **1 MB**. Configure event identity, points or INR, auto-next, and optional spotlight fields in Settings. Each unit has an independent draft budget.
5. Start the auction. Selection is persisted **before** the anonymous wheel animates. Enter the final amount and winning team, review, and confirm Sold; or confirm Unsold without an amount or team. Sales cannot exceed remaining budget or capacity. Canceling review preserves inputs. Collapsing the rail preserves the selection and form.
6. Auto-next runs only after a successful save. Turn it off for manual progression. Leaving Auction cancels the timer. Refresh recovers a selected player, and never starts a surprise spin after a saved result.
7. Completed rounds can be exported or followed by another unsold round. Retry rounds retain sold squads, budgets, player IDs, and every historical attempt. Pending retry players are distinguished from their previous unsold outcomes.
8. Correct a sale from Results when no player is active. Review old and new values before confirming. The old allocation is refunded for validation; the replacement and immutable correction are saved together.

After the first result, the unit and existing starting budgets are locked. Roster replacement and adding/deleting players are locked after results, and while a player is selected. Profile edits remain available. Teams referenced by historical outcomes or corrections cannot be deleted. New teams can be added between players.

## Excel results

Final export unlocks only when the active round is complete. Starting a retry round locks export again until that round completes. The real `.xlsx` contains:

- **Player Results**: one final row per player, including completed time.
- **Team Allocations**: current sold allocations after corrections.
- **Unsold Players**: final unsold profiles with blank team and amount.
- **Summary**: event, season, unit, counts, rounds, allocations, team budgets, counts, and limits.
- **Auction History**: every outcome and correction in sequence with name snapshots, old/new values, reasons, and timestamps.

Amounts are numeric cells with separate unit labels. INR exports use rupees with two decimals; points and counts use integer formats. User text starting with formula characters remains literal text. Sheets have readable widths and filters; frozen-header/decorative formatting is not claimed.

## Persistence and recovery

This baseline has **one browser-local event**, not a shared backend. There is no login, payments, bidder portal, direct Google Forms connection, cloud backup, or cross-device synchronization. Browsers, profiles, origins, ports, and devices have separate data. Clearing site data deletes the event. Export completed results before clearing storage. JSON backup/restore is outside this build.

`AuctionRepository` hides IndexedDB access. Each command reads the latest validated snapshot, checks its revision, applies domain validation, and saves in one transaction. Budgets and squad counts are derived from immutable outcomes plus corrections. Money uses safe integer points or paise. Failed saves preserve the previous snapshot. Other tabs receive updates; stale writes are rejected and stale timers/forms canceled.

On first use, valid previous `auction-house-premium-v1` local-storage data is explicitly migrated to schema version 3. Players, rounds, outcomes, corrections, selection, logos, and rupee values are preserved. The original local-storage copy is retained for recovery; subsequent loads use IndexedDB. Corrupt, unsupported, or inconsistent data produces an error instead of being overwritten by samples. Historical names never recorded by the legacy app cannot be reconstructed; migration snapshots the available names. The rail preference stays separate from auction data.

Storage errors are shown on screen. Check site storage permissions and free disk space before retrying. Do not delete browser storage unless you intend to erase the saved event.

## Screen fit and accessibility

The desktop auction fills the viewport, with scrolling confined to panels where necessary. At narrow widths, team cards scroll inside their rail. Tables scroll inside their panels, and dialogs remain within the viewport. Pages do not overflow horizontally. Forms have accessible labels and focus indicators; native modal dialogs contain focus, support Escape, and restore focus. Reduced motion shortens wheel feedback. Reveal/outcome announcements remain available to screen readers without a redundant visible status line. The round appears in the stage status row.

System font fallbacks keep the app usable without font downloads. The reference site could not be fetched during implementation, so the explicit dark/gold layout specification was followed.

## Verification

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run preview
```

`npm run samples` regenerates public sample files and copies the SheetJS license. Browser tests use isolated storage and deterministic randomness injected only by the tests. They exercise actual uploads, dialogs, sales, corrections, retry rounds, downloads, reloads, multiple tabs, validation, and viewport sizing. Screenshots and failure traces are written to ignored `test-results/`.

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for actual checks and limitations, and [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md) for dependency/license details.

## Source and static hosting

The active app is in `src/app/`; rules in `src/domain/`; transactions/migration in `src/persistence/`; spreadsheet/asset adapters in `src/services/`; rail preferences in `src/state/`; tests in `tests/modern/`. The root `index.html` loads `src/main.tsx`. The previous JavaScript export and its scripts/tests remain preserved but are no longer served. The original execution plan stays at the project root.

`npm run build` produces `dist/`; `npm run preview` serves it locally. A future static host needs an `/index.html` fallback for non-asset routes including `/auction`, `/teams`, `/players`, `/import`, `/unsold`, `/results`, and `/settings`, so direct links and refresh work. No public deployment or paid services are configured.
