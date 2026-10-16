import type { Snapshot, Outcome } from './types';
import { safeSum } from './money';
export function allocations(s: Snapshot) {
  return s.outcomes
    .filter((o) => o.status === 'SOLD')
    .map((o) => {
      const corrections = s.corrections
        .filter((c) => c.targetOutcomeId === o.id)
        .sort((a, b) => a.sequence - b.sequence);
      const c = corrections.at(-1);
      return c
        ? { ...o, teamId: c.nextTeamId, amountMinor: c.nextAmountMinor }
        : o;
    });
}
export function teamStats(s: Snapshot, id: string, excludeOutcome?: string) {
  const t = s.teams.find((t) => t.id === id);
  if (!t) throw Error('Team not found.');
  const a = allocations(s).filter(
    (o) => o.teamId === id && o.id !== excludeOutcome,
  );
  const spent = safeSum(a.map((o) => o.amountMinor!));
  return {
    spent,
    remaining: t.startingBudgets[s.unit] - spent,
    count: a.length,
    slotsRemaining: t.maxPlayers - a.length,
  };
}
export const currentRound = (s: Snapshot) =>
  s.rounds.find((r) => r.id === s.currentRoundId);
export const pending = (s: Snapshot) =>
  (currentRound(s)?.eligiblePlayerIds ?? s.players.map((p) => p.id)).filter(
    (id) =>
      !s.outcomes.some(
        (o) => o.roundId === s.currentRoundId && o.playerId === id,
      ) && id !== s.currentSelection?.playerId,
  );
export const complete = (s: Snapshot) =>
  currentRound(s)?.status === 'COMPLETED' && !s.currentSelection;
export function finalOutcome(s: Snapshot, id: string): Outcome | undefined {
  return (
    allocations(s).find((o) => o.playerId === id) ??
    s.outcomes.filter((o) => o.playerId === id).at(-1)
  );
}
export function status(s: Snapshot, id: string) {
  if (s.currentSelection?.playerId === id) return 'CURRENT';
  if (pending(s).includes(id)) return 'PENDING';
  return finalOutcome(s, id)?.status ?? 'PENDING';
}
export const unsold = (s: Snapshot) =>
  s.players.filter((p) => finalOutcome(s, p.id)?.status === 'UNSOLD');
export function totals(s: Snapshot) {
  const a = allocations(s);
  return {
    sold: a.length,
    unsold: s.players.filter((p) => status(s, p.id) === 'UNSOLD').length,
    pending: pending(s).length,
    spent: safeSum(a.map((o) => o.amountMinor!)),
  };
}
