import { describe, it, expect } from 'vitest';
import { read, utils } from 'xlsx';
import { applyCommand, randomIndex } from '../../src/domain/commands';
import { seed } from '../../src/domain/seed';
import { amountInput, money, parseAmount } from '../../src/domain/money';
import {
  allocations,
  complete,
  pending,
  status,
  teamStats,
  totals,
} from '../../src/domain/selectors';
import {
  decodeWorkbook,
  exportSheets,
  normalizeRows,
  suggestMapping,
  workbook,
} from '../../src/services/spreadsheet';
import type { Snapshot } from '../../src/domain/types';
export function select(s: Snapshot) {
  return applyCommand(s, { type: 'select' }, () => 0);
}
export function outcome(s: Snapshot, amount?: string, team = 0) {
  s = select(s);
  return applyCommand(s, {
    type: 'outcome',
    selectionId: s.currentSelection!.id,
    status: amount ? 'SOLD' : 'UNSOLD',
    amount,
    teamId: s.teams[team].id,
  });
}
export function mainRound() {
  let s = seed();
  for (const [a, t] of [
    ['250', 0],
    [undefined, 0],
    ['400', 1],
    ['300', 2],
    ['500', 3],
    [undefined, 0],
  ] as const)
    s = outcome(s, a, t);
  return s;
}
export function allRounds() {
  let s = applyCommand(mainRound(), { type: 'retry' });
  s = outcome(s, '750');
  s = outcome(s);
  s = applyCommand(s, { type: 'retry' });
  return outcome(s, '300', 2);
}
describe('exact money', () => {
  it('formats the last paisa exactly at the safe integer limit', () => {
    expect(money(Number.MAX_SAFE_INTEGER, 'INR')).toBe(
      '₹9,00,71,99,25,47,409.91',
    );
  });
  it('parses rupees and keeps decimal arithmetic exact', () => {
    expect(parseAmount('1250.50', 'INR')).toBe(125050);
    expect(parseAmount('0.10', 'INR') + parseAmount('0.20', 'INR')).toBe(30);
    expect(amountInput(30, 'INR')).toBe('0.30');
  });
  for (const [text, unit] of [
    ['1.5', 'POINTS'],
    ['1.001', 'INR'],
    ['0', 'POINTS'],
    ['-1', 'INR'],
    ['NaN', 'POINTS'],
    ['1e3', 'INR'],
    ['Infinity', 'INR'],
    ['9007199254740992', 'POINTS'],
  ] as const)
    it(`rejects ${text} in ${unit}`, () =>
      expect(() => parseAmount(text, unit)).toThrow());
  it('allows zero budgets and exact INR budget remainder', () => {
    expect(parseAmount('0', 'INR', true)).toBe(0);
    let s = seed();
    s.unit = 'INR';
    s = outcome(s, '1250.50');
    expect(teamStats(s, s.teams[0].id).remaining).toBe(874950);
  });
});
describe('auction lifecycle', () => {
  it('matches the specified main-round fixture', () => {
    const s = mainRound();
    expect(complete(s)).toBe(true);
    expect(totals(s)).toMatchObject({ sold: 4, unsold: 2, spent: 1450 });
    expect(s.teams.map((t) => teamStats(s, t.id).remaining)).toEqual([
      750, 600, 700, 500,
    ]);
    expect(new Set(s.outcomes.map((o) => o.playerId)).size).toBe(6);
    expect(() => select(s)).toThrow();
  });
  it('repeats only unsold players and preserves sold allocations', () => {
    let s = mainRound();
    const original = s.outcomes.slice();
    s = applyCommand(s, { type: 'retry' });
    expect(pending(s)).toHaveLength(2);
    expect(status(s, s.players[1].id)).toBe('PENDING');
    expect(s.outcomes).toEqual(original);
    expect(() => applyCommand(s, { type: 'retry' })).toThrow();
    s = outcome(s, '750');
    s = outcome(s);
    expect(totals(s).spent).toBe(2200);
    expect(teamStats(s, s.teams[0].id)).toMatchObject({
      count: 2,
      remaining: 0,
    });
    s = applyCommand(s, { type: 'retry' });
    s = outcome(s, '300', 2);
    expect(totals(s)).toMatchObject({ sold: 6, unsold: 0, spent: 2500 });
    expect(s.outcomes).toHaveLength(9);
    expect(s.players).toHaveLength(6);
    expect(teamStats(s, s.teams[2].id).remaining).toBe(400);
    expect(() => applyCommand(s, { type: 'retry' })).toThrow();
  });
  it('rejects over-budget and duplicate outcomes without mutation', () => {
    let s = seed();
    s = select(s);
    const before = structuredClone(s);
    expect(() =>
      applyCommand(s, {
        type: 'outcome',
        selectionId: s.currentSelection!.id,
        status: 'SOLD',
        teamId: s.teams[0].id,
        amount: '1001',
      }),
    ).toThrow(/budget/);
    expect(s).toEqual(before);
    const id = s.currentSelection!.id;
    s = applyCommand(s, {
      type: 'outcome',
      selectionId: id,
      status: 'SOLD',
      teamId: s.teams[0].id,
      amount: '1000',
    });
    expect(() =>
      applyCommand(s, { type: 'outcome', selectionId: id, status: 'UNSOLD' }),
    ).toThrow();
    expect(s.outcomes).toHaveLength(1);
    expect(teamStats(s, s.teams[0].id).remaining).toBe(0);
    s = select(s);
    expect(() =>
      applyCommand(s, {
        type: 'outcome',
        selectionId: s.currentSelection!.id,
        status: 'SOLD',
        teamId: s.teams[0].id,
        amount: '1',
      }),
    ).toThrow();
  });
  it('unsold ignores previously entered amount and team', () => {
    let s = select(seed());
    s = applyCommand(s, {
      type: 'outcome',
      selectionId: s.currentSelection!.id,
      status: 'UNSOLD',
      amount: '900',
      teamId: s.teams[0].id,
    });
    expect(s.outcomes[0]).toMatchObject({ teamId: null, amountMinor: null });
    expect(teamStats(s, s.teams[0].id).spent).toBe(0);
  });
  it('blocks full squads and preserves the previous snapshot', () => {
    let s = seed();
    s.teams[0].maxPlayers = 1;
    s = outcome(s, '10');
    s = select(s);
    const before = structuredClone(s);
    expect(() =>
      applyCommand(s, {
        type: 'outcome',
        selectionId: s.currentSelection!.id,
        status: 'SOLD',
        amount: '10',
        teamId: s.teams[0].id,
      }),
    ).toThrow(/squad/);
    expect(s).toEqual(before);
  });
  it('locks units, starting budgets, roster replacement, and deletion after results', () => {
    const s = outcome(seed(), '100');
    expect(() =>
      applyCommand(s, { type: 'settings', ...s, unit: 'INR' }),
    ).toThrow(/locked/);
    expect(() =>
      applyCommand(s, {
        type: 'team',
        team: {
          ...s.teams[0],
          startingBudgets: { POINTS: 2000, INR: 1000000 },
        },
      }),
    ).toThrow(/locked/);
    expect(() =>
      applyCommand(s, { type: 'deletePlayer', id: s.players[1].id }),
    ).toThrow(/locked/);
    expect(() =>
      applyCommand(s, { type: 'deleteTeam', id: s.teams[0].id }),
    ).toThrow(/history/);
    expect(() =>
      applyCommand(s, {
        type: 'import',
        players: s.players,
        metadata: {
          fileName: 'x.csv',
          mapping: {},
          importedAt: new Date().toISOString(),
        },
      }),
    ).toThrow();
  });
  it('corrects using refund-before-validation and immutable audit history', () => {
    let s = outcome(seed(), '1000');
    const original = structuredClone(s.outcomes[0]);
    s = applyCommand(s, {
      type: 'correct',
      outcomeId: original.id,
      teamId: s.teams[0].id,
      amount: '999',
      reason: 'typo',
    });
    expect(teamStats(s, s.teams[0].id).remaining).toBe(1);
    s = applyCommand(s, {
      type: 'correct',
      outcomeId: original.id,
      teamId: s.teams[1].id,
      amount: '500',
      reason: 'team correction',
    });
    expect(teamStats(s, s.teams[0].id).remaining).toBe(1000);
    expect(teamStats(s, s.teams[1].id).spent).toBe(500);
    expect(s.outcomes[0]).toEqual(original);
    expect(s.corrections).toHaveLength(2);
    expect(allocations(s)).toHaveLength(1);
    const before = structuredClone(s);
    expect(() =>
      applyCommand(s, {
        type: 'correct',
        outcomeId: original.id,
        teamId: s.teams[1].id,
        amount: '1001',
        reason: '',
      }),
    ).toThrow();
    expect(s).toEqual(before);
    expect(() =>
      applyCommand(s, { type: 'deleteTeam', id: s.teams[0].id }),
    ).toThrow(/history/);
  });
  it('retains historical names through profile and branding edits', () => {
    let s = outcome(seed(), '20');
    s = applyCommand(s, {
      type: 'player',
      player: { ...s.players[0], name: 'New name' },
    });
    s = applyCommand(s, {
      type: 'team',
      team: { ...s.teams[0], name: 'New team' },
    });
    expect(s.outcomes[0]).toMatchObject({
      playerNameAtTime: 'Arjun Mehta',
      teamNameAtTime: 'Royal Strikers',
    });
  });
  it('creates unbiased random indices inside the eligible pool', () => {
    expect(() => randomIndex(0)).toThrow();
    for (let i = 0; i < 50; i++) {
      const n = randomIndex(6);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(6);
    }
  });
});
describe('spreadsheet adapter', () => {
  it('parses quoted CSV including BOM, commas, quotes and embedded line breaks', () => {
    const sheet = decodeWorkbook(
      '\uFEFFPlayer Name,City,Role\r\n"Alex, Junior","New\nTown","Batter ""A"""\r\n',
      true,
    )[0];
    const normalized = normalizeRows(
      sheet,
      0,
      suggestMapping(sheet.rows[0].map(String)),
    );
    expect(normalized.errors).toEqual([]);
    expect(normalized.players[0]).toMatchObject({
      name: 'Alex, Junior',
      city: 'New\nTown',
      role: 'Batter "A"',
    });
  });
  it('imports XLSX and CSV equivalently and discards private fields', () => {
    const rows = [
      ['RegistrationID', 'FullName', 'Age', 'Email', 'Phone', 'JerseySize'],
      ['PL-002', 'Alex', 22, 'secret@example.com', '12345', 'XL'],
    ];
    const xlsx = decodeWorkbook(workbook([{ name: 'Registrations', rows }]))[0],
      csv = decodeWorkbook(rows.map((r) => r.join(',')).join('\n'), true)[0];
    const mapping = suggestMapping(rows[0].map(String));
    const a = normalizeRows(xlsx, 0, mapping),
      b = normalizeRows(csv, 0, mapping);
    expect({ ...a.players[0], id: '' }).toEqual({ ...b.players[0], id: '' });
    expect(a.excluded).toEqual(['Email', 'Phone', 'JerseySize']);
    expect(JSON.stringify(a.players)).not.toContain('secret');
    expect(JSON.stringify(a.players)).not.toContain('12345');
  });
  it('avoids generated-code collisions, keeps source rows and accepts duplicate names', () => {
    const sheet = {
      name: 'Players',
      rows: [
        ['RegistrationID', 'FullName'],
        ['', 'Same'],
        ['PL-001', 'Same'],
        [],
        ['', 'Same'],
      ],
    };
    const p = normalizeRows(
      sheet,
      0,
      suggestMapping(sheet.rows[0].map(String)),
    );
    expect(p.errors).toEqual([]);
    expect(p.players.map((p) => p.registrationCode)).toEqual([
      'PL-002',
      'PL-001',
      'PL-003',
    ]);
    expect(p.players.map((p) => p.sourceRow)).toEqual([2, 3, 5]);
  });
  it('reports duplicate codes, invalid ages, URLs, missing names, duplicate mappings and row limits', () => {
    const sheet = {
      name: 'bad',
      rows: [
        ['ID', 'Name', 'Age', 'PhotoURL'],
        ['a', '', '1.5', 'javascript:alert(1)'],
        [' A ', 'B', '121', ''],
      ],
    };
    const p = normalizeRows(
      sheet,
      0,
      suggestMapping(sheet.rows[0].map(String)),
    );
    expect(p.errors.length).toBeGreaterThanOrEqual(4);
    expect(
      normalizeRows(sheet, 0, {
        ...suggestMapping(sheet.rows[0].map(String)),
        city: 'Name',
      }).errors.join(),
    ).toContain('multiple');
    const large = {
      name: 'large',
      rows: [['Name'], ...Array.from({ length: 1001 }, () => ['Alex'])],
    };
    expect(
      normalizeRows(large, 0, suggestMapping(['Name'])).errors.join(),
    ).toContain('1,000');
  });
  it('exports five real sheets with effective amounts, literal text, and complete history', () => {
    let s = allRounds();
    s = applyCommand(s, {
      type: 'player',
      player: { ...s.players[0], name: '=SUM(A1:A2)' },
    });
    s = applyCommand(s, {
      type: 'correct',
      outcomeId: s.outcomes[0].id,
      teamId: s.teams[0].id,
      amount: '200',
      reason: 'test',
    });
    const wb = read(workbook(exportSheets(s)), { type: 'array' });
    expect(wb.SheetNames).toEqual([
      'Player Results',
      'Team Allocations',
      'Unsold Players',
      'Summary',
      'Auction History',
    ]);
    const results = utils.sheet_to_json(wb.Sheets['Player Results'], {
      header: 1,
    });
    expect(results).toHaveLength(7);
    expect(wb.Sheets['Player Results'].B2).toMatchObject({
      t: 's',
      v: '=SUM(A1:A2)',
    });
    expect(wb.Sheets['Player Results'].B2.f).toBeUndefined();
    expect(wb.Sheets['Player Results'].I2).toMatchObject({ t: 'n', v: 200 });
    expect(
      utils.sheet_to_json(wb.Sheets['Auction History'], { header: 1 }),
    ).toHaveLength(11);
    expect(JSON.stringify(results)).not.toContain('example.com');
  });
  it('gates export during a retry round and exports numeric INR cells', () => {
    let s = mainRound();
    s = applyCommand(s, { type: 'retry' });
    expect(() => exportSheets(s)).toThrow(/Finish/);
    s = seed();
    s.unit = 'INR';
    for (let i = 0; i < 6; i++) s = outcome(s, i === 0 ? '1250.50' : undefined);
    const wb = read(workbook(exportSheets(s)), { type: 'array' });
    expect(wb.Sheets['Player Results'].I2).toMatchObject({ t: 'n', v: 1250.5 });
  });
});
