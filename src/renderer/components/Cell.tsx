import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useStore, type GridRow } from '../store';
import type { CellValue, ColumnMeta } from '../../shared/types';
import { valueText } from '../../shared/values';
import { FlagsEditor } from './FlagsEditor';
import { ReferencePicker } from './ReferencePicker';
import { ValueEditor } from './ValueEditor';

interface Props {
  column: ColumnMeta; gridRow: GridRow; value: CellValue; dirty: boolean; selected: boolean;
  style?: CSSProperties; onSelect(): void;
}

export function flagLabels(column: ColumnMeta, value: CellValue): string[] {
  if (!column.valueSet || value == null) return [];
  try {
    const mask = BigInt(value);
    let remaining = mask;
    const names: string[] = [];
    for (const entry of column.valueSet.values) {
      const bit = BigInt(entry.value);
      if (bit === 0n) continue;
      if ((mask & bit) === bit) { names.push(entry.name); remaining &= ~bit; }
    }
    if (remaining) names.push(`0x${remaining.toString(16).toUpperCase()}`);
    return names;
  } catch { return [String(value)]; }
}

export function enumLabel(column: ColumnMeta, value: CellValue): string | null {
  return column.valueSet?.values.find((v) => String(v.value) === String(value))?.name ?? null;
}

export function Cell({ column, gridRow, value, dirty, selected, style, onSelect }: Props) {
  // Narrow subscriptions matter: tables can have thousands of visible cells.
  const isEditing = useStore((s) => s.editing?.rowKey === gridRow.key && s.editing?.column === column.name);
  const beginEdit = useStore((s) => s.beginEdit);
  const stageEdit = useStore((s) => s.stageEdit);
  const readOnly = useStore((s) => s.meta?.readOnly ?? false) || gridRow.change?.kind === 'delete' || Boolean(gridRow.ambiguous);
  const resolved = useStore((s) => column.reference?.entity ? s.names[column.reference.entity]?.[String(value)] : undefined);
  const [draft, setDraft] = useState(String(value ?? ''));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitted = useRef(false);
  const changed = useRef(false);

  useEffect(() => {
    if (isEditing) {
      submitted.current = false;
      changed.current = false;
      setDraft(String(value ?? ''));
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commit = async (next: CellValue): Promise<boolean> => {
    if (submitted.current) return false;
    submitted.current = true;
    setSaving(true);
    try {
      const success = await stageEdit(gridRow.key, column.name, next);
      if (!success) submitted.current = false;
      return success;
    } finally { setSaving(false); }
  };
  const commitDraft = () => void commit(value === null && draft === '' && !changed.current ? null : draft);
  const cancel = () => { submitted.current = true; beginEdit(null); };
  const classes = ['grid-cell', `cell-${column.editor}`, dirty ? 'cell-dirty' : '', selected ? 'cell-selected' : '',
    column.inPrimaryKey ? 'cell-pk' : '', style?.position === 'sticky' ? 'cell-pinned' : '',
    column.kind === 'integer' || column.kind === 'float' ? 'cell-number' : ''].join(' ');
  const props = { className: classes, style, role: 'gridcell', 'aria-readonly': readOnly, 'aria-selected': selected, 'data-column': column.name };

  const activate = () => {
    onSelect();
    if (readOnly) return;
    submitted.current = false;
    if (column.editor === 'bool') void commit(Number(value) ? 0 : 1);
    else beginEdit({ rowKey: gridRow.key, column: column.name });
  };

  if (isEditing && column.editor === 'flags') return <div {...props}>
    <FlagsEditor column={column} value={value} onCancel={cancel} onChange={(next) => void commit(next)} />
  </div>;
  if (isEditing && column.editor === 'reference' && column.reference) return <div {...props}>
    <ReferencePicker column={column} value={value} onCancel={cancel} onPick={(next) => void commit(next)} />
  </div>;
  if (isEditing && (['longtext', 'binary'].includes(column.editor) || (column.kind === 'string' && (String(value ?? '').length > 80 || /[\r\n]/.test(String(value ?? '')))))) return <div {...props}>
    <ValueEditor column={column} value={value} onCancel={cancel} onChange={commit} />
  </div>;
  if (isEditing && column.editor === 'enum' && column.valueSet) return <div {...props}>
    <select className="cell-input" aria-label={`Edit ${column.name}`} autoFocus value={value === null ? '__null__' : String(value)}
      onChange={(e) => void commit(e.target.value === '__null__' ? null : e.target.value)} onBlur={cancel}
      onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); cancel(); } }}>
      {column.nullable && <option value="__null__">NULL (no value)</option>}
      {value !== null && !column.valueSet.values.some((v) => String(v.value) === String(value)) && <option value={String(value)}>{String(value)} (unknown)</option>}
      {column.valueSet.values.map((entry) => <option key={String(entry.value)} value={String(entry.value)}>{entry.value} — {entry.name}</option>)}
    </select>
  </div>;
  if (isEditing) return <div {...props}>
    <input ref={inputRef} className="cell-input" aria-label={`Edit ${column.name}`} autoFocus value={draft} readOnly={saving} aria-busy={saving}
      onChange={(e) => { setDraft(e.target.value); changed.current = true; submitted.current = false; }}
      onBlur={commitDraft} onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's')) { e.preventDefault(); commitDraft(); }
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      }} />
    {column.nullable && <button className="cell-null-button" title="Set NULL (different from an empty string)" aria-label={`Set ${column.name} to NULL`}
      onMouseDown={(e) => e.preventDefault()} onClick={() => void commit(null)}>NULL</button>}
  </div>;

  let content: React.ReactNode;
  let detail = '';
  if (value == null) content = <span className="null">NULL</span>;
  else if (value === '') content = <span className="null">empty</span>;
  else if (column.editor === 'bool') content = <span className={`bool ${Number(value) ? 'on' : ''}`}>{Number(value) ? '✓ 1' : '0'}</span>;
  else if (column.editor === 'flags') {
    detail = flagLabels(column, value).join(' | ');
    content = <><span className="enum-value">{String(value)}</span><span className="flags">{detail}</span></>;
  } else if (column.editor === 'enum') {
    detail = enumLabel(column, value) ?? '';
    content = <><span className="enum-value">{String(value)}</span>{detail}</>;
  } else if (column.editor === 'reference' && column.reference) {
    detail = resolved ?? '';
    content = <span className="ref"><span className="ref-id">{String(value)}</span>{resolved && <span className="ref-name">{resolved}</span>}</span>;
  } else content = String(value);

  return <div {...props} onClick={onSelect} onDoubleClick={activate} title={`${column.name}: ${valueText(value)}${detail ? `\n${detail}` : ''}${dirty ? '\nStaged change' : ''}`}>
    <span className="cell-content">{content}</span>{dirty && <span className="dirty-dot" />}
  </div>;
}
