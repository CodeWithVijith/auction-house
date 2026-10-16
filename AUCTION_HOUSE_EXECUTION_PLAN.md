# Auction House — Full Codex Execution Plan

Version: 1.0  
Prepared: 11 October 2026  
Target folder: `C:\Users\vijit\Documents\GitHub\auction-house`  
Deliverable: a runnable player-auction application with premium styling and complete organizer flows.

## 1. Instructions to the coding agent

Implement this plan in the target folder. Do not stop after generating a design, scaffold, or another plan. Deliver working code, realistic sample data, tests for the auction rules, and instructions for running the app.

Start by inspecting the folder, its `AGENTS.md` instructions, `package.json`, and Git status. Preserve unrelated files and existing user changes. If a working React app exists, extend it. If the earlier Auction House JavaScript export exists, reuse its auction behavior and fixtures while migrating the app incrementally to the stack below. If the folder is empty, create the project there. Do not create a second nested `auction-house` folder.

Use the specified defaults for routine choices. Ask only when a missing requirement blocks implementation. Implement every core feature before spending time on optional extensions. Do not deploy to a public host or configure paid services as part of this task.

If the Windows folder is unavailable in the current coding environment, state that limitation and work in the actual available project folder. Do not claim to have written files to a drive you cannot access.

Maintain `IMPLEMENTATION_STATUS.md` with completed work, remaining work, actual checks run, and known limitations. Update it at meaningful milestones. At the end, provide launch commands and a concise implementation report.

### Ready-to-use instruction for Codex

```text
Read AUCTION_HOUSE_EXECUTION_PLAN.md and implement the complete project in this workspace.
Follow applicable AGENTS.md instructions and preserve my existing changes.
Complete the core features in the order specified, verify the auction rules and browser flows,
and fix failures before reporting completion. Use working controls and real Excel import/export.
Keep IMPLEMENTATION_STATUS.md updated. Do not stop at a scaffold or a visual mockup.
```

## 2. Product goal and agreed scope

Auction House helps an organizer conduct a sports-player auction. Player registration happens externally through Google Forms. The organizer downloads the responses as Excel or CSV, uploads that file, maps the fields the auction needs, manages branded teams, and conducts a random player selection and sold/unsold process.

The app must support a complete main auction, optional subsequent auctions of unsold players, accurate team budgets and squad counts, and final Excel results.

### Core requirements

| ID | Requirement | Required behavior |
| --- | --- | --- |
| F01 | External registration | Registration stays in Google Forms; import the downloaded file. |
| F02 | Spreadsheet import | Accept `.xlsx` and `.csv`, preview rows, map fields, validate, and confirm. |
| F03 | Selective data retention | Persist required mapped fields; discard unrelated registration columns. |
| F04 | Teams and branding | Add, edit, and safely delete teams; manage name, short name, logo, color, and budget. |
| F05 | Points and rupees | Configure one auction unit: integer points or INR with up to two decimals. |
| F06 | Random wheel | Select an eligible player randomly through an animated wheel. |
| F07 | Name-free wheel | Never display player names on the wheel, including during its animation. |
| F08 | Sold outcome | Enter an amount, select a team, review, and confirm the sale. |
| F09 | Unsold outcome | Confirm unsold without an amount or a team allocation. |
| F10 | Automatic progression | After saving an outcome, spin for the next player when auto-next is enabled. |
| F11 | Live team information | Show starting budget, spent, remaining, and player count for every team. |
| F12 | Collapsible left rail | A button switches between the full team sidebar and an icon/logo rail. |
| F13 | Unsold re-auction | After a round finishes, auction its unsold pool again without resetting existing sales. |
| F14 | Results and Excel export | Show results and export a real multi-sheet `.xlsx` workbook. |
| F15 | Player management | View, search, filter, add, edit, and safely delete player profiles. |
| F16 | Event settings | Manage event name, season, logo, auto-next preference, and player-card fields. |
| F17 | Squad limits | Configure maximum players per team and prevent sales beyond the limit. |
| F18 | Sale corrections | Correct the amount or team of an existing sale with refund, validation, and audit history. |
| F19 | Persistence and resume | Save progress locally and recover the current player after a refresh. |
| F20 | Premium responsive UI | Follow the reference auction structure with polished dark and gold styling. |

F15–F19 carry forward the additional behavior included in the previous Auction House project. They belong in this implementation, not only in the roadmap.

### Scope boundary

The agreed baseline is a complete organizer-operated app with browser-local persistence. It does not require a shared server, login, payments, real-time online bidding, direct Google Forms integration, or several organizers editing the same auction across devices.

The organizer enters the final sold amount manually. There is no bidder portal, automatic bid increment engine, or financial payment collection. Points and rupees describe the auction budget and allocation, not a payment transaction.

Keep persistence behind a repository interface so a backend can be added later. Do not present local storage as a shared database or add placeholder authentication that suggests data is synchronized.

## 3. Design reference and visual direction

Primary reference: <https://neoauction.vercel.app/auction>

Previously created premium design: <https://auction-house-premium.developerndtester.chatgpt.site>

Use the NeoAuction auction page as the layout reference: top navigation, a left team rail, a central auction stage, a dark background, gold accents, a large serif event heading, and a prominent start/reveal area. Preserve that recognizable structure while improving spacing, typography, controls, feedback, and responsiveness.

If the reference is accessible, inspect it before finalizing the shell. If it requires sign-in and credentials are unavailable, continue with the explicit layout requirements in this document. Do not save credentials in source code, seed files, README files, or screenshots. Reference inspection must not modify another site's auction data.

### Desktop layout

