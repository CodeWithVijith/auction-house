import { z } from 'zod';
import { seed, uid } from '../domain/seed';
import { parseAmount } from '../domain/money';
import { validateSnapshot } from '../domain/schemas';
import type { Outcome, Snapshot } from '../domain/types';
const legacy = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  unit: z.enum(['POINTS', 'INR']),
  eventName: z.string(),
  season: z.string(),
  round: z.number().int().optional(),
  currentId: z.string().nullable(),
  autoNext: z.boolean(),
  sampleData: z.boolean().optional(),
  display: z
    .object({ photo: z.boolean(), age: z.boolean(), city: z.boolean() })
    .optional(),
  eventLogo: z.string().optional(),
  players: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
      category: z.string(),
      age: z.union([z.string(), z.number()]),
      city: z.string(),
      photo: z.string().optional(),
      status: z.enum(['Pending', 'Current', 'Sold', 'Unsold']),
      teamId: z.string().nullable(),
      amount: z.number().nullable(),
      round: z.number().nullable().optional(),
    }),
  ),
  teams: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      short: z.string(),
      color: z.string(),
      logo: z.string().optional(),
      maxPlayers: z.number().optional(),
      budgets: z.object({ POINTS: z.number(), INR: z.number() }).optional(),
    }),
  ),
  history: z.array(
    z.object({
      playerId: z.string(),
      status: z.enum(['Sold', 'Unsold']),
      teamId: z.string().nullable(),
      amount: z.number().nullable(),
      sequence: z.number(),
      timestamp: z.string(),
      round: z.number().optional(),
      action: z.string().optional(),
      previousAmount: z.number().optional(),
      previousTeamId: z.string().optional(),
    }),
  ),
});
export function migrateLegacy(input: unknown): {
  snapshot: Snapshot;
  assets: { id: string; data: string }[];
} {
  const old = legacy.parse(input),
    s = seed(false),
    assets: { id: string; data: string }[] = [];
  s.eventName = old.eventName;
  s.season = old.season;
  s.unit = old.unit;
  s.isSample = old.sampleData ?? false;
  s.configurationLocked = old.history.length > 0;
  s.preferences = {
    autoNext: old.autoNext,
    showPhoto: old.display?.photo ?? true,
    showAge: old.display?.age ?? true,
    showCity: old.display?.city ?? true,
  };
  const asset = (data?: string) => {
    if (!data) return undefined;
    if (!/^data:image\/(png|jpeg|webp);base64,/i.test(data))
      throw Error(
        'Legacy image cannot be migrated. Original data is preserved.',
      );
    const id = uid();
    assets.push({ id, data });
    return id;
  };
  s.eventLogoAssetId = asset(old.eventLogo);
  const ids = new Map(old.players.map((p) => [p.id, uid()]));
  s.players = old.players.map((p) => ({
    id: ids.get(p.id)!,
    registrationCode: p.id,
    name: p.name,
    role: p.role,
    category: p.category,
    age: p.age === '' ? undefined : Number(p.age),
    city: p.city,
    photoUrl: p.photo ?? '',
  }));
  s.teams = old.teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.short,
    color: t.color,
    maxPlayers: t.maxPlayers ?? 11,
    logoAssetId: asset(t.logo),
    startingBudgets: {
      POINTS: parseAmount(String(t.budgets?.POINTS ?? 1000), 'POINTS', true),
      INR: parseAmount(String(t.budgets?.INR ?? 10000), 'INR', true),
    },
  }));
  const maxRound = Math.max(
    old.round ?? 1,
    ...old.history.map((h) => h.round ?? 1),
  );
  for (let n = 1; n <= maxRound; n++) {
    const eligible =
      n === 1
        ? s.players.map((p) => p.id)
        : old.players
            .filter(
              (p) =>
                old.history.some(
                  (h) => h.playerId === p.id && (h.round ?? 1) === n,
                ) ||
                ((p.status === 'Pending' || p.status === 'Current') &&
                  n === maxRound),
            )
            .map((p) => ids.get(p.id)!);
    s.rounds.push({
      id: uid(),
      number: n,
      kind: n === 1 ? 'MAIN' : 'UNSOLD',
      status: n < maxRound ? 'COMPLETED' : 'ACTIVE',
      eligiblePlayerIds: eligible,
    });
  }
  s.currentRoundId = s.rounds.at(-1)!.id;
  for (const h of old.history) {
    const p = s.players.find((p) => p.id === ids.get(h.playerId));
    if (!p) throw Error('Unknown player in legacy history.');
    const t = s.teams.find((t) => t.id === h.teamId);
    if (h.action === 'Correction') {
      const o = s.outcomes.find(
        (o) => o.playerId === p.id && o.status === 'SOLD',
      );
      if (!o || !t || h.previousAmount === undefined || !h.previousTeamId)
        throw Error('Incomplete legacy correction.');
      s.corrections.push({
        id: uid(),
        targetOutcomeId: o.id,
        previousTeamId: h.previousTeamId,
        previousAmountMinor: parseAmount(String(h.previousAmount), s.unit),
        nextTeamId: t.id,
        nextAmountMinor: parseAmount(String(h.amount), s.unit),
        reason: 'Migrated from previous app',
        sequence: h.sequence,
        correctedAt: h.timestamp,
        previousTeamNameAtTime:
          s.teams.find((t) => t.id === h.previousTeamId)?.name ??
          h.previousTeamId,
        nextTeamNameAtTime: t.name,
      });
    } else {
      const o: Outcome = {
        id: uid(),
        roundId: s.rounds[(h.round ?? 1) - 1].id,
        playerId: p.id,
        selectionId: uid(),
        status: h.status === 'Sold' ? 'SOLD' : 'UNSOLD',
        teamId: h.status === 'Sold' ? h.teamId : null,
        amountMinor:
          h.status === 'Sold' ? parseAmount(String(h.amount), s.unit) : null,
        unit: s.unit,
        sequence: h.sequence,
        completedAt: h.timestamp,
        playerNameAtTime: p.name,
        teamNameAtTime: t?.name ?? null,
      };
      s.outcomes.push(o);
    }
  }
  if (old.currentId) {
    const playerId = ids.get(old.currentId);
    if (!playerId) throw Error('Unknown legacy selection.');
    s.currentSelection = {
      id: uid(),
      roundId: s.currentRoundId,
      playerId,
      selectedAt: new Date().toISOString(),
    };
  }
  const r = s.rounds.at(-1)!;
  if (
    !s.currentSelection &&
    r.eligiblePlayerIds.every((id) =>
      s.outcomes.some((o) => o.playerId === id && o.roundId === r.id),
    )
  )
    r.status = 'COMPLETED';
  return { snapshot: validateSnapshot(s), assets };
}
