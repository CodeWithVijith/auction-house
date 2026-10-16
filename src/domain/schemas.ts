import { z } from 'zod';
import type { Snapshot } from './types';
import { allocations, teamStats } from './selectors';
import { safeSum } from './money';
const int = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const text = z.string().trim().min(1).max(200);
export const playerSchema = z.object({
  id: text,
  registrationCode: text,
  name: text,
  role: z.string().max(100),
  category: z.string().max(100),
  age: z.number().int().min(0).max(120).optional(),
  city: z.string().max(200),
  photoUrl: z.union([
    z.literal(''),
    z
      .url()
      .refine(
        (v) => /^https?:\/\//i.test(v),
        'Use an HTTP or HTTPS photo URL.',
      ),
  ]),
  sourceRow: int.optional(),
});
export const teamSchema = z.object({
  id: text,
  name: text,
  shortName: z.string().min(1).max(5),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  logoAssetId: text.optional(),
  startingBudgets: z.object({ POINTS: int, INR: int }),
  maxPlayers: z.number().int().min(1).max(1000),
});
const round = z.object({
  id: text,
  number: int,
  kind: z.enum(['MAIN', 'UNSOLD']),
  status: z.enum(['READY', 'ACTIVE', 'COMPLETED']),
  eligiblePlayerIds: z.array(text),
  startedAt: z.iso.datetime().optional(),
  completedAt: z.iso.datetime().optional(),
});
const selection = z.object({
  id: text,
  roundId: text,
  playerId: text,
  selectedAt: z.iso.datetime(),
});
const outcome = z.object({
  id: text,
  roundId: text,
  playerId: text,
  selectionId: text,
  status: z.enum(['SOLD', 'UNSOLD']),
  teamId: text.nullable(),
  amountMinor: int.nullable(),
  unit: z.enum(['POINTS', 'INR']),
  sequence: int,
  completedAt: z.iso.datetime(),
  playerNameAtTime: text,
  teamNameAtTime: text.nullable(),
});
const correction = z.object({
  id: text,
  targetOutcomeId: text,
  previousTeamId: text,
  previousAmountMinor: int,
  nextTeamId: text,
  nextAmountMinor: int,
  reason: z.string(),
  sequence: int,
  correctedAt: z.iso.datetime(),
  previousTeamNameAtTime: text,
  nextTeamNameAtTime: text,
});
export const snapshotSchema = z.object({
  schemaVersion: z.literal(3),
  id: text,
  revision: int,
  eventName: text,
  season: text,
  eventLogoAssetId: text.optional(),
  unit: z.enum(['POINTS', 'INR']),
  configurationLocked: z.boolean(),
  isSample: z.boolean(),
  players: z.array(playerSchema).max(1000),
  teams: z.array(teamSchema),
  rounds: z.array(round),
  currentRoundId: text.nullable(),
  currentSelection: selection.nullable(),
  outcomes: z.array(outcome),
  corrections: z.array(correction),
  preferences: z.object({
    autoNext: z.boolean(),
    showPhoto: z.boolean(),
    showAge: z.boolean(),
    showCity: z.boolean(),
  }),
  importMetadata: z
    .object({
      fileName: text,
      importedAt: z.iso.datetime(),
      mapping: z.record(z.string(), z.string()),
    })
    .optional(),
});
export function validateSnapshot(input: unknown): Snapshot {
  const s = snapshotSchema.parse(input);
  if (s.configurationLocked !== s.outcomes.length > 0)
    throw Error('Saved configuration lock is inconsistent with its outcomes.');
  const unique = (v: string[]) => new Set(v).size === v.length;
  if (
    !unique(s.players.map((p) => p.id)) ||
    !unique(s.players.map((p) => p.registrationCode.toUpperCase())) ||
    !unique(s.teams.map((t) => t.id)) ||
    !unique(s.rounds.map((r) => r.id)) ||
    !unique(s.outcomes.map((o) => o.id)) ||
    !unique(s.outcomes.map((o) => o.selectionId)) ||
    !unique(s.outcomes.map((o) => o.roundId + ':' + o.playerId))
  )
    throw Error('Snapshot contains duplicate identifiers or outcomes.');
  const player = (id: string) => s.players.some((p) => p.id === id),
    team = (id: string) => s.teams.some((t) => t.id === id);
  if (s.currentRoundId && !s.rounds.some((r) => r.id === s.currentRoundId))
    throw Error('Unknown current round.');
  for (const r of s.rounds)
    if (
      !unique(r.eligiblePlayerIds) ||
      r.eligiblePlayerIds.some((id) => !player(id))
    )
      throw Error('Invalid round roster.');
  for (const o of s.outcomes) {
    if (
      !player(o.playerId) ||
      !s.rounds.some(
        (r) => r.id === o.roundId && r.eligiblePlayerIds.includes(o.playerId),
      ) ||
      o.unit !== s.unit
    )
      throw Error('Invalid historical reference.');
    if (
      o.status === 'SOLD'
        ? !o.teamId || !team(o.teamId) || !o.amountMinor
        : o.teamId !== null || o.amountMinor !== null
    )
      throw Error('Invalid outcome values.');
  }
  if (
    !unique(
      s.outcomes.filter((o) => o.status === 'SOLD').map((o) => o.playerId),
    )
  )
    throw Error('Player sold more than once.');
  for (const c of s.corrections)
    if (
      !s.outcomes.some(
        (o) => o.id === c.targetOutcomeId && o.status === 'SOLD',
      ) ||
      !team(c.previousTeamId) ||
      !team(c.nextTeamId) ||
      c.nextAmountMinor <= 0
    )
      throw Error('Invalid correction.');
  if (
    s.currentSelection &&
    (!player(s.currentSelection.playerId) ||
      s.currentSelection.roundId !== s.currentRoundId ||
      !s.rounds
        .find((r) => r.id === s.currentRoundId)
        ?.eligiblePlayerIds.includes(s.currentSelection.playerId) ||
      s.outcomes.some(
        (o) =>
          o.playerId === s.currentSelection!.playerId &&
          (o.status === 'SOLD' || o.roundId === s.currentRoundId),
      ))
  )
    throw Error('Invalid current selection.');
  if (
    !unique([
      ...s.outcomes.map((o) => o.sequence.toString()),
      ...s.corrections.map((c) => c.sequence.toString()),
    ]) ||
    !unique(s.corrections.map((c) => c.id))
  )
    throw Error('Duplicate audit identifiers or sequence numbers.');
  safeSum(allocations(s).map((o) => o.amountMinor!));
  for (const t of s.teams) {
    const b = teamStats(s, t.id);
    if (b.remaining < 0 || b.slotsRemaining < 0)
      throw Error('Saved allocations exceed the team budget or capacity.');
  }
  return s;
}