- Top bar: brand/event logo on the left; Auction, Teams, Players, Unsold, and Results navigation; Import and Settings as utility actions.
- Left rail: roughly 260–300 px expanded and 72–84 px collapsed, depending on viewport size. It contains team logos, names, budgets, player counts, and a clearly visible collapse/expand control.
- Main stage: event title and season, current round and progress, the central start/wheel/player area, and outcome controls.
- Initial auction state: an elegant “Auction Awaits” panel with a gold emblem, a short instruction, and the main start button.
- Active state: the name-free wheel, followed by a large player spotlight and clear sold/unsold controls.
- Complete state: round summary, results navigation, Excel export, and an unsold re-auction action when applicable.

### Visual tokens

| Token | Suggested value | Use |
| --- | --- | --- |
| Background | `#090B0E` | Page canvas |
| Surface | `#11151B` | Cards, panels, and sidebar |
| Raised surface | `#181E26` | Dialogs, fields, and selected controls |
| Gold | `#C9A45C` | Primary actions, headings, and active navigation |
| Soft gold | `#E9CF97` | Hover states and highlights |
| Main text | `#F4F0E8` | Readable primary text |
| Muted text | `#A5ABB5` | Supporting labels |
| Border | `#2A303A` | Neutral dividers |
| Success | `#41B58A` | Sold and valid states |
| Warning | `#D7A54B` | Unsold and low budget states |
| Error | `#E67575` | Validation and blocked actions |

Use Playfair Display or a similar serif for major event headings, and Montserrat or a similar sans serif for navigation and controls. Keep fallback fonts. Bundle fonts when practical; the app must remain usable if font downloads fail.

Use restrained gold borders and glow, spacious controls, consistent radii, and simple team marks. Avoid excessive gradients, decorative dashboards, or panels that distract from the current player. Do not use a generated image for precise UI components or the wheel; build them with CSS, SVG, or canvas.

### Responsive and accessible behavior

- At narrow widths, move team information into a drawer or horizontally accessible cards; keep amount entry and outcome buttons usable without horizontal page scrolling.
- Preserve the collapse preference separately from auction data. Collapsing the rail must not restart a spin, clear the current player, reset form values, or change results.
- In the compact rail, show each team's logo and expose its name, balance, and count through accessible tooltips or a focused popover.
- Use semantic buttons and navigation links, visible keyboard focus, labelled fields, and dialog focus management.
- Show statuses with text and icons as well as color. Respect reduced-motion preferences.
- Announce a saved outcome and the revealed player through an appropriate live region without repeatedly announcing the wheel animation.

## 4. Technology and repository structure

### Default stack for the new implementation

| Layer | Choice |
| --- | --- |
| App | React + TypeScript + Vite |
| Navigation | React Router with normal page routes |
| Styling | CSS variables and component CSS; use existing Tailwind setup if the repo already has it |
| Icons | Lucide React or the existing consistent icon set |
| UI state | Zustand for preferences and transient interaction state |
| Validation | Zod for import, settings, and persisted snapshot schemas |
| Durable local data | IndexedDB through Dexie, hidden behind a repository |
| Spreadsheet I/O | SheetJS Community Edition through a small adapter |
| Domain tests | Vitest |
| Component tests | React Testing Library where interaction coverage is useful |
| Browser checks | Playwright for complete user flows and visual inspection |

Use compatible current releases and commit the lockfile. Do not copy an old package list blindly. Vite's checked documentation currently lists Node.js 20.19+ or 22.12+; set the project baseline to **Node.js 22.12+** and verify installed package engine requirements during setup.

For SheetJS, follow its official distribution instructions rather than assuming the npm registry's `xlsx` package is current. Isolate the dependency behind `spreadsheet.ts`, record the installed version/source, and include the dependency license information. The official framework guide currently documents the vendor's tarball distribution. Do not load an unpinned runtime script from a CDN.

Do not write a custom ZIP/XML Excel parser when a maintained spreadsheet adapter can provide the required behavior. Read uploads as data; do not execute imported formulas or macros.

### Suggested structure

```text
auction-house/
  public/
    favicon.svg
    samples/
      player-registrations.xlsx
      player-registrations.csv
  src/
    app/
      App.tsx
      router.tsx
      AppShell.tsx
    components/
      layout/
        TopNavigation.tsx
        TeamSidebar.tsx
      auction/
        AuctionStage.tsx
        SpinWheel.tsx
        PlayerSpotlight.tsx
        OutcomeForm.tsx
        SaleConfirmation.tsx
        RoundSummary.tsx
      common/
        Dialog.tsx
        EmptyState.tsx
        StatusBadge.tsx
    features/
      import/
      teams/
      players/
      auction/
      unsold/
      results/
      settings/
    domain/
      types.ts
      schemas.ts
      money.ts
      selectors.ts
      commands.ts
      random.ts
    persistence/
      repository.ts
      indexedDbRepository.ts
      migrations.ts
    services/
      spreadsheet.ts
      assets.ts
    state/
      uiStore.ts
    data/
      samplePlayers.ts
      sampleTeams.ts
    styles/
      tokens.css
      global.css
    main.tsx
  tests/
    unit/
    integration/
    e2e/
    fixtures/
  docs/
    AUCTION_HOUSE_EXECUTION_PLAN.md
  index.html
  package.json
  package-lock.json
  IMPLEMENTATION_STATUS.md
  README.md
```

This is a suggested organization, not a requirement to create empty files. Organize by responsibility and keep the auction rules separate from rendering. The state store must not be a second independent durable source of budgets or allocations.

## 5. Screens and navigation

| Route | Screen | Main actions |
| --- | --- | --- |
| `/` | Entry | Redirect to `/auction` or show the existing setup state. |
| `/auction` | Live auction | Start spin, reveal player, sell, mark unsold, toggle auto-next, view teams. |
| `/import` | Import players | Upload, choose worksheet/header, map fields, validate, confirm import. |
| `/teams` | Teams | Create/edit/delete team, upload logo, configure budget/capacity, inspect squad. |
| `/players` | Players | Search/filter roster and manage profiles. |
| `/unsold` | Unsold pool | Inspect unsold players and start a new round when allowed. |
| `/results` | Results | Filter final outcomes, inspect totals, correct a sale, export Excel. |
| `/settings` | Event settings | Branding, unit, display preferences, auto-next, reset/sample controls. |

