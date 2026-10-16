import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');
const directory = dirname(fileURLToPath(import.meta.url));
const sql = await readFile(
  join(directory, 'migrations', '001_foundation.sql'),
  'utf8',
);
const client = new pg.Client({ connectionString });

await client.connect();
try {
  await client.query('select pg_advisory_lock($1)', [2_026_101_601]);
  await client.query(`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`);
  const applied = await client.query(
    'select 1 from schema_migrations where name = $1',
    ['001_foundation.sql'],
  );
  if (applied.rowCount) {
    console.log('001_foundation.sql already applied');
  } else {
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into schema_migrations (name) values ($1)', [
        '001_foundation.sql',
      ]);
      await client.query('commit');
      console.log('Applied 001_foundation.sql');
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }
} finally {
  await client.query('select pg_advisory_unlock($1)', [2_026_101_601]);
  await client.end();
}
