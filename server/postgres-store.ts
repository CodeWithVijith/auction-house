import { randomBytes, randomUUID } from 'node:crypto';
import { verify } from '@node-rs/argon2';
import pg from 'pg';
import type { EventRecord, Principal, Store } from './types';

const { Pool } = pg;

export class PostgresStore implements Store {
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 10 });
  }

  async authenticate(email: string, password: string) {
    const result = await this.pool.query<{
      user_id: string;
      email: string;
      display_name: string;
      password_hash: string;
      organization_id: string;
      organization_name: string;
      role: Principal['role'];
    }>(
      `select u.id user_id, u.email, u.display_name, u.password_hash,
              o.id organization_id, o.name organization_name, m.role
         from users u
         join organization_members m on m.user_id = u.id
         join organizations o on o.id = m.organization_id
        where lower(u.email) = lower($1) and u.disabled_at is null
        order by m.created_at asc limit 1`,
      [email],
    );
    const row = result.rows[0];
    if (!row || !(await verify(row.password_hash, password))) return null;
    return {
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      role: row.role,
      csrfToken: randomBytes(32).toString('base64url'),
    } satisfies Principal;
  }

  async createSession(principal: Principal, expiresAt: Date) {
    const id = randomBytes(32).toString('base64url');
    await this.pool.query(
      `insert into sessions
       (id, user_id, organization_id, role, csrf_token, expires_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        principal.userId,
        principal.organizationId,
        principal.role,
        principal.csrfToken,
        expiresAt,
      ],
    );
    return { ...principal, id, expiresAt };
  }

  async findSession(id: string) {
    const result = await this.pool.query<{
      id: string;
      user_id: string;
      email: string;
      display_name: string;
      organization_id: string;
      organization_name: string;
      role: Principal['role'];
      csrf_token: string;
      expires_at: Date;
    }>(
      `select s.id, s.user_id, u.email, u.display_name,
              s.organization_id, o.name organization_name, s.role,
              s.csrf_token, s.expires_at
         from sessions s
         join users u on u.id = s.user_id
         join organizations o on o.id = s.organization_id
        where s.id = $1 and s.expires_at > now() and u.disabled_at is null`,
      [id],
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          userId: row.user_id,
          email: row.email,
          displayName: row.display_name,
          organizationId: row.organization_id,
          organizationName: row.organization_name,
          role: row.role,
          csrfToken: row.csrf_token,
          expiresAt: row.expires_at,
        }
      : null;
  }

  async deleteSession(id: string) {
    await this.pool.query('delete from sessions where id = $1', [id]);
  }

  async listEvents(organizationId: string) {
    const result = await this.pool.query<EventRecord>(
      `select id, organization_id "organizationId", name, season, timezone,
              unit, status, revision, created_at "createdAt"
         from auction_events where organization_id = $1
        order by created_at desc`,
      [organizationId],
    );
    return result.rows;
  }

  async createEvent(
    organizationId: string,
    input: Pick<EventRecord, 'name' | 'season' | 'timezone' | 'unit'>,
  ) {
    const result = await this.pool.query<EventRecord>(
      `insert into auction_events
       (id, organization_id, name, season, timezone, unit)
       values ($1, $2, $3, $4, $5, $6)
       returning id, organization_id "organizationId", name, season,
                 timezone, unit, status, revision, created_at "createdAt"`,
      [
        randomUUID(),
        organizationId,
        input.name,
        input.season,
        input.timezone,
        input.unit,
      ],
    );
    return result.rows[0];
  }

  async close() {
    await this.pool.end();
  }
}
