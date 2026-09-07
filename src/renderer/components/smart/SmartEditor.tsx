/**
 * Visual SmartAI editor.
 *
 * A row of `smart_scripts` is 30 columns that only make sense together: an
 * event, the actions it fires and the target each action uses, chained through
 * `link`. This view lays those columns out as the sentence they describe, with
 * the definition data from `resources/metadata/derived/smartai.json` deciding
 * which parameter means what. Every edit is still staged through the same
 * ledger as the grid, so nothing here writes to the database directly.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { gridRows, useStore } from '../../store';
import { DefinitionPicker } from './pickers';
import { SmartRowDialog } from './RowDialog';
import { ScriptPicker } from './ScriptPicker';
import {
  asNumber, clearedParamValues, newScriptRowValues, scriptEntity, supportedParams, tintFor,
} from './helpers';
import {
  buildScript, describeSmartSource, entryIdGroups, linkPatchFor, nextScriptId, reorderScript,
  displayParam, smartSourceFor, suggestComment, toSmartRows, unlinkPatchFor, validateScript,
  type SmartData, type SmartDef, type SmartDescriptionContext, type SmartEntry, type SmartRow, type SmartSegment,
} from '../../../shared/smart';
import type { CellValue, Row } from '../../../shared/types';

export function SmartEditor() {
  const state = useStore();
  const { meta, smart, smartData, ledger, names, pendingMutations, notify } = state;
  const [dialog, setDialog] = useState<{ rowKey: string } | null>(null);
  const [newEvent, setNewEvent] = useState(false);
  const [newAction, setNewAction] = useState<{ entry: SmartEntry } | null>(null);
  const [picking, setPicking] = useState(false);
  const [term, setTerm] = useState('');
  const [hideComments, setHideComments] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const readOnly = Boolean(meta?.readOnly) || state.status?.connected === false;
  const busy = pendingMutations > 0;

  const sourceType = smart.sourceType ?? 0;
  const entryorguid = smart.entryorguid;

  /** Rows of this script only — the grid query is already filtered, staged
   *  inserts for other scripts are dropped here so they cannot leak in. */
  const scriptRows = useMemo(() => {
    if (entryorguid === null || !meta) return [];
    return gridRows(state)
      .filter((item) => String(item.row.entryorguid ?? '') === String(entryorguid))
      .filter((item) => asNumber(item.row.source_type) === sourceType);
  }, [state.result, ledger, entryorguid, sourceType, meta]);

  // A row staged for deletion is not part of the script any longer — the core
  // will not run it. It is listed below the toolbar so it can be restored.
  const removedRows = scriptRows.filter((item) => item.change?.kind === 'delete');
  const rows = useMemo<SmartRow[]>(
    () => toSmartRows(scriptRows.filter((item) => item.change?.kind !== 'delete').map((item) => ({ ...item })), smartData),
    [scriptRows, smartData],
  );

  const script = useMemo(() => buildScript(rows), [rows]);
  const entity = scriptEntity(smartData, sourceType);
  const subject = smart.subject ?? (entity && entryorguid !== null ? names[entity]?.[String(entryorguid)] ?? null : null);
  const issues = useMemo(() => validateScript(script, smartData, { subjectResolved: !entity || Boolean(subject) }), [script, smartData, subject, entity]);

  const name = (lookup: string, value: CellValue): string | null =>
    value === null || value === undefined || Number(value) <= 0 ? null : names[lookup]?.[String(value)] ?? null;
  const descriptionContext = (row: SmartRow, targetLabel: string): SmartDescriptionContext => ({
    value: (column) => row.values[column] ?? null,
    name,
    // `{pram1value}` in a description means the *display* value: a spell name,
    // an enum label — never a bare number the reader has to look up.
    labelFor: (_def, param, value) => (param ? displayParam(param, value, { value: (column) => row.values[column] ?? null, name }) : null),
    sourceLabel: subject ?? undefined,
    sourceId: row.entryorguid,
    targetLabel,
    position: [row.values.target_x, row.values.target_y, row.values.target_z].map((value) => asNumber(value as CellValue).toFixed(1)).join(', '),
  });

  // Reference values inside a script are the whole point of reading it, so make
  // sure their display names are cached even though the grid has no reference
  // columns for `*_param*`.
  const resolveKey = useRef('');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!meta || entryorguid === null || !smartData) return;
    const signature = `${script.rows.length}:${rows.map((row) => row.id).join(',')}`;
    if (resolveKey.current === signature) return;
    resolveKey.current = signature;
    const wanted = new Map<string, Set<string>>();
    const add = (lookup: string | undefined, value: CellValue) => {
      if (!lookup || value === null || value === undefined || Number(value) <= 0) return;
      const set = wanted.get(lookup) ?? new Set<string>();
      set.add(String(value));
      wanted.set(lookup, set);
    };
    if (entity && entryorguid) add(entity, String(entryorguid));
    for (const row of rows) {
      for (const source of [row.event, row.action]) {
        for (const param of source.def?.params ?? []) add(param.entity, row.values[param.column] ?? null);
      }
      for (const param of row.target.def?.params ?? []) add(param.entity, row.values[param.column] ?? null);
    }
    for (const [lookup, ids] of wanted) void state.resolveNamesFor(lookup, [...ids]);
  }, [rows, script, smartData, meta, entryorguid, entity]);

  const visible = useMemo(() => {
    const query = term.trim().toLowerCase();
    return script.entries.filter((entry) => {
      if (hideComments && entry.kind === 'comment') return false;
      if (!query) return true;
      const haystack = [
        entry.head.comment, ...entry.actions.map((row) => row.comment),
        ...entryActions(entry).map((row) => `${row.event.label} ${row.action.label} ${row.target.label} ${Object.values(row.values).join(' ')}`),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [script.entries, term, hideComments]);

  const rowByKey = (rowKey: string) => rows.find((row) => row.rowKey === rowKey) ?? null;
  const editing = dialog ? rowByKey(dialog.rowKey) : null;
  const entryOf = (rowKey: string) => script.entries.find((entry) => entry.head.rowKey === rowKey || entry.actions.some((item) => item.rowKey === rowKey)) ?? null;

  /** Values for a row the dialog has not staged yet. */
  const stage = async (rowKey: string, values: Record<string, CellValue>, note: string) => await state.stageValues(rowKey, values, note);

  const patchAll = async (patches: { rowKey: string; values: Record<string, CellValue> }[], note: string) => {
    for (const patch of patches) await state.stageValues(patch.rowKey, patch.values, note);
  };

  const addRow = async (values: Row, note: string) => await state.stageNewRowWith(values, note);

  const addEventFrom = async (def: SmartDef | null) => {
    setNewEvent(false);
    if (!def || entryorguid === null) return;
    const id = nextScriptId(rows);
    const values: Row = {
      ...newScriptRowValues({ entryorguid, sourceType }, id),
      event_type: def.id,
      ...clearedParamValues(meta, def),
      event_chance: 100,
      comment: suggestComment({
        subject,
        event: smartSourceFor(smartData, 'event', { ...newScriptRowValues({ entryorguid, sourceType }, id), event_type: def.id }),
        action: smartSourceFor(smartData, 'action', {}),
        target: smartSourceFor(smartData, 'target', {}),
        value: () => 0,
        name,
      }),
    };
    const rowKey = await addRow(values, `New SmartAI event: ${def.label}`);
    if (rowKey) {
      setDialog({ rowKey });
      notify('success', `Event “${def.label}” added as row #${id}. Pick its parameters, then review the change.`);
    }
  };

  const addActionFrom = async (def: SmartDef | null) => {
    const entry = newAction?.entry ?? null;
    setNewAction(null);
    if (!def || !entry || entryorguid === null) return;
    const id = nextScriptId(rows);
    const base: Row = { ...newScriptRowValues({ entryorguid, sourceType }, id), event_type: 0, action_type: def.id, ...clearedParamValues(meta, def) };
    const values: Row = {
      ...base,
      comment: suggestComment({
        subject,
        event: entry.head.event,
        action: smartSourceFor(smartData, 'action', base),
        target: smartSourceFor(smartData, 'target', base),
        value: (column) => base[column] ?? null,
        name,
      }),
    };
    const rowKey = await addRow(values, `New SmartAI action: ${def.label}`);
    if (!rowKey) return;
    const link = linkPatchFor(entry, id);
    if (link) await stage(link.rowKey, link.values, 'Linked action to event');
    setDialog({ rowKey });
  };

  const addCommentRow = async () => {
    if (entryorguid === null) return;
    const id = nextScriptId(rows);
    const rowKey = await addRow({ ...newScriptRowValues({ entryorguid, sourceType }, id), comment: 'New comment' }, 'New SmartAI comment row');
    if (rowKey) {
      setDialog({ rowKey });
      notify('info', 'Comment row added — a comment row runs no code, it only documents the script.');
    }
  };

  const removeRow = async (row: SmartRow) => {
    const entry = entryOf(row.rowKey);
    const follower = row.link;
    await state.deleteRow(row.rowKey);
    // Deleting a row out of a chain must not leave a dangling `link`.
    const patches = unlinkPatchFor(rows, row.id, follower).filter((patch) => patch.rowKey !== row.rowKey);
    if (patches.length) await patchAll(patches, 'Re-linked after deleting a row');
    if (entry && entry.actions.length === 0 && entry.head.rowKey !== row.rowKey) setDialog(null);
  };

  const moveEntry = async (entry: SmartEntry, delta: number) => {
    const groups = entryIdGroups(script);
    const index = groups.findIndex((group) => group[0] === entry.head.id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= groups.length) return;
    const next = [...groups];
    [next[index], next[target]] = [next[target], next[index]];
    const patches = reorderScript(rows, next);
    if (!patches.length) return;
    await patchAll(patches, delta < 0 ? 'Moved script entry up' : 'Moved script entry down');
  };

  const fixComments = async () => {
    const patches: { rowKey: string; values: Record<string, CellValue> }[] = [];
    for (const entry of script.entries) {
      for (const row of entryActions(entry)) {
        const suggested = suggestComment({
          subject, event: row.event, action: row.action, target: row.target, value: (column) => row.values[column] ?? null, name,
        });
        if (suggested && suggested !== row.comment.trim()) patches.push({ rowKey: row.rowKey, values: { comment: suggested } });
      }
    }
    if (!patches.length) { notify('info', 'Every row already carries a sensible comment.'); return; }
    await patchAll(patches, 'Scripted comment generated from the definitions');
    notify('success', `Comment rewritten on ${patches.length} row${patches.length === 1 ? '' : 's'}.`);
  };

  const issuesForRow = (rowKey: string) => issues.filter((issue) => issue.rowKey === rowKey);
  const errors = issues.filter((issue) => issue.severity === 'error').length;

  if (!meta || smart.entryorguid === null) {
    return (
      <div className="smart-editor smart-start">
        <h2>Choose the script you want to edit</h2>
        <p className="muted">SmartAI rows are only readable as a whole script: one creature, object or spell and the events it reacts to.
          Search by name — typing <em>Hogger</em> finds entry 448 — or pick a row in the grid view and open it from there.</p>
        {smartData ? <ScriptPicker /> : <p className="muted"><span className="spinner" /> Loading SmartAI definitions…</p>}
      </div>
    );
  }

  /** Editor-wide shortcuts: the grid can be driven without reaching for the toolbar. */
  const onEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const typing = event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
      return;
    }
    if (mod && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      if (!readOnly && !busy) setNewEvent(true);
      return;
    }
    if (!typing && !mod && event.key === '/') {
      event.preventDefault();
      searchRef.current?.focus();
    }
  };

  return (
    <div className="smart-editor" role="region" aria-label="SmartAI script editor" onKeyDown={onEditorKeyDown}>
      <div className="smart-toolbar">
        <button className="btn btn-ghost script-chip" onClick={() => setPicking(true)} title="Choose another script to edit">
          <span className="script-chip-kind">{smartData?.sourceTypes.find((kind) => kind.value === sourceType)?.name ?? `source_type ${sourceType}`}</span>
          <strong>{subject ?? `entry ${String(entryorguid)}`}</strong>
          <code>entryorguid {String(entryorguid)} · {rows.length} row{rows.length === 1 ? '' : 's'}</code>
          <span className="caret">▾</span>
        </button>
        <div className="search-field small-search">
          <input ref={searchRef} className="search" aria-label="Search inside this script" placeholder="Search in script…" title="Search inside this script (/)" value={term} onChange={(event) => setTerm(event.target.value)} />
          {term && <button className="input-clear" aria-label="Clear script search" onClick={() => setTerm('')}>✕</button>}
        </div>
        <button className={`btn btn-quick ${hideComments ? 'on' : ''}`} aria-pressed={hideComments} onClick={() => setHideComments((value) => !value)}>Hide comments</button>
        <button className={`btn btn-quick ${showIssues ? 'on' : ''}`} aria-pressed={showIssues} onClick={() => setShowIssues((value) => !value)}>
          Problems {issues.length > 0 && <span className={`count ${errors ? 'error' : ''}`}>{issues.length}</span>}
        </button>
        {removedRows.length > 0 && (
          <button className="btn btn-quick removed-notice" disabled={busy}
            title="These rows are staged for deletion and hidden from the script. Click to put them back."
            onClick={() => void state.revert(removedRows.map((item) => item.change!.id))}>
            {removedRows.length} row{removedRows.length === 1 ? '' : 's'} staged for deletion · revert
          </button>
        )}
        <div className="toolbar-spacer" />
        <button className="btn btn-quick" disabled={readOnly || busy} onClick={() => void fixComments()} title="Rewrite every comment from its event, action and target">Fix comments</button>
        <button className="btn" disabled={readOnly || busy} onClick={() => setNewEvent(true)} title="Add an event row (Ctrl/Cmd+N)">+ Event</button>
      </div>

      {showIssues && (
        <div className="smart-issues" role="list">
          {!issues.length && <p className="muted">Nothing to fix — {script.entries.length} entr{script.entries.length === 1 ? 'y' : 'ies'} look consistent with this core’s SmartAI definitions.</p>}
          {issues.map((issue, index) => (
            <button key={index} role="listitem" className={`issue ${issue.severity}`} disabled={!issue.rowKey}
              onClick={() => issue.rowKey && setDialog({ rowKey: issue.rowKey })}>
              <span className="issue-severity">{issue.severity === 'error' ? '✕' : issue.severity === 'warning' ? '!' : 'i'}</span>
              <span className="issue-text">{issue.message}</span>
              {issue.column && <code>{issue.column}</code>}
              {issue.rowKey && <span className="issue-jump">edit row</span>}
            </button>
          ))}
        </div>
      )}

      <div className="smart-rows" tabIndex={-1} onKeyDown={(event) => {
        if (!focused) return;
        const row = rowByKey(focused);
        if (!row) return;
        if (event.key === 'Enter') { event.preventDefault(); setDialog({ rowKey: row.rowKey }); }
        if ((event.key === 'Delete' || event.key === 'Backspace') && !readOnly) { event.preventDefault(); void removeRow(row); }
        if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && !readOnly) {
          const entry = entryOf(row.rowKey);
          if (entry) {
            event.preventDefault();
            void moveEntry(entry, event.key === 'ArrowUp' ? -1 : 1);
          }
        }
      }}>
        {!script.entries.length && <p className="muted empty-script">This script has no rows yet. Add the first event, or pick another script.</p>}
        {visible.map((entry) => (
          <ScriptEntry key={entry.head.rowKey} entry={entry} index={script.entries.indexOf(entry)} subject={subject} rows={rows}
            readOnly={readOnly} busy={busy} focused={focused} issues={issuesForRow(entry.head.rowKey)}
            description={describeSmartSource} contextFor={(row, targetLabel) => descriptionContext(row, targetLabel)}
            onFocus={setFocused} onEdit={(rowKey) => setDialog({ rowKey })} onAddAction={(item) => setNewAction({ entry: item })} onMove={moveEntry} onDelete={removeRow}
            hideComments={hideComments} />
        ))}
        <div className="smart-foot">
          <button className="btn btn-ghost ghost-add" disabled={readOnly || busy} onClick={() => setNewEvent(true)}>+ Add event</button>
          <button className="btn btn-ghost ghost-add" disabled={readOnly || busy} onClick={() => void addCommentRow()}>+ Add comment row</button>
          {visible.length !== script.entries.length && <span className="muted small">{visible.length} of {script.entries.length} rows match “{term}”</span>}
        </div>
      </div>

      {editing && (
        <SmartRowDialog
          row={editing}
          subject={subject}
          parentEventLabel={editing.isActionOnly ? entryOf(editing.rowKey)?.head.event.label : null}
          onClose={() => setDialog(null)}
          onStage={async (values, note) => await stage(editing.rowKey, values, note)}
        />
      )}

      {newEvent && (
        <DefinitionPicker title={`New event for a ${smartData?.sourceTypes.find((kind) => kind.value === sourceType)?.name ?? 'script'}`} searchLabel="SmartAI events"
          defs={defsForKind(smartData, 'event', sourceType)} groups={smartData?.groups.events ?? []} current={0} onPick={(def) => void addEventFrom(def)} onCancel={() => setNewEvent(false)} />
      )}
      {newAction && (
        <DefinitionPicker title={newAction.entry.head.event.id ? `Action for “${newAction.entry.head.event.label}”` : 'New action'} searchLabel="SmartAI actions"
          defs={defsForKind(smartData, 'action', sourceType)} groups={smartData?.groups.actions ?? []} current={0} onPick={(def) => void addActionFrom(def)} onCancel={() => setNewAction(null)} />
      )}
      {picking && <ScriptPicker onClose={() => setPicking(false)} />}
    </div>
  );
}

