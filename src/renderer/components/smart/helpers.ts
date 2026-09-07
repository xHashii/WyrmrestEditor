/**
 * Helpers shared by the visual SmartAI editor.
 *
 * The editor deliberately does not invent its own storage: every change it
 * makes goes through the same staged-changes ledger as the grid, so preview,
 * export and apply behave identically no matter which view produced a change.
 */
import type { CellValue, ColumnMeta, DatabaseName, EntityMeta, Row, TableMeta } from '../../../shared/types';
import type { SmartData, SmartDef, SmartParamDef, SmartRow } from '../../../shared/smart';

/** Value sets / references are described as column metadata; reuse the editors. */
export function columnForParam(
  meta: TableMeta,
  param: SmartParamDef,
  entities: Record<string, EntityMeta>,
): ColumnMeta {
  const base = meta.columns.find((column) => column.name === param.column);
  const fallback: ColumnMeta = {
    name: param.column, ordinal: 0, label: param.label, baseType: 'int', rawType: 'int unsigned', kind: 'integer',
    unsigned: true, length: null, precision: null, scale: null, members: null, nullable: false, hasDefault: true, default: '0',
    autoIncrement: false, onUpdateCurrentTimestamp: false, comment: '', range: null, isBool: false, hint: param.description ?? null,
    description: param.description ?? null, docSource: null, editor: 'int', valueSet: null, valueSetSource: null, reference: null,
    dbc: null, inPrimaryKey: false,
  };
  const column = base ?? fallback;
  const valueSet = param.options?.length
    ? { kind: param.editor === 'flags' ? ('flags' as const) : ('enum' as const), values: param.options.map((option) => ({ value: option.value, name: option.name, comment: option.comment ?? undefined })) }
    : param.editor === 'bool'
      ? { kind: 'enum' as const, values: [{ value: 0, name: 'No' }, { value: 1, name: 'Yes' }] }
      : null;
  const entity = param.entity ? entities[param.entity] : null;
  const reference = entity
    ? { entity: entity.key, database: entity.database as DatabaseName, table: entity.table, column: entity.idColumn, source: 'curated' as const }
    : null;
  const editor = param.editor === 'reference' ? (reference ? ('reference' as const) : ('int' as const)) : param.editor === 'text' ? ('text' as const) : param.editor;
  return { ...column, label: param.label || column.label, hint: param.description ?? column.hint, description: param.description ?? column.description, editor, valueSet: valueSet ?? (param.editor === 'int' || param.editor === 'float' ? null : column.valueSet), reference };
}

/** The enum a column has from the schema, unless the definition narrows it. */
export function valueSetOf(param: SmartParamDef, column: ColumnMeta): ColumnMeta {
  return column.valueSet && !param.options?.length ? { ...column, editor: column.valueSet.kind === 'flags' ? 'flags' : 'enum' } : column;
}

export const asNumber = (value: CellValue, fallback = 0): number => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface ScriptKey {
  entryorguid: string | number;
  sourceType: number;
}

/** Columns a new SmartAI row needs before it can exist at all. */
export function newScriptRowValues(key: ScriptKey, id: number, extra: Row = {}): Row {
  return {
    entryorguid: asNumber(String(key.entryorguid)),
    source_type: key.sourceType,
    id,
    link: 0,
    event_type: 0,
    event_phase_mask: 0,
    event_chance: 100,
    event_flags: 0,
    action_type: 0,
    target_type: 0,
    Difficulties: '',
    comment: '',
    ...extra,
  };
}

/**
 * Parameters this core can actually store: a definition may document a param
 * whose column was added (or removed) in another branch, and staging a value
 * for an unknown column must never be attempted.
 */
export function supportedParams(meta: TableMeta | null, def: SmartDef | null | undefined): SmartParamDef[] {
  if (!def) return [];
  if (!meta) return def.params;
  const known = new Set(meta.columns.map((column) => column.name));
  return def.params.filter((param) => known.has(param.column));
}

/** Every column a definition writes, limited to the live schema. */
export const paramColumnsFor = (meta: TableMeta | null, def: SmartDef | null | undefined): string[] => supportedParams(meta, def).map((param) => param.column);

/** Values that reset a definition's parameters when the type changes. */
export function clearedParamValues(meta: TableMeta | null, def: SmartDef | null | undefined): Record<string, CellValue> {
  const out: Record<string, CellValue> = {};
  for (const param of supportedParams(meta, def)) {
    if (param.editor === 'text') out[param.column] = '';
    else if (param.default !== undefined) out[param.column] = param.default;
    else out[param.column] = 0;
  }
  return out;
}

/** The scripted entity a row belongs to, used to label a script. */
export function scriptEntity(data: SmartData | null, sourceType: number): string | null {
  return data?.sourceTypes.find((item) => item.value === sourceType)?.entity ?? null;
}

/**
 * Tables that get a guided editor instead of (or on top of) the raw grid.
 * Deliberately a renderer-side check: the metadata stays a faithful dump of the
 * database, and only the UI decides that `world.smart_scripts` is smarter.
 */
export function guidedEditorFor(meta: TableMeta | null): 'smart' | null {
  if (!meta) return null;
  if (meta.database === 'world' && meta.name === 'smart_scripts') return 'smart';
  return null;
}

/**
 * The tint a row group gets, mirroring the desktop editor: rows that belong to
 * one event share a colour so a chain is readable at a glance.
 */
export const TINTS = 6;
export const tintFor = (index: number): number => ((index % TINTS) + TINTS) % TINTS;

export function scriptLabel(data: SmartData | null, sourceType: number, entryorguid: string | number): string {
  const source = data?.sourceTypes.find((item) => item.value === sourceType);
  return source?.name ?? `source_type ${sourceType}`;
}

/** `0,1,3` → the difficulties a row is limited to, or null for "all". */
export function parseDifficulties(text: string): number[] {
  return [...new Set(String(text ?? '').split(',').map((part) => Number.parseInt(part.trim(), 10)).filter((value) => Number.isInteger(value) && value >= 0 && value <= 3))];
}

export const formatDifficulties = (values: number[]): string => (values.length ? values.join(',') : '');

export const difficultyLabel = (value: number): string =>
  ({ 0: 'Normal (10/25)', 1: 'Heroic (10/25)', 2: 'Normal (25)', 3: 'Heroic (25)' }[value] ?? `Difficulty ${value}`);

export function rowMatchesScript(row: SmartRow, key: ScriptKey): boolean {
  return String(row.entryorguid) === String(key.entryorguid) && row.sourceType === key.sourceType;
}
