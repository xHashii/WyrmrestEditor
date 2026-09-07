/** Load a complete (entryorguid, source_type) script, not a random table row. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { useStore } from '../../store';
import { Modal } from '../Modal';
import { parseCellValue } from '../../../shared/values';
import type { SmartScriptSummary } from '../../../shared/types';

interface Props {
  onClose?(): void;
  suggest?: { entryorguid: string; sourceType: number } | null;
  variant?: 'modal' | 'inline';
}

export function ScriptPickerList({ onClose, suggest, variant = 'inline' }: Props) {
  const { smartData, smart, meta, selectScript, sourceToken } = useStore();
  const [term, setTerm] = useState(suggest ? String(suggest.entryorguid) : '');
  const [sourceType, setSourceType] = useState<number | ''>(suggest?.sourceType ?? '');
  const [items, setItems] = useState<SmartScriptSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState('');
  const [entryKind, setEntryKind] = useState(suggest?.sourceType ?? 0);
  const [entryError, setEntryError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const token = useRef(0);

  const load = useCallback(async (search: string, kind: number | '') => {
    const myToken = ++token.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.smartScripts({ search: search.trim() || undefined, sourceType: kind === '' ? undefined : kind, limit: 60 });
      if (token.current !== myToken) return;
      setItems(result);
    } catch (err) {
      if (token.current !== myToken) return;
      setError((err as Error).message);
      setItems([]);
    } finally {
      if (token.current === myToken) setLoading(false);
    }
  }, []);

  useEffect(() => {
    ++token.current;
    setLoading(true);
    setItems(null);
    timer.current = setTimeout(() => void load(term, sourceType), 250);
    return () => { clearTimeout(timer.current); ++token.current; };
  }, [term, sourceType, sourceToken, load]);

  const open = async (id: string, kind: number, subject?: string | null) => {
    if (opening) return;
    setOpening(true);
    const ok = await selectScript(id, kind, subject);
    if (ok) onClose?.();
    setOpening(false);
  };
  const openEntry = () => {
    try {
      const column = meta?.columns.find((column) => column.name === 'entryorguid');
      if (!column) throw new Error('SmartAI metadata is not ready. Please retry.');
      const id = parseCellValue(column, entry);
      if (id == null || BigInt(String(id)) === 0n) throw new Error('Enter a non-zero entry ID, or a negative spawn GUID.');
      setEntryError(null);
      void open(String(id), entryKind);
    } catch (err) { setEntryError((err as Error).message); }
  };

  const kinds = smartData?.sourceTypes ?? [];
  const body = <>
    <form className="script-direct" onSubmit={(event) => { event.preventDefault(); openEntry(); }}>
      <div className="script-direct-heading"><strong>Open by ID</strong><span className="muted small">Existing or new script — nothing is staged just by opening it.</span></div>
      <label className="field-label">Script type<select aria-label="Script type to open" value={entryKind} onChange={(event) => setEntryKind(Number(event.target.value))} disabled={opening}>
        {kinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.name}</option>)}
      </select><span className="selected-option">{kinds.find((kind) => kind.value === entryKind)?.name}</span></label>
      <label className="field-label">Entry ID / GUID<input aria-label="Entry ID or GUID" placeholder="e.g. 448" value={entry} inputMode="text" disabled={opening}
        aria-invalid={Boolean(entryError)} aria-describedby="script-entry-hint" onChange={(event) => { setEntry(event.target.value); setEntryError(null); }} /></label>
      <button type="submit" className="btn btn-accent" disabled={opening || !entry.trim()}>{opening ? 'Opening…' : 'Load script'}</button>
      <p id="script-entry-hint" className="muted small">Use a negative ID for a creature or game object spawn GUID. Timed action lists use their own ID.</p>
      {entryError && <p className="error-box" role="alert">{entryError}</p>}
    </form>

    <div className="script-search-heading"><h3>Find an existing script</h3><span className="muted small">Search by name or entry ID</span></div>
    <div className="picker-controls">
      <input className="search" autoFocus placeholder="Try Hogger, Fireball or an entry ID…"
        aria-label="Search scripts by name or entry" value={term} onChange={(event) => { ++token.current; setTerm(event.target.value); }}
        onKeyDown={(event) => { if (event.key === 'Enter') { clearTimeout(timer.current); void load(term, sourceType); } }} />
      <label className="script-kind-filter"><select aria-label="Script kind" value={sourceType === '' ? '' : String(sourceType)} onChange={(event) => { ++token.current; setSourceType(event.target.value === '' ? '' : Number(event.target.value)); }}>
        <option value="">All kinds</option>{kinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.name}</option>)}
      </select>{sourceType !== '' && <span className="selected-option">{kinds.find((kind) => kind.value === sourceType)?.name}</span>}</label>
    </div>
    {error && <div className="error-box" role="alert">{error}<button className="btn btn-ghost" onClick={() => void load(term, sourceType)}>Retry script search</button></div>}
    <div className="script-list" aria-live="polite" aria-busy={loading || opening}>
      {loading && <p className="muted"><span className="spinner" /> Looking for scripts…</p>}
      {items?.length === 0 && !loading && !error && <p className="muted">No existing script matches. Try a different name, clear the kind filter, or open an ID above to start a new script.</p>}
      {!loading && items?.map((item) => {
        const current = String(item.entryorguid) === String(smart.entryorguid) && item.sourceType === smart.sourceType;
        return <button key={`${item.entryorguid}:${item.sourceType}`} className={`script-item ${current ? 'on' : ''}`} disabled={opening}
          onClick={() => void open(String(item.entryorguid), item.sourceType, item.nameResolved ? item.name : null)}>
          <span className="script-name">{item.name ?? `Entry ${item.entryorguid}`}{item.name && !item.nameResolved && <span className="tag tag-warn tag-mini">id only</span>}</span>
          <span className="script-kind">{item.kind ?? `source_type ${item.sourceType}`}</span>
          <span className="script-count">{item.events} event{item.events === 1 ? '' : 's'}</span>
          <span className="script-rows">{item.rows} row{item.rows === 1 ? '' : 's'}</span>
          <code className="script-entry">entryorguid {String(item.entryorguid)} · type {item.sourceType}</code>
        </button>;
      })}
    </div>
    {items?.length === 60 && !loading && <p className="muted small">Showing the first 60 matches. Refine the name or kind to find your script.</p>}
  </>;

  if (variant === 'modal') return <Modal label="Choose a script to edit" className="modal wide script-picker" onClose={() => onClose?.()} busy={opening}>
    <header className="modal-head"><div><h2>Choose a script</h2><p className="muted small">Load every row sharing an entryorguid and source_type.</p></div>
      <button className="btn btn-ghost" aria-label="Close script picker" disabled={opening} onClick={() => onClose?.()}>✕</button></header>
    {body}
  </Modal>;
  return <div className="script-picker inline">{body}</div>;
}

export function ScriptPicker({ onClose, suggest }: Props) {
  return <ScriptPickerList onClose={onClose} suggest={suggest} variant="modal" />;
}
