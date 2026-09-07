/**
 * SmartAI (`world.smart_scripts`) domain model.
 *
 * `smart_scripts` rows are flat, but a script is not: an *event* row may link
 * to a chain of *action* rows through `id`/`link`, and the meaning of every
 * `*_param` column depends on the `event_type` / `action_type` / `target_type`
 * of that row. This module is the pure, testable core of the visual SmartAI
 * editor — the React layer only renders what it produces.
 *
 * It is shared (not renderer-only) because the service uses the same model for
 * server-side validation, and the tests exercise it without a DOM.
 */
import type { CellValue, Row, StagedChange } from './types.js';
import { valueText } from './values.js';

// ---------------------------------------------------------------------------
// generated definitions (see tools/build-smartai.mjs)
// ---------------------------------------------------------------------------

export type SmartEditorKind = 'int' | 'float' | 'bool' | 'enum' | 'flags' | 'text' | 'reference';

export interface SmartOption {
  value: number;
  name: string;
  comment?: string | null;
}

export interface SmartParamDef {
  /** 1..7 for the numbered columns; 900+ for the string/position columns. */
  index: number;
  column: string;
  label: string;
  description?: string | null;
  editor: SmartEditorKind;
  entity?: string;
  options?: SmartOption[] | null;
  valueSetName?: string;
  required?: boolean;
  default?: number | string;
  hint?: string;
}

export interface SmartDef {
  id: number;
  name: string;
  label: string;
  comment?: string | null;
  description?: string | null;
  template?: string | null;
  help?: string | null;
  deprecated?: boolean;
  timed?: boolean;
  supported?: boolean;
  targetTypes?: string[] | null;
  targetIsSource?: boolean | null;
  implicitSource?: string[] | null;
  sources?: string[] | null;
  usesTargetPosition?: boolean;
  async?: boolean;
  scriptTypes?: number[] | null;
  tags: string[];
  params: SmartParamDef[];
}

export interface SmartSource {
  key: 'event' | 'action' | 'target';
  typeColumn: string;
  def: SmartDef | null;
  /** The type id stored in the row, even when it is unknown to this core. */
  id: number;
  constant: string;
  label: string;
  params: SmartParamDef[];
  /** Raw values of `params` plus the row-level extras (chance, flags, phase…). */
  values: Record<string, CellValue>;
  rowKey: string;
  column: string;
}

export interface SmartData {
  generated: string;
  wiki: { page: string; variant: string; sha1: string };
  smartData: { project: string; license: string; vendoredIn: string };
  sourceTypes: { value: number; name: string; comment: string | null; entity: string | null }[];
  sourceTypeEntityForNegative: Record<string, string>;
  events: SmartDef[];
  actions: SmartDef[];
  targets: SmartDef[];
  groups: { events: { name: string; members: string[] }[]; actions: { name: string; members: string[] }[]; targets: { name: string; members: string[] }[] };
  flagSets: Record<string, SmartOption[]>;
  notes?: string[];
}

// ---------------------------------------------------------------------------
// row model
// ---------------------------------------------------------------------------

export interface SmartRow {
  rowKey: string;
  origin: 'db' | 'staged-insert';
  change: StagedChange | null;
  /** Values as displayed (source rows with staged edits merged in). */
  values: Row;
  entryorguid: number;
  sourceType: number;
  id: number;
  link: number;
  event: SmartSource;
  action: SmartSource;
  target: SmartSource;
  difficulties: string;
  comment: string;
  /** True when the row only carries a comment (the SAI "comment row"). */
  isComment: boolean;
  /** True for action-only rows (`event_type` 0 with a real action). */
  isActionOnly: boolean;
  colorId: number;
  /** Scratch field used while computing renumbering patches. */
  __newId?: number;
}

export interface SmartEntry {
  /** Row index inside the script (the row that owns the event). */
  head: SmartRow;
  /** Action-only rows chained to this event through `link`. */
  actions: SmartRow[];
  /** Rows linked from an action of this event (rare, but legal). */
  chained: SmartRow[];
  kind: 'event' | 'comment' | 'action';
  /** Set when a `link` target does not exist in the script. */
  brokenLink: number | null;
}

export interface SmartScript {
  rows: SmartRow[];
  entries: SmartEntry[];
  /** Rows that are linked by more than one row, or that their owner hides. */
  orphans: SmartRow[];
  entryorguid: number;
  sourceType: number;
}

