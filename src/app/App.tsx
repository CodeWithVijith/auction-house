import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { Trophy, Upload, Settings as SettingsIcon } from 'lucide-react';
import type { Command, Snapshot } from '../domain/types';
import { repository, ConflictError } from '../persistence/repository';
import { Context } from './context';
import { Asset } from './components';
import { Auction } from './Auction';
const ImportPlayers = lazy(() =>
  import('./ImportPlayers').then((m) => ({ default: m.ImportPlayers })),
);
const Teams = lazy(() =>
  import('./Management').then((m) => ({ default: m.Teams })),
);
const Players = lazy(() =>
  import('./Management').then((m) => ({ default: m.Players })),
);
const Results = lazy(() =>
  import('./Management').then((m) => ({ default: m.Results })),
);
const Unsold = lazy(() =>
  import('./Management').then((m) => ({ default: m.Unsold })),
);
const Settings = lazy(() =>
  import('./Management').then((m) => ({ default: m.Settings })),
);
export function App() {
  const [s, setS] = useState<Snapshot | null>(null),
    [error, setError] = useState(''),
    [fatal, setFatal] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [syncEpoch, setSyncEpoch] = useState(0);
  const lock = useRef(false),
    current = useRef(s);
  current.current = s;
  const channel = useRef<BroadcastChannel | null>(null),
    location = useLocation();
  const load = useCallback(async () => {
    try {
      const next = await repository.load();
      if (
        current.current &&
        (current.current.revision !== next.revision ||
          current.current.id !== next.id)
      )
        setSyncEpoch((v) => v + 1);
      setS(next);
    } catch (e) {
      setFatal(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    let legacy: string | null = null;
    try {
      legacy = localStorage.getItem('auction-house-premium-v1');
    } catch {
      /* IndexedDB may remain available. */
    }
    repository
      .initialize(legacy)
      .then(setS)
      .catch((e) =>
        setFatal(
          'Could not load this auction. Saved data has been preserved. ' +
            String(e),
        ),
      );
    const c = new BroadcastChannel('auction-house-changes');
    channel.current = c;
    c.onmessage = () => {
      void load();
      setMessage('Auction updated in another tab. Review the latest state.');
    };
    const focus = () => {
      if (!lock.current) void load();
    };
    window.addEventListener('focus', focus);
    return () => {
      c.close();
      window.removeEventListener('focus', focus);
    };
  }, [load]);
  useEffect(() => {
    setError('');
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const run = useCallback(
    async (command: Command) => {
      if (lock.current) throw Error('A save is already in progress.');
      if (!current.current) throw Error('Auction is loading.');
      lock.current = true;
      setBusy(true);
      setError('');
      try {
        const next = await repository.execute(
          command,
          current.current.revision,
        );
        current.current = next;
        setS(next);
        channel.current?.postMessage(next.revision);
        return next;
      } catch (e) {
        if (e instanceof ConflictError) await load();
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [load],
  );
  if (fatal)
    return (
      <main className="storage-error">
        <Trophy />
        <h1>Saved auction needs attention</h1>
        <p role="alert">{fatal}</p>
        <p>
          Check browser storage permissions and available disk space. The
          previous local-storage copy is retained. No sample data has replaced
          your saved event.
        </p>
        <button onClick={() => window.location.reload()}>Retry loading</button>
      </main>
    );
  if (!s)
    return (
      <main className="storage-error" role="status">
        Loading your auction…
      </main>
    );
  return (
    <Context.Provider value={{ s, busy, syncEpoch, run, notify: setMessage }}>
      <div className="app">
        <header>
          <NavLink className="brand" to="/auction">
            <span className="brand-logo">
              <Asset
                id={s.eventLogoAssetId}
                alt="Event logo"
                fallback={<Trophy size={30} />}
              />
            </span>
            <span>
              <strong>{s.eventName}</strong>
              <small>THE PLAYER AUCTION EXPERIENCE</small>
            </span>
          </NavLink>
          <nav aria-label="Main navigation">
            {['Auction', 'Teams', 'Players', 'Unsold', 'Results'].map((n) => (
              <NavLink key={n} to={'/' + n.toLowerCase()}>
                {n}
              </NavLink>
            ))}
          </nav>
          <div className="utilities">
            <NavLink to="/import" aria-label="Import players">
              <Upload size={19} />
            </NavLink>
            <NavLink to="/settings" aria-label="Settings">
              <SettingsIcon size={19} />
            </NavLink>
          </div>
        </header>
        <div className="notice sr-only" role="status" aria-live="polite">
          {message ||
            `${s.isSample ? 'Sample workspace · ' : ''}Saved on this browser · ${s.unit === 'INR' ? 'Indian rupees' : 'Auction points'}`}
        </div>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <Suspense
          fallback={
            <main className="page" role="status">
              Loading screen…
            </main>
          }
        >
          <Routes>
            <Route path="/" element={<Navigate to="/auction" replace />} />
            <Route path="/auction" element={<Auction />} />
            <Route path="/import" element={<ImportPlayers />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/players" element={<Players />} />
            <Route path="/unsold" element={<Unsold />} />
            <Route path="/results" element={<Results />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/auction" replace />} />
          </Routes>
        </Suspense>
        <footer>
          <span>
            AUCTION HOUSE <i> A fair chance. A stronger squad.</i>
          </span>
          <span>
            {s.isSample ? 'Sample workspace · ' : ''}Browser-local event · No
            cloud sync
          </span>
        </footer>
      </div>
    </Context.Provider>
  );
}