/** Event row plus the rows chained to it, in execution order. */
function entryActions(entry: SmartEntry): SmartRow[] {
  return [entry.head, ...entry.actions];
}

interface EntryProps {
  entry: SmartEntry;
  index: number;
  subject: string | null;
  rows: SmartRow[];
  readOnly: boolean;
  busy: boolean;
  focused: string | null;
  issues: { severity: string; message: string }[];
  hideComments: boolean;
  description: typeof describeSmartSource;
  contextFor(row: SmartRow, targetLabel: string): SmartDescriptionContext;
  onFocus(rowKey: string | null): void;
  onEdit(rowKey: string): void;
  onAddAction(entry: SmartEntry): void;
  onMove(entry: SmartEntry, delta: number): Promise<void>;
  onDelete(row: SmartRow): Promise<void>;
}

function ScriptEntry({ entry, index, subject, readOnly, busy, focused, issues, description, contextFor, onFocus, onEdit, onAddAction, onMove, onDelete }: EntryProps) {
  const tint = tintFor(index);
  const head = entry.head;
  if (entry.kind === 'comment' && !entry.actions.length) {
    return (
      <div className={`smart-row comment tint-${tint}`} tabIndex={0} onFocus={() => onFocus(head.rowKey)} onBlur={() => onFocus(null)}
        onKeyDown={(event) => { if (event.key === 'Enter') onEdit(head.rowKey); }}>
        <span className="row-id">#{head.id}</span>
        <button className="comment-text" onClick={() => onEdit(head.rowKey)}>{head.comment || <em>empty comment row — click to write it</em>}</button>
        <RowTools row={head} readOnly={readOnly} busy={busy} onEdit={onEdit} onDelete={onDelete} onMove={onMove} entry={entry} />
      </div>
    );
  }
  const chained = entry.actions;
  const highlight = focused !== null && entryActions(entry).some((row) => row.rowKey === focused);
  return (
    <div className={`smart-row event tint-${tint} ${highlight ? 'focused' : ''} ${issues.length ? `has-${issues.some((issue) => issue.severity === 'error') ? 'error' : 'warn'}` : ''}`}
      tabIndex={0} onFocus={() => onFocus(head.rowKey)} onBlur={() => onFocus(null)}>
      <div className="smart-row-line">
        <span className="row-id" title="Row id inside this script">#{head.id}</span>
        <SourceCell source={head.event} part="event" row={head} subject={subject} description={description} contextFor={contextFor} onEdit={onEdit} focused={focused === head.rowKey} />
        <SourceCell source={head.action} part="action" row={head} subject={subject} description={description} contextFor={contextFor} onEdit={onEdit} focused={focused === head.rowKey} />
        <RowTools row={head} readOnly={readOnly} busy={busy} onEdit={onEdit} onDelete={onDelete} onMove={onMove} entry={entry} />
      </div>
      {head.comment && <p className="smart-row-comment">{head.comment}</p>}
      {chained.map((row) => (
        <div className="smart-row-line chained" key={row.rowKey} tabIndex={0} onFocus={() => onFocus(row.rowKey)}>
          <span className="row-id chain" title={`Linked from row ${row.link}`}>↳ #{row.id}</span>
          <SourceCell source={row.action} part="action" row={row} subject={subject} description={description} contextFor={contextFor} onEdit={onEdit} focused={focused === row.rowKey} />
          <RowTools row={row} readOnly={readOnly} busy={busy} onEdit={onEdit} onDelete={onDelete} onMove={onMove} entry={entry} />
        </div>
      ))}
      <button className="btn btn-ghost ghost-add inside" disabled={readOnly || busy} onClick={() => onAddAction(entry)}>+ Add action</button>
      {entry.brokenLink !== null && <p className="notice small">This event links to row {entry.brokenLink}, which is not in the script. Fix it in the Problems panel or the chain stops there.</p>}
    </div>
  );
}

