/**
 * Pickers used by the visual SmartAI editor.
 *
 * `DefinitionPicker` replaces "type a number between 0 and 148" with a
 * searchable, grouped list of the events/actions/targets this core supports,
 * and `ParamField` renders one parameter with the editor its definition asks
 * for — an id picker for a spell, a checklist for cast flags, a switch for a
 * boolean. Reference and flag parameters reuse the grid's own dialogs, so the
 * two views can never drift apart.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../Modal';
import { ReferencePicker } from '../ReferencePicker';
import { FlagsEditor } from '../FlagsEditor';
import { useStore } from '../../store';
import { columnForParam } from './helpers';
import type { CellValue, ColumnMeta, TableMeta } from '../../../shared/types';
import type { SmartDef, SmartParamDef } from '../../../shared/smart';

type PickerRow = { kind: 'group'; name: string; size: number } | { kind: 'def'; def: SmartDef };

export interface PickerGroup {
  name: string;
  members: string[];
}

interface DefinitionPickerProps {
  title: string;
  /** Noun for the search field's accessible name, e.g. `actions`. */
  searchLabel?: string;
  subtitle?: string;
  defs: SmartDef[];
  groups: PickerGroup[];
  /** Row value of the type column, so the current choice can be marked. */
  current: CellValue;
  /** Offer "no event / no action" for rows that only chain or comment. */
  allowNone?: boolean;
  onPick(def: SmartDef | null): void;
  onCancel(): void;
}