Back/forward navigation and a refresh on any route must work. A route change must not lose persisted auction progress. Document the history fallback needed when deploying the static build.

The left team rail is essential on the live auction page. Keep its component reusable on other screens, but do not crowd import mapping or management tables to force it everywhere.

## 6. Data model and authoritative calculations

Use stable internal IDs for all entities. Keep the player registration code separate from the internal ID. A player may share a name with another player; names are not identifiers.

Represent all financial values as integers:

- `POINTS`: one stored unit equals one point.
- `INR`: one stored unit equals one paisa; `1250.50` rupees becomes `125050`.

The generic field name below is `amountMinor`; for points its scale is 1. Parse decimal input from strings, validate precision before conversion, and enforce safe integer limits. Never use floating-point accumulation for team balances.

### Core types

```ts
type AuctionUnit = 'POINTS' | 'INR';
type PlayerStatus = 'PENDING' | 'CURRENT' | 'SOLD' | 'UNSOLD';
type RoundKind = 'MAIN' | 'UNSOLD';
type RoundStatus = 'READY' | 'ACTIVE' | 'COMPLETED';

interface Player {
  id: string;
  registrationCode: string;
  name: string;
  role: string;
  category?: string;
  age?: number;
  city?: string;
  photoUrl?: string;
  sourceRow?: number;
}

interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  logoAssetId?: string;
  startingBudgets: Record<AuctionUnit, number>;
  maxPlayers: number;
}

interface AuctionRound {
  id: string;
  number: number;
  kind: RoundKind;
  status: RoundStatus;
  eligiblePlayerIds: string[];
  startedAt?: string;
  completedAt?: string;
}

interface CurrentSelection {
  id: string;
  roundId: string;
  playerId: string;
  selectedAt: string;
}

interface OutcomeRecord {
  id: string;
  roundId: string;
  playerId: string;
  selectionId: string;
  status: 'SOLD' | 'UNSOLD';
  teamId: string | null;
  amountMinor: number | null;
  unit: AuctionUnit;
  sequence: number;
  completedAt: string;
  playerNameAtTime: string;
  teamNameAtTime: string | null;
}

interface SaleCorrection {
  id: string;
  targetOutcomeId: string;
  previousTeamId: string;
  previousAmountMinor: number;
  nextTeamId: string;
  nextAmountMinor: number;
  reason?: string;
  sequence: number;
  correctedAt: string;
  previousTeamNameAtTime: string;
  nextTeamNameAtTime: string;
}

interface AuctionSnapshot {
  schemaVersion: number;
  id: string;
  revision: number;
  eventName: string;
  season: string;
  eventLogoAssetId?: string;
  unit: AuctionUnit;
  configurationLocked: boolean;
  isSample: boolean;
  players: Player[];
  teams: Team[];
  rounds: AuctionRound[];
  currentRoundId: string | null;
  currentSelection: CurrentSelection | null;
  outcomes: OutcomeRecord[];
  corrections: SaleCorrection[];
  preferences: {
    autoNext: boolean;
    showPhoto: boolean;
    showAge: boolean;
    showCity: boolean;
  };
}
```

### Derived views

Compute player status, current allocations, team totals, and progress through selectors. Do not maintain independently writable `spent`, `remaining`, or squad count fields.

An effective allocation is an original sold outcome with all subsequent corrections applied in sequence. Since sold players never enter an unsold round, each player has at most one current allocation. Historical outcomes remain intact.

For each team:

```text
spent = sum(effective sold allocations assigned to this team)
remaining = startingBudgets[auction.unit] - spent
playerCount = number of distinct players in those allocations
slotsRemaining = maxPlayers - playerCount
```

Compute round progress from distinct resolved players in that round's eligible list. Corrections are not additional processed players. Global results count each player once; history may contain several attempts for that player across rounds.

During an unsold round, eligible players without an outcome in that round appear as “Awaiting re-auction”/Pending, and the current selection appears as Current. Their previous unsold attempts remain in history. Show the retry pool's pending count explicitly rather than implying those prior attempts disappeared.

Record timestamps in ISO format. Display them in the user's locale. Keep original name snapshots in history so renaming a team or editing a profile does not rewrite the past.

## 7. Persistence, commands, and recovery

### Durable repository

Store an event snapshot and logo/image assets in IndexedDB. Keep the sidebar collapse preference in a separate local UI preference so an auction reset does not unexpectedly expand the rail.

Expose a repository abstraction with operations equivalent to:

```ts
interface AuctionRepository {
  load(): Promise<AuctionSnapshot | null>;
  execute(command: AuctionCommand, expectedRevision: number): Promise<AuctionSnapshot>;
  saveAsset(blob: Blob): Promise<string>;
  resetToSample(expectedRevision: number): Promise<AuctionSnapshot>;
}
```

Each command reads the latest persisted snapshot, checks the revision, validates the operation, applies it, and writes the complete next snapshot in one transaction. The UI only shows success after the write succeeds. A failed command leaves the prior snapshot unchanged.

Keep commands narrow: confirm import, save team, delete team, save player, delete player, update settings, select player, record sold, record unsold, start unsold round, and correct sale.

Do file decoding, image resizing, and spreadsheet work before opening a write transaction. Do not perform slow network or unrelated asynchronous work inside an IndexedDB transaction. Catch quota/unavailable-storage errors and show an actionable message; never silently reset the auction.

### Recovery rules

