import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles, RotateCw } from 'lucide-react';
import { useAuction } from './context';
import { useUi } from '../state/uiStore';
import {
  complete,
  currentRound,
  pending,
  teamStats,
} from '../domain/selectors';
import { validateSale } from '../domain/commands';
import { money, parseAmount } from '../domain/money';
import {
  Confirm,
  Emblem,
  Field,
  Mark,
  Portrait,
  ErrorText,
} from './components';
export function Auction() {
  const { s, run, busy, notify, syncEpoch } = useAuction(),
    { collapsed, toggle } = useUi();
  const [spinning, setSpinning] = useState(false),
    [amount, setAmount] = useState(''),
    [teamId, setTeamId] = useState(''),
    [confirmation, setConfirmation] = useState<'SOLD' | 'UNSOLD' | null>(null),
    [error, setError] = useState(''),
    [autoRevision, setAutoRevision] = useState<number | null>(null),
    [autoNext, setAutoNext] = useState(s.preferences.autoNext);
  const mounted = useRef(true);
  const p = s.players.find((p) => p.id === s.currentSelection?.playerId),
    r = currentRound(s),
    count = pending(s).length,
    processed = r ? s.outcomes.filter((o) => o.roundId === r.id).length : 0;
  useEffect(
    () => setAutoNext(s.preferences.autoNext),
    [s.preferences.autoNext, s.id],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    setConfirmation(null);
    setSpinning(false);
    setAmount('');
    setTeamId('');
    setAutoRevision(null);
  }, [s.id, syncEpoch]);
  async function spin() {
    setAutoRevision(null);
    setError('');
    try {
      await run({ type: 'select' });
      if (mounted.current) {
        setSpinning(true);
        setAmount('');
      }
    } catch (e) {
      setSpinning(false);
      setError(String(e));
    }
  }
  useEffect(() => {
    if (!spinning) return;
    const timer = setTimeout(
      () => {
        setSpinning(false);
        if (p) notify(`Revealed ${p.name}. Choose sold or unsold.`);
      },
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 100
        : 3400,
    );
    return () => clearTimeout(timer);
  }, [spinning, p, notify]);
  useEffect(() => {
    if (
      autoRevision === null ||
      autoRevision !== s.revision ||
      !s.preferences.autoNext ||
      s.currentSelection ||
      confirmation ||
      busy ||
      complete(s)
    )
      return;
    const timer = setTimeout(() => void spin(), 1800);
    return () =>
      clearTimeout(
        timer,
      ); /* auto-next belongs only to the save that scheduled it. */
  }, [
    autoRevision,
    s.revision,
    s.preferences.autoNext,
    s.currentSelection,
    confirmation,
    busy,
  ]);
  async function outcome() {
    if (!s.currentSelection || !confirmation) throw Error('Selection changed.');
    const next = await run({
      type: 'outcome',
      selectionId: s.currentSelection.id,
      status: confirmation,
      amount,
      teamId,
    });
    setAmount('');
    setTeamId('');
    notify(
      `${p!.name}: ${confirmation === 'SOLD' ? 'sale' : 'unsold result'} saved.`,
    );
    setAutoRevision(next.revision);
  }
  const review = (status: 'SOLD' | 'UNSOLD') => {
    try {
      if (status === 'SOLD') validateSale(s, teamId, amount);
      setError('');
      setConfirmation(status);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const chosen = s.teams.find((t) => t.id === teamId);
  let sale = 0;
  try {
    sale = confirmation === 'SOLD' && chosen ? parseAmount(amount, s.unit) : 0;
  } catch {
    /* Confirmation may be invalidated by another tab. The save command revalidates. */
  }
  return (
    <main className={'auction-layout ' + (collapsed ? 'collapsed' : '')}>
      <aside className="team-rail">
        <div className="rail-heading">
          <span>
            THE FRANCHISES <small>{s.teams.length} teams</small>
          </span>
          <button
            className="icon-button"
            title={collapsed ? 'Expand teams' : 'Collapse teams'}
            aria-label={collapsed ? 'Expand teams' : 'Collapse teams'}
            aria-expanded={!collapsed}
            onClick={toggle}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <div className="rail-teams">
          {s.teams.map((t) => {
            const b = teamStats(s, t.id),
              details = `${t.name}: ${money(b.remaining, s.unit)} remaining, ${b.count} of ${t.maxPlayers} players`;
            return (
              <Link
                to="/teams"
                className="rail-team"
                key={t.id}
                title={details}
                aria-label={details}
              >
                <Mark team={t} />
                <div className="rail-copy">
                  <strong>{t.name}</strong>
                  <small>
                    {b.count} / {t.maxPlayers} players
                  </small>
                  <b>{money(b.remaining, s.unit)}</b>
                  <span>
                    {money(b.spent, s.unit)} spent /{' '}
                    {money(t.startingBudgets[s.unit], s.unit)}
                  </span>
                  <meter
                    min={0}
                    max={Math.max(1, t.startingBudgets[s.unit])}
                    value={b.remaining}
                    aria-label={`${t.name} remaining budget`}
                  />
                  {!b.slotsRemaining && <small>Squad full</small>}
                </div>
              </Link>
            );
          })}
          {!s.teams.length && <Link to="/teams">Add your first team</Link>}
        </div>
        <Link className="rail-manage" to="/teams">
          Manage teams →
        </Link>
      </aside>
      <section className="auction-content">
        <div className="stage">
          <div className="stage-toolbar">
            <span>
              <i className="live-dot" />{' '}
              {complete(s)
                ? 'ROUND COMPLETE'
                : p
                  ? 'PLAYER ON THE BLOCK'
                  : 'READY WHEN YOU ARE'}
              <span className="round-label">
                {r?.kind === 'UNSOLD' ? 'Unsold round' : 'Round'}{' '}
                {r?.number ?? 1}
              </span>
            </span>
            <span>
              {processed} / {r?.eligiblePlayerIds.length ?? s.players.length}{' '}
              processed · {count} pending
            </span>
          </div>
          {complete(s) ? (
            <div className="welcome">
              <Emblem />
              <p className="eyebrow">THE ROUND IS COMPLETE</p>
              <h2>Every chance counts.</h2>
              <p>Your results and team allocations are saved.</p>
              <Link className="button primary" to="/results">
                View results & export
              </Link>
              <Link className="button" to="/unsold">
                Review unsold players
              </Link>
            </div>
          ) : !p && !spinning ? (
            <div className="welcome">
              <Emblem />
              <p className="eyebrow">THE STAGE IS SET</p>
              <h2>Auction Awaits</h2>
              <p>Find the next name. Build the next great team.</p>
              <button
                className="primary large"
                onClick={() => void spin()}
                disabled={busy || !count || !s.teams.length}
              >
                <Sparkles size={18} />{' '}
                {processed ? 'Spin next player' : 'Start bidding'}
              </button>
              <p className="muted">
                {count} players available · {s.teams.length} teams ready
              </p>
              {(!s.players.length || !s.teams.length) && (
                <Link to={!s.players.length ? '/import' : '/teams'}>
                  Complete your auction setup →
                </Link>
              )}
              <div className="welcome-links">
                <Link to="/import">Import players</Link>
                <Link to="/teams">Review teams & budgets</Link>
              </div>
            </div>
          ) : (
            <div className="active-stage">
              <section className="wheel-panel">
                <p className="eyebrow">A FAIR CHANCE FOR EVERY PLAYER</p>
                <h2>
                  {spinning ? 'The next chapter…' : 'Your player is ready'}
                </h2>
                <div
                  className={'wheel-wrap ' + (spinning ? 'spinning' : '')}
                  role="img"
                  aria-label={
                    spinning
                      ? 'Selecting the next player'
                      : 'Anonymous selection wheel'
                  }
                >
                  <div className="wheel" />
                  <div className="wheel-center">
                    <RotateCw size={28} />
                  </div>
                  <div className="pointer" />
                </div>
                <p className="muted">
                  Anonymous segments · uniform random draw
                </p>
                <span className="tag">
                  {spinning ? 'Selecting…' : 'Selection saved'}
                </span>
              </section>
              <section className="spotlight">
                {spinning ? (
                  <div className="reveal-wait">
                    <Sparkles size={36} />
                    <h2>The spotlight is waiting</h2>
                    <p>One player. A world of possibility.</p>
                  </div>
                ) : (
                  p && (
                    <>
                      <p className="eyebrow">
                        ON THE BLOCK · {p.registrationCode}
                      </p>
                      <div className="player-hero">
                        {s.preferences.showPhoto && <Portrait player={p} />}
                        <div>
                          <h2>{p.name}</h2>
                          <p>
                            {p.role} · {p.category}
                          </p>
                          <p className="muted">
                            {[
                              s.preferences.showAge && p.age !== undefined
                                ? `${p.age} years`
                                : null,
                              s.preferences.showCity ? p.city : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      </div>
                      <div className="sale-form">
                        <Field
                          label={`Sale amount (${s.unit === 'INR' ? '₹ INR' : 'points'})`}
                        >
                          <input
                            aria-label="Sale amount"
                            inputMode={s.unit === 'INR' ? 'decimal' : 'numeric'}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter final amount"
                          />
                        </Field>
                        <Field label="Winning team">
                          <select
                            value={teamId}
                            onChange={(e) => setTeamId(e.target.value)}
                          >
                            <option value="">Select a team</option>
                            {s.teams.map((t) => {
                              const b = teamStats(s, t.id);
                              return (
                                <option key={t.id} value={t.id}>
                                  {t.name} · {money(b.remaining, s.unit)} ·{' '}
                                  {b.slotsRemaining} slots
                                </option>
                              );
                            })}
                          </select>
                        </Field>
                        <ErrorText error={error} />
                        <div className="outcomes">
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={() => review('SOLD')}
                          >
                            Mark sold
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => review('UNSOLD')}
                          >
                            Mark unsold
                          </button>
                        </div>
                      </div>
                    </>
                  )
                )}
              </section>
            </div>
          )}
          <div className="stage-bottom">
            <label className="check">
              <input
                type="checkbox"
                checked={autoNext}
                disabled={busy}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAutoNext(checked);
                  setAutoRevision(null);
                  void run({
                    type: 'settings',
                    ...s,
                    preferences: { ...s.preferences, autoNext: checked },
                  }).catch(() => setAutoNext(s.preferences.autoNext));
                }}
              />{' '}
              Auto-spin next player
            </label>
            <span>Every outcome is saved before moving on.</span>
          </div>
        </div>
        <ErrorText error={!p ? error : ''} />
      </section>
      {confirmation && p && (
        <Confirm
          title={
            confirmation === 'SOLD'
              ? 'Confirm player sale'
              : 'Confirm unsold player'
          }
          onClose={() => setConfirmation(null)}
          onConfirm={outcome}
        >
          <p>
            <strong>{p.name}</strong>
          </p>
          {confirmation === 'SOLD' && chosen ? (
            <dl>
              <dt>Winning team</dt>
              <dd>{chosen.name}</dd>
              <dt>Sale amount</dt>
              <dd>{money(sale, s.unit)}</dd>
              <dt>Current remaining</dt>
              <dd>{money(teamStats(s, chosen.id).remaining, s.unit)}</dd>
              <dt>Remaining after sale</dt>
              <dd>{money(teamStats(s, chosen.id).remaining - sale, s.unit)}</dd>
              <dt>Squad after sale</dt>
              <dd>
                {teamStats(s, chosen.id).count + 1} / {chosen.maxPlayers}
              </dd>
            </dl>
          ) : (
            <p>
              No team or amount will be assigned. Team budgets stay unchanged.
            </p>
          )}
        </Confirm>
      )}
    </main>
  );
}