const number = (value: CellValue): number => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const smartValue = (row: { values: Row }, column: string): CellValue => row.values[column] ?? null;

export function definitionById(defs: SmartDef[] | undefined, id: number | null | undefined): SmartDef | null {
  if (id === null || id === undefined) return null;
  return (defs ?? []).find((def) => def.id === Number(id)) ?? null;
}

export function definitionsFor(data: SmartData | null | undefined, key: 'event' | 'action' | 'target'): SmartDef[] {
  if (!data) return [];
  return key === 'event' ? data.events : key === 'action' ? data.actions : data.targets;
}

const COLUMNS = {
  event: { type: 'event_type', prefix: 'event_param', chance: 'event_chance', flags: 'event_flags', phase: 'event_phase_mask' },
  action: { type: 'action_type', prefix: 'action_param' },
  target: { type: 'target_type', prefix: 'target_param' },
} as const;

function sourceFor(key: 'event' | 'action' | 'target', row: Row, values: Row, defs: SmartDef[]): SmartSource {
  const config = COLUMNS[key];
  const id = number(values[config.type] ?? row[config.type]);
  const def = definitionById(defs, id);
  const params: SmartParamDef[] = (def?.params ?? []).filter((param) => Object.prototype.hasOwnProperty.call(values, param.column));
  const collected: Record<string, CellValue> = {};
  for (const param of params) collected[param.column] = values[param.column] ?? null;
  const constant = def?.name ?? (id ? `${key.toUpperCase()}_${id}` : `${key.toUpperCase()}_NONE`);
  return {
    key,
    typeColumn: config.type,
    def,
    id,
    constant,
    label: def?.label ?? (id === 0 ? 'None' : `Unknown (${id})`),
    params,
    values: collected,
    rowKey: '',
    column: config.type,
  };
}

/** The event/action/target a set of (possibly draft) values describes. */
export function smartSourceFor(data: SmartData | null, key: 'event' | 'action' | 'target', values: Row): SmartSource {
  return sourceFor(key, {}, values, definitionsFor(data, key));
}

/**
 * Turn grid rows (source values merged with staged edits) into SmartAI rows.
 * Unknown column names are tolerated so a partially edited draft still renders.
 */
export function toSmartRows(rows: { key: string; row: Row; change: StagedChange | null; origin: 'db' | 'staged-insert' }[], data: SmartData | null): SmartRow[] {
  const events = definitionsFor(data, 'event');
  const actions = definitionsFor(data, 'action');
  const targets = definitionsFor(data, 'target');
  return rows.map((item) => {
    const values: Row = { ...item.row };
    for (const [column, delta] of Object.entries(item.change?.values ?? {})) values[column] = delta.after;
    const base: SmartRow = {
      rowKey: item.key,
      origin: item.origin,
      change: item.change,
      values,
      entryorguid: number(values.entryorguid),
      sourceType: number(values.source_type),
      id: number(values.id),
      link: number(values.link),
      event: sourceFor('event', item.row, values, events),
      action: sourceFor('action', item.row, values, actions),
      target: sourceFor('target', item.row, values, targets),
      difficulties: String(values.Difficulties ?? '').trim(),
      comment: String(values.comment ?? ''),
      isComment: false,
      isActionOnly: false,
      colorId: 0,
    };
    base.isActionOnly = base.event.id === 0 && base.action.id !== 0;
    base.isComment = base.event.id === 0 && base.action.id === 0 && base.comment.trim() !== '';
    return base;
  });
}

/**
 * Group a script's rows into events with their chained actions.
 *
 * The schema has no foreign key for a chain: an event's `link` holds the `id`
 * of its first action row and each action row's `link` holds the next id. Rows
 * are ordered by `id` first so the visual order matches what the core reads.
 */