- Validate the snapshot schema before hydration. Version migrations must be explicit and tested.
- Refreshing during a spin must recover the already selected player, not choose another one. Show that player and require the organizer to complete its outcome.
- Refreshing after a saved outcome must not save it again or start a surprise automatic spin. Resume in an idle state with the next-spin action available.
- Keep auto-next timers and wheel animation progress transient. They are not durable auction outcomes.
- When another tab changes the snapshot, refresh the view and cancel stale timers. Revision checks and transaction validation must prevent duplicate selection or duplicate sales even if two tabs attempt an action.
- Explain that different browsers, devices, ports, and website origins have separate local data.
- If migrating the earlier local-storage version, read it once, validate it, convert rupees to integer minor units, preserve existing players/rounds/history, and write it to IndexedDB atomically. Do not delete the old copy until conversion succeeds. If migration cannot be validated, preserve the old copy and report the issue instead of loading samples over it.

## 8. Spreadsheet import flow

### User flow

1. Open Import Players.
2. Browse or drop a `.xlsx` or `.csv` file.
3. For an XLSX with several worksheets, choose the registration sheet. Default to the first non-empty sheet and allow another choice.
4. Show a header preview; default to the first non-empty row as headers and allow the organizer to choose a header row if the sheet has a title block.
5. Suggest mappings from common column names. Keep every suggestion editable.
6. Show the mapped player preview, valid/error counts, and the names of excluded columns.
7. Correct the mapping or upload a corrected file. Do not silently import only the valid subset.
8. Confirm import when all included rows are valid.
9. Persist normalized player fields, source-row numbers, file metadata, and mapping metadata. Discard raw excluded fields from memory and durable storage.
10. Continue to Teams or Auction setup.

### Mapping

| App field | Required? | Example aliases |
| --- | --- | --- |
| Registration code | Optional | RegistrationID, Player ID, Reg ID |
| Player name | Yes | FullName, Full Name, Player Name, Name |
| Role | Optional | Role, Playing Role, Position |
| Category | Optional | Category, Age Group, Level |
| Age | Optional | Age |
| City | Optional | City, Location, Town |
| Photo URL | Optional | Photo URL, Image URL, Profile Photo |

Matching is trimmed and case-insensitive. Do not map one source column to several unrelated fields without warning. Never infer age from a date of birth unless a separate age-calculation feature is explicitly requested.

### Validation and limits

- Limit uploads to 8 MB and 1,000 non-empty player rows. Make the limits constants and explain failures clearly.
- Reject unsupported formats such as `.xls`, macro-enabled workbooks, and corrupt files with a useful message.
- Ignore completely empty rows, but retain their source row numbers for accurate error reporting.
- Require a non-empty name. Accept duplicate names when registration codes are different.
- Normalize registration codes for duplicate comparison using trimming and a consistent case rule. Preserve a useful display form.
- For missing registration codes, generate readable codes such as `PL-001` while avoiding collisions with supplied codes and other generated codes. Internal UUIDs remain separate.
- Validate age as a whole number from 0 to 120 when provided. Invalid supplied ages require correction; a missing optional age is valid.
- Accept optional HTTP/HTTPS photo URLs. Render them as image URLs, not HTML. Do not assume a Google Drive sharing-page URL is a direct image URL; show a fallback avatar if loading fails.
- Parse CSV quoting, escaped quotes, embedded line breaks, UTF-8 BOM, and CRLF correctly. If the delimiter is uncertain, let the user select it or explain the supported format.
- Keep imported cells as plain data. Do not execute spreadsheet formulas or inject cell content into HTML.
- Before any outcome exists and no player is selected, allow replacing the roster after a clear confirmation.
- Once an outcome exists, block roster replacement and adding/deleting players. Allow permitted profile edits. A real roster must never be replaced by the demo shortcut.

Raw spreadsheet data may exist temporarily in the import view for mapping. It must not appear in logs, analytics, or persisted snapshots. Email, phone, jersey size, and other unmapped registration fields are excluded from the final auction data and exports.

## 9. Teams, branding, and squad management

Each team form contains name, short name, logo upload, brand color, starting budget for the active unit, and maximum players.

Defaults: four sample teams, 1,000 points or ₹10,000 per team, and 11 maximum players. Draft budgets for the two units are independent values, not a currency conversion.

### Rules

- Require a trimmed team name. Generate a short name when omitted, with a maximum of five characters.
- Validate the color and budget; a zero budget is allowed but cannot support a positive sale.
- Restrict logos to PNG, JPEG, and WebP, at most 1 MB. Decode the image before accepting it, use a fallback mark, and revoke temporary object URLs when no longer needed.
- Require squad capacity between 1 and 1,000. Do not allow lowering it below the current squad count.
- Lock the active unit and existing starting budgets after the first outcome. Team branding may still be edited.
- Add a new team only when there is no active player or spin. Validate its budget in the already locked auction unit if outcomes exist.
- Delete a team only when no selection form references it, it has no allocated players, and no historical outcome or correction references it. Otherwise explain the reason it cannot be deleted. Never erase its history to make deletion possible.
- A team squad dialog lists current players, roles, amounts, total spent, and available slots.

### Sidebar presentation

Expanded cards show logo, name/short name, remaining budget prominently, spent/starting budget, player count such as `3 / 11`, and a budget meter. Highlight low balance or a full squad without making the team name unreadable.

Collapsed mode shows logos with accessible team details. The toggle has `aria-expanded` and a clear tooltip. Both directions work by mouse and keyboard, and the preference survives a refresh.

## 10. Auction lifecycle and wheel

### Preconditions

Starting a round requires at least one valid player and one team. Before the first selection, prompt for review of the unit and team budgets if setup is incomplete. Zero budgets do not prevent marking players unsold, but the UI should explain why teams cannot buy.

At most one unresolved current player may exist. A player already resolved in this round cannot be selected again. A sold player cannot be selected in any unsold round.

### Transitions

