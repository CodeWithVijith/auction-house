import { createContext, useContext } from 'react';
import type { Command, Snapshot } from '../domain/types';
export interface AuctionContext {
  s: Snapshot;
  busy: boolean;
  syncEpoch: number;
  run: (command: Command) => Promise<Snapshot>;
  notify: (message: string) => void;
}
export const Context = createContext<AuctionContext | null>(null);
export function useAuction() {
  const c = useContext(Context);
  if (!c) throw Error('Missing auction context');
  return c;
}