export function buildScript(rows: SmartRow[]): SmartScript {
  const sorted = [...rows].sort((a, b) => a.id - b.id || a.link - b.link);
  const byId = new Map<number, SmartRow>();
  for (const row of sorted) if (!byId.has(row.id)) byId.set(row.id, row);

  const consumed = new Set<string>();
  const entries: SmartEntry[] = [];
  const orphans: SmartRow[] = [];

  const chainFrom = (start: number, seen: Set<number>): { rows: SmartRow[]; broken: number | null } => {
    const chained: SmartRow[] = [];
    let cursor: number | null = start;
    while (cursor !== null && cursor !== 0 && !seen.has(cursor)) {
      const next = byId.get(cursor);
      if (!next) return { rows: chained, broken: cursor };
      seen.add(cursor);
      consumed.add(next.rowKey);
      chained.push(next);
      cursor = next.link;
    }
    return { rows: chained, broken: null };
  };

  for (const row of sorted) {
    if (consumed.has(row.rowKey)) continue;
    if (row.isComment || row.isActionOnly) {
      // Loose rows keep their own chain so nested action lists still render.
      const seen = new Set<number>([row.id]);
      consumed.add(row.rowKey);
      const { rows: chained, broken } = chainFrom(row.link, seen);
      entries.push({ head: row, actions: chained.filter((item) => item.rowKey !== row.rowKey), chained, kind: row.isComment ? 'comment' : 'action', brokenLink: broken });
      continue;
    }
    const seen = new Set<number>([row.id]);
    consumed.add(row.rowKey);
    const { rows: chained, broken } = chainFrom(row.link, seen);
    entries.push({ head: row, actions: chained, chained, kind: 'event', brokenLink: broken });
  }

  const first = sorted[0];
  return {
    rows: sorted,
    entries,
    orphans,
    entryorguid: first?.entryorguid ?? 0,
    sourceType: first?.sourceType ?? 0,
  };
}

/** `id` values are per-script; the next free one avoids clashing with links. */
export function nextScriptId(rows: SmartRow[]): number {
  let highest = -1;
  for (const row of rows) highest = Math.max(highest, row.id, row.link);
  return highest + 1;
}

/**
 * Patch that attaches `actionId` to the end of an event's action chain.
 * Returns the row whose `link` has to change (the event head or its last action).
 */
export function linkPatchFor(entry: SmartEntry, actionId: number): { rowKey: string; values: Record<string, CellValue> } | null {
  const last = entry.actions[entry.actions.length - 1];
  if (last) return { rowKey: last.rowKey, values: { link: actionId } };
  if (entry.head.isActionOnly || entry.head.isComment) return null;
  return { rowKey: entry.head.rowKey, values: { link: actionId } };
}

/** Rows whose `link` points at `removedId`, and the value they must take instead. */
export function unlinkPatchFor(rows: SmartRow[], removedId: number, replacement: number): { rowKey: string; values: Record<string, CellValue> }[] {
  return rows
    .filter((row) => row.rowKey !== '' && row.link === removedId)
    .map((row) => ({ rowKey: row.rowKey, values: { link: replacement } }));
}

/**
 * Re-number a script after a reorder. Each entry is the ordered list of row ids
 * that belong together (event row first, then its chained actions); ids are
 * assigned from 0 in the new order and every `link` follows the same mapping, so
 * a chain can never end up pointing at another event.
 */
export function reorderScript(rows: SmartRow[], orderedEntries: number[][]): { rowKey: string; values: Record<string, CellValue> }[] {
  const byId = new Map<number, SmartRow>();
  for (const row of rows) if (!byId.has(row.id)) byId.set(row.id, row);
  const mapped = new Map<number, number>();
  let next = 0;
  for (const group of orderedEntries) for (const old of group) if (!mapped.has(old)) mapped.set(old, next++);
  const patches = new Map<string, Record<string, CellValue>>();
  const remember = (row: SmartRow, column: string, value: CellValue) => {
    if (String(row.values[column] ?? '') === String(value)) return;
    const patch = patches.get(row.rowKey) ?? {};
    patch[column] = value;
    patches.set(row.rowKey, patch);
  };
  for (const group of orderedEntries) {
    group.forEach((old, index) => {
      const row = byId.get(old);
      const assigned = mapped.get(old);
      if (!row || assigned === undefined) return;
      remember(row, 'id', assigned);
      const follower = index + 1 < group.length ? mapped.get(group[index + 1]) : 0;
      remember(row, 'link', follower ?? 0);
    });
  }
  return [...patches].map(([rowKey, values]) => ({ rowKey, values }));
}

/** Ids of every row of an entry, in chain order — the input `reorderScript` wants. */
export function entryIdGroups(script: SmartScript): number[][] {
  return script.entries.map((entry) => [entry.head.id, ...entry.actions.map((row) => row.id)]);
}

