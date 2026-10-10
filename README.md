# Auction House

A working player auction app with the NeoAuction-inspired auction layout, premium charcoal and gold styling, a top navigation bar, a collapsible team rail, and a central player stage. The app opens with six fictional players and four branded teams.

## Run on Windows

Install Node.js 22 or newer. Extract the contents of the project ZIP directly into:

`C:\Users\vijit\Documents\GitHub\auction-house`

The folder should contain `package.json`, `src`, `scripts`, `tests`, and this README. Extracting into an existing folder may overwrite files with the same names; keep a copy of any existing work first.

Open PowerShell and run:

```powershell
Set-Location 'C:\Users\vijit\Documents\GitHub\auction-house'
npm run dev
```

Open **http://localhost:5173**. This project has no npm dependencies, so an install step is unnecessary. The development server listens only on your computer. Refresh the browser after editing a source file; stop the server with Ctrl+C.

If PowerShell blocks `npm.ps1`, use `npm.cmd run dev` instead. If port 5173 is busy, use `npm run dev -- --port 5174`.

## Included features

- Import `.xlsx` or `.csv` registrations from Google Forms exports. Map player ID, name, role, category, age, city, and photo URL; review errors before importing. Only mapped fields are retained after confirmation.
- Add, edit, and delete teams with names, short names, logos, colors, starting budgets, and squad limits.
- Auction with whole-number points or rupees to two decimal places. The unit and existing starting budgets lock after the first saved result.
- Random selection through a wheel that displays no player names. Each player appears once per round; the selected player is revealed after the spin.
- Enter the sale amount, select the winning team, review the confirmation, and save. Mark an unsold player without assigning an amount or team.
- Automatically spin for the next player after an outcome, with an option to turn automatic selection off.
- See every team's remaining balance, spent amount, and player count in the left rail. Collapse the rail to a logo view and expand it with the toggle.
- Re-auction unsold players after the current round finishes. Existing sales, budgets, and squads carry forward; repeat unsold rounds if needed.
- Manage player profiles, search the roster, and filter by status. Adding and deleting players is available before outcomes are recorded; profile edits remain available.
- Edit event branding and player-card display options. Correct a sale with a refund to the previous team, new budget checks, squad checks, and an audit entry.
- Export a real five-sheet Excel workbook after a round completes: Player Results, Team Allocations, Unsold Players, Summary, and Auction History.

## Try one complete flow

1. Open the app and choose **Settings** to select points or rupees and edit the event branding.
2. Use the existing sample roster, or choose **Import players**, upload `samples/player-registrations.xlsx`, review the mapping, and confirm.
3. Open **Teams** and review budgets, logos, and squad limits.
4. Open **Auction** and start the spin. After the player reveal, enter an amount, choose a team, and confirm a sale. For the next player, confirm an unsold outcome.
5. Continue until the round finishes. The team rail updates after each sale.
6. Start **Auction unsold players** to run another round for the unsold pool, or export the completed results. Finish the retry round before exporting its updated results.

The initial sample roster also includes a **Finish sample round** shortcut for trying the results and re-auction screens quickly. It is unavailable for your own imported or manually changed roster.

## Source files

| File | Purpose |
| --- | --- |
| `src/index.html` | App entry page and fonts |
| `src/app.mjs` | Views, dialogs, event handlers, and browser persistence |
| `src/core.mjs` | Player mapping, auction rules, budgets, squads, and history |
| `src/workbook.mjs` | CSV/XLSX reading and workbook export |
| `src/styles.css` | Responsive premium styling |
| `scripts/` | Local server, static build, preview, and test commands |
| `tests/` | Auction model and UI event checks |
| `samples/` | Sample registration workbook and CSV |

## Build and verify

```powershell
npm test
npm run build
npm run preview
```

The build copies `src/` into `dist/`. The preview is available at **http://localhost:4173**. You can deploy the contents of `dist/` to a static web host.

Tests cover import validation, unique selection, sold/unsold outcomes, team balances, squad limits, sale corrections, repeated unsold rounds, confirmations, automatic selection, filtering, and workbook export. They write test artifacts into `test-output/`. UI checks use a DOM fixture and do not replace testing in a real browser.

## Data and scope

Progress and preferences are stored in this browser's local storage for the current website address. A different browser, port, or deployed address has its own data. Clearing browser storage or resetting the demo clears that copy of the auction. Export results when a round is complete.

This version has no shared database, login system, or multi-organizer synchronization. Registration remains outside the app in Google Forms; upload its downloaded spreadsheet here. Google Fonts and optional external player photo URLs use the internet; fallback fonts are available. Use a current Chrome or Edge browser for XLSX import.

Registration uploads are limited to 8 MB and 1,000 players. Logos are limited to 1 MB. Squad limits default to 11 and can be configured per team.
