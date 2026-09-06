import { useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { displayValue, gridRows, useStore } from '../store';
import { Cell } from './Cell';

const ROW_HEIGHT = 30;

function columnWidth(kind: string, editor: string): number {
  if (editor === 'bool') return 70;
  if (editor === 'flags') return 220;
  if (editor === 'enum') return 190;
  if (editor === 'reference') return 210;
  if (editor === 'longtext' || kind === 'string') return 240;
  if (editor === 'coordinate' || editor === 'orientation') return 110;
  return 100;
}

export function DataGrid() {
  const state = useStore();
  const { meta, loading, selected, select, toggleSort, orderBy, deleteRow } = state;
  const rows = useMemo(() => gridRows(state), [state.meta, state.result, state.ledger]);
  const parentRef = useRef<HTMLDivElement>(null);

  /** Spreadsheet-style keyboard navigation over the virtualised grid. */
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const { selected: cell, editing, meta: m } = useStore.getState();
    if (editing || !m || !cell) return;
    const rowIndex = rows.findIndex((r) => r.key === cell.rowKey);
    const colIndex = m.columns.findIndex((c) => c.name === cell.column);
    if (rowIndex < 0 || colIndex < 0) return;

    const move = (dRow: number, dCol: number) => {
      const row = rows[Math.min(Math.max(rowIndex + dRow, 0), rows.length - 1)];
      const column = m.columns[Math.min(Math.max(colIndex + dCol, 0), m.columns.length - 1)];
      select({ rowKey: row.key, column: column.name });
      virtualizer.scrollToIndex(rows.indexOf(row), { align: 'auto' });
    };

    switch (event.key) {
      case 'ArrowDown':
        move(1, 0);
        break;
      case 'ArrowUp':
        move(-1, 0);
        break;
      case 'ArrowRight':
        move(0, 1);
        break;
      case 'ArrowLeft':
        move(0, -1);
        break;
      case 'Tab':
        move(0, event.shiftKey ? -1 : 1);
        break;
      case 'PageDown':
        move(20, 0);
        break;
      case 'PageUp':
        move(-20, 0);
        break;
      case 'Home':
        move(0, -m.columns.length);
        break;
      case 'End':
        move(0, m.columns.length);
        break;
      case 'Enter':
      case 'F2':
        if (!m.readOnly) state.beginEdit(cell);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  if (!meta) return null;

  const widths = meta.columns.map((c) => columnWidth(c.kind, c.editor));
  const gridTemplate = `44px ${widths.map((w) => `${w}px`).join(' ')}`;

  if (!loading && rows.length === 0) {
    return (
      <div className="grid-empty">
        <p>No rows{state.search ? ` matching “${state.search}”` : ''}.</p>
        {!meta.readOnly && (
          <button className="btn btn-accent" onClick={() => void state.addRow()}>
            Stage a new row
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid" ref={parentRef} tabIndex={0} onKeyDown={onKeyDown}>
      <div className="grid-inner" style={{ width: `${widths.reduce((a, b) => a + b, 44)}px` }}>
        <div className="grid-head" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="grid-cell grid-head-cell row-gutter" />
          {meta.columns.map((column) => {
            const sort = orderBy.find((o) => o.column === column.name);
            return (
              <div
                key={column.name}
                className={`grid-cell grid-head-cell ${column.inPrimaryKey ? 'is-pk' : ''}`}
                onClick={() => toggleSort(column.name)}
                title={`${column.name} — ${column.rawType}${column.hint ? `\n\n${column.hint}` : ''}`}
              >
                <span className="head-label">{column.name}</span>
                {sort && <span className="sort">{sort.direction === 'asc' ? '▲' : '▼'}</span>}
                {column.reference && <span className="head-icon" title="ID picker">🔗</span>}
                {column.valueSet && <span className="head-icon" title={`${column.valueSet.kind} editor`}>≡</span>}
              </div>
            );
          })}
        </div>

        <div className="grid-body" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const gridRow = rows[virtualRow.index];
            const change = gridRow.change;
            const rowClass = [
              'grid-row',
              change?.kind === 'insert' ? 'row-inserted' : '',
              change?.kind === 'delete' ? 'row-deleted' : '',
              change?.kind === 'update' ? 'row-updated' : '',
              selected?.rowKey === gridRow.key ? 'row-selected' : '',
            ].join(' ');

            return (
              <div
                key={gridRow.key}
                className={rowClass}
                style={{
                  gridTemplateColumns: gridTemplate,
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${ROW_HEIGHT}px`,
                }}
              >
                <div className="grid-cell row-gutter">
                  <button
                    className="row-delete"
                    title={change?.kind === 'delete' ? 'Deletion staged — revert from the ledger' : 'Stage row deletion'}
                    disabled={meta.readOnly || change?.kind === 'delete'}
                    onClick={() => void deleteRow(gridRow.key)}
                  >
                    ×
                  </button>
                </div>
                {meta.columns.map((column) => (
                  <Cell
                    key={column.name}
                    column={column}
                    gridRow={gridRow}
                    value={displayValue(gridRow, column.name)}
                    dirty={Boolean(change?.values?.[column.name])}
                    selected={selected?.rowKey === gridRow.key && selected.column === column.name}
                    onSelect={() => {
                      select({ rowKey: gridRow.key, column: column.name });
                      parentRef.current?.focus({ preventScroll: true });
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
