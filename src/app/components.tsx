import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { X, Trophy, UserRound } from 'lucide-react';
import { repository } from '../persistence/repository';
import type { Player, Team } from '../domain/types';
import { useAuction } from './context';
export function Asset({
  id,
  alt,
  fallback,
}: {
  id?: string;
  alt: string;
  fallback: ReactNode;
}) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true,
      objectUrl = '';
    setUrl('');
    if (id)
      repository
        .asset(id)
        .then((blob) => {
          if (blob && active) {
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
          }
        })
        .catch(() => {});
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return url ? (
    <img src={url} alt={alt} onError={() => setUrl('')} />
  ) : (
    <>{fallback}</>
  );
}
export function Mark({ team }: { team: Team }) {
  return (
    <span className="team-mark" style={{ background: team.color }}>
      <Asset
        id={team.logoAssetId}
        alt={`${team.name} logo`}
        fallback={team.shortName}
      />
    </span>
  );
}
export function Portrait({ player }: { player: Player }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [player.photoUrl]);
  return (
    <div className="portrait">
      {player.photoUrl && !failed ? (
        <img
          src={player.photoUrl}
          referrerPolicy="no-referrer"
          alt={player.name}
          onError={() => setFailed(true)}
        />
      ) : (
        <UserRound size={72} aria-label="Player avatar" />
      )}
    </div>
  );
}
export function Emblem() {
  return (
    <div className="emblem">
      <Trophy size={58} strokeWidth={1} />
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const child = children as ReactElement<{ 'aria-label'?: string }>;
  return (
    <label className="field">
      <span>{label}</span>
      {isValidElement(children)
        ? cloneElement(child, {
            'aria-label': child.props['aria-label'] ?? label,
          })
        : children}
    </label>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { busy } = useAuction();
  useEffect(() => {
    const d = ref.current!,
      previous = document.activeElement as HTMLElement;
    d.showModal();
    return () => {
      d.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          aria-label="Close dialog"
          className="icon-button"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  children,
  onClose,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => Promise<unknown>;
}) {
  const { busy } = useAuction();
  const [error, setError] = useState('');
  return (
    <Dialog title={title} onClose={onClose}>
      <div className="dialog-body">
        {children}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
      <div className="actions">
        <button disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            try {
              await onConfirm();
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          {busy ? 'Saving…' : 'Confirm'}
        </button>
      </div>
    </Dialog>
  );
}
export function ErrorText({ error }: { error: string }) {
  return error ? (
    <p className="error" role="alert">
      {error}
    </p>
  ) : null;
}
