import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildApi } from '../../server/app';
import type {
  EventRecord,
  Principal,
  Session,
  Store,
} from '../../server/types';

class MemoryStore implements Store {
  sessions = new Map<string, Session>();
  events: EventRecord[] = [];
  principal: Principal = {
    userId: 'user-1',
    email: 'admin@example.com',
    displayName: 'Admin',
    organizationId: 'org-1',
    organizationName: 'Premier League',
    role: 'ADMIN',
    csrfToken: 'csrf-token',
  };

  async authenticate(email: string, password: string) {
    return email === this.principal.email && password === 'correct-password'
      ? this.principal
      : null;
  }
  async createSession(principal: Principal, expiresAt: Date) {
    const session = { ...principal, id: randomUUID(), expiresAt };
    this.sessions.set(session.id, session);
    return session;
  }
  async findSession(id: string) {
    return this.sessions.get(id) ?? null;
  }
  async deleteSession(id: string) {
    this.sessions.delete(id);
  }
  async listEvents(organizationId: string) {
    return this.events.filter(
      (event) => event.organizationId === organizationId,
    );
  }
  async createEvent(
    organizationId: string,
    input: Pick<EventRecord, 'name' | 'season' | 'timezone' | 'unit'>,
  ) {
    const event: EventRecord = {
      ...input,
      id: randomUUID(),
      organizationId,
      status: 'DRAFT',
      revision: 0,
      createdAt: new Date().toISOString(),
    };
    this.events.push(event);
    return event;
  }
  async close() {}
}

function sessionCookie(response: { headers: Record<string, unknown> }) {
  return String(response.headers['set-cookie']).split(';', 1)[0];
}

describe('production API foundation', () => {
  it('serves the built SPA and preserves direct routes', async () => {
    const api = buildApi(new MemoryStore(), {
      secureCookies: false,
      staticDirectory: join(process.cwd(), 'dist'),
    });
    const home = await api.inject({ method: 'GET', url: '/' });
    const directRoute = await api.inject({ method: 'GET', url: '/teams' });
    expect(home.statusCode).toBe(200);
    expect(home.headers['content-type']).toContain('text/html');
    expect(directRoute.statusCode).toBe(200);
    expect(directRoute.body).toContain('<div id="root"></div>');
    expect(
      (await api.inject({ method: 'GET', url: '/api/missing' })).statusCode,
    ).toBe(404);
    await api.close();
  });

  it('protects organization event data and validates login', async () => {
    const api = buildApi(new MemoryStore(), { secureCookies: false });
    expect(
      (await api.inject({ method: 'GET', url: '/api/health' })).statusCode,
    ).toBe(200);
    expect(
      (await api.inject({ method: 'GET', url: '/api/events' })).statusCode,
    ).toBe(401);
    expect(
      (
        await api.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { email: 'admin@example.com', password: 'wrong-pass' },
        })
      ).statusCode,
    ).toBe(401);
    await api.close();
  });

  it('creates and lists an organization-scoped event with CSRF protection', async () => {
    const store = new MemoryStore();
    const api = buildApi(store, { secureCookies: false });
    const login = await api.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@example.com', password: 'correct-password' },
    });
    expect(login.statusCode).toBe(200);
    const cookie = sessionCookie(login);
    const payload = {
      name: 'Premier League 2026',
      season: '2026',
      timezone: 'Asia/Calcutta',
      unit: 'INR',
    };
    expect(
      (
        await api.inject({
          method: 'POST',
          url: '/api/events',
          headers: { cookie },
          payload,
        })
      ).statusCode,
    ).toBe(403);
    const created = await api.inject({
      method: 'POST',
      url: '/api/events',
      headers: { cookie, 'x-csrf-token': 'csrf-token' },
      payload,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().event).toMatchObject({
      name: payload.name,
      organizationId: 'org-1',
      status: 'DRAFT',
    });
    const listed = await api.inject({
      method: 'GET',
      url: '/api/events',
      headers: { cookie },
    });
    expect(listed.json().events).toHaveLength(1);
    await api.close();
  });

  it('enforces organizer role and destroys sessions on logout', async () => {
    const store = new MemoryStore();
    store.principal.role = 'VIEWER';
    const api = buildApi(store, { secureCookies: false });
    const login = await api.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@example.com', password: 'correct-password' },
    });
    const cookie = sessionCookie(login);
    expect(
      (
        await api.inject({
          method: 'POST',
          url: '/api/events',
          headers: { cookie, 'x-csrf-token': 'csrf-token' },
          payload: {
            name: 'Blocked',
            season: '2026',
            timezone: 'UTC',
            unit: 'POINTS',
          },
        })
      ).statusCode,
    ).toBe(403);
    const logout = await api.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie, 'x-csrf-token': 'csrf-token' },
    });
    expect(logout.statusCode).toBe(204);
    expect(
      (
        await api.inject({
          method: 'GET',
          url: '/api/auth/me',
          headers: { cookie },
        })
      ).statusCode,
    ).toBe(401);
    await api.close();
  });
});