| Current condition | Action | Result |
| --- | --- | --- |
| Ready/idle, eligible players remain | Start spin | Persist one random current selection, then animate. |
| Spinning | Animation completes | Reveal the persisted selected player. |
| Player revealed | Submit valid sale | Open confirmation; no result saved yet. |
| Player revealed | Submit unsold | Open confirmation; no result saved yet. |
| Confirmation open | Cancel | Return to the same current player and form values. |
| Confirmation open | Confirm | Validate again, persist outcome, clear selection, update all projections. |
| Outcome saved, pending players remain | Auto-next enabled | Schedule one next spin after the feedback delay. |
| Outcome saved, pending players remain | Auto-next disabled | Wait for the organizer to press next spin. |
| No pending/current players in round | Complete round | Save completed timestamp and show round summary. |
| Completed round, unsold players exist | Start unsold round | Create a new round using only the unsold pool. |

### Random selection

Build the eligible pool from the latest persisted state. Choose one player uniformly, using `crypto.getRandomValues` with an unbiased index selection method. Inject a deterministic random provider in domain tests; do not expose a “choose winning player” control in the real UI.

Persist the selected player and a unique selection ID before animating. The wheel visual is decorative feedback for that persisted random draw, not a second random selection. Re-rendering or resizing cannot change the winner.

Use unlabeled colored segments, neutral marks, or anonymous slots. Never put player names in wheel SVG text, canvas drawing instructions, tooltips, animation labels, or its accessible label. “Selecting the next player” and eligible-player counts are sufficient.

For large pools, a fixed number of decorative segments is acceptable; explain the count separately. It must not imply each segment is a named player. Use approximately 3–4 seconds of motion, or a shorter equivalent for reduced motion, then reveal the player card.

### Player spotlight

Show registration code, name, role, category, optional age/city, and a photo/fallback portrait. Settings control optional card fields. Include a round label and accurate “processed / eligible” count.

After reveal, provide the amount field, team selector, Sold action, and Unsold action. Keep the name off the wheel itself even though it is now visible on the separate player card.

### Automatic next selection

Default auto-next to enabled. After a successful save, show the outcome for roughly 1.5–2 seconds and then spin automatically if eligible players remain. Never auto-spin while a save failed, a confirmation is open, another player is current, or the organizer has turned auto-next off.

Cancel timers on route changes away from Auction, reset, starting another round, stale-data notification, and unmount. Returning to Auction does not automatically fire an old timer. Toggling the sidebar must not cancel or duplicate the legitimate current animation.

## 11. Sold, unsold, and monetary rules

### Sold flow

1. Enter the amount in the active unit.
2. Select a team with available budget and squad capacity.
3. Validate and show the confirmation dialog with player, team, amount/unit, current remaining budget, resulting remaining budget, and resulting player count.
4. On confirmation, validate against the latest snapshot again.
5. Append one sold outcome and clear the current selection atomically.
6. Update the team rail, squad, global counts, round progress, and results from the committed snapshot.

Amount must be positive. Points accept whole numbers only. INR accepts at most two decimal digits. A sale equal to the remaining budget is valid and produces zero remaining; a sale above it is blocked. Do not accept negatives, zero, `NaN`, infinity, scientific notation, or silently rounded three-decimal INR input.

Use clear validation messages such as “Select the winning team”, “Points must be a whole number”, and “Royal Strikers has only 750 pts remaining”. Preserve input values after a validation error.

Disable Sold while saving, but do not rely on a disabled button for correctness. A persisted outcome must be unique for its selection ID and for the player/round pair. Repeated clicks or a retried save return the existing result or reject the duplicate without a second deduction.

### Unsold flow

Open a confirmation for the revealed player. On confirmation append an unsold outcome with `amountMinor: null` and `teamId: null`, clear the current selection, and update progress. Never retain a previously entered amount or chosen team on that outcome. Team balances and squads remain unchanged.

### Unit configuration

Configure one unit for the event, not separately for each player. Before the first outcome, switching unit uses the teams' separate draft budgets and clears an incompatible unsaved amount. It does not multiply existing budgets by an invented exchange rate.

After the first outcome, lock the unit and existing starting budgets through all re-auction rounds. Changing them requires a new/reset event after confirmation, not rewriting already completed sales.

## 12. Unsold re-auction rounds

The Unsold and completed Results screens must expose **Auction unsold players (N)** when there is an unsold pool. This action is disabled until the current round is complete, with an explanation.

When activated:

1. Show a confirmation with the unsold count and next round number.
2. Re-read the latest state and ensure the current round is complete, there is no active selection, at least one team exists, and the pool is not empty.
3. Create a new round with `kind: 'UNSOLD'`, the next number, and an immutable eligible list containing only currently unsold players.
4. Keep existing outcome records, corrections, sold allocations, team budgets, and squad counts intact.
5. Show the retry pool as pending in the new round. Open the auction stage with a clear “Unsold round 2” label.
6. Use the same random, sold, unsold, validation, and auto-next behavior as the main round.
7. At completion, recompute final results. Offer another unsold round if some players remain unsold.

Never clone a player to create the retry pool. The same internal player ID appears in several history attempts but only once in the roster and final results. A sale in a retry round deducts once from the team's already remaining budget.

Distinguish “current round complete” from “all players sold”. Unsold players do not prevent finishing a round or exporting its completed results. Re-auction is optional; do not force it.

## 13. Results, corrections, and Excel export

### Results screen

Show total players, final sold count, final unsold count, allocated total, active unit, completed round count, and team summaries. Provide All/Sold/Unsold filters and search. Include registration code, player name, role, final status, team, final amount, and final outcome round in the table.

For a round in progress, clearly label results as current progress and disable final export. Enable export once the active round is complete and no player is current. If another unsold round starts, disable final export until that round completes.

### Sale correction

Allow editing a sold player's amount or assigned team when no player is active or spinning. Keep the original outcome immutable and append a correction.

For validation, temporarily remove the player's effective existing allocation. This refunds its amount and frees its slot on the previous team. Validate the replacement against that adjusted state, then apply the new allocation and the correction in one transaction. This also handles a correction to the same team correctly.