function SourceCell({ source, part, row, subject, description, contextFor, onEdit, focused }: {
  source: SmartRow['event'];
  part: 'event' | 'action';
  row: SmartRow;
  subject: string | null;
  description: typeof describeSmartSource;
  contextFor(row: SmartRow, targetLabel: string): SmartDescriptionContext;
  onEdit(rowKey: string): void;
  focused: boolean;
}) {
  const segments = source.id === 0 ? [] : description(source, part === 'event' ? row.action : row.event, contextFor(row, row.target.label), part);
  const empty = source.id === 0;
  return (
    <button className={`source-cell ${part} ${empty ? 'empty' : ''} ${focused ? 'focused' : ''}`} onClick={() => onEdit(row.rowKey)}
      title={`${source.constant} · ${part}_type ${source.id}\n${source.def?.comment ?? source.def?.description ?? 'click to choose a ' + part}`}>
      <span className="source-part">{part}</span>
      <span className="source-label">{empty ? `no ${part} — click to add` : source.label}</span>
      {!empty && segments.length > 0 && (
        <span className="source-text">
          {segments.map((segment, index) => <SegmentView key={index} segment={segment} />)}
        </span>
      )}
      {!empty && source.def?.supported === false && <span className="tag tag-warn tag-mini">not in 3.4.3</span>}
      {!empty && !source.def && <span className="tag tag-warn tag-mini">unknown id {source.id}</span>}
      {part === 'event' && !empty && (
        <span className="source-flags">
          {asNumber(row.values.event_chance) !== 100 && <em className="chip chance">{asNumber(row.values.event_chance)}%</em>}
          {asNumber(row.values.event_flags) !== 0 && <em className="chip flags">{flagNames(row, 'event_flags')}</em>}
          {row.difficulties && <em className="chip">{row.difficulties}</em>}
        </span>
      )}
      {part === 'action' && !empty && <span className="source-target">{targetText(row)}</span>}
      {subject && empty && part === 'action' && <span className="muted small">chained action of “{subject}”</span>}
    </button>
  );
}

