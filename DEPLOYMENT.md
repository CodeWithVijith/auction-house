# Testing and deployment

## Quick local UI test

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173`. Test this organizer path:

1. Import `samples/player-registrations.xlsx`.
2. Review field mappings and confirm the roster.
3. Add or edit a team and upload a logo.
4. Start the auction and spin a player.
5. Record one sold player and one unsold player.
6. Finish the round, start the unsold round, and export Excel.
7. Resize the browser to phone and laptop widths and confirm every action remains visible.

Automated checks:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

## Full local web and database test

Docker Desktop or another PostgreSQL 17 installation is required.

```powershell
docker compose up -d postgres
$env:DATABASE_URL="postgres://auction:auction@127.0.0.1:5432/auction_house"
$env:BOOTSTRAP_EMAIL="admin@example.com"
$env:BOOTSTRAP_PASSWORD="choose-a-long-test-password"
$env:BOOTSTRAP_NAME="Auction Admin"
$env:BOOTSTRAP_ORGANIZATION="Premier League"
npm.cmd run build
npm.cmd run api:migrate
npm.cmd run api:bootstrap
npm.cmd run api:start
```

Open `http://127.0.0.1:3000`. Verify API health at `http://127.0.0.1:3000/api/health`.

The migration and bootstrap commands are safe to run again. Existing migrations and the existing administrator are skipped.

## Deploy to Render

The repository includes `render.yaml`. It defines one Node web service and one PostgreSQL 17 database.

1. Commit and push the repository to GitHub.
2. In Render, choose **New → Blueprint**.
3. Connect the GitHub repository and select `render.yaml`.
4. Enter these secret values when Render requests them:
   - `BOOTSTRAP_EMAIL`
   - `BOOTSTRAP_PASSWORD` with at least 12 characters
   - `BOOTSTRAP_NAME`
   - `BOOTSTRAP_ORGANIZATION`
5. Create the Blueprint and wait for the database and web service to become healthy.
6. Open the generated `onrender.com` address.
7. Verify `<deployed-url>/api/health` returns `{"status":"ok"}`.
8. Test direct URLs such as `<deployed-url>/auction`, `/teams`, and `/results`.

Render supplies `DATABASE_URL` from the managed database. Each service start applies unapplied migrations, creates the first administrator once, builds the SPA, and serves the UI and API from one origin.

## Current deployment boundary

The hosted UI is fully usable, but its auction roster, teams, rounds, and results still use IndexedDB in each browser. The new server currently persists accounts, organizations, sessions, and event records. Cross-device auction synchronization will become available after the remaining team/player/import/auction API integration is completed.

Do not use the current build for a multi-device live auction. Use one browser profile and export the final workbook for recovery.
