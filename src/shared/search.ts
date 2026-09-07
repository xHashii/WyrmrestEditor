/**
 * The row search bar understands more than a plain substring.
 *
 *   Hogger                 every name-ish column, every id, and every reference
 *                          (a row is a hit when its `creature` column points at
 *                          a creature called Hogger)
 *   creature:Hogger        restrict the search to columns that reference an
 *                          entity (spell:, quest:, item:, gameobject:, …)
 *   entry=448              one column: = != > >= < <=, `name:~text` for LIKE and
 *                          `name:^text` for "starts with"
 *   -spell:Fireball        negate a token (rows whose spell reference is NOT it)
 *
 * Parsing lives here, shared by the service (which turns the tokens into SQL)
 * and the renderer (which shows what was understood). It needs to know the
 * table's columns and the catalogue's entities, so both are passed in.
 */

export type SearchScope = 'all' | 'names' | 'ids' | 'references';

export const SEARCH_SCOPES: { id: SearchScope; label: string; hint: string }[] = [
  { id: 'all', label: 'Everything', hint: 'Names, ids and the names of referenced creatures, game objects, spells, quests and items.' },
  { id: 'names', label: 'Names & text', hint: 'Only text columns such as names, titles and comments.' },
  { id: 'ids', label: 'Ids', hint: 'Only keys and id columns — exact numeric matches, no lookups.' },
  { id: 'references', label: 'References', hint: 'Only ids that point at a row whose name matches (creature, game object, spell, item, quest…).' },
];

export type SearchToken =
  | { kind: 'text'; value: string; not: boolean }
  | { kind: 'entity'; entity: string; value: string; not: boolean }
  | { kind: 'column'; column: string; op: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'startsWith'; value: string; not: boolean }
  | { kind: 'unknown'; value: string; key: string; not: boolean };

export interface ParsedSearch {
  raw: string;
  tokens: SearchToken[];
  /** Free-text words (what a plain "Hogger" becomes). */
  terms: string[];
}

/** Friendly synonyms for the entity keys in the metadata index. */
export const ENTITY_ALIASES: Record<string, string> = {
  creature: 'creature', creatures: 'creature', npc: 'creature', npcs: 'creature', mob: 'creature', mobs: 'creature',
  creaturename: 'creature',
  mobspawn: 'creatureSpawn', spawn: 'creatureSpawn', guid: 'creatureSpawn',
  gameobject: 'gameobject', go: 'gameobject', gos: 'gameobject', gameobjects: 'gameobject', object: 'gameobject',
  quest: 'quest', quests: 'quest',
  item: 'item', items: 'item',
  spell: 'spell', spells: 'spell',
  faction: 'faction', factions: 'faction',
  map: 'map', maps: 'map',
  area: 'area', zone: 'area', zones: 'area', areas: 'area',
  sound: 'sound', sounds: 'sound',
  emote: 'emote', emotes: 'emote',
  text: 'broadcastText', texts: 'broadcastText', broadcast: 'broadcastText', broadcasttext: 'broadcastText',
  gossip: 'gossipMenu', menu: 'gossipMenu',
  npctext: 'npcText', pagetext: 'pageText',
  achievement: 'achievement', achv: 'achievement',
  title: 'charTitle', currency: 'currency', taxinode: 'taxiNode', taxi: 'taxiNode',
  event: 'gameEvent', holiday: 'holiday', difficulty: 'difficulty', phase: 'phaseName',
  loot: 'creatureLoot', creatureloot: 'creatureLoot', goloot: 'gameobjectLoot', itemloot: 'itemLoot',
  skill: 'skillLine', trainer: 'trainer', vehicle: 'vehicleEntry', lock: 'lock', pool: 'pool',
  account: 'account', character: 'character', player: 'character',
  display: 'creatureDisplay', model: 'creatureDisplay',
};

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Which entity key a `foo:` prefix refers to, given the catalogue's entities. */
export function entityForPrefix(prefix: string, entities: string[]): string | null {
  const key = normalise(prefix);
  if (!key) return null;
  const aliased = ENTITY_ALIASES[key];
  if (aliased && entities.includes(aliased)) return aliased;
  for (const entity of entities) if (normalise(entity) === key) return entity;
  return null;
}

const COLUMN_OPERATOR = /^(=|!=|>=|<=|>|<|~|\^)/;

/** Split on whitespace, honouring "quoted phrases"; a stray quote is dropped. */
function splitWords(text: string): string[] {
  const out: string[] = [];
  const pattern = /"([^"]*)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) out.push(match[1] !== undefined ? match[1] : match[2].replace(/"/g, ''));
  return out.filter(Boolean);
}

/**
 * `name: Farley` means the same as `name:Farley`, so a word that ends on an
 * operator borrows the next one. Quoted phrases are already single words.
 */
function group(words: string[]): string[] {
  const out: string[] = [];
  for (let index = 0; index < words.length; index++) {
    let word = words[index];
    while (/[!=:~^<>]$/.test(word) && index + 1 < words.length) word += words[++index];
    out.push(word);
  }
  return out;
}

/**
 * @param columns column names of the table being searched (any case)
 * @param entities entity keys available in the metadata index
 */
export function parseSearch(raw: string, columns: string[], entities: string[]): ParsedSearch {
  const tokens: SearchToken[] = [];
  const terms: string[] = [];
  const lowered = new Map(columns.map((column) => [column.toLowerCase(), column]));
  for (const word of group(splitWords(raw.trim()))) {
    const not = word.startsWith('-') && word.length > 1;
    const body = not ? word.slice(1) : word;
    // `name: text` and `name:text` mean the same, and a quoted phrase carries a
    // space without becoming an operator — so only the operator characters split.
    const separator = /([=!:~^<>]+)\s*/.exec(body);
    if (!separator || separator.index === 0) {
      tokens.push({ kind: 'text', value: body, not });
      if (!not) terms.push(body);
      continue;
    }
    const key = body.slice(0, separator.index);
    const operator = separator[1];
    const value = body.slice(separator.index + separator[1].length);
    if (!value) {
      tokens.push({ kind: 'text', value: body, not });
      if (!not) terms.push(body);
      continue;
    }
    const column = lowered.get(normalise(key)) ?? lowered.get(key.toLowerCase());
    const entity = column && operator === ':' ? null : entityForPrefix(key, entities);
    if (entity && (operator === ':' || operator === '=' || operator === '~')) {
      tokens.push({ kind: 'entity', entity, value, not });
      continue;
    }
    if (column) {
      const op = operator === '~' ? 'like' : operator === '^' ? 'startsWith'
        : operator === '!' || operator === '!=' || operator === '!:' ? '!='
          : operator === '>=' ? '>=' : operator === '<=' ? '<=' : operator === '>' ? '>' : operator === '<' ? '<' : '=';
      tokens.push({ kind: 'column', column, op, value, not });
      continue;
    }
    tokens.push({ kind: 'unknown', value, key, not });
  }
  return { raw, tokens, terms };
}

/** Does the term look like an exact id rather than a name fragment? */
export const isIdTerm = (term: string) => /^-?\d+$/.test(term.replace(/,/g, ''));

export function describeToken(token: SearchToken): string {
  switch (token.kind) {
    case 'text': return token.value;
    case 'entity': return `${token.not ? 'not ' : ''}${token.entity}:${token.value}`;
    case 'column': return `${token.not ? 'not ' : ''}${token.column} ${token.op === 'like' ? '~' : token.op === 'startsWith' ? '^' : token.op} ${token.value}`;
    default: return `${token.key}:${token.value}`;
  }
}