If the replacement fails because of budget, squad capacity, or invalid input, keep the previous amount, team, and history unchanged. Show both the previous and new values before confirmation. Optionally collect a short correction reason.

Only amount/team corrections are in scope. Do not add “sold to unsold”, deletion of past outcomes, or arbitrary budget adjustments without a separate agreed rule.

### Workbook

Export a real `.xlsx`, not a CSV renamed to `.xlsx`. Use a sanitized event-based filename such as `Auction_House_Results_2026-10-11.xlsx`.

| Sheet | Required contents |
| --- | --- |
| Player Results | One row per player: registration code, name, role, category, age, city, final status, current team, final amount, unit, final round, completed time. |
| Team Allocations | One row per current sold allocation: team, player code/name, role, effective amount, and unit. |
| Unsold Players | One row per final unsold player with profile fields and latest attempted round; team and amount cells remain blank. |
| Summary | Event, season, unit, counts, completed rounds, total allocated amount, and per-team starting/spent/remaining budgets, player counts, and limits. |
| Auction History | Every original outcome and correction in sequence, with round, player, action, old/new team and amount where relevant, unit, and timestamp. |

Use numeric Excel cells for monetary values and counts. Convert stored INR paisa to rupees for export and apply a two-decimal numeric format. Points remain integer numeric cells. Keep a separate Unit column so labels never corrupt numeric cells.

Use readable headers, sensible column widths, frozen headers, and filters if supported by the selected adapter. Do not promise formatting unsupported by the chosen library. The workbook must remain useful even without decorative formatting.

Write untrusted text as literal text, not formulas. A name beginning with `=`, `+`, `-`, or `@` must not become a workbook formula. Never export unmapped private registration fields.

Validate exports by reading them back through a spreadsheet reader in tests, checking sheet names, row counts, status values, numeric cells, units, and total allocations. History sums are not the final allocated total because corrections and unsold retries may add extra records.

## 14. Settings, demo data, and destructive actions

Settings include event name, season, event logo, auction unit, auto-next preference, and photo/age/city visibility. Explain any locked fields next to the controls.

The initial demo may open directly on Auction with six players and four teams so the UI is immediately reviewable. Make demo data clearly identifiable. The sample Excel download must contain additional registration columns to demonstrate selective import.

Provide reset/sample controls through a confirmation dialog that states what will be replaced. Never automatically reset a saved real auction on reload, import failure, migration failure, or storage failure. Keep the collapsed-sidebar preference independent.

A “Finish sample round” shortcut is optional for the demo only. It must be hidden and protected at command level after importing a real roster or manually changing the sample roster. It must use the same domain commands and validations, not directly invent result rows or bypass budgets.

## 15. Dummy data and one complete example

### Players

All entries below are fictional.

| Code | Name | Role | Category | Age | City |
| --- | --- | --- | --- | --- | --- |
| PL-001 | Arjun Mehta | Batter | Senior | 24 | Bengaluru |
| PL-002 | Rohan Nair | All-rounder | Senior | 26 | Kochi |
| PL-003 | Karthik Rao | Bowler | Senior | 23 | Hyderabad |
| PL-004 | Dev Sharma | Wicketkeeper | Junior | 21 | Pune |
| PL-005 | Sahil Khan | Batter | Senior | 25 | Mumbai |
| PL-006 | Vikram Patel | Bowler | Junior | 22 | Ahmedabad |

Sample registration file headers:

```csv
RegistrationID,FullName,Role,Category,Age,City,PhotoURL,Email,Phone,JerseySize
```

Use safe fictional contact values such as `arjun@example.com`. Map the first seven fields; exclude Email, Phone, and JerseySize after confirmation. Sample photo URLs may be empty and use the built-in avatar.

### Teams

| Team | Short name | Color | Points budget | INR budget | Maximum players |
| --- | --- | --- | --- | --- | --- |
| Royal Strikers | RS | `#7258C9` | 1,000 | ₹10,000 | 11 |
| Coastal Sharks | CS | `#288AB3` | 1,000 | ₹10,000 | 11 |
| Thunder XI | TX | `#D28C29` | 1,000 | ₹10,000 | 11 |
| Green Falcons | GF | `#21846D` | 1,000 | ₹10,000 | 11 |

### Main round in points

For deterministic QA, inject the selection provider so players appear in code order. Real use stays random.

| Player | Outcome | Team | Amount |
| --- | --- | --- | --- |
| Arjun Mehta | Sold | Royal Strikers | 250 pts |
| Rohan Nair | Unsold | — | — |
| Karthik Rao | Sold | Coastal Sharks | 400 pts |
| Dev Sharma | Sold | Thunder XI | 300 pts |
| Sahil Khan | Sold | Green Falcons | 500 pts |
| Vikram Patel | Unsold | — | — |

Expected main-round totals: 6 processed, 4 sold, 2 unsold, 1,450 points allocated. Each team has one player. Remaining budgets are 750, 600, 700, and 500 points in the team-table order.

### Unsold round 2

Only Rohan and Vikram are eligible. Sell Rohan to Royal Strikers for 750 points and mark Vikram unsold again.

Expected results: Royal Strikers has 2 players, spent 1,000, remaining 0; other teams remain unchanged. Overall totals are 5 sold, 1 unsold, and 2,200 points allocated. History has 8 outcome records, while Player Results still has exactly 6 player rows.

### Unsold round 3

Only Vikram is eligible. Sell him to Thunder XI for 300 points.

Expected results: all 6 players sold, no unsold pool, 2,500 points allocated, and 9 outcome records. Thunder XI has 2 players and 400 points remaining. No fourth unsold round action is available.

Run a separate INR fixture to prove decimal behavior: a ₹1,250.50 sale from a ₹10,000 budget leaves ₹8,749.50. Sales of ₹0.10 and ₹0.20 total exactly ₹0.30 in storage-derived calculations.

