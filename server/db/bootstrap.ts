import { randomUUID } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
const email = process.env.BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_PASSWORD;
const displayName = process.env.BOOTSTRAP_NAME?.trim() || 'Auction Admin';
const organizationName =
  process.env.BOOTSTRAP_ORGANIZATION?.trim() || 'Auction House';
if (!connectionString) throw new Error('DATABASE_URL is required.');
if (!email || !password) {
  console.warn(
    'Complete bootstrap credentials were not supplied; administrator creation skipped.',
  );
  process.exit(0);
}
if (password.length < 12)
  throw new Error('BOOTSTRAP_PASSWORD must contain at least 12 characters.');

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query('begin');
  const existing = await client.query<{ id: string }>(
    'select id from users where lower(email) = lower($1)',
    [email],
  );
  if (existing.rowCount) {
    await client.query('commit');
    console.log(`Administrator ${email} already exists; bootstrap skipped.`);
  } else {
    const organizationId = randomUUID();
    const userId = randomUUID();
    const passwordHash = await hash(password, {
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    await client.query('insert into organizations (id, name) values ($1, $2)', [
      organizationId,
      organizationName,
    ]);
    await client.query(
      `insert into users (id, email, display_name, password_hash)
       values ($1, $2, $3, $4)`,
      [userId, email, displayName, passwordHash],
    );
    await client.query(
      `insert into organization_members (organization_id, user_id, role)
       values ($1, $2, 'ADMIN')`,
      [organizationId, userId],
    );
    await client.query('commit');
    console.log(`Created administrator ${email} for ${organizationName}.`);
  }
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
