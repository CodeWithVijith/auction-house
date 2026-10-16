export type Unit = 'POINTS' | 'INR';
export interface Player {
  id: string;
  registrationCode: string;
  name: string;
  role: string;
  category: string;
  age?: number;
  city: string;
  photoUrl: string;
  sourceRow?: number;
}
export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  logoAssetId?: string;
  startingBudgets: Record<Unit, number>;
  maxPlayers: number;
}
export interface Round {
  id: string;
  number: number;
  kind: 'MAIN' | 'UNSOLD';
  status: 'READY' | 'ACTIVE' | 'COMPLETED';
  eligiblePlayerIds: string[];
  startedAt?: string;
  completedAt?: string;
}
export interface Selection {
  id: string;
  roundId: string;
  playerId: string;
  selectedAt: string;
}
export interface Outcome {
  id: string;
  roundId: string;
  playerId: string;
  selectionId: string;
  status: 'SOLD' | 'UNSOLD';
  teamId: string | null;
  amountMinor: number | null;
  unit: Unit;
  sequence: number;
  completedAt: string;
  playerNameAtTime: string;
  teamNameAtTime: string | null;
}
export interface Correction {
  id: string;
  targetOutcomeId: string;
  previousTeamId: string;
  previousAmountMinor: number;
  nextTeamId: string;
  nextAmountMinor: number;
  reason: string;
  sequence: number;
  correctedAt: string;
  previousTeamNameAtTime: string;
  nextTeamNameAtTime: string;
}
export interface Snapshot {
  schemaVersion: 3;
  id: string;
  revision: number;
  eventName: string;
  season: string;
  eventLogoAssetId?: string;
  unit: Unit;
  configurationLocked: boolean;
  isSample: boolean;
  players: Player[];
  teams: Team[];
  rounds: Round[];
  currentRoundId: string | null;
  currentSelection: Selection | null;
  outcomes: Outcome[];
  corrections: Correction[];
  preferences: {
    autoNext: boolean;
    showPhoto: boolean;
    showAge: boolean;
    showCity: boolean;
  };
  importMetadata?: {
    fileName: string;
    importedAt: string;
    mapping: Record<string, string>;
  };
}
export type Command =
  | { type: 'select' }
  | {
      type: 'outcome';
      selectionId: string;
      status: 'SOLD' | 'UNSOLD';
      teamId?: string;
      amount?: string;
    }
  | { type: 'retry' }
  | {
      type: 'correct';
      outcomeId: string;
      teamId: string;
      amount: string;
      reason: string;
    }
  | { type: 'team'; team: Team }
  | { type: 'deleteTeam'; id: string }
  | { type: 'player'; player: Player }
  | { type: 'deletePlayer'; id: string }
  | {
      type: 'import';
      players: Player[];
      metadata: NonNullable<Snapshot['importMetadata']>;
    }
  | {
      type: 'settings';
      eventName: string;
      season: string;
      unit: Unit;
      eventLogoAssetId?: string;
      preferences: Snapshot['preferences'];
    }
  | { type: 'reset'; sample: boolean };
