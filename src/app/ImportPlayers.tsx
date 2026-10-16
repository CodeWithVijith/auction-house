import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { useAuction } from './context';
import { Confirm, ErrorText, Field } from './components';
import {
  fields,
  normalizeRows,
  readUpload,
  suggestMapping,
  type Mapping,
  type Sheet,
} from '../services/spreadsheet';
export function ImportPlayers() {
  const { s, run, busy, notify } = useAuction(),
    navigate = useNavigate();
  const [sheets, setSheets] = useState<Sheet[]>([]),
    [index, setIndex] = useState(0),
    [header, setHeader] = useState(0),
    [mapping, setMapping] = useState<Mapping>({
      registrationCode: '',
      name: '',
      role: '',
      category: '',
      age: '',
      city: '',
      photoUrl: '',
    }),
    [fileName, setFileName] = useState(''),
    [error, setError] = useState(''),
    [reading, setReading] = useState(false),
    [confirm, setConfirm] = useState(false);
  const sheet = sheets[index],
    headers = (sheet?.rows[header] ?? []).map((v) => String(v).trim());
  const preview = useMemo(
    () => (sheet ? normalizeRows(sheet, header, mapping) : null),
    [sheet, header, mapping],
  );
  const locked = !!s.outcomes.length || !!s.currentSelection;
  function chooseSheet(i: number) {
    const next = sheets[i];
    const h = Math.max(
      0,
      next.rows.findIndex((r) => r.some((v) => String(v).trim())),
    );
    setIndex(i);
    setHeader(h);
    setMapping(suggestMapping((next.rows[h] ?? []).map(String)));
  }
  async function upload(file?: File) {
    if (!file || locked) return;
    setReading(true);
    setError('');
    try {
      const next = await readUpload(file);
      const i = next.findIndex((s) =>
        s.rows.some((r) => r.some((v) => String(v).trim())),
      );
      const h = next[i].rows.findIndex((r) => r.some((v) => String(v).trim()));
      setSheets(next);
      setIndex(i);
      setHeader(h);
      setMapping(suggestMapping(next[i].rows[h].map((v) => String(v).trim())));
      setFileName(file.name);
    } catch (e) {
      setSheets([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReading(false);
    }
  }
  async function save() {
    if (!preview || preview.errors.length)
      throw Error('Fix all mapping and row errors before importing.');
    await run({
      type: 'import',
      players: preview.players,
      metadata: { fileName, importedAt: new Date().toISOString(), mapping },
    });
    setSheets([]);
    notify(
      `${preview.players.length} players imported. Unmapped registration data was discarded.`,
    );
    navigate('/teams');
  }
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">REGISTRATION / IMPORT</p>
          <h1>Bring your players to the stage.</h1>
          <p>
            Upload your Google Forms download. Keep only the fields your auction
            needs.
          </p>
        </div>
        <a
          className="button"
          href="/samples/player-registrations.xlsx"
          download
        >
          Sample Excel
        </a>
        <a className="button" href="/samples/player-registrations.csv" download>
          Sample CSV
        </a>
      </div>
      {locked ? (
        <section className="panel">
          <h2>Roster is locked</h2>
          <p>
            Complete the selected player first. After any result, roster
            replacement requires a new event.
          </p>
          <Link to="/players">Manage permitted profile edits →</Link>
        </section>
      ) : (
        <>
          <section className="panel">
            <label
              className="upload-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void upload(e.dataTransfer.files[0]);
              }}
            >
              <Upload size={36} />
              <strong>
                {reading
                  ? 'Reading workbook…'
                  : fileName || 'Choose or drop a registration file'}
              </strong>
              <span>XLSX or UTF-8 CSV · Up to 8 MB · 1,000 players</span>
              <input
                type="file"
                accept=".xlsx,.csv"
                aria-label="Registration file"
                disabled={reading || busy}
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
            <ErrorText error={error} />
          </section>
          {sheet && preview && (
            <>
              <section className="panel">
                <h2>
                  <FileSpreadsheet size={22} /> Map registration fields
                </h2>
                <div className="form-grid">
                  <Field label="Worksheet">
                    <select
                      value={index}
                      onChange={(e) => chooseSheet(Number(e.target.value))}
                    >
                      {sheets.map((v, i) => (
                        <option key={v.name} value={i}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Header row">
                    <input
                      type="number"
                      min={1}
                      max={sheet.rows.length}
                      value={header + 1}
                      onChange={(e) => {
                        const h = Math.max(
                          0,
                          Math.min(
                            sheet.rows.length - 1,
                            Number(e.target.value) - 1,
                          ),
                        );
                        setHeader(h);
                        setMapping(
                          suggestMapping(
                            (sheet.rows[h] ?? []).map((v) => String(v).trim()),
                          ),
                        );
                      }}
                    />
                  </Field>
                </div>
                <div className="header-preview">
                  <strong>Header preview:</strong> {headers.join(' · ')}
                </div>
                <div className="form-grid">
                  {fields.map((f) => (
                    <Field
                      key={f}
                      label={
                        f === 'name'
                          ? 'Player name *'
                          : f.replace(/([A-Z])/g, ' $1')
                      }
                    >
                      <select
                        value={mapping[f]}
                        onChange={(e) =>
                          setMapping({ ...mapping, [f]: e.target.value })
                        }
                      >
                        <option value="">Not imported</option>
                        {headers.filter(Boolean).map((h, i) => (
                          <option key={i} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
                <p className="privacy">
                  Excluded columns: {preview.excluded.join(', ') || 'none'}.
                  Excluded values will never be saved.
                </p>
              </section>
              <section className="panel">
                <h2>Mapped preview</h2>
                <p>
                  {preview.players.length} player rows · {preview.errors.length}{' '}
                  validation errors
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Source row</th>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Age</th>
                        <th>City</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.players.slice(0, 10).map((p) => (
                        <tr key={p.id}>
                          <td>{p.sourceRow}</td>
                          <td>{p.registrationCode}</td>
                          <td>{p.name}</td>
                          <td>{p.role}</td>
                          <td>{p.age ?? '—'}</td>
                          <td>{p.city}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.errors.length > 0 && (
                  <div className="error" role="alert">
                    <p>
                      Correct all errors before importing. No partial roster
                      will be saved.
                    </p>
                    <ul>
                      {preview.errors.slice(0, 25).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                    {preview.errors.length > 25 && (
                      <p>{preview.errors.length - 25} more errors.</p>
                    )}
                  </div>
                )}
                <button
                  className="primary"
                  disabled={busy || reading || !!preview.errors.length}
                  onClick={() => setConfirm(true)}
                >
                  Confirm import
                </button>
              </section>
            </>
          )}
          {confirm && preview && (
            <Confirm
              title="Replace the player roster?"
              onClose={() => setConfirm(false)}
              onConfirm={save}
            >
              <p>
                The existing {s.players.length} players will be replaced with{' '}
                {preview.players.length} validated players from {fileName}.
                Teams and budgets stay in place. Only mapped profile fields are
                retained.
              </p>
            </Confirm>
          )}
        </>
      )}
    </main>
  );
}