## 16. Implementation phases

Complete these in order, integrating each phase into the working app. A phase is complete when its exit checks pass, not when the files merely exist.

### Phase 0 — Inspect and establish the project

- Inspect the real workspace, existing files, applicable instructions, and Git changes.
- Record which parts of the previous app can be reused and any migration needed.
- Scaffold React/TypeScript/Vite if required; resolve compatible packages and commit a lockfile to the project files.
- Create the app routes, CSS tokens, scripts, README outline, and status checklist.
- Define the scope boundary and storage behavior in the README.

Exit: the development server and build work; all required routes render a shell; no unrelated files were overwritten.

### Phase 1 — Domain model, money, and persistence

- Implement types, schemas, immutable history records, effective allocation selectors, and round-progress selectors.
- Implement exact amount parsing/formatting for points and INR.
- Implement command validation and atomic snapshot persistence with revision guards.
- Add schema versioning, loading/error states, and a sample seed available only when appropriate.
- If old local data exists, implement and test its migration before replacing its storage path.

Exit: domain tests prove exact money arithmetic, no partial writes, correct derived balances/counts, and preserved data on storage errors.

### Phase 2 — Premium shell and team rail

- Build the top navigation, event branding, central stage container, and team sidebar.
- Implement expanded/collapsed modes and preference persistence.
- Create desktop and mobile layouts, keyboard navigation, empty states, and reusable dialogs.
- Use the dummy data to inspect the visual hierarchy before adding every form.

Exit: layout resembles the reference structure; collapsing/expanding preserves live state; mobile has no page overflow and controls remain accessible.

### Phase 3 — Import, teams, players, and settings

- Implement real XLSX/CSV parsing, worksheet/header selection, mapping suggestions, preview, limits, and errors.
- Implement atomic import confirmation and raw-field disposal.
- Implement team branding/logo management, budgets, squad limits, safe deletion, and squad inspection.
- Implement player search, status filters, profile forms, setup-only add/delete, and placeholders for failed photos.
- Implement event/unit/display settings and their lock rules.
- Generate the sample XLSX/CSV files and sample download action.

Exit: a downloaded registration file can become a clean roster; private extra columns are absent from persisted data; team and player controls perform real validated changes.

### Phase 4 — Live selection and outcomes

- Implement the unbiased random provider and persisted selection command.
- Build the name-free wheel and reveal behavior with reduced-motion support.
- Implement amount/team selection, validation, confirmations, atomic sold/unsold saves, and duplicate protection.
- Update all team and progress views from committed data.
- Implement auto-next with cancellation/recovery rules and final-round completion.

Exit: the full main-round example works through the real UI; no repeated player occurs; refresh during selection preserves the player; teams never overspend or exceed capacity.

### Phase 5 — Unsold rounds, results, and corrections

- Implement the unsold pool screen, start-round confirmation, guards, and retry pool creation.
- Reuse the normal auction flow for subsequent rounds.
- Implement global result filters/totals and current-round summaries.
- Implement amount/team corrections with refund-before-validation semantics and immutable audit records.

Exit: the example reaches round 3 without duplicate roster entries, lost history, or reset budgets; correction failures leave the entire previous state intact.

### Phase 6 — Excel export

- Implement five-sheet workbook generation through the spreadsheet adapter.
- Export effective allocations and final outcomes while retaining all history attempts/corrections.
- Add numeric formats, safe text handling, a clean filename, progress/error feedback, and export gating.
- Read generated files back in tests and verify the expected sheets, values, and totals.

Exit: the exported workbook opens in Excel/LibreOffice, contains the expected five sheets, and matches the visible final results.

### Phase 7 — Browser verification and polish

- Run unit, integration, and full browser-flow checks; fix failures.
- Test fresh setup, real import, budget/cap failures, refresh recovery, sidebar toggles during a spin, unit lock, sale correction, and repeated unsold rounds.
- Inspect Auction, Import, Teams, Players, Unsold, Results, and dialogs at desktop and mobile sizes.
- Verify focus order, dialog keyboard handling, reduced motion, accessible error feedback, and missing-image fallbacks.
- Finish loading states, empty states, disabled-action explanations, and README instructions.

Exit: core requirements pass, production build succeeds, and status documentation identifies any actual remaining limitation. Do not report browser testing as complete if the environment could not run it.

## 17. Test and acceptance matrix

| Area | Required check | Expected result |
| --- | --- | --- |
| Import | XLSX and quoted CSV | Both create equivalent normalized players. |
| Mapping | Different source headers | Editable mapping imports correct fields. |
| Privacy | Source has Email/Phone/JerseySize | These values are absent after import and from results exports. |
| Validation | Blank name, duplicate code, corrupt/oversized file | Clear error; existing roster remains unchanged. |
| Generated IDs | Missing codes plus supplied `PL-001` | Generated codes do not collide. |
| Teams | Add/edit/delete | Changes persist; referenced team deletion is blocked. |
| Logos | Valid and invalid files | Accepted images render; invalid/oversized uploads are rejected. |
| Points | 250, 1.5, zero, negative | 250 valid; other examples blocked. |
| INR | 1250.50, 1.001, 0.10 + 0.20 | Two decimals valid, third decimal blocked, sum exactly 0.30. |
| Budget | Sale equals remaining, then another sale | First allowed; next positive sale blocked. |
| Capacity | Team with maxPlayers 1 already has one | Another sale blocked without state change. |
| Wheel | Inspect text/accessibility output during animation | No player names in the wheel; winner appears on separate card. |
| Selection | Resolve all main-round players | Each selected once; no next spin after completion. |
| Refresh | Reload after selection is persisted | Same current player recovered. |
| Duplicate save | Repeat confirmation/request | One outcome and one deduction. |
| Unsold | Amount/team were previously entered | Saved unsold has null amount/team; budgets unchanged. |
| Sidebar | Toggle while spinning and after reveal | No new selection, lost amount, or duplicated timer. |
| Auto-next | On, off, route exit, save failure | Exactly one valid next spin; canceled where required. |
| Unit lock | Change after first outcome | Blocked through all later rounds. |
| Re-auction | Start while main round incomplete | Blocked with explanation. |
| Re-auction | Run rounds 2 and 3 | Only unsold pool eligible; sold squads/budgets preserved. |
| Counts | 9 attempts for 6 players | Final roster/results remain 6; history contains 9 attempts. |
| Correction | Move sale to another team | Previous team refunded; new team charged once. |
| Correction | Increase beyond adjusted budget/full team | Entire correction rejected; previous state unchanged. |
| History | Correct a sale or rename team | Original record remains; correction/name snapshots are meaningful. |
| Export | Completed main/retry round | Five real sheets with matching values and numeric amount cells. |
| Export lock | Retry round is still active | Final export disabled with explanation. |
| Text safety | Player name starts with `=` | Exported as literal text, not a formula. |
| Persistence | Reload after results | Same event, balances, outcomes, and preferences. |
| Multiple tabs | Stale revision submits a command | Conflict handled; no duplicate or overspend. |
| Empty state | No roster or no teams | Setup action shown; invalid spin prevented. |
| Demo guard | Real upload then sample shortcut | Shortcut cannot modify real auction results. |
| Accessibility | Keyboard only and reduced motion | Core flow remains operable and readable. |

