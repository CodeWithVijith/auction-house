import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Download } from 'lucide-react';
import { useAuction } from './context';
import {
  Confirm,
  Dialog,
  ErrorText,
  Field,
  Mark,
  Portrait,
  Asset,
} from './components';
import type { Player, Team } from '../domain/types';
import { uid } from '../domain/seed';
import { validateSale } from '../domain/commands';
import { amountInput, money, parseAmount } from '../domain/money';
import {
  allocations,
  complete,
  finalOutcome,
  status,
  teamStats,
  totals,
  unsold,
} from '../domain/selectors';
import { uploadImage } from '../services/assets';
import { download, exportSheets, workbook } from '../services/spreadsheet';
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
function Heading({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">AUCTION HOUSE / {label}</p>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
function TeamForm({ team, onClose }: { team?: Team; onClose: () => void }) {
  const { s, run, busy } = useAuction();
  const [name, setName] = useState(team?.name ?? ''),
    [short, setShort] = useState(team?.shortName ?? ''),
    [color, setColor] = useState(team?.color ?? '#7258c9'),
    [budget, setBudget] = useState(
      amountInput(
        team?.startingBudgets[s.unit] ?? (s.unit === 'INR' ? 1000000 : 1000),
        s.unit,
      ),
    ),
    [capacity, setCapacity] = useState(team?.maxPlayers ?? 11),
    [logo, setLogo] = useState(team?.logoAssetId),
    [error, setError] = useState(''),
    [uploading, setUploading] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      const t: Team = {
        id: team?.id ?? uid(),
        name: name.trim(),
        shortName:
          short.trim().toUpperCase() ||
          name
            .trim()
            .split(/\s+/)
            .map((x) => x[0])
            .join('')
            .slice(0, 5),
        color,
        logoAssetId: logo,
        maxPlayers: capacity,
        startingBudgets: {
          POINTS: 1000,
          INR: 1000000,
          ...team?.startingBudgets,
          [s.unit]: parseAmount(budget, s.unit, true),
        },
      };
      await run({ type: 'team', team: t });
      onClose();
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <Dialog title={team ? 'Edit team' : 'Add a team'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="dialog-body">
          <Field label="Team name">
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label="Short name">
              <input
                maxLength={5}
                value={short}
                onChange={(e) => setShort(e.target.value)}
              />
            </Field>
            <Field label="Brand color">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </Field>
          </div>
          <Field
            label={`Starting budget (${s.unit === 'INR' ? 'rupees' : 'points'})`}
          >
            <input
              required
              inputMode="decimal"
              value={budget}
              disabled={!!team && s.configurationLocked}
              onChange={(e) => setBudget(e.target.value)}
            />
          </Field>
          {!!team && s.configurationLocked && (
            <p className="muted">
              Starting budgets are locked after the first outcome.
            </p>
          )}
          <Field label="Maximum players">
            <input
              type="number"
              min={1}
              max={1000}
              required
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </Field>
          <Field label="Team logo (PNG, JPEG, WebP · 1 MB)">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setUploading(true);
                  try {
                    setLogo(await uploadImage(f));
                    setError('');
                  } catch (e) {
                    setError(message(e));
                  } finally {
                    setUploading(false);
                  }
                }
              }}
            />
          </Field>
          {logo && (
            <div className="logo-preview">
              <Asset id={logo} alt="Team logo preview" fallback="Logo" />
              <button type="button" onClick={() => setLogo(undefined)}>
                Remove logo
              </button>
            </div>
          )}
          <ErrorText error={error} />
        </div>
        <div className="actions">
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy || uploading}>
            Save team
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function Teams() {
  const { s, run, busy } = useAuction();
  const [edit, setEdit] = useState<Team | null | undefined>(undefined),
    [remove, setRemove] = useState<Team | null>(null),
    [squad, setSquad] = useState<Team | null>(null);
  return (
    <main className="page">
      <Heading label="FRANCHISES" title="The teams. The ambition.">
        <button
          className="primary"
          disabled={busy || !!s.currentSelection}
          onClick={() => setEdit(null)}
        >
          <Plus size={18} /> Add team
        </button>
      </Heading>
      {s.currentSelection && (
        <p className="muted">
          Finish the selected player before adding or deleting teams.
        </p>
      )}
      <div className="team-grid">
        {s.teams.map((t) => {
          const b = teamStats(s, t.id);
          return (
            <section className="panel team-card" key={t.id}>
              <div className="team-title">
                <Mark team={t} />
                <div>
                  <h2>{t.name}</h2>
                  <p>
                    {t.shortName} · {b.count} / {t.maxPlayers} players
                  </p>
                </div>
              </div>
              <p className="budget">{money(b.remaining, s.unit)}</p>
              <p className="muted">Remaining budget</p>
              <dl>
                <dt>Starting budget</dt>
                <dd>{money(t.startingBudgets[s.unit], s.unit)}</dd>
                <dt>Allocated</dt>
                <dd>{money(b.spent, s.unit)}</dd>
                <dt>Available slots</dt>
                <dd>{b.slotsRemaining}</dd>
              </dl>
              <div className="actions">
                <button onClick={() => setSquad(t)}>View squad</button>
                <button onClick={() => setEdit(t)}>Edit</button>
                <button
                  disabled={busy || !!s.currentSelection}
                  onClick={() => setRemove(t)}
                >
                  Delete
                </button>
              </div>
            </section>
          );
        })}
      </div>
      {!s.teams.length && (
        <section className="panel">
          <h2>Your first franchise starts here.</h2>
          <p>Add at least one team to run an auction.</p>
        </section>
      )}
      {edit !== undefined && (
        <TeamForm team={edit ?? undefined} onClose={() => setEdit(undefined)} />
      )}{' '}
      {remove && (
        <Confirm
          title={`Delete ${remove.name}?`}
          onClose={() => setRemove(null)}
          onConfirm={() => run({ type: 'deleteTeam', id: remove.id })}
        >
          <p>
            Only teams without historical sales or corrections can be removed.
            Auction history is retained.
          </p>
        </Confirm>
      )}
      {squad && (
        <Dialog title={`${squad.name} squad`} onClose={() => setSquad(null)}>
          <div className="dialog-body">
            <p>
              {teamStats(s, squad.id).count} / {squad.maxPlayers} players ·{' '}
              {money(teamStats(s, squad.id).spent, s.unit)} spent
            </p>
            <ul className="squad-list">
              {allocations(s)
                .filter((o) => o.teamId === squad.id)
                .map((o) => {
                  const p = s.players.find((p) => p.id === o.playerId)!;
                  return (
                    <li key={o.id}>
                      <span>
                        {p.name}
                        <small>{p.role}</small>
                      </span>
                      <strong>{money(o.amountMinor!, s.unit)}</strong>
                    </li>
                  );
                })}
            </ul>
            {!teamStats(s, squad.id).count && <p>No players allocated yet.</p>}
          </div>
        </Dialog>
      )}
    </main>
  );
}
function PlayerForm({
  player,
  onClose,
}: {
  player?: Player;
  onClose: () => void;
}) {
  const { s, run, busy } = useAuction();
  const [p, setP] = useState<Player>(
      player ?? {
        id: uid(),
        registrationCode: '',
        name: '',
        role: 'Player',
        category: '',
        city: '',
        photoUrl: '',
      },
    ),
    [age, setAge] = useState(
      player?.age === undefined ? '' : String(player.age),
    ),
    [error, setError] = useState('');
  const update = (key: keyof Player, value: string) =>
    setP({ ...p, [key]: value });
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      if (age && !/^\d+$/.test(age))
        throw Error('Age must be a whole number from 0 to 120.');
      let code = p.registrationCode.trim();
      if (!code) {
        let n = 1;
        do {
          code = 'PL-' + String(n++).padStart(3, '0');
        } while (
          s.players.some((p) => p.registrationCode.toUpperCase() === code)
        );
      }
      await run({
        type: 'player',
        player: {
          ...p,
          name: p.name.trim(),
          registrationCode: code,
          age: age ? Number(age) : undefined,
        },
      });
      onClose();
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <Dialog
      title={player ? 'Edit player profile' : 'Add a player'}
      onClose={onClose}
    >
      <form onSubmit={save}>
        <div className="dialog-body">
          <Field label="Player name">
            <input
              required
              maxLength={100}
              value={p.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </Field>
          <Field label="Registration code">
            <input
              maxLength={100}
              value={p.registrationCode}
              disabled={!!player && !!s.outcomes.length}
              onChange={(e) => update('registrationCode', e.target.value)}
              placeholder="Generate automatically if blank"
            />
          </Field>
          <div className="form-grid">
            {(['role', 'category', 'city'] as const).map((k) => (
              <Field label={k} key={k}>
                <input
                  maxLength={100}
                  value={p[k]}
                  onChange={(e) => update(k, e.target.value)}
                />
              </Field>
            ))}
            <Field label="Age (optional)">
              <input
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Photo URL (optional HTTP / HTTPS)">
            <input
              type="url"
              value={p.photoUrl}
              onChange={(e) => update('photoUrl', e.target.value)}
            />
          </Field>
          <ErrorText error={error} />
        </div>
        <div className="actions">
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            Save player
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function Players() {
  const { s, run, busy } = useAuction();
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('ALL'),
    [edit, setEdit] = useState<Player | null | undefined>(),
    [remove, setRemove] = useState<Player | null>(null);
  const locked = !!s.outcomes.length || !!s.currentSelection;
  const players = s.players.filter(
    (p) =>
      (filter === 'ALL' || status(s, p.id) === filter) &&
      `${p.name} ${p.registrationCode} ${p.role} ${p.city}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <main className="page">
      <Heading label="PLAYER ROSTER" title="Talent, ready to be discovered.">
        <button
          className="primary"
          disabled={busy || locked}
          onClick={() => setEdit(null)}
        >
          Add player
        </button>
        <Link className="button" to="/import">
          Import roster
        </Link>
      </Heading>
      {locked && (
        <p className="muted">
          Adding and deleting players is locked after selection or results.
          Profile edits remain available.
        </p>
      )}
      <div className="filters">
        <Field label="Search players">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, code, role, city"
          />
        </Field>
        <Field label="Player status">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {['ALL', 'PENDING', 'CURRENT', 'SOLD', 'UNSOLD'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
      </div>
      <p>
        {players.length} of {s.players.length} players
      </p>
      <div className="player-grid">
        {players.map((p) => (
          <section className="panel player-card" key={p.id}>
            <Portrait player={p} />
            <div>
              <span className="eyebrow">{p.registrationCode}</span>
              <h2>{p.name}</h2>
              <p>
                {p.role} · {p.category}
              </p>
              <p className="muted">
                {p.city}
                {p.age !== undefined ? ` · ${p.age} years` : ''}
              </p>
              <span className="tag">{status(s, p.id)}</span>
            </div>
            <div className="actions">
              <button onClick={() => setEdit(p)}>Edit profile</button>
              <button disabled={busy || locked} onClick={() => setRemove(p)}>
                Delete
              </button>
            </div>
          </section>
        ))}
      </div>
      {!players.length && (
        <section className="panel">No players match this view.</section>
      )}
      {edit !== undefined && (
        <PlayerForm
          player={edit ?? undefined}
          onClose={() => setEdit(undefined)}
        />
      )}{' '}
      {remove && (
        <Confirm
          title={`Delete ${remove.name}?`}
          onClose={() => setRemove(null)}
          onConfirm={() => run({ type: 'deletePlayer', id: remove.id })}
        >
          <p>This removes the player from the setup roster.</p>
        </Confirm>
      )}
    </main>
  );
}
export function Unsold() {
  const { s, run, busy, notify } = useAuction(),
    navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const pool = unsold(s);
  return (
    <main className="page">
      <Heading label="ANOTHER CHANCE" title="The story isn’t over.">
        <button
          className="primary"
          disabled={busy || !complete(s) || !pool.length}
          onClick={() => setConfirm(true)}
        >
          Auction unsold players ({pool.length})
        </button>
      </Heading>
      <section className="panel">
        <h2>{pool.length} players in the retry pool</h2>
        <p>
          {complete(s)
            ? 'Start a new round for these players. Existing sales, squads, budgets, and history stay intact.'
            : 'Finish the active round before starting another. Prior unsold attempts stay in history.'}
        </p>
        <p>
          {pool.filter((p) => status(s, p.id) === 'PENDING').length} awaiting
          re-auction ·{' '}
          {pool.filter((p) => status(s, p.id) === 'CURRENT').length} current
        </p>
      </section>
      <div className="player-grid">
        {pool.map((p) => (
          <section className="panel" key={p.id}>
            <p className="eyebrow">{p.registrationCode}</p>
            <h2>{p.name}</h2>
            <p>
              {p.role} · {p.city}
            </p>
            <span className="tag">
              {status(s, p.id) === 'PENDING'
                ? 'Awaiting re-auction'
                : status(s, p.id)}
            </span>
          </section>
        ))}
      </div>
      {!pool.length && (
        <section className="panel">No unsold players yet.</section>
      )}
      {confirm && (
        <Confirm
          title={`Start unsold round ${s.rounds.length + 1}?`}
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            await run({ type: 'retry' });
            notify(`${pool.length} players are ready for another chance.`);
            navigate('/auction');
          }}
        >
          <p>
            Only these {pool.length} unsold players enter the new round. No
            existing sale or team budget will be reset.
          </p>
        </Confirm>
      )}
    </main>
  );
}
function CorrectionForm({
  outcomeId,
  onClose,
}: {
  outcomeId: string;
  onClose: () => void;
}) {
  const { s, run, busy } = useAuction();
  const o = allocations(s).find((o) => o.id === outcomeId)!;
  const [amount, setAmount] = useState(amountInput(o.amountMinor!, s.unit)),
    [team, setTeam] = useState(o.teamId!),
    [reason, setReason] = useState(''),
    [error, setError] = useState(''),
    [review, setReview] = useState(false);
  if (review)
    return (
      <Confirm
        title="Confirm sale correction"
        onClose={() => setReview(false)}
        onConfirm={async () => {
          await run({
            type: 'correct',
            outcomeId,
            teamId: team,
            amount,
            reason,
          });
          onClose();
        }}
      >
        <dl>
          <dt>Previous team</dt>
          <dd>{s.teams.find((t) => t.id === o.teamId)?.name}</dd>
          <dt>Previous amount</dt>
          <dd>{money(o.amountMinor!, s.unit)}</dd>
          <dt>New team</dt>
          <dd>{s.teams.find((t) => t.id === team)?.name}</dd>
          <dt>New amount</dt>
          <dd>{money(parseAmount(amount, s.unit), s.unit)}</dd>
        </dl>
        <p>{reason || 'No correction reason supplied.'}</p>
      </Confirm>
    );
  return (
    <Dialog title="Correct a sale" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            validateSale(s, team, amount, outcomeId);
            setReview(true);
          } catch (e) {
            setError(message(e));
          }
        }}
      >
        <div className="dialog-body">
          <p>
            The current allocation is refunded before validating the
            replacement. The original sale remains in history.
          </p>
          <Field label="Corrected amount">
            <input
              required
              value={amount}
              inputMode="decimal"
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Corrected winning team">
            <select value={team} onChange={(e) => setTeam(e.target.value)}>
              {s.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Correction reason (optional)">
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <ErrorText error={error} />
        </div>
        <div className="actions">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            Review correction
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function Results() {
  const { s, busy, notify } = useAuction();
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('ALL'),
    [correction, setCorrection] = useState(''),
    [error, setError] = useState(''),
    [exporting, setExporting] = useState(false);
  const t = totals(s);
  const players = s.players.filter(
    (p) =>
      (filter === 'ALL' || status(s, p.id) === filter) &&
      `${p.name} ${p.registrationCode}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  async function exportFile() {
    setExporting(true);
    setError('');
    try {
      const data = workbook(exportSheets(s));
      download(
        data,
        `${s.eventName.replace(/[^a-z0-9_-]/gi, '_')}_Round_${s.rounds.length}_Results.xlsx`,
      );
      notify('Five-sheet Excel results exported.');
    } catch (e) {
      setError(message(e));
    } finally {
      setExporting(false);
    }
  }
  return (
    <main className="page">
      <Heading
        label="THE FINAL PICTURE"
        title={
          complete(s)
            ? 'The teams have taken shape.'
            : 'Your auction, in progress.'
        }
      >
        <button
          className="primary"
          disabled={!complete(s) || exporting}
          onClick={() => void exportFile()}
        >
          <Download size={18} />
          {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
        <Link className="button" to="/unsold">
          Unsold re-auction
        </Link>
      </Heading>
      {!complete(s) && (
        <p className="muted">
          Final export unlocks when the active round is complete and no player
          is selected.
        </p>
      )}
      <ErrorText error={error} />
      <div className="metrics">
        {[
          ['PLAYERS', s.players.length],
          ['SOLD', t.sold],
          ['UNSOLD', t.unsold],
          ['ALLOCATED', money(t.spent, s.unit)],
        ].map(([label, value]) => (
          <section className="panel" key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </section>
        ))}
      </div>
      <p>
        {s.rounds.filter((r) => r.status === 'COMPLETED').length} completed
        rounds · {s.outcomes.length} outcome attempts · {s.corrections.length}{' '}
        corrections · {s.unit}
      </p>
      <div className="filters">
        <Field label="Search results">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field label="Outcome filter">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {['ALL', 'SOLD', 'UNSOLD', 'PENDING', 'CURRENT'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
      </div>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code / Player</th>
              <th>Role</th>
              <th>Status</th>
              <th>Team</th>
              <th>Amount</th>
              <th>Round</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const o = finalOutcome(s, p.id);
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <small>{p.registrationCode}</small>
                  </td>
                  <td>{p.role}</td>
                  <td>
                    <span className="tag">{status(s, p.id)}</span>
                  </td>
                  <td>
                    {s.teams.find((t) => t.id === o?.teamId)?.name ?? '—'}
                  </td>
                  <td>
                    {o?.amountMinor !== null && o?.amountMinor !== undefined
                      ? money(o.amountMinor, s.unit)
                      : '—'}
                  </td>
                  <td>
                    {s.rounds.find((r) => r.id === o?.roundId)?.number ?? '—'}
                  </td>
                  <td>
                    {o?.status === 'SOLD' && (
                      <button
                        disabled={busy || !!s.currentSelection}
                        onClick={() => setCorrection(o.id)}
                      >
                        Correct sale
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!players.length && <p>No matching players.</p>}
      </section>
      <section className="panel">
        <h2>Team allocation summary</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>Players</th>
                <th>Starting</th>
                <th>Spent</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {s.teams.map((team) => {
                const b = teamStats(s, team.id);
                return (
                  <tr key={team.id}>
                    <td>{team.name}</td>
                    <td>
                      {b.count} / {team.maxPlayers}
                    </td>
                    <td>{money(team.startingBudgets[s.unit], s.unit)}</td>
                    <td>{money(b.spent, s.unit)}</td>
                    <td>{money(b.remaining, s.unit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <details className="panel">
        <summary>Auction & correction audit history</summary>
        <ol className="audit">
          {[
            ...s.outcomes.map((o) => ({
              sequence: o.sequence,
              text: `${o.playerNameAtTime} · ${o.status} · ${o.teamNameAtTime ?? 'No team'} · ${o.amountMinor === null ? 'No amount' : money(o.amountMinor, s.unit)} · ${new Date(o.completedAt).toLocaleString()}`,
            })),
            ...s.corrections.map((c) => ({
              sequence: c.sequence,
              text: `Correction: ${c.previousTeamNameAtTime} ${money(c.previousAmountMinor, s.unit)} → ${c.nextTeamNameAtTime} ${money(c.nextAmountMinor, s.unit)} · ${c.reason || 'No reason supplied'} · ${new Date(c.correctedAt).toLocaleString()}`,
            })),
          ]
            .sort((a, b) => a.sequence - b.sequence)
            .map((h) => (
              <li key={h.sequence}>
                #{h.sequence} {h.text}
              </li>
            ))}
        </ol>
      </details>
      {correction && (
        <CorrectionForm
          outcomeId={correction}
          onClose={() => setCorrection('')}
        />
      )}
    </main>
  );
}
export function Settings() {
  const { s, run, busy, notify } = useAuction();
  const [name, setName] = useState(s.eventName),
    [season, setSeason] = useState(s.season),
    [unit, setUnit] = useState(s.unit),
    [prefs, setPrefs] = useState(s.preferences),
    [logo, setLogo] = useState(s.eventLogoAssetId),
    [error, setError] = useState(''),
    [reset, setReset] = useState<'sample' | 'empty' | null>(null),
    [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await run({
        type: 'settings',
        eventName: name,
        season,
        unit,
        eventLogoAssetId: logo,
        preferences: prefs,
      });
      notify('Event settings saved.');
      setError('');
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <main className="page">
      <Heading label="EVENT SETTINGS" title="Make the occasion your own." />
      <form className="panel settings-form" onSubmit={save}>
        <h2>Event identity</h2>
        <Field label="Event name">
          <input
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Season">
          <input
            required
            maxLength={100}
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          />
        </Field>
        <Field label="Auction unit">
          <select
            value={unit}
            disabled={s.configurationLocked || !!s.currentSelection}
            onChange={(e) => setUnit(e.target.value as typeof unit)}
          >
            <option value="POINTS">Integer points</option>
            <option value="INR">Indian rupees (INR)</option>
          </select>
        </Field>
        <p className="muted">
          {s.configurationLocked
            ? 'Unit and existing budgets are locked after the first outcome.'
            : 'Each unit has an independent draft budget. A selected player must be resolved before changing units.'}
        </p>
        <Field label="Event logo (PNG, JPEG, WebP · 1 MB)">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                setUploading(true);
                try {
                  setLogo(await uploadImage(file));
                } catch (e) {
                  setError(message(e));
                } finally {
                  setUploading(false);
                }
              }
            }}
          />
        </Field>
        {logo && (
          <div className="logo-preview">
            <Asset id={logo} alt="Event logo preview" fallback="Logo" />
            <button type="button" onClick={() => setLogo(undefined)}>
              Remove logo
            </button>
          </div>
        )}
        <h2>Player spotlight & progression</h2>
        {(['autoNext', 'showPhoto', 'showAge', 'showCity'] as const).map(
          (k) => (
            <label className="check" key={k}>
              <input
                type="checkbox"
                checked={prefs[k]}
                onChange={(e) => setPrefs({ ...prefs, [k]: e.target.checked })}
              />
              {
                {
                  autoNext: 'Automatically spin the next player after saving',
                  showPhoto: 'Show player photos',
                  showAge: 'Show player age',
                  showCity: 'Show player city',
                }[k]
              }
            </label>
          ),
        )}
        <ErrorText error={error} />
        <button className="primary" disabled={busy || uploading}>
          Save settings
        </button>
      </form>
      <section className="panel">
        <h2>Browser-local storage</h2>
        <p>
          This event is saved in IndexedDB in this browser and origin. Devices,
          browser profiles, ports, and hosts have separate data. There is no
          login, shared database, or cloud backup. Clearing site data removes
          the saved event. Export completed results before clearing storage.
        </p>
      </section>
      <section className="panel danger-zone">
        <h2>Start over</h2>
        <p>
          These actions replace players, teams, results, corrections, assets in
          use, and event settings. The team-rail preference is kept.
        </p>
        <div className="actions">
          <button disabled={busy} onClick={() => setReset('empty')}>
            New empty event
          </button>
          <button disabled={busy} onClick={() => setReset('sample')}>
            Load sample event
          </button>
        </div>
      </section>
      {reset && (
        <Confirm
          title={
            reset === 'sample'
              ? 'Replace with the sample event?'
              : 'Start a new empty event?'
          }
          onClose={() => setReset(null)}
          onConfirm={async () => {
            await run({ type: 'reset', sample: reset === 'sample' });
            notify('New event ready.');
            navigate('/auction');
          }}
        >
          <p>
            All current players, teams, outcomes, and correction history in this
            browser event will be replaced. This cannot be undone.
          </p>
        </Confirm>
      )}
    </main>
  );
}
