import { buildApi } from './app';
import { PostgresStore } from './postgres-store';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');
const port = Number(process.env.PORT ?? 3000);
const host =
  process.env.HOST ??
  (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = buildApi(new PostgresStore(connectionString), {
  staticDirectory: join(projectRoot, 'dist'),
});

await api.listen({ port, host });