// ---------------------------------------------------------------------------
// human readable description
// ---------------------------------------------------------------------------

export type SmartSegment =
  | { type: 'text'; text: string }
  | { type: 'emphasis'; text: string }
  | { type: 'param'; column: string; label: string; text: string; editor: SmartEditorKind; entity?: string }
  | { type: 'link'; column: string; label: string; text: string };

export interface SmartDescriptionContext {
  /** Value stored for a parameter column. */
  value(column: string): CellValue;
  /** `entryorguid` of the script: what `{sourceid}` means. */
  sourceId?: CellValue;
  /** Resolved name for a reference value, when we have one. */
  name?(entity: string, value: CellValue): string | null | undefined;
  labelFor?(def: SmartDef | null, param: SmartParamDef | undefined, value: CellValue): string | null;
  targetLabel?: string;
  sourceLabel?: string;
  position?: string;
}

function findParam(source: SmartSource | undefined, index: number): SmartParamDef | undefined {
  return source?.params.find((param) => param.index === index);
}

/**
 * Render one `{…}` expression of WDE's description template language.
 * Supported: `{pramN}`, `{pramNvalue}`, `{pramNvalue:choose(a|b):then|else}`,
 * `{target}`, `{source}`, `{sourceid}`, `{targetcoords}`, `{o}` and `[s]…[/s]`.
 */
function renderExpression(expression: string, context: SmartDescriptionContext, sources: { event?: SmartSource; action?: SmartSource; target?: SmartSource }): string {
  const [head, ...rest] = splitTopLevel(expression, ':');
  const key = (head ?? '').trim();
  let value = '';
  // What `:choose(…)` compares against. Always the stored value: a branch is a
  // statement about the data, not about how we happened to label it.
  let comparable = '';
  const paramMatch = /^pram(\d+)(value)?$/.exec(key);
  if (paramMatch) {
    const index = Number.parseInt(paramMatch[1], 10);
    const wantDisplay = Boolean(paramMatch[2]);
    const param = findParam(sources.action, index) ?? findParam(sources.event, index) ?? findParam(sources.target, index);
    const stored = param ? context.value(param.column) : null;
    comparable = valueText(stored);
    value = wantDisplay && param && context.labelFor ? (context.labelFor(null, param, stored) ?? comparable) : comparable;
  } else if (key === 'target') { value = context.targetLabel ?? ''; comparable = valueText(context.value('target_type')); }
  else if (key === 'source') { value = context.sourceLabel ?? ''; comparable = valueText(context.sourceId ?? 0); }
  else if (key === 'sourceid') { value = valueText(context.sourceId ?? context.sourceLabel ?? ''); comparable = valueText(context.sourceId ?? 0); }
  else if (key === 'targetcoords' || key === 'position') { value = context.position ?? ''; comparable = value; }
  else if (key === 'o') { value = valueText(context.value('target_o')); comparable = value; }
  else if (key.startsWith('targetid')) { value = valueText(context.value('target_type')); comparable = value; }
  else { value = ''; comparable = ''; }

  if (!rest.length) return value;
  const directive = rest.join(':');
  const choose = /^choose\(([^)]*)\)\s*([\s\S]*)$/.exec(directive.trimStart());
  if (!choose) return value;
  const wanted = new Set(choose[1].split('|').map((part) => part.trim()).filter((part) => part !== ''));
  // Branches are spliced back into a sentence, so their padding is meaningful.
  const branches = splitBranches(choose[2].replace(/^\s*:/, ''));
  const numeric = Number.parseFloat(comparable.trim());
  const hit = [...wanted].some((option) => option === comparable.trim() || (Number.isFinite(numeric) && Number.parseInt(option, 10) === numeric));
  const branch = hit ? branches[0] ?? '' : branches.slice(1).join('|') ?? '';
  return renderTemplateText(branch, context, sources, false);
}

/** Like `splitTopLevel` but whitespace-safe, for template branches. */
function splitBranches(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if (char === '{') depth++;
    else if (char === '}') depth = Math.max(0, depth - 1);
    if (char === '|' && depth === 0) { parts.push(current); current = ''; continue; }
    current += char;
  }
  parts.push(current);
  return parts;
}