function SegmentView({ segment }: { segment: SmartSegment }) {
  if (segment.type === 'param') return <em className="seg-param" title={`${segment.label} (${segment.column})`}>{segment.text}</em>;
  if (segment.type === 'emphasis') return <em className="seg-em">{segment.text}</em>;
  if (segment.type === 'link') return <span className="seg-link">{segment.text}</span>;
  return <span className="seg-text">{segment.text}</span>;
}

function RowTools({ row, entry, readOnly, busy, onEdit, onDelete, onMove }: {
  row: SmartRow;
  entry: SmartEntry;
  readOnly: boolean;
  busy: boolean;
  onEdit(rowKey: string): void;
  onDelete(row: SmartRow): Promise<void>;
  onMove(entry: SmartEntry, delta: number): Promise<void>;
}) {
  const first = entry.head.rowKey === row.rowKey;
  return (
    <span className="row-tools">
      <button className="btn btn-ghost btn-mini" disabled={!first || busy} title="Move this event (and its actions) up" aria-label={`Move row ${row.id} up`} onClick={() => void onMove(entry, -1)}>↑</button>
      <button className="btn btn-ghost btn-mini" disabled={!first || busy} title="Move this event (and its actions) down" aria-label={`Move row ${row.id} down`} onClick={() => void onMove(entry, 1)}>↓</button>
      <button className="btn btn-ghost btn-mini" disabled={readOnly || busy} title="Edit all columns of this row" aria-label={`Edit row ${row.id}`} onClick={() => onEdit(row.rowKey)}>✎</button>
      <button className="btn btn-ghost btn-mini danger" disabled={readOnly || busy} title="Stage the deletion of this row" aria-label={`Delete row ${row.id}`} onClick={() => void onDelete(row)}>✕</button>
    </span>
  );
}

