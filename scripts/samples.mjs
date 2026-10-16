import { writeFile, mkdir, copyFile } from 'node:fs/promises';
import { utils, write } from 'xlsx';
import { sampleRows } from '../src/core.mjs';
await mkdir('public/samples', { recursive: true });
const rows = sampleRows.map((p) => ({ ...p, PhotoURL: '' }));
const ws = utils.json_to_sheet(rows, {
  header: [
    'RegistrationID',
    'FullName',
    'Role',
    'Category',
    'Age',
    'City',
    'PhotoURL',
    'Email',
    'Phone',
    'JerseySize',
  ],
});
const wb = utils.book_new();
utils.book_append_sheet(wb, ws, 'Registrations');
await writeFile(
  'public/samples/player-registrations.xlsx',
  write(wb, { type: 'buffer', bookType: 'xlsx', compression: true }),
);
await writeFile(
  'public/samples/player-registrations.csv',
  utils.sheet_to_csv(ws),
);
await mkdir('docs/licenses', { recursive: true });
await copyFile(
  'node_modules/xlsx/LICENSE',
  'docs/licenses/SheetJS-LICENSE.txt',
);
