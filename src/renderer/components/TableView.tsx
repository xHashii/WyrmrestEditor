import { useEffect, useState } from 'react';
import { useStore, gridRows, displayValue } from '../store';
import { DataGrid, gridColumns } from './DataGrid';
import { ValueEditor } from './ValueEditor';
import { SmartEditor } from './smart/SmartEditor';
import { guidedEditorFor } from './smart/helpers';
import type { FilterClause, SearchScope } from '../../shared/types';
import { valueText } from '../../shared/values';

/** What the search box is looking at, spelled out where it is typed. */
const SEARCH_HINTS: Record<SearchScope, string> = {
  all: 'Search names, ids and referenced rows…',
  names: 'Search the text columns only…',
  ids: 'Search ids exactly (no name lookup)…',
  references: 'Search by the name of a referenced creature, spell, quest…',
};

function filterLabel(filter: FilterClause): string {
  const labels: Record<string, string> = { '!=': '≠', '>=': '≥', '<=': '≤', isNull: 'IS NULL', notNull: 'NOT NULL', bitAnd: 'has bit' };
  return `${filter.column} ${labels[filter.op] ?? filter.op}${['isNull', 'notNull'].includes(filter.op) ? '' : ` ${Array.isArray(filter.value) ? filter.value.map(valueText).join(', ') : valueText(filter.value)}`}`;
}