/** Split on `separator`, ignoring separators nested inside braces. */
function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if (char === '{') depth++;
    else if (char === '}') depth = Math.max(0, depth - 1);
    if (char === separator && depth === 0) { parts.push(current); current = ''; continue; }
    current += char;
  }
  parts.push(current);
  // Keep branch padding: only the expression key is whitespace-insensitive.
  return parts;
}

/**
 * WDE's description templates carry wiki markup that should never reach the UI:
 * `[spell={pram1value}]` is a link, `[p]` a paragraph break. Unwrap them so the
 * value stays and the syntax disappears, and drop a raw id that repeats the
 * name we just resolved (`[spell=Fireball] 133`).
 */
export function unwrapTemplateMarkup(template: string): string {
  return String(template ?? '')
    // `[spell={pram1value}] {pram1}` asks for the same number twice: once as a
    // link, once raw. Keep the link, drop the raw id.
    .replace(/\[(spell|quest|item|creature|gameobject|area|map|emote|broadcasttext|text)=\{pram(\d+)value\}\]\s*\{pram\d+\}/gi, '[$1={pram$2value}]')
    .replace(/\[(spell|quest|item|creature|gameobject|area|map|emote|broadcasttext|text)=?([^\]]*)\]/gi, '$2')
    .replace(/\[\/?p(?:=\d+)?\]/gi, ' ')
    .replace(/(\{pram\d+value\})\s*\1/gi, '$1')
    .replace(/\]\s*\{(pram\d+)\}/gi, '] {$1}')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Render a template into plain text (used for comments and titles). */
export function renderTemplate(template: string, context: SmartDescriptionContext, sources: { event?: SmartSource; action?: SmartSource; target?: SmartSource } = {}): string {
  return renderTemplateText(unwrapTemplateMarkup(template), context, sources, true);
}

/**
 * `trim` only applies to the outermost render: a `choose` branch is embedded
 * mid-sentence, and trimming it would glue words together.
 */
function renderTemplateText(template: string, context: SmartDescriptionContext, sources: { event?: SmartSource; action?: SmartSource; target?: SmartSource }, root: boolean): string {
  let text = '';
  let index = 0;
  while (index < template.length) {
    const open = template.indexOf('{', index);
    if (open < 0) { text += template.slice(index); break; }
    text += template.slice(index, open);
    let depth = 0;
    let end = open;
    for (; end < template.length; end++) {
      if (template[end] === '{') depth++;
      else if (template[end] === '}') { depth--; if (depth === 0) break; }
    }
    if (end >= template.length) { text += template.slice(open); break; }
    text += renderExpression(template.slice(open + 1, end), context, sources);
    index = end + 1;
  }
  const collapsed = text.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1');
  return root ? collapsed.trim() : collapsed;
}

