import cookie from '@fastify/cookie';
import staticFiles from '@fastify/static';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Principal, Store } from './types';

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(1024),
});
const eventSchema = z.object({
  name: z.string().trim().min(1).max(120),
  season: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(80).default('Asia/Calcutta'),
  unit: z.enum(['INR', 'POINTS']),
});

declare module 'fastify' {
  interface FastifyRequest {
    principal?: Principal;
    sessionId?: string;
  }
}

export function buildApi(
  store: Store,
  options?: { secureCookies?: boolean; staticDirectory?: string },
) {
  const api = Fastify({ logger: false, bodyLimit: 1_048_576 });
  api.register(cookie);
  if (options?.staticDirectory)
    api.register(staticFiles, {
      root: options.staticDirectory,
      wildcard: false,
    });

  api.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError)
      return reply
        .code(400)
        .send({ error: 'INVALID_REQUEST', issues: error.issues });
    api.log.error(error);
    return reply.code(500).send({ error: 'INTERNAL_ERROR' });
  });

  async function requireSession(request: FastifyRequest, reply: FastifyReply) {
    const id = request.cookies.auction_session;
    if (!id) return reply.code(401).send({ error: 'AUTH_REQUIRED' });
    const session = await store.findSession(id);
    if (!session) {
      reply.clearCookie('auction_session', { path: '/' });
      return reply.code(401).send({ error: 'AUTH_REQUIRED' });
    }
    request.sessionId = session.id;
    request.principal = session;
  }

  async function requireCsrf(request: FastifyRequest, reply: FastifyReply) {
    await requireSession(request, reply);
    if (reply.sent) return;
    if (request.headers['x-csrf-token'] !== request.principal?.csrfToken)
      return reply.code(403).send({ error: 'CSRF_FAILED' });
  }

  async function requireOrganizer(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    await requireCsrf(request, reply);
    if (reply.sent) return;
    if (!['ADMIN', 'ORGANIZER'].includes(request.principal!.role))
      return reply.code(403).send({ error: 'FORBIDDEN' });
  }

  api.get('/api/health', async () => ({ status: 'ok' }));

  api.post('/api/auth/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const principal = await store.authenticate(input.email, input.password);
    if (!principal)
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS' });
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const session = await store.createSession(principal, expiresAt);
    reply.setCookie('auction_session', session.id, {
      httpOnly: true,
      sameSite: 'strict',
      secure: options?.secureCookies ?? process.env.NODE_ENV === 'production',
      path: '/',
      expires: expiresAt,
    });
    return reply.send({ user: principal });
  });

  api.post(
    '/api/auth/logout',
    { preHandler: requireCsrf },
    async (request, reply) => {
      await store.deleteSession(request.sessionId!);
      reply.clearCookie('auction_session', { path: '/' });
      return reply.code(204).send();
    },
  );

  api.get('/api/auth/me', { preHandler: requireSession }, async (request) => ({
    user: request.principal,
  }));

  api.get('/api/events', { preHandler: requireSession }, async (request) => ({
    events: await store.listEvents(request.principal!.organizationId),
  }));

  api.post(
    '/api/events',
    { preHandler: requireOrganizer },
    async (request, reply) => {
      const input = eventSchema.parse(request.body);
      const event = await store.createEvent(
        request.principal!.organizationId,
        input,
      );
      return reply.code(201).send({ event });
    },
  );

  if (options?.staticDirectory) {
    api.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/'))
        return reply.code(404).send({ error: 'NOT_FOUND' });
      return reply.type('text/html').sendFile('index.html');
    });
  }

  api.addHook('onClose', async () => store.close());
  return api;
}
