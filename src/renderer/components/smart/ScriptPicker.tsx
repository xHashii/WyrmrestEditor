/**
 * Script picker: which (entryorguid, source_type) pair to edit.
 *
 * `smart_scripts` holds tens of thousands of rows across a dozen kinds of
 * scripter, so the useful question is never "which row" but "which creature /
 * gameobject / quest am I scripting". This resolves names, so typing "Hogger"
 * finds entry 448.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { useStore } from '../../store';
import { Modal } from '../Modal';
import type { SmartScriptSummary } from '../../../shared/types';

interface Props {
  /** Close after a choice; the inline variant keeps itself open. */
  onClose?(): void;
  /** Pre-fill the search with the id of the row selected in the grid. */
  suggest?: { entryorguid: string; sourceType: number } | null;
  variant?: 'modal' | 'inline';
}

export function ScriptPickerList({ onClose, suggest, variant = 'inline' }: Props) {
  const smartData = useStore((state) => state.smartData);
  const selectScript = useStore((state) => state.selectScript);
  const smart = useStore((state) => state.smart);
  const [term, setTerm] = useState(suggest ? String(suggest.entryorguid) : '');
  const [sourceType, setSourceType] = useState<number | ''>(suggest?.sourceType ?? '');
  const [items, setItems] = useState<SmartScriptSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(term, sourceType), 250);
    return () => clearTimeout(timer.current);
  }, [term, sourceType, load]);

  const pick = (item: SmartScriptSummary) => {
    void selectScript(String(item.entryorguid), item.sourceType, item.name).then(() => onClose?.());
  };

  const kinds = smartData?.sourceTypes ?? [];
  const body = (
    <>
      <div className="picker-controls">
        <input className="search" autoFocus placeholder="Creature, object or quest name — or the entry id…"
          aria-label="Search scripts by name or entry" value={term} onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { clearTimeout(timer.current); void load(term, sourceType); } }} />
        <select aria-label="Script kind" value={sourceType === '' ? '' : String(sourceType)} onChange={(event) => setSourceType(event.target.value === '' ? '' : Number(event.target.value))}>
          <option value="">All kinds</option>
          {kinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.name}</option>)}
        </select>
      </div>
      {error && <div className="error-box" role="alert">{error}<button className="btn btn-ghost btn-mini" onClick={() => void load(term, sourceType)}>Retry</button></div>}
      <div className="script-list" aria-live="polite" aria-busy={loading}>
        {loading && !items?.length && <p className="muted"><span className="spinner" /> Looking for scripts…</p>}
        {items?.length === 0 && !loading && <p className="muted">No script matches. Type a name (for example <em>Hogger</em>) or an entry id — a script exists only if some row uses it.</p>}
        {items?.map((item) => {
          const current = String(item.entryorguid) === String(smart.entryorguid) && item.sourceType === smart.sourceType;
          return (
            <button key={`${item.entryorguid}:${item.sourceType}`} className={`script-item ${current ? 'on' : ''}`} onClick={() => pick(item)}
              title={`${item.name ?? `#${item.entryorguid}`} — ${item.kind ?? 'script'} · ${item.rows} row${item.rows === 1 ? '' : 's'}`}>
              <span className="script-name">
                {item.name ?? <span className="muted">entry {String(item.entryorguid)}</span>}
                {item.name && !item.nameResolved && <span className="tag tag-warn tag-mini">id only</span>}
              </span>
              <span className="script-kind">{item.kind ?? `source_type ${item.sourceType}`}</span>
              <span className="script-count">{item.events} event{item.events === 1 ? '' : 's'}</span>
              <span className="script-rows">{item.rows} row{item.rows === 1 ? '' : 's'}</span>
              <code className="script-entry">entryorguid {String(item.entryorguid)} · type {item.sourceType}</code>
            </button>
          );
        })}
      </div>
    </>
  );

  if (variant === 'modal') {
    return (
      <Modal label="Choose a script to edit" className="modal wide script-picker" onClose={() => onClose?.()}>
        <header className="modal-head"><h2>Choose a script</h2><p className="muted small">One script is every row that shares an entryorguid and source_type.</p>
          <button className="btn btn-ghost" aria-label="Close script picker" onClick={() => onClose?.()}>✕</button></header>
        {body}
      </Modal>
    );
  }
  return <div className="script-picker inline">{body}</div>;
}

export function ScriptPicker({ onClose, suggest }: Props) {
  return <ScriptPickerList onClose={onClose} suggest={suggest} variant="modal" />;
}