/** Render a template into UI segments, so parameters stay clickable inline. */
export function describeSmartSource(
  source: SmartSource,
  sibling: SmartSource | undefined,
  context: SmartDescriptionContext,
  kind: 'event' | 'action' | 'target',
): SmartSegment[] {
  const template = source.def?.template;
  const fallback = source.def?.description ?? null;
  const sources = kind === 'event' ? { event: source, action: sibling, target: undefined }
    : kind === 'action' ? { event: sibling, action: source, target: undefined } : { event: undefined, action: sibling, target: source };
  const segments: SmartSegment[] = [];
  const raw = unwrapTemplateMarkup(template ?? fallback ?? '');
  if (!raw) {
    for (const param of source.params) {
      const value = context.value(param.column);
      if (value === null || value === '' || Number(value) === 0) continue;
      if (segments.length) segments.push({ type: 'text', text: ' · ' });
      segments.push({ type: 'param', column: param.column, label: param.label, text: displayParam(param, value, context), editor: param.editor, entity: param.entity });
    }
    return segments;
  }
  let index = 0;
  let emphasis = false;
  const pushText = (text: string) => {
    const clean = text.replace(/\s{2,}/g, ' ');
    if (clean) segments.push({ type: emphasis ? 'emphasis' : 'text', text: clean });
  };
  while (index < raw.length) {
    const nextBrace = raw.indexOf('{', index);
    const tag = /<\/?\[?s\]?>|\[s\]|\[\/s\]/.exec(raw.slice(index));
    const stop = nextBrace < 0 ? raw.length : nextBrace;
    if (tag && tag.index !== undefined && index + tag.index < stop) {
      pushText(raw.slice(index, index + tag.index));
      emphasis = !tag[0].startsWith('[/');
      index += tag.index + tag[0].length;
      continue;
    }
    if (tag && tag.index === 0) {
      emphasis = !tag[0].startsWith('[/');
      index += tag[0].length;
      continue;
    }
    if (nextBrace < 0) { pushText(raw.slice(index)); break; }
    pushText(raw.slice(index, nextBrace));
    let depth = 0;
    let end = nextBrace;
    for (; end < raw.length; end++) {
      if (raw[end] === '{') depth++;
      else if (raw[end] === '}') { depth--; if (depth === 0) break; }
    }
    const expression = raw.slice(nextBrace + 1, end);
    const head = (splitTopLevel(expression, ':')[0] ?? '').trim();
    const paramMatch = /^pram(\d+)(value)?$/.exec(head);
    const param = paramMatch ? (findParam(source, Number.parseInt(paramMatch[1], 10)) ?? findParam(sibling, Number.parseInt(paramMatch[1], 10))) : undefined;
    const rendered = renderExpression(expression, context, sources as { event?: SmartSource; action?: SmartSource; target?: SmartSource })
      .replace(/\[\/?s\]|<\/?\[?s\]?>/gi, '');
    // An empty choose branch deliberately hides a default parameter. Falling
    // back to its raw value here glued “none” or “0” onto the previous word.
    if (param && rendered) {
      segments.push({ type: 'param', column: param.column, label: param.label, text: rendered, editor: param.editor, entity: param.entity });
    } else if (rendered.trim()) {
      segments.push({ type: emphasis ? 'emphasis' : 'text', text: rendered });
    }
    index = Math.max(index + 1, end + 1);
  }
  return segments;
}

export function displayParam(param: SmartParamDef, value: CellValue, context?: SmartDescriptionContext): string {
  if (value === null) return 'NULL';
  if (param.editor === 'bool') return Number(value) ? 'yes' : 'no';
  if ((param.editor === 'enum' || param.editor === 'flags') && param.options) {
    if (param.editor === 'enum') {
      const option = param.options.find((entry) => String(entry.value) === String(value));
      return option ? option.name : `${valueText(value)} (undocumented)`;
    }
    let mask = 0n;
    try { mask = BigInt(String(value)); } catch { return String(value); }
    const names = param.options.filter((entry) => entry.value !== 0 && (mask & BigInt(entry.value)) === BigInt(entry.value)).map((entry) => entry.name);
    return names.length ? names.join(' + ') : 'none';
  }
  if (param.editor === 'reference' && param.entity && context?.name) {
    const resolved = context.name(param.entity, value);
    if (resolved) return `${resolved}`;
  }
  return valueText(value);
}

/** `Hogger - On Aggro - Cast Fireball` — the comment convention from the wiki. */
export function suggestComment(context: {
  subject: string | null;
  event: SmartSource;
  action: SmartSource;
  target: SmartSource;
  value(column: string): CellValue;
  name?(entity: string, value: CellValue): string | null | undefined;
  labelFor?(def: SmartDef | null, param: SmartParamDef | undefined, value: CellValue): string | null;
}): string {
  const eventLabel = describeDef(context.event, context);
  const actionLabel = context.action.id === 0 ? '' : describeDef(context.action, context);
  const parts = [context.subject?.trim() || 'Script'];
  if (eventLabel) parts.push(eventLabel);
  if (actionLabel) parts.push(actionLabel);
  return parts.filter(Boolean).join(' - ').replace(/\s+/g, ' ').slice(0, 240);
}

function describeDef(source: SmartSource, context: {
  value(column: string): CellValue;
  name?(entity: string, value: CellValue): string | null | undefined;
  labelFor?(def: SmartDef | null, param: SmartParamDef | undefined, value: CellValue): string | null;
}): string {
  const label = source.def?.label ?? (source.id === 0 ? '' : source.constant);
  if (!label) return '';
  const significant = source.params.filter((param) => {
    const value = context.value(param.column);
    return value !== null && value !== '' && Number(value) !== 0;
  });
  const first = significant[0];
  if (!first) return label;
  const detail = displayParam(first, context.value(first.column), context);
  if (!detail || detail === '0' || detail === 'NULL') return label;
  const mention = first.editor === 'int' || first.editor === 'float' ? `${first.label} ${detail}` : detail;
  return `${label} ${mention}`.trim();
}

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------