Use domain unit tests for calculations and invariants; integration tests for repository transactions and migration; browser tests for actual uploads, dialogs, selection, route reloads, and file downloads. Do not substitute mocked UI markup checks for real browser testing when a browser is available.

For browser tests, use temporary browser storage and fixtures. Use deterministic randomness and shorter test animation timing through test-only configuration; keep those controls out of the production UI.

## 18. Local run, scripts, and delivery

Provide scripts equivalent to:

```json
{
  "dev": "vite --host 127.0.0.1",
  "build": "tsc -b && vite build",
  "preview": "vite preview --host 127.0.0.1",
  "lint": "eslint .",
  "test": "vitest run",
  "test:e2e": "playwright test"
}
```

Adapt TypeScript/build configuration to the actual scaffold. Include ESLint and Playwright configurations if exposing those scripts; never document a command that the repo cannot run. Use npm consistently unless the existing repo has another package manager and lockfile.

### Windows developer instructions

```powershell
Set-Location 'C:\Users\vijit\Documents\GitHub\auction-house'
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. If PowerShell blocks `npm.ps1`, use `npm.cmd` for the corresponding commands. Installation instructions must match the implemented React build; do not reuse the earlier zero-dependency export's instructions unchanged.

Verification commands:

```powershell
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview
```

The browser install may require network access. If unavailable, record the limitation and the unrun browser checks explicitly while completing the checks that are available.

### Required delivery files

- Working source, assets, package configuration, and lockfile.
- Sample registration XLSX and CSV files with additional unmapped fields.
- Domain/repository tests and end-to-end test fixtures.
- README with prerequisites, launch/build/test commands, features, local persistence behavior, and deployment route fallback notes.
- `IMPLEMENTATION_STATUS.md` with honest results and remaining limitations.
- This execution plan retained in `docs/` or the project root.

No external credentials or environment secrets are needed for the browser-local baseline. Do not add fake secrets, hard-coded login accounts, or server connection settings that the app does not use.

## 19. Definition of done

- [ ] The app runs from the requested project folder when that folder is available.
- [ ] The UI follows the reference's top bar, left team rail, central stage, dark/gold hierarchy, and premium finish.
- [ ] Imported Excel/CSV rows are mapped, validated, and normalized; unmapped data is discarded.
- [ ] Team branding, budget, capacity, player management, and settings controls are functional.
- [ ] Both points and rupees work with correct validation and exact balances.
- [ ] The wheel contains no names, selects without repeats, and reveals the persisted selected player.
- [ ] Sold/unsold confirmations persist exactly one outcome and update all visible totals.
- [ ] Auto-next and manual progression both work, including refresh and route-change recovery.
- [ ] The collapsible sidebar shows useful team details and preserves auction state.
- [ ] Main and repeated unsold rounds complete without resetting sold players, balances, or history.
- [ ] Sale corrections refund and reallocate safely with retained audit records.
- [ ] Completed results export to a verified five-sheet Excel workbook.
- [ ] Relevant tests and production build pass; browser checks are run or honestly reported unavailable.
- [ ] README and implementation status reflect the actual code and its browser-local scope.
- [ ] No core control is a placeholder, no raw private registration data is retained, and no credentials are committed.

## 20. Optional follow-up work — outside the core build

Do not delay the core release for these. Label them as separate proposals, not as implemented requirements.

- Versioned JSON backup/restore for recovering a local auction before it reaches final export. Validate the entire restored snapshot and confirm replacement of existing data.
- A shared backend with authenticated organizers, event-level authorization, a transactional database, unique outcome constraints, asset storage, backups, and a server-authoritative sale command. This is required for synchronization across devices or organizers; a frontend state store alone cannot provide it.
- A read-only public display/projector view, historical event management, or direct registration integrations after their rules are agreed.

## 21. Official technical references

Checked on 11 October 2026. Recheck package engine and installation details when implementing; do not treat these links as fixed dependency versions.

- Vite setup and Node requirements: <https://vite.dev/guide/>
- SheetJS framework installation and authoritative distribution: <https://docs.sheetjs.com/docs/getting-started/installation/frameworks/>
- Dexie transaction behavior: <https://dexie.org/docs/Dexie/Dexie.transaction%28%29>
- Dexie transaction best practices: <https://dexie.org/docs/Tutorial/Best-Practices>

These references support dependency setup and transaction usage. The auction rules, defaults, flow examples, and acceptance criteria above are the product specification for this project.
