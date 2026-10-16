import { read, write, utils, type WorkBook } from 'xlsx';
import type { Player, Snapshot } from '../domain/types';
import { uid } from '../domain/seed';
import { playerSchema } from '../domain/schemas';
import {
  allocations,
  complete,
  finalOutcome,
  teamStats,
  totals,
} from '../domain/selectors';
export const MAX_UPLOAD = 8 * 1024 * 1024,
  MAX_ROWS = 1000;
export type Field =
  | 'registrationCode'
  | 'name'
  | 'role'
  | 'category'
  | 'age'
  | 'city'
  | 'photoUrl';
export const fields: Field[] = [
  'registrationCode',
  'name',
  'role',
  'category',
  'age',
  'city',
  'photoUrl',
];
export type Mapping = Record<Field, string>;
export type Sheet = { name: string; rows: unknown[][] };
export function decodeWorkbook(
  data: ArrayBuffer | string,
  csv = false,
): Sheet[] {
  let wb: WorkBook;
  try {
    wb = read(typeof data === 'string' ? data.replace(/^\uFEFF/, '') : data, {
      type: typeof data === 'string' ? 'string' : 'array',
      raw: csv,
      cellFormula: false,
      cellHTML: false,
      bookVBA: true,
    });
  } catch {
    throw Error('Could not read this file. Upload a valid .xlsx or UTF-8 CSV.');
  }
  if (wb.vbaraw)
    throw Error(
      'Macro-enabled workbooks are not supported. Export registrations as .xlsx or CSV without macros.',
    );
  const sheets = wb.SheetNames.map((name) => ({
    name,
    rows: utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
      header: 1,
      defval: '',
      blankrows: true,
      raw: true,
    }),
  }));
  if (!sheets.some((s) => s.rows.some((r) => r.some((v) => String(v).trim()))))
    throw Error('The workbook is empty.');
  return sheets;
}
export async function readUpload(file: File) {
  if (!/\.(xlsx|csv)$/i.test(file.name))
    throw Error('Only .xlsx and .csv files are supported.');
  if (file.size > MAX_UPLOAD) throw Error('Upload limit is 8 MB.');
  if (/\.csv$/i.test(file.name)) return decodeWorkbook(await file.text(), true);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b)
    throw Error('Could not read this file. Choose a valid .xlsx workbook.');
  return decodeWorkbook(buffer);
}
export function suggestMapping(headers: string[]): Mapping {
  const aliases: Record<Field, string[]> = {
    registrationCode: [
      'registrationid',
      'registrationcode',
      'playerid',
      'regid',
      'id',
    ],
    name: ['fullname', 'playername', 'name'],
    role: ['role', 'playingrole', 'position'],
    category: ['category', 'agegroup', 'level'],
    age: ['age'],
    city: ['city', 'location', 'town'],
    photoUrl: ['photourl', 'imageurl', 'profilephoto', 'photo'],
  };
  return Object.fromEntries(
    fields.map((f) => [
      f,
      headers.find((h) =>
        aliases[f].includes(h.toLowerCase().replace(/[^a-z0-9]/g, '')),
      ) ?? '',
    ]),
  ) as Mapping;
}
export function normalizeRows(
  sheet: Sheet,
  headerIndex: number,
  mapping: Mapping,
) {
  const headers = (sheet.rows[headerIndex] ?? []).map((v) => String(v).trim());
  const errors: string[] = [];
  if (!mapping.name) errors.push('Map the required player name field.');
  const mapped = Object.values(mapping).filter(Boolean);
  if (new Set(mapped).size !== mapped.length)
    errors.push('A source column cannot be mapped to multiple fields.');
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length)
    errors.push('Header names must be unique. Choose another header row.');
  const rows = sheet.rows
    .slice(headerIndex + 1)
    .map((row, i) => ({ row, sourceRow: headerIndex + i + 2 }))
    .filter((x) => x.row.some((v) => String(v ?? '').trim()));
  if (rows.length > MAX_ROWS)
    errors.push('At most 1,000 non-empty player rows are allowed.');
  if (!rows.length) errors.push('No player rows found below this header.');
  const get = (row: unknown[], field: Field) =>
    String(row[headers.indexOf(mapping[field])] ?? '').trim();
  const supplied = new Set(
      rows
        .map((x) => get(x.row, 'registrationCode').toUpperCase())
        .filter(Boolean),
    ),
    seen = new Set<string>();
  let nextCode = 1;
  const players: Player[] = rows.map(({ row, sourceRow }) => {
    let code = get(row, 'registrationCode');
    if (!code) {
      do {
        code = 'PL-' + String(nextCode++).padStart(3, '0');
      } while (
        supplied.has(code.toUpperCase()) ||
        seen.has(code.toUpperCase())
      );
    }
    if (seen.has(code.toUpperCase()))
      errors.push(`Row ${sourceRow}: Duplicate registration code ${code}.`);
    seen.add(code.toUpperCase());
    const age = get(row, 'age');
    if (age && !/^\d+$/.test(age))
      errors.push(`Row ${sourceRow}: Age must be a whole number.`);
    const p = {
      id: uid(),
      registrationCode: code,
      name: get(row, 'name'),
      role: get(row, 'role') || 'Player',
      category: get(row, 'category'),
      age: age ? Number(age) : undefined,
      city: get(row, 'city'),
      photoUrl: get(row, 'photoUrl'),
      sourceRow,
    };
    const result = playerSchema.safeParse(p);
    if (!result.success)
      for (const issue of result.error.issues)
        errors.push(
          `Row ${sourceRow}: ${issue.path.join('.')} — ${issue.message}`,
        );
    return p;
  });
  return {
    players,
    errors,
    excluded: headers.filter((h) => h && !mapped.includes(h)),
  };
}
export function workbook(
  sheets: { name: string; rows: (string | number | null | undefined)[][] }[],
) {
  const wb = utils.book_new();
  for (const { name, rows } of sheets) {
    const ws = utils.aoa_to_sheet(rows);
    ws['!cols'] = (rows[0] ?? []).map(() => ({ wch: 24 }));
    ws['!autofilter'] = { ref: ws['!ref'] ?? 'A1' };
    const inr = rows.some((r) => r.includes('INR'));
    for (const key of Object.keys(ws)) {
      if (key.startsWith('!')) continue;
      const cell = ws[key];
      if (cell.t === 'n') {
        const pos = utils.decode_cell(key);
        const isAmount =
          /amount/i.test(String(rows[0]?.[pos.c] ?? '')) ||
          (name === 'Summary' &&
            /allocated|starting budget|spent|remaining/.test(
              String(rows[pos.r]?.[0] ?? ''),
            ));
        cell.z = inr && isAmount ? '0.00' : '0';
      } else if (cell.t === 's') delete cell.f;
    }
    utils.book_append_sheet(wb, ws, name);
  }
  return write(wb, {
    bookType: 'xlsx',
    type: 'array',
    compression: true,
  }) as ArrayBuffer;
}
export function exportSheets(s: Snapshot) {
  if (!complete(s))
    throw Error('Finish the current round before exporting final results.');
  const unit = s.unit === 'INR' ? 'INR' : 'Points',
    value = (n: number | null) =>
      n === null ? '' : s.unit === 'INR' ? n / 100 : n;
  const header = [
    'Registration code',
    'Player name',
    'Role',
    'Category',
    'Age',
    'City',
    'Status',
    'Team',
    'Amount',
    'Unit',
    'Final round',
    'Completed at',
  ];
  const row = (p: Player) => {
    const o = finalOutcome(s, p.id);
    return [
      p.registrationCode,
      p.name,
      p.role,
      p.category,
      p.age ?? '',
      p.city,
      o?.status ?? 'PENDING',
      s.teams.find((t) => t.id === o?.teamId)?.name ?? '',
      o ? value(o.amountMinor) : '',
      unit,
      s.rounds.find((r) => r.id === o?.roundId)?.number ?? '',
      o?.completedAt ?? '',
    ];
  };
  const t = totals(s);
  return [
    { name: 'Player Results', rows: [header, ...s.players.map(row)] },
    {
      name: 'Team Allocations',
      rows: [
        ['Team', 'Registration code', 'Player name', 'Role', 'Amount', 'Unit'],
        ...allocations(s).map((o) => {
          const p = s.players.find((p) => p.id === o.playerId)!;
          return [
            s.teams.find((t) => t.id === o.teamId)!.name,
            p.registrationCode,
            p.name,
            p.role,
            value(o.amountMinor),
            unit,
          ];
        }),
      ],
    },
    {
      name: 'Unsold Players',
      rows: [
        header,
        ...s.players
          .filter((p) => finalOutcome(s, p.id)?.status === 'UNSOLD')
          .map(row),
      ],
    },
    {
      name: 'Summary',
      rows: [
        ['Metric', 'Value'],
        ['Event', s.eventName],
        ['Season', s.season],
        ['Unit', unit],
        ['Players', s.players.length],
        ['Sold', t.sold],
        ['Unsold', t.unsold],
        ['Total allocated', value(t.spent)],
        [
          'Rounds completed',
          s.rounds.filter((r) => r.status === 'COMPLETED').length,
        ],
        ...s.teams.flatMap((team) => {
          const b = teamStats(s, team.id);
          return [
            [team.name + ' — players', b.count],
            [team.name + ' — squad limit', team.maxPlayers],
            [
              team.name + ' — starting budget',
              value(team.startingBudgets[s.unit]),
            ],
            [team.name + ' — spent', value(b.spent)],
            [team.name + ' — remaining', value(b.remaining)],
          ];
        }),
      ],
    },
    {
      name: 'Auction History',
      rows: [
        [
          'Sequence',
          'Action',
          'Round',
          'Player at time',
          'Outcome',
          'Team at time',
          'Amount',
          'Unit',
          'Timestamp',
          'Previous team',
          'Previous amount',
          'Reason',
        ],
        ...[
          ...s.outcomes.map((o) => ({
            sequence: o.sequence,
            row: [
              o.sequence,
              'Outcome',
              s.rounds.find((r) => r.id === o.roundId)!.number,
              o.playerNameAtTime,
              o.status,
              o.teamNameAtTime ?? '',
              value(o.amountMinor),
              unit,
              o.completedAt,
              '',
              '',
              '',
            ],
          })),
          ...s.corrections.map((c) => ({
            sequence: c.sequence,
            row: [
              c.sequence,
              'Correction',
              s.rounds.find(
                (r) =>
                  r.id ===
                  s.outcomes.find((o) => o.id === c.targetOutcomeId)!.roundId,
              )!.number,
              s.outcomes.find((o) => o.id === c.targetOutcomeId)!
                .playerNameAtTime,
              'SOLD',
              c.nextTeamNameAtTime,
              value(c.nextAmountMinor),
              unit,
              c.correctedAt,
              c.previousTeamNameAtTime,
              value(c.previousAmountMinor),
              c.reason,
            ],
          })),
        ]
          .sort((a, b) => a.sequence - b.sequence)
          .map((x) => x.row),
      ],
    },
  ];
}
export function download(data: ArrayBuffer, name: string) {
  const url = URL.createObjectURL(
    new Blob([data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