/** Searchable, grouped list of SMART_EVENT_ / SMART_ACTION_ / SMART_TARGET_ constants. */
export function DefinitionPicker({ title, subtitle, searchLabel, defs, groups, current, allowNone, onPick, onCancel }: DefinitionPickerProps) {
  const [term, setTerm] = useState('');
  const [cursor, setCursor] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const list = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return defs;
    return defs.filter((def) =>
      def.label.toLowerCase().includes(query) || def.name.toLowerCase().includes(query) || (def.comment ?? '').toLowerCase().includes(query)
      || (def.description ?? '').toLowerCase().includes(query) || def.tags.some((tag) => tag.includes(query))
      || def.params.some((param) => param.label.toLowerCase().includes(query)));
  }, [defs, term]);

  const membersByGroup = useMemo(() => {
    const map = new Map<string, SmartDef[]>();
    for (const group of groups) {
      const byName = new Map(group.members.map((name) => [name, true]));
      const items = matches.filter((def) => byName.has(def.name));
      if (items.length) map.set(group.name, items);
    }
    return map;
  }, [groups, matches]);

  const ungrouped = useMemo(() => {
    const grouped = new Set([...membersByGroup.values()].flat().map((def) => def.name));
    return matches.filter((def) => !grouped.has(def.name));
  }, [membersByGroup, matches]);

  const rows = useMemo<PickerRow[]>(() => {
    const out: PickerRow[] = [];
    for (const group of groups) {
      const items = membersByGroup.get(group.name);
      if (!items?.length) continue;
      if (!term && expanded[group.name]) continue;
      out.push({ kind: 'group', name: group.name, size: items.length });
      if (term || !expanded[group.name]) for (const def of items) out.push({ kind: 'def', def });
    }
    if (ungrouped.length) {
      if (term) out.push({ kind: 'group', name: 'Other', size: ungrouped.length });
      for (const def of ungrouped) out.push({ kind: 'def', def });
    }
    return out;
  }, [groups, membersByGroup, ungrouped, expanded, term]);

  const options: (SmartDef | null)[] = [];
  if (allowNone) options.push(null);
  for (const row of rows) if (row.kind === 'def') options.push(row.def);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>('.active')?.scrollIntoView?.({ block: 'nearest' });
  }, [cursor]);

  const move = (delta: number) => setCursor((previous) => Math.max(0, Math.min(options.length - 1, previous + delta)));

  const choose = (index: number) => {
    const def = options[index];
    if (def === undefined) return;
    onPick(def);
  };

  return (
    <Modal label={title} className="popover definition-picker" backdropClassName="popover-backdrop" onClose={onCancel}>
      <header className="popover-head">
        <div>
          <strong>{title}</strong>
          <code>{subtitle ?? `${matches.length} of ${defs.length} options`}</code>
        </div>
        <button className="btn btn-ghost" aria-label={`Close ${title}`} onClick={onCancel}>✕</button>
      </header>
      <input
        className="picker-input"
        autoFocus
        aria-label={searchLabel ? `Search ${searchLabel}` : `Search ${title}`}
        role="combobox"
        aria-expanded="true"
        aria-controls="definition-results"
        placeholder="Name, constant, description or parameter…"
        value={term}
        onChange={(event) => { setTerm(event.target.value); setCursor(0); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
          if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
          if (event.key === 'Enter') { event.preventDefault(); choose(cursor); }
        }}
      />
      <div className="definition-list" id="definition-results" role="listbox" aria-label={title} ref={list}>
        {allowNone && (
          <button className={`definition-item none ${cursor === 0 ? 'active' : ''}`} role="option" aria-selected={cursor === 0} tabIndex={-1}
            onMouseEnter={() => setCursor(0)} onClick={() => choose(0)}>
            <span className="definition-label">None</span>
            <span className="definition-note">Clears this part of the row</span>
          </button>
        )}
        {rows.map((row) => {
          if (row.kind === 'group') {
            return (
              <button key={`group:${row.name}`} className="definition-group" aria-expanded={!expanded[row.name]}
                onClick={() => setExpanded((state) => ({ ...state, [row.name]: !state[row.name] }))}>
                <span className={`caret ${expanded[row.name] ? 'closed' : ''}`}>▾</span>{row.name}<span className="count">{row.size}</span>
              </button>
            );
          }
          const def = row.def;
          const position = options.indexOf(def);
          const isCurrent = String(def.id) === String(current ?? 0);
          return (
            <button key={`${def.name}:${def.id}`} role="option" aria-selected={position === cursor} tabIndex={-1} id={`definition-${position}`}
              className={`definition-item ${position === cursor ? 'active' : ''} ${isCurrent ? 'current' : ''} ${def.deprecated ? 'deprecated' : ''} ${def.supported === false ? 'unsupported' : ''}`}
              onMouseEnter={() => setCursor(position)} onClick={() => choose(position)}
              title={`${def.name}${def.comment ? `\n${def.comment}` : ''}`}>
              <span className="definition-id">{def.id}</span>
              <span className="definition-body">
                <span className="definition-label">{def.label}
                  {def.deprecated && <span className="tag tag-warn tag-mini">deprecated</span>}
                  {def.supported === false && <span className="tag tag-warn tag-mini">not in this core</span>}
                  {def.timed && <span className="tag tag-mini">timer</span>}
                  {isCurrent && <span className="tag tag-soft tag-mini">current</span>}
                </span>
                <span className="definition-note">{def.comment ?? def.description ?? def.name}</span>
                {def.params.length > 0 && <span className="definition-params">{def.params.map((param) => param.label).join(' · ')}</span>}
              </span>
            </button>
          );
        })}
        {!matches.length && <p className="muted definition-empty">Nothing matches “{term}”. Try a shorter word, or a constant such as SMART_EVENT_AGGRO.</p>}
      </div>
      <footer className="popover-foot">
        <span className="muted small">↑ ↓ to choose · Enter to select · Esc to cancel</span>
        <div className="spacer" />
        <span className="muted small">{matches.length} options</span>
      </footer>
    </Modal>
  );
}

interface ParamFieldProps {
  param: SmartParamDef;
  meta: TableMeta;
  value: CellValue;
  /** Staging happens once per dialog, so this only updates the draft. */
  onChange(value: CellValue): void;
  disabled?: boolean;
  /** Show a description line under the control (dialog) or not (chips). */
  describe?: boolean;
}