export function TableView() {
  const state = useStore();
  const { meta, result, loading, queryError, search, setSearch, refresh, offset, setOffset, settings, addRow, duplicateRow,
    deleteRow, revertRow, filterByCell, filters, clearFilters, setFilters, tableName, ledger, database, selected, pendingMutations } = state;
  const [showSql, setShowSql] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [database, tableName, selected?.rowKey, selected?.column]);
  const retry = () => state.smart.view === 'script' && !state.smart.entryorguid ? void state.openSmartEditor() :
    meta ? void refresh() : tableName ? void state.openTable(database, tableName) : undefined;
  const guided = guidedEditorFor(meta);
  const scriptMode = guided === 'smart' && state.smart.view === 'script';
  // Entities this table can point at — what `spell:Fireball` can usefully mean.
  const searchEntities = Object.keys(state.index?.entities ?? {}).filter((entity) =>
    (meta?.columns ?? []).some((column) => column.reference?.entity === entity)).slice(0, 6);

  /** Table → script: open the script the selected row belongs to. */
  const openScript = async () => {
    if (scriptMode) return;
    const token = state.navigationToken;
    await state.ensureSmartData();
    if (useStore.getState().navigationToken !== token) return;
    if (!useStore.getState().smartData) { state.notify('error', 'SmartAI definitions are not available, so the script editor cannot open.'); return; }
    const target = selected ? rows.find((r) => r.key === selected.rowKey) : undefined;
    const entry = target?.row.entryorguid ?? state.smart.entryorguid ?? rows[0]?.row.entryorguid;
    const kind = Number(target?.row.source_type ?? state.smart.sourceType ?? rows[0]?.row.source_type ?? 0);
    if (entry === null || entry === undefined) { state.notify('info', 'Pick a script first: no row is loaded to take you to.'); await state.setSmartView('script'); return; }
    await state.selectScript(String(entry), kind, String(entry) === state.smart.entryorguid && kind === state.smart.sourceType ? state.smart.subject : null);
  };

  if (!meta) return <div className="empty table-empty" role={queryError ? 'alert' : 'status'}>
    {queryError ? <><h2>Could not open {tableName}</h2><p>{queryError}</p><div><button className="btn btn-accent" onClick={retry}>Try again</button></div></> :
      loading ? <><span className="spinner" /><h2>Opening {tableName}…</h2><p>Loading the table definition and rows.</p></> :
        <><h2>Choose a table</h2><p>Browse the sidebar or search all {state.catalogue.length.toLocaleString()} tables.</p><div><button className="btn btn-accent" onClick={() => state.setDialog('palette')}>Find a table · Ctrl/Cmd+K</button></div></>}
  </div>;

  const pageSize = result?.limit ?? settings?.pageSize ?? 100;
  const total = result?.total ?? null;
  const relevant = ledger.filter((c) => c.database === database && c.table === tableName);
  const inserts = relevant.filter((c) => c.kind === 'insert').length;
  const rows = gridRows(state);
  const target = selected ? rows.find((r) => r.key === selected.rowKey) : undefined;
  const editable = !meta.readOnly && !target?.ambiguous && target?.change?.kind !== 'delete';
  const busy = pendingMutations > 0;
  const range = result?.rows.length ? `${result.offset + 1}–${result.offset + result.rows.length}` : '0';

  return <div className="tableview">
    <div className="table-controls">
      <div className="table-header">
        <div className="table-title"><h1>{meta.label}</h1><code>{database}.{meta.name}</code>
          {!meta.identityColumns.length && !meta.readOnly && <span className="tag tag-warn">No unique row key</span>}
          {meta.readOnly && <span className="tag tag-warn">Read only</span>}
          {relevant.length > 0 && <span className="tag tag-staged">{relevant.length} staged</span>}
        </div>
        {meta.description && <p className="table-desc">{meta.description}</p>}
      </div>
      <div className="editor-mode-bar">
        {guided === 'smart' && <div className="view-switch" role="group" aria-label="Editor view">
          <button className={`btn ${scriptMode ? '' : 'on'}`} aria-pressed={!scriptMode} onClick={() => state.setSmartView('grid')}
            title="Show the raw rows of this script in the table">Table</button>
          <button className={`btn ${scriptMode ? 'on' : ''}`} aria-pressed={scriptMode} disabled={state.smartData === null && state.loading}
            onClick={() => void openScript()} title="Open the rows this creature/object reacts to as a script — events, actions and targets">SmartAI editor</button>
        </div>}
        {scriptMode && <><span className="muted small">Load a script by name or ID. Click an event, action or comment to edit.</span>
          <button className="btn btn-ghost" aria-expanded={showSql} onClick={() => setShowSql((s) => !s)}>Query SQL</button></>}
      </div>
      {!scriptMode && <><div className="toolbar">
        <div className="search-field">
          <select className="search-scope" aria-label="What to search" value={state.searchScope} title="Search everything, only names, only ids, or the names of referenced rows"
            onChange={(e) => state.setSearchScope(e.target.value as SearchScope)}>
            <option value="all">All</option>
            <option value="names">Names</option>
            <option value="ids">IDs</option>
            <option value="references">References</option>
          </select>
          <input className="search" aria-label={`Search ${meta.name} rows`} value={search}
            placeholder={SEARCH_HINTS[state.searchScope] ?? 'Search names, ids or referenced rows…'}
            title={`Type a name or id. Narrow it with ${meta.nameColumn ? `${meta.nameColumn}:… or ` : ''}${searchEntities.slice(0, 3).join(':…, ')}:…`}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void refresh(); }} />
          {search && <button className="input-clear" aria-label="Clear row search" onClick={() => setSearch('')}>✕</button>}
        </div>
        <button className="btn" onClick={() => void refresh()} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        <button className="btn btn-accent" onClick={() => void addRow()} disabled={meta.readOnly || busy} title="Stage a new empty row (Ctrl/Cmd+I)">+ Row</button>
        <div className="toolbar-spacer" />
        <div className="pager" aria-label="Pagination">
          <button className="btn btn-ghost" aria-label="Previous page" disabled={loading || offset === 0} onClick={() => setOffset(offset - pageSize)}>‹</button>
          <span className="pager-label" aria-live="polite">{result ? range : '—'}{total !== null ? ` of ${total.toLocaleString()}` : ''}</span>
          <button className="btn btn-ghost" aria-label="Next page" disabled={loading || !result || (total !== null ? offset + pageSize >= total : result.rows.length < pageSize)} onClick={() => setOffset(offset + pageSize)}>›</button>
        </div>
      </div>
      <div className="quick-bar" aria-label="Row actions">
        <button className="btn btn-quick" disabled={!target || !editable || busy} onClick={() => selected && state.beginEdit(selected)} title="Edit the selected cell (Enter or F2)">Edit cell</button>
        <button className="btn btn-quick" disabled={!target || !editable || busy} onClick={() => setExpanded(true)} title="Read and edit the complete value in a resizable text editor">Expand / edit value</button>
        <button className="btn btn-quick" disabled={!target || meta.readOnly || busy} onClick={() => selected && void duplicateRow(selected.rowKey)} title="Copy the row (Ctrl/Cmd+D)">Duplicate row</button>
        <button className="btn btn-quick" disabled={!target || !editable || busy} onClick={() => selected && void deleteRow(selected.rowKey)} title="Stage a deletion (Ctrl/Cmd+Delete)">Delete row</button>
        <button className="btn btn-quick" disabled={!target?.change || busy} onClick={() => selected && void revertRow(selected.rowKey)} title="Discard this row's staged changes (Ctrl/Cmd+R)">Revert row</button>
        <span className="quick-sep" />
        <button className="btn btn-quick" disabled={!target} onClick={() => selected && void filterByCell(selected.rowKey, selected.column)}>Filter by cell</button>
        <button className="btn btn-quick" disabled={!filters.length} onClick={clearFilters}>Clear filters</button>
      </div>
      <div className="table-tools">
        <label className="jump-control"><span>Jump to column</span><select aria-label="Jump to column" value={selected?.column ?? ''}
          onChange={(e) => { state.select({ rowKey: selected?.rowKey ?? rows[0]?.key ?? '', column: e.target.value }); document.querySelector<HTMLElement>('.grid')?.focus(); }}>
          <option value="" disabled>All {meta.columns.length} columns…</option>
          {gridColumns(meta).map((c) => <option key={c.name} value={c.name}>{c.name}{c.inPrimaryKey ? ' · key' : ''}</option>)}
        </select></label>
        <span className="table-help">{target ? <><strong>{selected?.column}</strong><button className="link-button" onClick={() => useStore.setState({ showDocs: true })}>Inspect full value →</button></> : 'Select a cell to inspect or edit its full value.'}</span>
        <div className="toolbar-spacer" />
        <label className="page-size">Rows / page <select aria-label="Rows per page" value={settings?.pageSize ?? 100} onChange={(e) => void state.saveSettings({ pageSize: Number(e.target.value) }).catch((err) => state.notify('error', err.message))}>
          {[...new Set([50, 100, 200, 500, settings?.pageSize ?? 100])].sort((a, b) => a - b).map((size) => <option key={size} value={size}>{size}</option>)}
        </select></label>
        <button className="btn btn-ghost btn-quick" aria-expanded={showSql} onClick={() => setShowSql((s) => !s)}>Query SQL</button>
      </div>
      </>}
      {!scriptMode && search.trim() && result && (result.searchReferences?.length || result.searchNotes?.length) && (
        <div className="search-trace" aria-live="polite">
          {(result.searchReferences ?? []).map((hit, i) => (
            <span key={`${hit.entity}:${hit.term}:${i}`} className={`trace-chip ${hit.failed ? 'miss' : hit.matches ? 'hit' : 'miss'}`}
              title={`${hit.matches} ${hit.entity === 'creature' ? 'creatures' : hit.entity} matched “${hit.term}” in ${hit.entity === 'creature' ? 'creature_template' : hit.entity}`}>
              <b>{hit.entity}:</b>{' '}{hit.term}
              <span className="trace-arrow">→</span>
              {hit.failed ? 'lookup failed' : hit.matches ? hit.shown.join(', ') + (hit.matches > hit.shown.length ? ` · +${hit.matches - hit.shown.length} more` : '') : 'nothing found'}
            </span>
          ))}
          {(result.searchNotes ?? []).map((note, i) => <span key={`note:${i}`} className="trace-note">{note}</span>)}
        </div>
      )}
      {!scriptMode && filters.length > 0 && <div className="filter-chips" aria-label="Active filters">{filters.map((filter, i) => <span key={i} className="filter-chip">
        <span>{filterLabel(filter)}</span><button className="filter-chip-x" aria-label={`Remove filter ${filterLabel(filter)}`} onClick={() => setFilters(filters.filter((_, index) => index !== i))}>✕</button>
      </span>)}</div>}
      {showSql && result && <pre className="sql-strip">{result.sql}<span className="sql-timing">{result.durationMs} ms</span></pre>}
      {target?.ambiguous && <p className="notice">This row is identical to another row and has no unique key. Its values remain readable, but editing or deleting it cannot be targeted safely.</p>}
      {!scriptMode && (search || filters.length > 0) && relevant.length > 0 && <p className="source-query-note">Search and filters use source values. New staged rows stay visible; edits are not applied to the source.</p>}
      {state.editError && <div className="error-box edit-error" role="alert"><strong>Value not staged.</strong> {state.editError}<button className="btn btn-ghost btn-mini" aria-label="Dismiss value error" onClick={() => useStore.setState({ editError: null })}>✕</button></div>}
    </div>
    {queryError
      ? <div className="query-error" role="alert"><h2>Could not load rows</h2><p>{queryError}</p><div>
        <button className="btn btn-accent" onClick={retry}>Retry query</button><button className="btn" onClick={() => state.setDialog('connection')}>Check connection</button>
      </div></div>
      : scriptMode ? <SmartEditor /> : <DataGrid key={`${database}.${tableName}`} />}
    {expanded && target && selected && <ValueEditor column={meta.columns.find((column) => column.name === selected.column)!} value={displayValue(target, selected.column)}
      onCancel={() => setExpanded(false)} onChange={async (next) => {
        const success = await state.stageEdit(target.key, selected.column, next);
        if (success) setExpanded(false);
        return success;
      }} />}
    <footer className="table-status">
      <span>{meta.columns.length} columns · {result?.rows.length ?? 0} source rows{inserts ? ` + ${inserts} staged new` : ''}</span>
      <span>{busy ? 'Saving staged changes…' : relevant.length ? `${relevant.length} staged · not applied` : 'Edits are staged, never auto-applied'}</span>
      <span className="keyboard-hint">{scriptMode ? 'Click a row to edit · Ctrl/Cmd+N for a new event' : 'Enter to edit · Expand / edit value for full text'}</span>
    </footer>
  </div>;
}
