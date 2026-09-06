import { useEffect, useRef, useState } from 'react';
import { useStore, type GridRow } from '../store';
import type { CellValue, ColumnMeta } from '../../shared/types';
import { FlagsEditor } from './FlagsEditor';
import { ReferencePicker } from './ReferencePicker';

interface Props {
  column: ColumnMeta;
  gridRow: GridRow;
  value: CellValue;
  dirty: boolean;
  selected: boolean;
  onSelect(): void;
}

export function flagLabels(column: ColumnMeta, value: number): string[] {
  const set = column.valueSet;
  if (!set) return [];
  const names: string[] = [];
  let remaining = value;
  for (const entry of set.values) {
    const bit = Number(entry.value);
    if (!bit) continue;
    if ((value & bit) === bit) {
      names.push(entry.name);
      remaining &= ~bit;
    }
  }
  if (remaining) names.push(`0x${(remaining >>> 0).toString(16).toUpperCase()}`);
  return names;
}

export function enumLabel(column: ColumnMeta, value: CellValue): string | null {
  const entry = column.valueSet?.values.find((v) => String(v.value) === String(value));
  return entry ? entry.name : null;
}

export function Cell({ column, gridRow, value, dirty, selected, onSelect }: Props) {
  // Fine grained subscriptions: a table can paint thousands of cells, so a
  // cell must not re-render because some unrelated slice of state changed.
  const isEditing = useStore(
    (s) => s.editing?.rowKey === gridRow.key && s.editing?.column === column.name,
  );
  const beginEdit = useStore((s) => s.beginEdit);
  const stageEdit = useStore((s) => s.stageEdit);
  const readOnly = useStore((s) => s.meta?.readOnly ?? false);
  const resolvedName = useStore((s) =>
    column.reference?.entity ? s.names[column.reference.entity]?.[String(value)] : undefined,
  );
  const [draft, setDraft] = useState<string>(value === null ? '' : String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(value === null ? '' : String(value));
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [isEditing, value]);

  const commit = (next: CellValue) => {
    void stageEdit(gridRow.key, column.name, next);
  };

  const commitDraft = () => {
    if (column.nullable && draft === '') return commit(null);
    if (column.kind === 'integer') {
      const parsed = Number.parseInt(draft, 10);
      return commit(Number.isFinite(parsed) ? parsed : 0);
    }
    if (column.kind === 'float') {
      const parsed = Number.parseFloat(draft);
      return commit(Number.isFinite(parsed) ? parsed : 0);
    }
    return commit(draft);
  };

  const classes = [
    'grid-cell',
    `cell-${column.editor}`,
    dirty ? 'cell-dirty' : '',
    selected ? 'cell-selected' : '',
    column.inPrimaryKey ? 'cell-pk' : '',
    column.kind === 'integer' || column.kind === 'float' ? 'cell-number' : '',
  ].join(' ');

  const activate = () => {
    onSelect();
    if (readOnly) return;
    if (column.editor === 'bool') {
      commit(Number(value) ? 0 : 1);
      return;
    }
    beginEdit({ rowKey: gridRow.key, column: column.name });
  };

  // ---- editing surfaces -----------------------------------------------------
  if (isEditing && column.editor === 'flags') {
    return (
      <div className={classes}>
        <FlagsEditor
          column={column}
          value={Number(value ?? 0)}
          onCancel={() => beginEdit(null)}
          onChange={(next) => commit(next)}
        />
      </div>
    );
  }

  if (isEditing && column.editor === 'reference' && column.reference) {
    return (
      <div className={classes}>
        <ReferencePicker
          column={column}
          value={value}
          onCancel={() => beginEdit(null)}
          onPick={(next) => commit(next)}
        />
      </div>
    );
  }

  if (isEditing && column.editor === 'enum' && column.valueSet) {
    return (
      <div className={classes}>
        <select
          className="cell-input"
          autoFocus
          value={String(value ?? '')}
          onChange={(e) => commit(column.kind === 'integer' ? Number(e.target.value) : e.target.value)}
          onBlur={() => beginEdit(null)}
        >
          {!column.valueSet.values.some((v) => String(v.value) === String(value)) && (
            <option value={String(value ?? '')}>{String(value ?? '')} (unknown)</option>
          )}
          {column.valueSet.values.map((entry) => (
            <option key={String(entry.value)} value={String(entry.value)}>
              {entry.value} — {entry.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={classes}>
        <input
          ref={inputRef}
          className="cell-input"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitDraft();
            }
            if (e.key === 'Escape') beginEdit(null);
          }}
        />
      </div>
    );
  }

  // ---- display --------------------------------------------------------------
  let content: React.ReactNode;
  if (value === null || value === undefined) {
    content = <span className="null">NULL</span>;
  } else if (column.editor === 'bool') {
    content = <span className={`bool ${Number(value) ? 'on' : ''}`}>{Number(value) ? '✓' : '·'}</span>;
  } else if (column.editor === 'flags') {
    const labels = flagLabels(column, Number(value));
    content = Number(value) === 0 ? <span className="muted">0</span> : <span className="flags">{labels.join(' | ')}</span>;
  } else if (column.editor === 'enum') {
    const label = enumLabel(column, value);
    content = label ? (
      <span>
        <span className="enum-value">{String(value)}</span> {label}
      </span>
    ) : (
      String(value)
    );
  } else if (column.editor === 'reference' && column.reference) {
    const resolved = resolvedName;
    content =
      Number(value) === 0 && column.kind === 'integer' ? (
        <span className="muted">0</span>
      ) : (
        <span className="ref">
          <span className="ref-id">{String(value)}</span>
          {resolved ? <span className="ref-name">{resolved}</span> : null}
        </span>
      );
  } else {
    content = String(value);
  }

  return (
    <div className={classes} onClick={onSelect} onDoubleClick={activate} title={dirty ? 'Staged change' : undefined}>
      {content}
      {dirty && <span className="dirty-dot" />}
    </div>
  );
}
