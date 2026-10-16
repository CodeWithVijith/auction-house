import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AuctionDB,
  ConflictError,
  IndexedDbRepository,
} from '../../src/persistence/repository';
import { migrateLegacy } from '../../src/persistence/migrations';
const databases: AuctionDB[] = [];
function repo() {
  const db = new AuctionDB('test-' + crypto.randomUUID());
  databases.push(db);
  return new IndexedDbRepository(db, () => 0);
}
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});
describe('transactional repository', () => {
  it('seeds once and recovers the same persisted selection', async () => {
    const r = repo();
    let s = await r.initialize(null);
    s = await r.execute({ type: 'select' }, s.revision);
    expect((await r.load()).currentSelection).toEqual(s.currentSelection);
    expect((await r.initialize('invalid legacy data')).id).toBe(s.id);
  });
  it('prevents stale-tab writes and duplicate outcomes', async () => {
    const r = repo();
    let s = await r.initialize(null);
    s = await r.execute({ type: 'select' }, s.revision);
    const c = {
      type: 'outcome' as const,
      selectionId: s.currentSelection!.id,
      status: 'SOLD' as const,
      teamId: s.teams[0].id,
      amount: '100',
    };
    const result = await Promise.allSettled([
      r.execute(c, s.revision),
      r.execute(c, s.revision),
    ]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (result.find((r) => r.status === 'rejected') as PromiseRejectedResult)
        .reason,
    ).toBeInstanceOf(ConflictError);
    expect((await r.load()).outcomes).toHaveLength(1);
  });
  it('leaves the saved snapshot intact on validation and quota errors', async () => {
    const r = repo();
    let s = await r.initialize(null);
    s = await r.execute({ type: 'select' }, s.revision);
    await expect(
      r.execute(
        {
          type: 'outcome',
          selectionId: s.currentSelection!.id,
          status: 'SOLD',
          teamId: s.teams[0].id,
          amount: '1001',
        },
        s.revision,
      ),
    ).rejects.toThrow();
    expect(await r.load()).toEqual(s);
    r.db.snapshots.hook('creating', () => {
      throw new DOMException('Disk full', 'QuotaExceededError');
    });
    await expect(
      r.execute(
        {
          type: 'outcome',
          selectionId: s.currentSelection!.id,
          status: 'UNSOLD',
        },
        s.revision,
      ),
    ).rejects.toThrow('Disk full');
    expect(await r.load()).toEqual(s);
  });
  it('preserves corrupt or future data without loading samples', async () => {
    const r = repo();
    await expect(r.initialize('{broken')).rejects.toThrow();
    expect(await r.db.snapshots.count()).toBe(0);
    const s = await r.initialize(null);
    await r.db.snapshots.put({
      ...s,
      schemaVersion: 99,
    } as unknown as typeof s);
    await expect(r.initialize(null)).rejects.toThrow();
    expect(await r.db.snapshots.count()).toBe(1);
  });
});
describe('legacy migration', () => {
  const fixture = () => ({
    version: 2,
    unit: 'INR',
    eventName: 'Existing auction',
    season: '2026',
    round: 1,
    currentId: null,
    autoNext: false,
    sampleData: false,
    players: [
      {
        id: 'PL-001',
        name: 'Alex',
        role: 'Batter',
        category: 'Senior',
        age: '24',
        city: 'Pune',
        photo: '',
        status: 'Sold',
        teamId: 't1',
        amount: 1250.5,
        round: 1,
      },
    ],
    teams: [
      {
        id: 't1',
        name: 'Original team',
        short: 'OT',
        color: '#7258c9',
        budgets: { POINTS: 1000, INR: 10000 },
        maxPlayers: 11,
      },
    ],
    history: [
      {
        playerId: 'PL-001',
        status: 'Sold',
        teamId: 't1',
        amount: 1250.5,
        sequence: 1,
        timestamp: '2026-10-11T00:00:00.000Z',
        round: 1,
      },
    ],
  });
  it('preserves players and history and converts rupees to paise', async () => {
    const r = repo();
    const s = await r.initialize(JSON.stringify(fixture()));
    expect(s.eventName).toBe('Existing auction');
    expect(s.players).toHaveLength(1);
    expect(s.players[0].registrationCode).toBe('PL-001');
    expect(s.players[0].id).not.toBe('PL-001');
    expect(s.outcomes[0].amountMinor).toBe(125050);
    expect(s.teams[0].startingBudgets.INR).toBe(1000000);
    expect(s.rounds[0].status).toBe('COMPLETED');
  });
  it('rejects invalid legacy references instead of replacing progress', () => {
    const f = fixture();
    f.history[0].playerId = 'missing';
    expect(() => migrateLegacy(f)).toThrow();
  });
});
