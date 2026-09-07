import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { displayValue, gridRows, useStore } from '../store';
import type { ColumnMeta, TableMeta } from '../../shared/types';
import { Cell } from './Cell';

const ROW_HEIGHT = 32;
const GUTTER = 42;

/** Keep row identity and the human name together; every schema column remains
 * available, including in the jump menu and the full-row inspector. */
export function gridColumns(meta: TableMeta): ColumnMeta[] {
  const first = [...meta.identityColumns, ...(meta.nameColumn ? [meta.nameColumn] : [])];
  return [...new Set([...first, ...meta.columns.map((c) => c.name)])].map((name) => meta.columns.find((c) => c.name === name)!);
}

function columnWidth(column: ColumnMeta, primary: boolean): number {
  const base = primary ? 110 : column.editor === 'bool' ? 80 : column.editor === 'flags' ? 220 : column.editor === 'enum' ? 195 :
    column.editor === 'reference' ? 195 : column.kind === 'string' || column.editor === 'longtext' ? 230 : 110;
  return Math.min(280, Math.max(base, column.name.length * 7 + 28));
}

export function DataGrid() {
  const state = useStore();
  const { meta, loading, selected, select, toggleSort, orderBy } = state;
  const rows = useMemo(() => gridRows(state), [state.meta, state.result, state.ledger, state.database, state.tableName]);
  const columns = useMemo(() => meta ? gridColumns(meta) : [], [meta]);
  const widths = useMemo(() => columns.map((c) => columnWidth(c, meta?.identityColumns.includes(c.name) ?? false)), [columns, meta]);
  const parentRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  useEffect(() => {
    const parent = parentRef.current;
    if (!parent || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setViewportWidth(parent.clientWidth));
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);
  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => parentRef.current, estimateSize: () => ROW_HEIGHT, overscan: 12, scrollPaddingStart: 44 });

  // Arrow keys, column jumps and new rows must stay visible in BOTH axes.
  useEffect(() => {
    const parent = parentRef.current;
    if (!parent || !selected) return;
    const column = columns.findIndex((c) => c.name === selected.column);
    const row = rows.findIndex((r) => r.key === selected.rowKey);
    if (row >= 0 && typeof parent.scrollTo === 'function') virtualizer.scrollToIndex(row, { align: 'auto' });
    if (column >= 0) {
      const start = widths.slice(0, column).reduce((a, b) => a + b, GUTTER);
      const pinnedWidth = GUTTER + (widths[0] ?? 0);
      if (column === 0) parent.scrollLeft = 0;
      else if (start < parent.scrollLeft + pinnedWidth) parent.scrollLeft = Math.max(0, start - pinnedWidth);
      else if (start + widths[column] > parent.scrollLeft + parent.clientWidth) parent.scrollLeft = start + widths[column] - parent.clientWidth;
    }
  }, [selected?.rowKey, selected?.column, columns, widths, rows.length, viewportWidth]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== parentRef.current || event.ctrlKey || event.metaKey || event.altKey) return;
    const { selected: cell, editing } = useStore.getState();
    if (editing || !meta || !rows.length) return;
    if (!cell) { if (['Enter', 'ArrowDown', 'ArrowRight'].includes(event.key)) { event.preventDefault(); select({ rowKey: rows[0].key, column: columns[0].name }); } return; }
    const rowIndex = rows.findIndex((r) => r.key === cell.rowKey);
    const colIndex = columns.findIndex((c) => c.name === cell.column);
    if (rowIndex < 0 || colIndex < 0) return;
    const move = (row: number, column: number) => select({ rowKey: rows[Math.max(0, Math.min(row, rows.length - 1))].key,
      column: columns[Math.max(0, Math.min(column, columns.length - 1))].name });
    switch (event.key) {
      case 'ArrowDown': move(rowIndex + 1, colIndex); break;
      case 'ArrowUp': move(rowIndex - 1, colIndex); break;
      case 'ArrowRight': move(rowIndex, colIndex + 1); break;
      case 'ArrowLeft': move(rowIndex, colIndex - 1); break;
      case 'Tab': {
        const next = colIndex + (event.shiftKey ? -1 : 1);
        // At either end of the grid, let Tab leave instead of trapping focus.
        if ((next < 0 && rowIndex === 0) || (next === columns.length && rowIndex === rows.length - 1)) return;
        move(rowIndex + (next < 0 ? -1 : next === columns.length ? 1 : 0), (next + columns.length) % columns.length);
        break;
      }
      case 'PageDown': move(rowIndex + Math.max(1, Math.floor((parentRef.current?.clientHeight ?? 640) / ROW_HEIGHT) - 1), colIndex); break;
      case 'PageUp': move(rowIndex - Math.max(1, Math.floor((parentRef.current?.clientHeight ?? 640) / ROW_HEIGHT) - 1), colIndex); break;
      case 'Home': move(rowIndex, 0); break;
      case 'End': move(rowIndex, columns.length - 1); break;
      case 'Enter':
      case 'F2':
        if (columns[colIndex].editor === 'bool') void state.stageEdit(cell.rowKey, cell.column, Number(displayValue(rows[rowIndex], cell.column)) ? 0 : 1);
        else state.beginEdit(cell);
        break;
      default: return;
    }
    event.preventDefault();
  };

  if (!meta) return null;
  const gridTemplate = `${GUTTER}px ${widths.map((w) => `${w}px`).join(' ')}`;
  const hasQuery = Boolean(state.search || state.filters.length);

  return (
    <div className="grid" ref={parentRef} tabIndex={0} onKeyDown={onKeyDown} role="grid" aria-label={`${meta.name} rows`}
      aria-busy={loading} aria-readonly={meta.readOnly} aria-colcount={columns.length + 1} aria-rowcount={rows.length + 1}>
      <div className="grid-inner" style={{ width: `${widths.reduce((a, b) => a + b, GUTTER)}px` }}>
        <div className="grid-head" style={{ gridTemplateColumns: gridTemplate }} role="row" aria-rowindex={1}>
          <div className="grid-cell grid-head-cell row-gutter" role="columnheader" aria-label="Row">#</div>
          {columns.map((column, index) => {
            const sort = orderBy.find((o) => o.column === column.name);
            return <div key={column.name} role="columnheader" aria-colindex={index + 2} aria-sort={sort ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}
              className={`grid-cell grid-head-cell ${column.inPrimaryKey ? 'is-pk' : ''} ${index === 0 ? 'cell-pinned' : ''}`}
              style={index === 0 ? { position: 'sticky', left: GUTTER } : undefined} data-column={column.name}>
              <button className="column-sort" title={`${column.name} — ${column.rawType}${column.hint ? `\n\n${column.hint}` : ''}`} onClick={() => toggleSort(column.name)}>
                <span className="head-label">{column.name}</span>{sort && <span className="sort">{sort.direction === 'asc' ? '▲' : '▼'}</span>}
                <span className="head-type">{column.rawType}{column.inPrimaryKey ? ' · key' : column.reference ? ' · reference' : ''}</span>
              </button>
            </div>;
          })}
        </div>
        <div className="grid-body" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const gridRow = rows[virtualRow.index];
            if (!gridRow) return null;
            const change = gridRow.change;
            return <div key={gridRow.key} role="row" aria-rowindex={virtualRow.index + 2}
              className={`grid-row ${change ? `row-${change.kind === 'insert' ? 'inserted' : change.kind === 'delete' ? 'deleted' : 'updated'}` : ''} ${selected?.rowKey === gridRow.key ? 'row-selected' : ''}`}
              style={{ gridTemplateColumns: gridTemplate, transform: `translateY(${virtualRow.start}px)`, height: ROW_HEIGHT }}>
              <div className="grid-cell row-gutter" role="rowheader">
                <button className={`row-number ${change ? `kind-${change.kind}` : ''}`} title={change ? `${change.kind} staged` : `Row ${state.offset + virtualRow.index + 1}`}
                  aria-label={`Select row ${virtualRow.index + 1}${change ? `, ${change.kind} staged` : ''}`}
                  onClick={() => { select({ rowKey: gridRow.key, column: columns[0].name }); parentRef.current?.focus({ preventScroll: true }); }}>
                  {change ? change.kind === 'insert' ? '+' : change.kind === 'delete' ? '−' : '•' : state.offset + virtualRow.index + 1}
                </button>
              </div>
              {columns.map((column, index) => <Cell key={column.name} column={column} gridRow={gridRow} value={displayValue(gridRow, column.name)}
                dirty={Boolean(change?.values?.[column.name])} selected={selected?.rowKey === gridRow.key && selected.column === column.name}
                style={index === 0 ? { position: 'sticky', left: GUTTER } : undefined}
                onSelect={() => { select({ rowKey: gridRow.key, column: column.name }); parentRef.current?.focus({ preventScroll: true }); }} />)}
            </div>;
          })}
        </div>
      </div>
      {loading && <div className="grid-loading" role="status"><span className="spinner" />Loading rows…</div>}
      {!loading && !rows.length && <div className="grid-empty">
        <h2>{hasQuery ? 'No matching rows' : 'No rows in this table'}</h2>
        <p>{hasQuery ? 'Try a different search or remove the filters.' : state.status?.mode === 'demo' ? 'This table has real schema metadata, but no built-in sample rows.' : 'Start by staging a new row.'}</p>
        <div>{hasQuery ? <button className="btn" onClick={() => { state.setSearch(''); state.clearFilters(); }}>Clear search & filters</button> : !meta.readOnly &&
          <button className="btn btn-accent" onClick={() => void state.addRow()}>Stage a new row</button>}</div>
      </div>}
    </div>
  );
}
