export type Role = 'ADMIN' | 'ORGANIZER' | 'OPERATOR' | 'VIEWER';

export interface Principal {
  userId: string;
  email: string;
  displayName: string;
  organizationId: string;
  organizationName: string;
  role: Role;
  csrfToken: string;
}

export interface Session extends Principal {
  id: string;
  expiresAt: Date;
}

export interface EventRecord {
  id: string;
  organizationId: string;
  name: string;
  season: string;
  timezone: string;
  unit: 'INR' | 'POINTS';
  status: 'DRAFT' | 'READY' | 'LIVE' | 'COMPLETE' | 'ARCHIVED';
  revision: number;
  createdAt: string;
}

export interface Store {
  authenticate(email: string, password: string): Promise<Principal | null>;
  createSession(principal: Principal, expiresAt: Date): Promise<Session>;
  findSession(id: string): Promise<Session | null>;
  deleteSession(id: string): Promise<void>;
  listEvents(organizationId: string): Promise<EventRecord[]>;
  createEvent(
    organizationId: string,
    input: Pick<EventRecord, 'name' | 'season' | 'timezone' | 'unit'>,
  ): Promise<EventRecord>;
  close(): Promise<void>;
}