/** Value-set names for a row-level flag column, taken from the table metadata. */
function flagNames(row: SmartRow, column: string): string {
  const entries = useStore.getState().meta?.columns.find((item) => item.name === column)?.valueSet?.values ?? [];
  let mask = 0n;
  try { mask = BigInt(String(row.values[column] ?? 0)); } catch { return String(row.values[column] ?? 0); }
  const names = entries.filter((entry) => BigInt(entry.value) !== 0n && (mask & BigInt(entry.value)) === BigInt(entry.value)).map((entry) => entry.name);
  const unknown = mask & ~entries.reduce((all, entry) => all | BigInt(entry.value), 0n);
  if (unknown > 0n) names.push(`0x${unknown.toString(16)}`);
  return names.length ? names.join(' · ') : '0';
}

function targetText(row: SmartRow): string {
  const target = row.target;
  if (target.id === 0) return 'no target';
  const params = supportedParams(null, target.def).filter((param) => {
    const value = row.values[param.column];
    return value !== null && value !== undefined && String(value) !== '' && Number(value) !== 0;
  });
  const detail = params.slice(0, 2).map((param) => `${param.label} ${row.values[param.column]}`).join(', ');
  return `${target.label}${detail ? ` · ${detail}` : ''}`;
}

/** Definitions offered by the picker, narrowed to the script kind when possible. */
export function defsForKind(data: SmartData | null, part: 'event' | 'action', sourceType: number): SmartDef[] {
  const defs = part === 'event' ? data?.events ?? [] : data?.actions ?? [];
  return defs.filter((def) => !def.scriptTypes?.length || def.scriptTypes.includes(sourceType));
}
