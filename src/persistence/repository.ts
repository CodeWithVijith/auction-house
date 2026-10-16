import Dexie, { type Table } from 'dexie';
import type { Command, Snapshot } from '../domain/types';
import { applyCommand } from '../domain/commands';
import { validateSnapshot } from '../domain/schemas';
import { teamStats } from '../domain/selectors';
import { seed } from '../domain/seed';
import { migrateLegacy } from './migrations';
export interface AuctionRepository {
  load(): Promise<Snapshot>;
  execute(command: Command, expectedRevision: number): Promise<Snapshot>;
  saveAsset(blob: Blob): Promise<string>;
}
export class ConflictError extends Error {
  constructor() {
    super(
      'Another tab changed this auction. The latest state has been loaded; review and retry.',
    );
  }
}
export class AuctionDB extends Dexie {
  snapshots!: Table<Snapshot, string>;
  assets!: Table<{ id: string; blob: Blob }, string>;
  constructor(name = 'auction-house-v3') {
    super(name);
    this.version(1).stores({ snapshots: 'id', assets: 'id' });
  }
}
export class IndexedDbRepository implements AuctionRepository {
  constructor(
    public db = new AuctionDB(),
    private random?: (length: number) => number,
  ) {}
  async load() {
    const values = await this.db.snapshots.toArray();
    if (values.length !== 1)
      throw Error(
        'Auction storage is missing or ambiguous. Reload after initializing.',
      );
    const s = validateSnapshot(values[0]);
    for (const t of s.teams) {
      const b = teamStats(s, t.id);
      if (b.remaining < 0 || b.slotsRemaining < 0)
        throw Error('Saved auction has invalid balances; data was preserved.');
    }
    return s;
  }
  async initialize(legacyText: string | null) {
    const existing = await this.db.snapshots.count();
    if (existing) return this.load();
    let s: Snapshot;
    const assets: { id: string; blob: Blob }[] = [];
    if (legacyText) {
      const migrated = migrateLegacy(JSON.parse(legacyText));
      s = migrated.snapshot;
      for (const a of migrated.assets) {
        const response = await fetch(a.data);
        assets.push({ id: a.id, blob: await response.blob() });
      }
    } else s = seed();
    await this.db.transaction(
      'rw',
      this.db.snapshots,
      this.db.assets,
      async () => {
        if (await this.db.snapshots.count()) return;
        await this.db.snapshots.add(s);
        if (assets.length) await this.db.assets.bulkAdd(assets);
      },
    );
    return this.load();
  }
  async execute(command: Command, expectedRevision: number) {
    return this.db.transaction('rw', this.db.snapshots, async () => {
      const s = await this.load();
      if (s.revision !== expectedRevision) throw new ConflictError();
      const next = applyCommand(s, command, this.random);
      await this.db.snapshots.delete(s.id);
      await this.db.snapshots.add(next);
      return next;
    });
  }
  async saveAsset(blob: Blob) {
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) ||
      blob.size > 1024 * 1024
    )
      throw Error('Choose PNG, JPEG or WebP up to 1 MB.');
    const id = crypto.randomUUID();
    await this.db.assets.add({ id, blob });
    return id;
  }
  async asset(id: string) {
    return (await this.db.assets.get(id))?.blob;
  }
}
export const repository = new IndexedDbRepository();