/** One SmartAI parameter, with the editor its definition asks for. */
export function ParamField({ param, meta, value, onChange, disabled, describe = true }: ParamFieldProps) {
  const entities = useStore((state) => state.entities);
  const names = useStore((state) => state.names);
  const column: ColumnMeta = useMemo(() => columnForParam(meta, param, entities), [meta, param, entities]);
  const [picking, setPicking] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const resolved = param.entity ? names[param.entity]?.[String(value)] : undefined;

  const set = (next: CellValue) => onChange(next);
  const numeric = value === null || value === undefined || value === '' ? 0 : Number(value);

  if (param.editor === 'reference' && column.reference) {
    return (
      <div className="param-field param-reference">
        <span className="param-label">{param.label}</span>
        <div className="param-control">
          <button className="btn param-pick" type="button" disabled={disabled} onClick={() => setPicking(true)}>
            <span className="ref-id">{valueText(value)}</span>
            {resolved && <span className="ref-name">{resolved}</span>}
            {!resolved && <span className="ref-name muted">choose…</span>}
          </button>
          <button className="btn btn-ghost btn-mini" type="button" disabled={disabled} title="Set to 0 (no reference)" onClick={() => set(0)}>0</button>
        </div>
        {describe && param.description && <p className="param-hint">{param.description}</p>}
        {picking && <ReferencePicker column={column} value={value} onCancel={() => setPicking(false)} onPick={(next) => { setPicking(false); set(next); }} />}
      </div>
    );
  }
  if (param.editor === 'reference') {
    // No lookup table on this connection (e.g. a DB2-only entity): still editable by id.
    return (
      <label className="param-field">
        <span className="param-label">{param.label}</span>
        <input className="param-control" inputMode="numeric" disabled={disabled} value={valueText(value)} aria-label={param.label}
          onChange={(event) => set(/^\d+$/.test(event.target.value.trim()) ? event.target.value.trim() : 0)} />
        {describe && <p className="param-hint">{[param.description, `Raw id${param.entity ? ` of a ${param.entity}` : ''}; no lookup is available for it here.`].filter(Boolean).join(' ')}</p>}
      </label>
    );
  }
  if (param.editor === 'flags') {
    const labels = column.valueSet && value !== null
      ? column.valueSet.values.filter((entry) => {
        try { return BigInt(entry.value) !== 0n && (BigInt(String(value)) & BigInt(entry.value)) === BigInt(entry.value); } catch { return false; }
      }).map((entry) => entry.name)
      : [];
    return (
      <div className="param-field param-flags">
        <span className="param-label">{param.label}</span>
        <button className="btn param-pick wide" type="button" disabled={disabled} onClick={() => setFlagOpen(true)}>
          <span className="flags-value">{valueText(value)}</span>
          <span className="flags-names">{labels.length ? labels.join(' · ') : 'no flags set'}</span>
        </button>
        {describe && param.description && <p className="param-hint">{param.description}</p>}
        {flagOpen && <FlagsEditor column={column} value={value} onCancel={() => setFlagOpen(false)} onChange={(next) => { setFlagOpen(false); set(next); }} />}
      </div>
    );
  }
  if (param.editor === 'enum' && column.valueSet) {
    const options = column.valueSet.values;
    const known = options.some((entry) => String(entry.value) === String(value));
    return (
      <label className="param-field param-enum">
        <span className="param-label">{param.label}</span>
        <select className="param-control" disabled={disabled} value={String(value ?? '0')} onChange={(event) => set(event.target.value)}>
          {!known && <option value={String(value ?? '0')}>{`${valueText(value)} (undocumented)`}</option>}
          {options.map((entry) => <option key={String(entry.value)} value={String(entry.value)}>{entry.value} — {entry.name}</option>)}
        </select>
        <span className="selected-option">{known ? `${valueText(value)} — ${options.find((entry) => String(entry.value) === String(value))!.name}` : `${valueText(value)} (undocumented)`}</span>
        {describe && param.description && <p className="param-hint">{param.description}</p>}
      </label>
    );
  }
  if (param.editor === 'bool') {
    return (
      <div className="param-field param-bool">
        <span className="param-label">{param.label}</span>
        <div className="switch" role="group" aria-label={param.label}>
          <button type="button" className={`switch-option ${numeric === 0 ? 'on' : ''}`} disabled={disabled} onClick={() => set(0)}>0 · no</button>
          <button type="button" className={`switch-option ${numeric !== 0 ? 'on' : ''}`} disabled={disabled} onClick={() => set(1)}>1 · yes</button>
        </div>
        {describe && param.description && <p className="param-hint">{param.description}</p>}
      </div>
    );
  }
  const isText = param.editor === 'text';
  return (
    <label className="param-field">
      <span className="param-label">{param.label}</span>
      {isText ? <textarea className="param-control param-text" rows={3} disabled={disabled} value={value == null ? '' : String(value)} aria-label={param.label}
        onChange={(event) => set(event.target.value)} /> : <input className="param-control" inputMode="numeric" disabled={disabled}
        value={value == null ? '' : String(value)} aria-label={param.label}
        onChange={(event) => set(event.target.value === '' ? 0 : event.target.value)} />}
      {describe && param.description && <p className="param-hint">{param.description}</p>}
    </label>
  );
}

const valueText = (value: CellValue): string => (value === null || value === undefined ? '0' : String(value));
