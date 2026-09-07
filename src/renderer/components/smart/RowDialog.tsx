/**
 * One row of a SmartAI script, edited as a row instead of 30 columns.
 *
 * The dialog is deliberately the only place that knows about the columns a
 * definition uses: it edits a draft (`column -> value`), shows the sentence the
 * core would produce for it, and hands a flat patch back to the store, which
 * turns it into a single staged change. Nothing is written to the database here.
 */
import { useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { FlagsEditor } from '../FlagsEditor';
import { DefinitionPicker, ParamField } from './pickers';
import { clearedParamValues, difficultyLabel, formatDifficulties, parseDifficulties, supportedParams } from './helpers';
import { useStore } from '../../store';
import { describeSmartSource, displayParam, smartSourceFor, suggestComment } from '../../../shared/smart';
import type { SmartDef, SmartDescriptionContext, SmartRow, SmartSource } from '../../../shared/smart';
import type { CellValue, ColumnMeta, Row } from '../../../shared/types';

type Part = 'event' | 'action' | 'target';

interface Props {
  row: SmartRow;
  /** Name of the scripted creature / object / spell, for comments. */
  subject: string | null;
  /** For action-only rows: the event their chain reacts to. */
  parentEventLabel?: string | null;
  onClose(): void;
  /** Stage the draft; resolves to false when the store refused it. */
  onStage(values: Record<string, CellValue>, note: string): Promise<boolean>;
}

const TYPE_COLUMN: Record<Part, string> = { event: 'event_type', action: 'action_type', target: 'target_type' };

export function SmartRowDialog({ row, subject, parentEventLabel, onClose, onStage }: Props) {
  const meta = useStore((state) => state.meta);
  const data = useStore((state) => state.smartData);
  const names = useStore((state) => state.names);
  const readOnly = Boolean(meta?.readOnly);
  const busy = useStore((state) => state.pendingMutations) > 0;

  const [draft, setDraft] = useState<Record<string, CellValue>>({});
  const [picker, setPicker] = useState<Part | null>(null);
  const [flagsFor, setFlagsFor] = useState<ColumnMeta | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const values = useMemo<Row>(() => ({ ...row.values, ...draft }), [row.values, draft]);
  const name = (entity: string, value: CellValue): string | null =>
    value === null || value === undefined || Number(value) <= 0 ? null : names[entity]?.[String(value)] ?? null;
  const context: SmartDescriptionContext = {
    value: (column) => values[column] ?? null,
    name,
    // `{pram1value}` in a definition means the readable value: a spell name or
    // an enum label, never a bare number the reader has to look up elsewhere.
    labelFor: (_def, param, value) => (param ? displayParam(param, value, { value: (column) => values[column] ?? null, name }) : null),
    sourceLabel: subject ?? undefined,
    sourceId: row.entryorguid,
    position: '',
  };

  const event = smartSourceFor(data, 'event', values);
  const action = smartSourceFor(data, 'action', values);
  const target = smartSourceFor(data, 'target', values);
  const sourceFor = { event, action, target };
  const siblingFor: Record<Part, SmartSource | undefined> = { event: action, action: event, target: action };
  const describe = (part: Part) => describeSmartSource(sourceFor[part], siblingFor[part], { ...context, targetLabel: target.label }, part);

  const set = (column: string, value: CellValue) => setDraft((current) => ({ ...current, [column]: value }));
  const columns = (part: Part): SmartDef | null => sourceFor[part].def;
  const dirty = Object.keys(draft).length;

  const pickDefinition = (part: Part, def: SmartDef | null) => {
    const previous = columns(part);
    // Old parameters go to zero first: a stale `action_param3` is a silent bug.
    const patch: Record<string, CellValue> = { ...clearedParamValues(meta, previous), ...clearedParamValues(meta, def), [TYPE_COLUMN[part]]: def?.id ?? 0 };
    setDraft((current) => ({ ...current, ...patch }));
    setPicker(null);
  };

  const save = async () => {
    if (!dirty) { onClose(); return; }
    setSaving(true);
    setError(null);
    const label = row.origin === 'staged-insert' ? `New SmartAI row #${row.id}` : `SmartAI row #${row.id}`;
    const ok = await onStage(draft, label);
    setSaving(false);
    if (ok) onClose();
    else setError('The change was not staged. Fix the reported problem and try again.');
  };

  const difficulties = parseDifficulties(String(values.Difficulties ?? ''));
  const chance = Number(values.event_chance ?? 0);
  const flagsColumn = meta?.columns.find((column) => column.name === 'event_flags') ?? null;
  const phaseColumn = meta?.columns.find((column) => column.name === 'event_phase_mask') ?? null;
  const hasEvent = event.id !== 0;

  return (
    <Modal label={`SmartAI row ${row.id}`} className="modal wide smart-row-dialog" onClose={onClose} busy={busy || saving}>
      <header className="modal-head">
        <div>
          <h2>{hasEvent ? `Edit event · row #${row.id}` : row.isComment ? `Edit comment · row #${row.id}` : `Edit action · row #${row.id}`}</h2>
          <p className="muted small">
            {row.origin === 'staged-insert' ? 'New row — still only staged. ' : ''}
            {subject ? `${subject} · ` : ''}{meta?.database}.{meta?.name} · entryorguid {row.entryorguid} · source_type {row.sourceType}
          </p>
        </div>
        <button className="btn btn-ghost" aria-label="Close row editor" onClick={onClose}>✕</button>
      </header>

      <div className="smart-form">
        {(['event', 'action', 'target'] as Part[]).map((part) => {
          const source = sourceFor[part];
          const def = source.def;
          const params = supportedParams(meta, def);
          const unknown = source.id !== 0 && !def;
          const segments = describe(part);
          return (
            <section key={part} className={`smart-section ${part} ${def ? 'filled' : ''}`}>
              <div className="smart-section-head">
                <h3>{part === 'event' ? 'Event — when it happens' : part === 'action' ? 'Action — what it does' : 'Target — who it affects'}</h3>
                <button className="btn btn-ghost btn-mini" disabled={readOnly} onClick={() => setPicker(part)}>
                  {def ? 'Change' : source.id !== 0 ? 'Replace' : 'Choose…'}
                </button>
              </div>
              {def ? (
                <button className="smart-def" disabled={readOnly} onClick={() => setPicker(part)} title={[def.comment, def.help].filter(Boolean).join(' ') || def.name}>
                  <span className="smart-def-label">{def.label}</span>
                  <code className="smart-def-const">{def.name}</code>
                  <span className="smart-def-id">id {def.id}</span>
                </button>
              ) : (
                <button className="smart-def empty" disabled={readOnly} onClick={() => setPicker(part)}>
                  <span className="smart-def-label">{unknown ? `Unknown ${part}_type ${source.id}` : part === 'event' ? 'No event (chained row)' : part === 'action' ? 'No action' : 'No target'}</span>
                  <span className="smart-def-const muted">choose from this core’s {part} list</span>
                </button>
              )}
              {unknown && <p className="notice small">id {source.id} is not a {part} this 3.4.3 build knows. It will be written to the database unchanged — pick a supported {part} unless you are sure.</p>}
              {def?.supported === false && <p className="notice small">{def.name} exists in a newer core than this one, so it is written but never runs here.</p>}
              {def?.deprecated && <p className="notice small">Deprecated: {def.comment ?? 'another definition covers this now.'}</p>}
              {def && (def.comment || def.help) && <p className="smart-def-note">{def.comment ?? def.help}</p>}
              {def && segments.length > 0 && (
                <p className="smart-preview" aria-label={`${part} description`}>
                  {segments.map((segment, index) => segment.type === 'param'
                    ? <span key={index} className={`seg seg-param ${segment.column in draft ? 'changed' : ''}`}>{segment.text}</span>
                    : segment.type === 'emphasis' ? <em key={index}>{segment.text}</em> : <span key={index}>{segment.text}</span>)}
                </p>
              )}
              {params.length > 0 && (
                <div className="smart-params">
                  {params.map((param) => (
                    <ParamField key={param.column} param={param} meta={meta!} value={values[param.column] ?? 0} disabled={readOnly}
                      onChange={(next) => set(param.column, next)} />
                  ))}
                </div>
              )}
              {part === 'event' && (
                <div className="smart-extras">
                  <label className="param-field">
                    <span className="param-label">Chance (%)</span>
                    <input className="param-control" type="number" min={0} max={100} step={1} disabled={readOnly} value={Number.isFinite(chance) ? chance : 0}
                      aria-label="Event chance, percent" onChange={(event) => set('event_chance', Math.max(0, Math.min(100, Math.trunc(Number(event.target.value) || 0))))} />
                    <span className="param-hint">100 always fires, 25 fires on a quarter of the attempts.</span>
                  </label>
                  {flagsColumn && (
                    <div className="param-field">
                      <span className="param-label">Event flags</span>
                      <button className="btn param-pick wide" disabled={readOnly} onClick={() => setFlagsFor(flagsColumn)}>{textForFlags(values.event_flags, flagsColumn)}</button>
                      <span className="param-hint">Repeat behaviour, per-difficulty and debug flags.</span>
                    </div>
                  )}
                  {phaseColumn && (
                    <div className="param-field">
                      <span className="param-label">Phase mask</span>
                      <button className="btn param-pick wide" disabled={readOnly} onClick={() => setFlagsFor(phaseColumn)}>{textForFlags(values.event_phase_mask, phaseColumn)}</button>
                      <span className="param-hint">0 = visible in every phase.</span>
                    </div>
                  )}
                  {meta?.columns.some((column) => column.name === 'Difficulties') && (
                    <div className="param-field">
                      <span className="param-label">Difficulties</span>
                      <div className="chip-row">
                        {[0, 1, 2, 3].map((value) => (
                          <button key={value} type="button" className={`chip ${difficulties.includes(value) ? 'on' : ''}`} disabled={readOnly}
                            aria-pressed={difficulties.includes(value)} title={difficultyLabel(value)}
                            onClick={() => set('Difficulties', formatDifficulties(difficulties.includes(value) ? difficulties.filter((item) => item !== value) : [...difficulties, value].sort()))}>
                            D{value}
                          </button>
                        ))}
                        {difficulties.length === 0 && <span className="muted small">all difficulties</span>}
                      </div>
                      <span className="param-hint">Empty means the row runs in every difficulty.</span>
                    </div>
                  )}
                </div>
              )}
              {part === 'action' && (def?.usesTargetPosition || Number(values.target_type) !== 0) && meta?.columns.some((column) => column.name === 'target_x') && (
                <div className="smart-extras">
                  {(['target_x', 'target_y', 'target_z', 'target_o'] as const).map((column) => (
                    <label key={column} className="param-field compact">
                      <span className="param-label">{column.replace('target_', 'target ')}</span>
                      <input className="param-control" value={String(values[column] ?? '0')} aria-label={column} disabled={readOnly}
                        onChange={(event) => { const raw = event.target.value.trim(); if (raw === '' || /^-?\d*\.?\d*(e[-+]?\d+)?$/i.test(raw)) set(column, raw === '' ? 0 : raw); }} />
                    </label>
                  ))}
                  <span className="param-hint">Position override the target is moved to / read from (x, y, z, orientation).</span>
                </div>
              )}
            </section>
          );
        })}

        <section className="smart-section comment">
          <div className="smart-section-head">
            <h3>Comment</h3>
            <button className="btn btn-ghost btn-mini" disabled={readOnly} onClick={() => set('comment', suggestComment({
              subject, event, action, target, value: context.value, name,
            }))}>Suggest</button>
          </div>
          <textarea className="comment-input" rows={2} disabled={readOnly} value={String(values.comment ?? '')} aria-label="Row comment"
            placeholder={row.isComment ? 'Comment shown in the script (this row has no event and no action)' : 'e.g. Hogger - On Aggro - Cast Fireball'}
            onChange={(event) => set('comment', event.target.value)} />
          {parentEventLabel && !hasEvent && <p className="muted small">Chained to “{parentEventLabel}”{row.link ? ` (row ${row.link})` : ''}.</p>}
        </section>

        <section className="smart-section">
          <button className="link-button" aria-expanded={advanced} onClick={() => setAdvanced((open) => !open)}>
            {advanced ? '▾' : '▸'} Row wiring — id {row.id}{row.link ? `, linked from row ${row.link}` : ''}
          </button>
          {advanced && (
            <div className="smart-extras">
              <label className="param-field compact">
                <span className="param-label">id</span>
                <input className="param-control" value={String(values.id ?? 0)} disabled aria-label="Row id" title="ids are renumbered by the editor" />
              </label>
              <label className="param-field compact">
                <span className="param-label">link</span>
                <input className="param-control" inputMode="numeric" disabled={readOnly} aria-label="Link: id of the row that follows this one"
                  value={String(values.link ?? 0)} onChange={(event) => set('link', /^\d+$/.test(event.target.value.trim()) ? Number(event.target.value.trim()) : 0)} />
              </label>
              <span className="param-hint">A non-zero <code>link</code> means “this row is a continuation of row N”, which is how one event runs several actions.</span>
            </div>
          )}
        </section>
      </div>

      {error && <div className="error-box" role="alert">{error}</div>}
      <footer className="modal-foot">
        <span className="muted small">{dirty ? `${dirty} column${dirty === 1 ? '' : 's'} changed` : 'no changes yet'}</span>
        <div className="spacer" />
        <button className="btn" onClick={onClose}>{dirty ? 'Discard' : 'Close'}</button>
        <button className="btn btn-accent" disabled={!dirty || readOnly || busy || saving} onClick={() => void save()} title="Ctrl/Cmd+Enter">
          {saving ? 'Staging…' : 'Stage changes'}
        </button>
      </footer>

      {picker && (
        <DefinitionPicker
          title={picker === 'event' ? 'SmartAI event' : picker === 'action' ? 'SmartAI action' : 'SmartAI target'}
          searchLabel={picker === 'event' ? 'SmartAI events' : picker === 'action' ? 'SmartAI actions' : 'SmartAI targets'}
          defs={data ? (picker === 'event' ? data.events : picker === 'action' ? data.actions : data.targets) : []}
          groups={(data ? (picker === 'event' ? data.groups.events : picker === 'action' ? data.groups.actions : data.groups.targets) : []).map((group) => ({ name: group.name, members: group.members }))}
          current={values[TYPE_COLUMN[picker]] ?? 0}
          allowNone={picker !== 'target'}
          onPick={(def) => pickDefinition(picker, def)}
          onCancel={() => setPicker(null)}
        />
      )}
      {flagsFor && (
        <FlagsEditor column={flagsFor} value={values[flagsFor.name] ?? 0} onCancel={() => setFlagsFor(null)}
          onChange={(next) => { setFlagsFor(null); set(flagsFor.name, next); }} />
      )}
    </Modal>
  );
}

function textForFlags(value: CellValue, column: ColumnMeta): string {
  const entries = column.valueSet?.values ?? [];
  if (!entries.length) return value === null || value === undefined || String(value) === '0' ? 'none' : String(value);
  let mask = 0n;
  try { mask = BigInt(String(value ?? 0)); } catch { return String(value); }
  const labels = entries.filter((entry) => BigInt(entry.value) !== 0n && (mask & BigInt(entry.value)) === BigInt(entry.value)).map((entry) => entry.name);
  const unknown = mask & ~entries.reduce((all, entry) => all | BigInt(entry.value), 0n);
  if (unknown > 0n) labels.push(`0x${unknown.toString(16)}`);
  return labels.length ? labels.join(' · ') : 'none';
}
