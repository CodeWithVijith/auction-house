import type { Snapshot, Command } from './types';
import { uid, seed } from './seed';
import { parseAmount } from './money';
import {
  allocations,
  complete,
  currentRound,
  pending,
  teamStats,
  unsold,
} from './selectors';
import { playerSchema, teamSchema, validateSnapshot } from './schemas';
export function randomIndex(length: number) {
  if (!Number.isSafeInteger(length) || length < 1)
    throw Error('No eligible players.');
  const limit = Math.floor(0x100000000 / length) * length;
  let n: number;
  do {
    n = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (n >= limit);
  return n % length;
}
function setup(s: Snapshot) {
  if (s.outcomes.length || s.currentSelection)
    throw Error('Roster changes are locked after selection or results.');
}
export function validateSale(
  s: Snapshot,
  teamId: string,
  amount: string,
  exclude?: string,
) {
  const n = parseAmount(amount, s.unit),
    t = s.teams.find((t) => t.id === teamId);
  if (!t) throw Error('Select the winning team.');
  const b = teamStats(s, teamId, exclude);
  if (b.slotsRemaining <= 0)
    throw Error('This team has reached its squad limit.');
  if (n > b.remaining)
    throw Error('Amount exceeds this team’s remaining budget.');
  return n;
}
export function applyCommand(
  input: Snapshot,
  c: Command,
  random = randomIndex,
): Snapshot {
  const s = structuredClone(input),
    now = new Date().toISOString();
  switch (c.type) {
    case 'select': {
      if (s.currentSelection) throw Error('Finish the current player first.');
      if (!s.players.length || !s.teams.length)
        throw Error('Add players and at least one team before starting.');
      if (complete(s))
        throw Error('Round complete. Start an unsold round if needed.');
      if (!s.currentRoundId) {
        const r = {
          id: uid(),
          number: 1,
          kind: 'MAIN' as const,
          status: 'ACTIVE' as const,
          eligiblePlayerIds: s.players.map((p) => p.id),
          startedAt: now,
        };
        s.rounds.push(r);
        s.currentRoundId = r.id;
      }
      const pool = pending(s);
      if (!pool.length) throw Error('No eligible players.');
      const index = random(pool.length);
      if (!Number.isInteger(index) || index < 0 || index >= pool.length)
        throw Error('Invalid random selection.');
      s.currentSelection = {
        id: uid(),
        roundId: s.currentRoundId,
        playerId: pool[index],
        selectedAt: now,
      };
      currentRound(s)!.status = 'ACTIVE';
      currentRound(s)!.startedAt ??= now;
      break;
    }
    case 'outcome': {
      const v = s.currentSelection;
      if (!v || v.id !== c.selectionId)
        throw Error('This selection was already resolved or changed.');
      const p = s.players.find((p) => p.id === v.playerId)!;
      const n =
        c.status === 'SOLD'
          ? validateSale(s, c.teamId ?? '', c.amount ?? '')
          : null;
      s.outcomes.push({
        id: uid(),
        roundId: v.roundId,
        playerId: p.id,
        selectionId: v.id,
        status: c.status,
        teamId: c.status === 'SOLD' ? c.teamId! : null,
        amountMinor: n,
        unit: s.unit,
        sequence: s.outcomes.length + s.corrections.length + 1,
        completedAt: now,
        playerNameAtTime: p.name,
        teamNameAtTime:
          c.status === 'SOLD'
            ? s.teams.find((t) => t.id === c.teamId)!.name
            : null,
      });
      s.currentSelection = null;
      s.configurationLocked = true;
      if (!pending(s).length) {
        currentRound(s)!.status = 'COMPLETED';
        currentRound(s)!.completedAt = now;
      }
      break;
    }
    case 'retry': {
      if (!complete(s)) throw Error('Finish the current round first.');
      const pool = unsold(s);
      if (!pool.length || !s.teams.length)
        throw Error('An unsold pool and a team are required.');
      const r = {
        id: uid(),
        number: s.rounds.length + 1,
        kind: 'UNSOLD' as const,
        status: 'READY' as const,
        eligiblePlayerIds: pool.map((p) => p.id),
      };
      s.rounds.push(r);
      s.currentRoundId = r.id;
      break;
    }
    case 'correct': {
      if (s.currentSelection)
        throw Error('Finish the current player before correcting a sale.');
      const o = allocations(s).find((o) => o.id === c.outcomeId);
      if (!o) throw Error('Only a sold result can be corrected.');
      const n = validateSale(s, c.teamId, c.amount, o.id);
      s.corrections.push({
        id: uid(),
        targetOutcomeId: o.id,
        previousTeamId: o.teamId!,
        previousAmountMinor: o.amountMinor!,
        nextTeamId: c.teamId,
        nextAmountMinor: n,
        reason: c.reason.trim(),
        sequence: s.outcomes.length + s.corrections.length + 1,
        correctedAt: now,
        previousTeamNameAtTime: s.teams.find((t) => t.id === o.teamId)!.name,
        nextTeamNameAtTime: s.teams.find((t) => t.id === c.teamId)!.name,
      });
      break;
    }
    case 'team': {
      const t = teamSchema.parse(c.team),
        old = s.teams.find((t) => t.id === c.team.id);
      if (!old && s.currentSelection)
        throw Error('Finish the current player before adding a team.');
      if (
        old &&
        s.configurationLocked &&
        (old.startingBudgets.POINTS !== t.startingBudgets.POINTS ||
          old.startingBudgets.INR !== t.startingBudgets.INR)
      )
        throw Error('Starting budgets are locked after the first outcome.');
      if (old && t.maxPlayers < teamStats(s, t.id).count)
        throw Error('Capacity cannot be lower than the current squad count.');
      s.teams = old
        ? s.teams.map((x) => (x.id === t.id ? t : x))
        : [...s.teams, t];
      break;
    }
    case 'deleteTeam': {
      if (s.currentSelection)
        throw Error('Finish the current selection before deleting teams.');
      if (
        s.outcomes.some((o) => o.teamId === c.id) ||
        s.corrections.some(
          (x) => x.previousTeamId === c.id || x.nextTeamId === c.id,
        )
      )
        throw Error(
          'This team is referenced by auction history and cannot be deleted.',
        );
      s.teams = s.teams.filter((t) => t.id !== c.id);
      break;
    }
    case 'player': {
      const p = playerSchema.parse(c.player),
        old = s.players.find((p) => p.id === c.player.id);
      if (!old) setup(s);
      if (
        old &&
        old.registrationCode !== p.registrationCode &&
        s.outcomes.length
      )
        throw Error('Registration codes are locked after results.');
      s.players = old
        ? s.players.map((x) => (x.id === p.id ? p : x))
        : [...s.players, p];
      s.isSample = false;
      if (!s.outcomes.length && !s.currentSelection) {
        s.rounds = [];
        s.currentRoundId = null;
      }
      break;
    }
    case 'deletePlayer':
      setup(s);
      s.players = s.players.filter((p) => p.id !== c.id);
      s.rounds = [];
      s.currentRoundId = null;
      s.isSample = false;
      break;
    case 'import':
      setup(s);
      if (!c.players.length) throw Error('Import at least one valid player.');
      s.players = c.players.map((p) => playerSchema.parse(p));
      s.importMetadata = c.metadata;
      s.rounds = [];
      s.currentRoundId = null;
      s.isSample = false;
      break;
    case 'settings':
      if (s.configurationLocked && c.unit !== s.unit)
        throw Error('Unit is locked after the first outcome.');
      if (s.currentSelection && c.unit !== s.unit)
        throw Error('Finish the current player before changing units.');
      Object.assign(s, {
        eventName: c.eventName.trim(),
        season: c.season.trim(),
        unit: c.unit,
        eventLogoAssetId: c.eventLogoAssetId,
        preferences: c.preferences,
      });
      break;
    case 'reset':
      return { ...seed(c.sample), revision: s.revision + 1 };
  }
  s.revision++;
  return validateSnapshot(s);
}