export interface SmartIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  rowKey?: string;
  column?: string;
}

export function validateScript(script: SmartScript, data: SmartData | null, options: { subjectResolved?: boolean } = {}): SmartIssue[] {
  const issues: SmartIssue[] = [];
  const ids = new Map<number, SmartRow[]>();
  for (const row of script.rows) {
    const list = ids.get(row.id) ?? [];
    list.push(row);
    ids.set(row.id, list);
  }
  for (const [id, list] of ids) {
    if (list.length > 1) issues.push({ severity: 'error', message: `${list.length} rows share id ${id}; the core picks one of them non-deterministically.`, rowKey: list[1].rowKey, column: 'id' });
  }
  for (const entry of script.entries) {
    const head = entry.head;
    if (entry.brokenLink !== null) {
      issues.push({ severity: 'error', message: `Row ${head.id} links to id ${entry.brokenLink}, which does not exist in this script.`, rowKey: head.rowKey, column: 'link' });
    }
    for (const row of [head, ...entry.actions]) {
      if (row.event.def && !row.event.def.supported) {
        issues.push({ severity: 'error', message: `${row.event.constant} is newer than this core (id ${row.event.id}) and will not run.`, rowKey: row.rowKey, column: 'event_type' });
      }
      if (row.action.def && !row.action.def.supported) {
        issues.push({ severity: 'error', message: `${row.action.constant} is newer than this core (id ${row.action.id}) and will not run.`, rowKey: row.rowKey, column: 'action_type' });
      }
      if (!row.event.def && row.event.id !== 0) {
        issues.push({ severity: 'error', message: `Unknown event_type ${row.event.id} — this core has no such SMART_EVENT_.`, rowKey: row.rowKey, column: 'event_type' });
      }
      if (!row.action.def && row.action.id !== 0) {
        issues.push({ severity: 'error', message: `Unknown action_type ${row.action.id} — this core has no such SMART_ACTION_.`, rowKey: row.rowKey, column: 'action_type' });
      }
      if (row.event.id === 0 && row.action.id === 0 && !row.comment.trim()) {
        issues.push({ severity: 'warning', message: `Row ${row.id} does nothing (no event, no action, no comment).`, rowKey: row.rowKey });
      }
      if (row.event.id !== 0 && row.action.id === 0 && entry.actions.length === 0) {
        issues.push({ severity: 'warning', message: `${row.event.label} has no action yet.`, rowKey: row.rowKey, column: 'action_type' });
      }
      const chance = number(row.values.event_chance);
      if (chance < 0 || chance > 100) issues.push({ severity: 'error', message: `event_chance must be 0–100 (got ${chance}).`, rowKey: row.rowKey, column: 'event_chance' });
      for (const source of [row.event, row.action]) {
        for (const param of source.def?.params ?? []) {
          if (!param.required) continue;
          const value = row.values[param.column];
          if (value === null || value === '' || Number(value) === 0) {
            issues.push({ severity: 'warning', message: `${source.def?.label ?? source.constant}: ${param.label} (${param.column}) is usually required.`, rowKey: row.rowKey, column: param.column });
          }
        }
      }
      if (row.action.def?.targetTypes?.length && row.action.id !== 0) {
        const allowed = row.action.def.targetTypes;
        const target = row.target.def;
        if (target?.targetTypes?.length) {
          const compatible = allowed.some((kind) => target.targetTypes?.some((own) => own.toLowerCase() === kind.toLowerCase()));
          if (!compatible && !target.usesTargetPosition && allowed.length) {
            issues.push({ severity: 'warning', message: `${row.action.def.label} expects a ${allowed.join('/')} target, not ${target.label}.`, rowKey: row.rowKey, column: 'target_type' });
          }
        }
      }
    }
  }
  if (options.subjectResolved === false) {
    issues.push({ severity: 'info', message: 'The scripted creature/object id was not found in this database, so names are shown as ids.', rowKey: undefined });
  }
  return issues;
}

/** Colour grouping like the desktop editor: rows sharing an event share a tint. */
export function colorIdFor(entryIndex: number): number {
  return entryIndex % 6;
}
