#!/usr/bin/env node
/**
 * Wyrmrest Editor — SmartAI (smart_scripts) definition builder.
 *
 * The visual SmartAI editor needs to know more about `smart_scripts` than a
 * plain schema does: what each event/action/target means, what each of the
 * numbered `*_param` columns holds for that specific row, and which value set
 * or ID picker belongs to it. Two sources are merged, deterministically:
 *
 *   1. `.docs-cache/database/{335,master}/world/smart_scripts.md`
 *      The TrinityCore wiki (the same pinned clone `npm run metadata:fetch-docs`
 *      produces). Its `### event_type` / `### action_type` / `### target_type`
 *      tables are authoritative for this core: constant name, numeric id, per
 *      parameter label, inline `<ul><li>0 → Passive</li>…` option lists, links
 *      to other tables (`[quest_template.ID](…)` → an ID picker) and the
 *      `## Enums` tabset.
 *   2. `tools/vendor/wde-smartdata/*.json`
 *      SmartData shipped by WoWDatabaseEditor (MIT; see the vendored
 *      LICENSE-MIT.txt). Provides short human labels ("Cast", "Talk"), prose
 *      descriptions, parameter *kinds* (spell / creature / bool / float …),
 *      picker groups and which target kinds an action accepts.
 *
 * The wiki wins for ids, value sets and pickers (it documents this core); WDE
 * wins for labels, prose and parameter kinds. WDE entries are joined by
 * constant NAME and never by id, because WDE's ids span several cores.
 *
 * Output: resources/metadata/derived/smartai.json
 *
 *   node tools/build-smartai.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, '.docs-cache', 'database');
const WDE = path.join(ROOT, 'tools', 'vendor', 'wde-smartdata');
const OUT = path.join(ROOT, 'resources', 'metadata', 'derived', 'smartai.json');
/**
 * 3.4.3 documents its SmartAI enums in the `vw_smart_scripts_with_labels` view,
 * and the wiki's `master` page carries exactly those ids, so it is tried first.
 * The 3.3.5 page documents every event in its own tabset instead of a table,
 * which this builder cannot parse — it is only a last-resort fallback.
 */
const VARIANT_PRIORITY = ['master', '335'];

// ---------------------------------------------------------------------------
// markdown helpers
// ---------------------------------------------------------------------------

const readIf = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);
const json = (file) => {
  const text = readIf(file);
  if (text === null) throw new Error(`missing required input ${path.relative(ROOT, file)}`);
  return JSON.parse(text);
};

function wikiPage(variant) {
  const file = path.join(DOCS, variant, 'world', 'smart_scripts.md');
  const text = readIf(file);
  return text ? { text, variant, file } : null;
}

/** Body of a `### heading` section, up to the next heading of any level. */
function section(markdown, heading) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim().startsWith(`### ${heading}`));
  if (start < 0) return '';
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}

/** Markdown table rows tolerate a missing leading pipe (the wiki does that). */
function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((cell) => cell.trim());
}

const isSeparator = (line) => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-');

/** First markdown table in `text`, as objects keyed by header cells. */
function firstTable(text) {
  if (!text) return [];
  const lines = text.split('\n');
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i]) || !isSeparator(lines[i + 1])) continue;
    const header = cells(lines[i]);
    const rows = [];
    for (let j = i + 2; j < lines.length && /^\s*(\||[A-Za-z:])/.test(lines[j]); j++) {
      const values = cells(lines[j]);
      if (!values.length || values.every((cell) => cell === '')) continue;
      const row = {};
      header.forEach((name, index) => { row[name] = values[index] ?? ''; });
      rows.push(row);
    }
    if (rows.length) return rows;
  }
  return [];
}

const stripTags = (text) =>
  String(text ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(?:ul|li|p|div|span|em|strong|code|pre)\b[^>]*>/gi, ' ')
    .replace(/&rarr;|&#8594;/gi, ' → ')
    .replace(/&nbsp;/g, ' ')
    // The wiki marks cross references as `[table.Column](/en/database/…)`; the
    // target is noise for us, the label is the useful part.
    .replace(/\[([^\]]+)\]\((?:\/|http)[^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

/** `<ul><li>0 → Passive</li><li>1 → …</li></ul>` — only the wiki's real form. */
function parseOptions(text) {
  const source = String(text ?? '');
  const blocks = source.match(/<ul>[\s\S]*?<\/ul>/gi) ?? [];
  if (!blocks.length) return null;
  const options = [];
  for (const block of blocks) {
    for (const item of block.match(/<li>[\s\S]*?<\/li>/gi) ?? []) {
      const clean = stripTags(item.replace(/<\/?li>/gi, ''));
      const match = /^(\d+|0x[0-9a-f]+)\s*(?:→|->|:)\s*(.+)$/i.exec(clean);
      if (!match) continue;
      const value = /^0x/i.test(match[1]) ? parseInt(match[1], 16) : parseInt(match[1], 10);
      const label = match[2].replace(/[.;,]+$/, '').trim();
      if (Number.isFinite(value) && label) options.push({ value, label });
    }
  }
  return options.length ? options : null;
}

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/;

const firstLink = (raw) => {
  const match = MARKDOWN_LINK.exec(String(raw ?? ''));
  return match ? { text: match[1], href: match[2] } : null;
};

/** db2 names mentioned in the wiki map onto the editor's curated pickers. */
const DB2_ENTITIES = {
  faction: 'faction', emotes: 'emote', areatable: 'area', map: 'map', itemsparse: 'item', spell: 'spell',
  soundentries: 'sound', creaturedisplayinfo: 'creatureDisplay', npc_text: 'npcText', gossiptext: 'broadcastText',
  chatemplates: 'broadcastText', achievement: 'achievement', taxipath: 'taxiNode', gametele: 'gameTele',
  gameobjecttemplate: 'gameobject', creaturetemplate: 'creature', questtemplate: 'quest', broadcasttext: 'broadcastText',
  spellvisualkit: 'spellVisualKit', movie: 'movie', scenetemplate: 'sceneTemplate', conversation: 'conversation',
  vehicleentry: 'vehicleEntry', lock: 'lock', holiday: 'holiday', language: 'language', skillline: 'skillLine',
  difficulty: 'difficulty', poitable: 'poi', charpagetitle: 'charTitle', creaturetext: 'creatureTextGroup',
};

const TABLE_ENTITIES = [
  ['creature_template', 'entry', 'creature'],
  ['gameobject_template', 'entry', 'gameobject'],
  ['quest_template', 'id', 'quest'],
  ['creature', 'guid', 'creatureSpawn'],
  ['gameobject', 'guid', 'gameobjectSpawn'],
  ['item_template', 'entry', 'item'],
  ['gossip_menu', 'menuid', 'gossipMenu'],
  ['gossip_menu_option', 'menuid', 'gossipMenu'],
  ['npc_text', 'id', 'npcText'],
  ['broadcast_text', 'id', 'broadcastText'],
  ['page_text', 'id', 'pageText'],
  ['areatrigger_template', 'id', 'gameTele'],
  ['waypoint_path', 'path_id', 'waypointPath'],
  ['conditions', 'sourceentry', 'conditionSource'],
];

function entityFromLink(href, entities) {
  if (!href) return null;
  const known = new Set(Object.keys(entities));
  const wago = /wago\.tools\/db2\/([A-Za-z_0-9]+)/i.exec(href);
  if (wago) {
    const entity = DB2_ENTITIES[wago[1].toLowerCase()];
    return entity && known.has(entity) ? entity : null;
  }
  const relative = /\/(?:auth|characters|world|hotfixes)\/([a-z0-9_]+)(?:#([a-z0-9_]+))?/i.exec(href);
  if (!relative) return null;
  const table = relative[1].toLowerCase();
  const column = (relative[2] ?? '').toLowerCase();
  for (const [candidate, candidateColumn, entity] of TABLE_ENTITIES) {
    if (candidate !== table) continue;
    if (column && candidateColumn !== column) continue;
    return known.has(entity) ? entity : null;
  }
  for (const [key, meta] of Object.entries(entities)) {
    if (meta.table.toLowerCase() === table) return key;
  }
  return null;
}

// ---------------------------------------------------------------------------
// WDE SmartData
// ---------------------------------------------------------------------------

/** WDE parameter type → this app's editor for that parameter. */
const WDE_REFERENCES = {
  spellparameter: 'spell', creatureparameter: 'creature', creatureguidparameter: 'creatureSpawn',
  gameobjectparameter: 'gameobject', gameobjectguidparameter: 'gameobjectSpawn', questparameter: 'quest',
  queststarterparameter: 'quest', questenderparameter: 'quest', itemparameter: 'item', soundparameter: 'sound',
  emoteparameter: 'emote', emoteoneshotparameter: 'emote', textemoteparameter: 'emote', npctextparameter: 'npcText',
  zoneareaparameter: 'area', zoneparameter: 'area', mapparameter: 'map', gameeventparameter: 'gameEvent',
  factiontemplateparameter: 'factionTemplate', gossipmenuparameter: 'gossipMenu', gossipmenuoptionparameter: 'gossipMenu',
  taxipathparameter: 'taxiNode', movieparameter: 'movie', broadcasttextparameter: 'broadcastText',
  conversationparameter: 'conversation', creaturemodeldataparameter: 'creatureDisplay', spawngrouptemplateparameter: 'spawnGroup',
};

const WDE_FLAG_TYPES = new Set([
  'spellschoolmaskparameter', 'smartcastflagsparameter', 'unitflagparameter', 'npcflagparameter',
  'gameobjectflagparameter', 'dynamicflagsparameter', 'movementflagparameter', 'triggerflagparameter',
  'flagparameter', 'auratypeparameter', 'summontypeparameter', 'reactstateparameter', 'standstateparameter',
  'sheathstateparameter', 'powertypeparameter', 'spellimmunitytypeparameter', 'gameobjectactionparameter',
]);

const WDE_FLOAT_TYPES = new Set(['floatparameter', 'decifloatparameter', 'percentageparameter']);

function wdeParamKind(type) {
  const key = String(type ?? '').toLowerCase();
  if (WDE_REFERENCES[key]) return { editor: 'reference', entity: WDE_REFERENCES[key] };
  if (key === 'boolparameter' || key === 'switchparameter') return { editor: key === 'boolparameter' ? 'bool' : 'enum' };
  if (WDE_FLAG_TYPES.has(key)) return { editor: 'flags' };
  if (WDE_FLOAT_TYPES.has(key)) return { editor: 'float' };
  if (key === 'stringparameter') return { editor: 'text' };
  return { editor: 'int' };
}

const wdeIndex = (rows) => new Map(rows.map((row) => [String(row.name).toUpperCase(), row]));

// ---------------------------------------------------------------------------
// curated flag lists (the wiki documents these by name only)
// ---------------------------------------------------------------------------

const CURATED = {
  spellSchoolMask: [
    { value: 1, name: 'Physical' }, { value: 2, name: 'Holy' }, { value: 4, name: 'Fire' }, { value: 8, name: 'Nature' },
    { value: 16, name: 'Frost' }, { value: 32, name: 'Shadow' }, { value: 64, name: 'Arcane' },
  ],
  castFlags: [
    { value: 1, name: 'Prepare' }, { value: 2, name: 'Preparation' }, { value: 4, name: 'Triggered' },
    { value: 8, name: 'Do not move' }, { value: 16, name: 'Do not turn' }, { value: 32, name: 'Interrupt previous' },
    { value: 64, name: 'Reset in combat' }, { value: 128, name: 'Main hand refund' }, { value: 256, name: 'Triggered after set in combat' },
    { value: 512, name: 'Ignore line of sight' }, { value: 1024, name: 'No global cooldown' }, { value: 2048, name: 'Finish casting' },
    { value: 4096, name: 'Only on target' }, { value: 8192, name: 'No immunity' }, { value: 16384, name: 'Allow while dead' },
    { value: 32768, name: 'No failure messages' }, { value: 65536, name: 'Is charge' }, { value: 131072, name: 'Allow while stunned' },
    { value: 262144, name: 'Allow while asleep' }, { value: 524288, name: 'Allow while incapacitated' },
    { value: 1048576, name: 'Allow while confused' }, { value: 2097152, name: 'Force cast in front' },
  ],
  summonType: [
    { value: 0, name: 'None' }, { value: 1, name: 'Permanent' }, { value: 2, name: 'Timed' }, { value: 3, name: 'Party pet' },
    { value: 4, name: 'Demand' }, { value: 5, name: 'Object' }, { value: 6, name: 'Guarded' }, { value: 7, name: 'Unavailable' },
    { value: 8, name: 'Player controlled' }, { value: 9, name: 'Vehicle' },
  ],
  reactState: [{ value: 0, name: 'Passive' }, { value: 1, name: 'Defensive' }, { value: 2, name: 'Aggressive' }, { value: 3, name: 'Assist' }],
  standState: [{ value: 0, name: 'None' }, { value: 1, name: 'Defensive' }, { value: 2, name: 'Passive' }, { value: 3, name: 'Chaired' }],
  sheathState: [{ value: 0, name: 'Unsheathed' }, { value: 1, name: 'Melee' }, { value: 2, name: 'Ranged' }],
  powerType: [
    { value: -2, name: 'Health' }, { value: 0, name: 'Mana' }, { value: 1, name: 'Rage' }, { value: 2, name: 'Focus' },
    { value: 3, name: 'Energy' }, { value: 4, name: 'Happiness' }, { value: 5, name: 'Rune' }, { value: 6, name: 'Runic power' },
    { value: 7, name: 'Combo points' }, { value: 8, name: 'Rest' }, { value: 9, name: 'Vitality' },
  ],
  dynamicFlags: [
    { value: 1, name: 'Worldobject' }, { value: 2, name: 'Complex' }, { value: 4, name: 'Tapped' }, { value: 8, name: 'Rooted' },
    { value: 16, name: 'Lootable' }, { value: 32, name: 'Petition' }, { value: 64, name: 'PvP' }, { value: 128, name: 'Silenced' },
    { value: 256, name: 'Peaceful' }, { value: 512, name: 'Demon' }, { value: 1024, name: 'Tapped by all' },
    { value: 2048, name: 'Server first' }, { value: 4096, name: 'No pet' }, { value: 8192, name: 'No mask pet' },
  ],
  movementFlags: [
    { value: 1, name: 'Prevent movement' }, { value: 2, name: 'Turn' }, { value: 4, name: 'No strafe' },
    { value: 8, name: 'Root disable' }, { value: 16, name: 'Root' }, { value: 32, name: 'Player controlled' },
    { value: 64, name: 'Hover' }, { value: 256, name: 'Set feathers' }, { value: 512, name: 'Push' },
    { value: 1024, name: 'Prevent landing' }, { value: 2048, name: 'Safe fall' },
  ],
  npcFlags: [
    { value: 1, name: 'Gossip' }, { value: 2, name: 'Quest giver' }, { value: 4, name: 'Invincible' }, { value: 8, name: 'Combat' },
    { value: 16, name: 'Magic' }, { value: 32, name: 'Taxi' }, { value: 64, name: 'Sell items' }, { value: 128, name: 'Buy items' },
    { value: 256, name: 'Trainer' }, { value: 512, name: 'Learn skill' }, { value: 1024, name: 'Bank' },
    { value: 2048, name: 'Tabard designer' }, { value: 4096, name: 'Auctioneer' }, { value: 8192, name: 'Trainer (animal)' },
    { value: 16384, name: 'Trade' }, { value: 32768, name: 'Vendor' }, { value: 65536, name: 'Mail' }, { value: 131072, name: 'Repair' },
    { value: 262144, name: 'Prospector' }, { value: 524288, name: 'Geomancer' }, { value: 2097152, name: 'Untrain all pets' },
    { value: 4194304, name: 'Untrain all talents' }, { value: 8388608, name: 'LFG dungeon' }, { value: 16777216, name: 'Battlefield' },
    { value: 33554432, name: 'Arena' }, { value: 67108864, name: 'Dungeon finder' },
  ],
  goFlags: [
    { value: 1, name: 'No despawn' }, { value: 2, name: 'No open' }, { value: 4, name: 'Never fails' },
    { value: 8, name: 'Open on radar' }, { value: 16, name: 'No durability loss' }, { value: 32, name: 'Heroic' },
    { value: 64, name: 'Ignore cooldown' }, { value: 128, name: 'Damaged' }, { value: 256, name: 'Destroyed' },
    { value: 512, name: 'Trapped' }, { value: 1024, name: 'Not smell' }, { value: 2048, name: 'Skull' }, { value: 4096, name: 'Reagent' },
  ],
  aiTemplates: [
    { value: 1, name: 'Caster' }, { value: 2, name: 'Melee' }, { value: 4, name: 'Ranged' }, { value: 8, name: 'Defensive' },
    { value: 16, name: 'Berserk' }, { value: 32, name: 'Low health' }, { value: 64, name: 'Simple' }, { value: 128, name: 'Archer' },
    { value: 256, name: 'Assist' }, { value: 512, name: 'Do nothing evade' }, { value: 1024, name: 'Scaled vs level (melee)' },
    { value: 2048, name: 'Scaled vs level (ranged)' }, { value: 4096, name: 'Caster melee base' },
  ],
  unitFlags: [
    { value: 256, name: 'Dazed' }, { value: 512, name: 'Pacify/silence' }, { value: 2048, name: 'Disarm' },
    { value: 8192, name: 'Stunned' }, { value: 16384, name: 'In combat' }, { value: 65536, name: 'Lootable' },
    { value: 4194304, name: 'PvP' }, { value: 33554432, name: 'Silenced' }, { value: 67108864, name: 'Peace' },
    { value: 1073741824, name: 'No crit' }, { value: 2147483648, name: 'Flappable' },
  ],
  unitFlags2: [
    { value: 1, name: 'Feign death' }, { value: 4, name: 'Immunity shield' }, { value: 64, name: 'Loot master' },
    { value: 256, name: 'Player killable' }, { value: 65536, name: 'Hide body' }, { value: 2097152, name: 'Prevent fade' },
    { value: 33554432, name: 'Allow boss kill' }, { value: 268435456, name: 'Tapped' },
  ],
  goState: [{ value: 0, name: 'Ready' }, { value: 1, name: 'In use' }, { value: 2, name: 'Locked' }, { value: 3, name: 'Progress' }],
  lootState: [{ value: 0, name: 'None' }, { value: 1, name: 'Lootable' }, { value: 2, name: 'Busy' }, { value: 3, name: 'Free for all' }, { value: 4, name: 'Phase' }],
  emoteState: [
    { value: 105, name: 'Sit on chair' }, { value: 233, name: 'Deep sit' }, { value: 293, name: 'At watch' },
    { value: 647, name: 'Kneel' }, { value: 3916, name: 'Crouch' }, { value: 3986, name: 'Read' }, { value: 4105, name: 'Loot' },
    { value: 4300, name: 'Work' }, { value: 4916, name: 'Berserking' },
  ],
  auraType: [
    { value: 1, name: 'Charm' }, { value: 2, name: 'Fear' }, { value: 6, name: 'Sleep' }, { value: 8, name: 'Stun' },
    { value: 11, name: 'Incapacitate' }, { value: 14, name: 'Silence' }, { value: 15, name: 'Confuse' }, { value: 17, name: 'Disarm' },
    { value: 27, name: 'Hunt track' }, { value: 56, name: 'Freeze effect' }, { value: 58, name: 'Bound' },
  ],
  spellImmunityType: [
    { value: 0, name: 'None' }, { value: 1, name: 'Magic' }, { value: 2, name: 'Physical' }, { value: 3, name: 'Elements' },
    { value: 4, name: 'Frost' }, { value: 5, name: 'Fire' }, { value: 6, name: 'Shadow' }, { value: 7, name: 'Nature' },
    { value: 8, name: 'Auras' }, { value: 9, name: 'All' }, { value: 10, name: 'Dispell' },
  ],
  goAction: [{ value: 0, name: 'Activate' }, { value: 1, name: 'Open' }, { value: 2, name: 'Destroy' }],
  triggerFlag: [
    { value: 0, name: 'Client trigger' }, { value: 1, name: 'Server side' }, { value: 2, name: 'Quest start' },
    { value: 3, name: 'Client trigger no server' }, { value: 4, name: 'Server side client' }, { value: 5, name: 'Quest exception' },
    { value: 6, name: 'Battle ground' }, { value: 7, name: 'Custom' }, { value: 8, name: 'Player action' },
  ],
};

/**
 * Wiki labels that clearly name a documented value domain. `kind` is `flags`
 * for bitmasks and `enum` for mutually exclusive choices; both come with the
 * curated list above so the editor can offer checkboxes instead of a magic
 * number.
 */
const FLAG_PARAM_MATCH = [
  [/cast\s*flags?/i, 'castFlags', 'flags'],
  [/spell\s*school/i, 'spellSchoolMask', 'flags'],
  [/unit\s*flag\s*2/i, 'unitFlags2', 'flags'],
  [/unit\s*flag/i, 'unitFlags', 'flags'],
  [/npc\s*flag/i, 'npcFlags', 'flags'],
  [/dynamic\s*flag/i, 'dynamicFlags', 'flags'],
  [/movement\s*flag/i, 'movementFlags', 'flags'],
  [/game\s*object\s*flag|\bgo\s*flag/i, 'goFlags', 'flags'],
  [/ai\s*template/i, 'aiTemplates', 'flags'],
  [/summon\s*type/i, 'summonType', 'enum'],
  [/react\s*state/i, 'reactState', 'enum'],
  [/stand\s*state/i, 'standState', 'enum'],
  [/sheath/i, 'sheathState', 'enum'],
  [/power\s*type/i, 'powerType', 'enum'],
  [/aura\s*type/i, 'auraType', 'enum'],
  [/immunity\s*type/i, 'spellImmunityType', 'enum'],
  [/loot\s*state/i, 'lootState', 'enum'],
  [/go\s*state|game\s*object\s*state/i, 'goState', 'enum'],
  [/trigger\s*flag/i, 'triggerFlag', 'enum'],
  [/emote\s*state/i, 'emoteState', 'int'],
];

// ---------------------------------------------------------------------------
// builder
// ---------------------------------------------------------------------------

const KINDS = {
  events: { heading: 'event_type', typeColumn: 'event_type', param: (i) => `event_param${i}`, stringColumn: 'event_param_string', maxParams: 5, wdeFile: 'events.json', wdeGroups: 'events_groups.json', prefix: 'SMART_EVENT_' },
  actions: { heading: 'action_type', typeColumn: 'action_type', param: (i) => `action_param${i}`, stringColumn: null, maxParams: 7, wdeFile: 'actions.json', wdeGroups: 'actions_groups.json', prefix: 'SMART_ACTION_' },
  targets: { heading: 'target_type', typeColumn: 'target_type', param: (i) => `target_param${i}`, stringColumn: null, maxParams: 4, wdeFile: 'targets.json', wdeGroups: 'targets_groups.json', prefix: 'SMART_TARGET_' },
};

function definitionFor(kind, row, wdeRow, context) {
  const config = KINDS[kind];
  const rawName = String(row.Name ?? '');
  const deprecated = /:\s*warning:/.test(rawName);
  const name = rawName.replace(/:warning:/g, '').replace(/`/g, '').trim();
  const id = Number.parseInt(String(row.Value ?? ''), 10);
  if (!new RegExp(`^${config.prefix}[A-Z0-9_]+$`).test(name) || !Number.isInteger(id)) return null;
  const { entities, columnNames, enums, report } = context;

  const params = [];
  for (let index = 1; index <= config.maxParams; index++) {
    const column = config.param(index);
    if (!columnNames.has(column)) continue;
    const wikiCell = String(row[`Param${index}`] ?? '');
    const wdeParam = wdeRow?.parameters?.[index - 1] ?? null;
    const hasWdeNeighbour = wdeRow?.parameters?.length ? index <= wdeRow.parameters.length : false;
    if (!wikiCell.trim() && !wdeParam && !hasWdeNeighbour) continue;

    const link = firstLink(wikiCell);
    const enumLink = /\[([^\]]+)\]\(#/.exec(wikiCell);
    const linkedEnum = enumLink ? enums[enumLink[1].trim()] : null;
    const options = parseOptions(wikiCell) ?? null;
    const wdeKind = wdeParam ? wdeParamKind(wdeParam.type) : null;
    const wikiLabel = stripTags(wikiCell.replace(/<ul>[\s\S]*?<\/ul>/gi, '')).replace(/[:：]\s*$/, '');
    const label = titleCase(wdeParam ? stripTags(wdeParam.name) : '') || wikiLabel || `${kind === 'targets' ? 'Target' : 'Param'} ${index}`;
    const description = prose(stripTags(wikiCell) || (wdeParam?.description ? stripTags(wdeParam.description) : ''));

    let def = { index, column, label, description: description || null };
    const curated = FLAG_PARAM_MATCH.find(([pattern]) => pattern.test(`${label} ${description}`));
    if (link && !linkedEnum) {
      const entity = entityFromLink(link.href, entities);
      if (entity && entities[entity]) def = { ...def, editor: 'reference', entity };
      else if (/\(0\s*\/\s*1\)/.test(wikiCell)) def = { ...def, editor: 'bool' };
      else if (/\(0:\s*any\)/i.test(wikiCell)) def = { ...def, editor: 'int', hint: '0 means "any".' };
      else def = { ...def, editor: 'int' };
    } else if (linkedEnum) {
      def = { ...def, editor: 'enum', options: linkedEnum.map((entry) => ({ value: entry.value, name: entry.label, comment: entry.name })) };
    } else if (options) {
      def = { ...def, editor: 'enum', options: options.map((option) => ({ value: option.value, name: option.label })) };
    } else if (/\(0\s*\/\s*1\)/.test(wikiCell) || wdeKind?.editor === 'bool') {
      def = { ...def, editor: 'bool' };
    } else if (curated) {
      const values = CURATED[curated[1]];
      if (values) def = { ...def, editor: curated[2], options: values, valueSetName: curated[1] };
      else if (wdeKind?.editor === 'flags') def = { ...def, editor: 'flags' };
    } else if (wdeKind?.editor === 'reference' && entities[wdeKind.entity]) {
      def = { ...def, editor: 'reference', entity: wdeKind.entity };
    } else if (wdeKind?.editor === 'flags') {
      def = { ...def, editor: 'flags' };
    } else if (wdeKind?.editor === 'enum' && Array.isArray(wdeParam?.values)) {
      def = { ...def, editor: 'enum', options: wdeParam.values.map((entry) => ({ value: entry.value, name: entry.label })) };
    } else if (wdeKind?.editor === 'float') {
      def = { ...def, editor: 'float' };
    } else {
      def = { ...def, editor: 'int' };
    }
    // Inline `values` dictionaries in WDE SmartData (switches) are the most
    // complete source for those few parameters.
    if (wdeParam && wdeParam.values && !Array.isArray(wdeParam.values) && def.editor !== 'flags') {
      const entries = Object.entries(wdeParam.values).map(([value, name2]) => ({ value: Number(value), name: String(name2) }));
      if (entries.length && entries.every((entry) => Number.isFinite(entry.value))) def = { ...def, editor: 'enum', options: entries };
    }
    // An editor must never offer a value the column cannot store: every
    // *_param column in 3.4.3 is an (un)signed integer, so floats collapse to
    // integers and pickers are limited to integer targets.
    const columnKind = context.schemaColumns.get(def.column)?.kind;
    if (columnKind === 'integer' && def.editor === 'float') def = { ...def, editor: 'int' };
    if (columnKind && columnKind !== 'integer' && ['reference', 'enum', 'flags', 'bool'].includes(def.editor)) def = { ...def, editor: 'text' };
    if (wdeParam?.required) def.required = true;
    if (wdeParam?.defaultVal !== undefined) def.default = wdeParam.defaultVal;
    if (def.entity && !entities[def.entity]) {
      report.push(`${kind}: dropping unknown picker ${def.entity} on ${name}.${def.column}`);
      def = { index: def.index, column: def.column, label: def.label, description: def.description, editor: 'int' };
    }
    params.push(def);
  }

  if (config.stringColumn && columnNames.has(config.stringColumn)) {
    const wikiCell = String(row.ParamString ?? '');
    const wdeParam = (wdeRow?.parameters ?? []).find((p) => /string|text|name/i.test(String(p.name)) && /string/i.test(String(p.type)));
    if (wikiCell.trim() || wdeParam) {
      params.push({
        index: 900,
        column: config.stringColumn,
        label: wdeParam ? stripTags(wdeParam.name) : 'Parameter string',
        description: prose(stripTags(wikiCell)) || 'Free text used by this row.',
        editor: 'text',
      });
    }
  }
  if (kind === 'targets') {
    const positions = [['X', 'x'], ['Y', 'y'], ['Z', 'z'], ['O', 'o']];
    positions.forEach(([heading, suffix], position) => {
      const column = `target_${suffix}`;
      if (!columnNames.has(column)) return;
      const documented = String(row[heading] ?? '').trim();
      if (!documented && !wdeRow?.uses_target_position) return;
      params.push({
        index: 910 + position,
        column,
        label: heading === 'O' ? 'Orientation' : `Position ${heading}`,
        description: prose(documented) || (heading === 'O' ? 'Facing in radians (0–6.28).' : 'World coordinate used when this target needs a position.'),
        editor: 'float',
      });
    });
  }

  return {
    id,
    name,
    label: wdeRow?.name_readable ? stripTags(wdeRow.name_readable) : humanize(name, config.prefix),
    comment: row.Comment ? stripTags(row.Comment) : null,
    description: wdeRow?.description ? cleanDescription(wdeRow.description) : null,
    template: wdeRow?.description ? String(wdeRow.description) : null,
    help: wdeRow?.help ? stripTags(wdeRow.help) : null,
    deprecated,
    timed: Boolean(wdeRow?.is_timed),
    targetTypes: wdeRow?.target_types ? unique(String(wdeRow.target_types).split(',').map((t) => t.trim())).filter(Boolean) : null,
    targetIsSource: wdeRow?.target_is_source ?? null,
    implicitSource: wdeRow?.implicit_source ? unique(String(wdeRow.implicit_source).split(',').map((t) => t.trim())).filter(Boolean) : null,
    sources: wdeRow?.sources ? unique(String(wdeRow.sources).split(',').map((t) => t.trim())).filter(Boolean) : null,
    usesTargetPosition: Boolean(wdeRow?.uses_target_position),
    async: String(wdeRow?.flags ?? '').toLowerCase().includes('async'),
    scriptTypes: usableWith(wdeRow?.usable_with_script_types),
    tags: mergeTags(wdeRow?.tags, wdeRow?.search_tags),
    params: params.sort((a, b) => a.index - b.index),
  };
}

/** `ReactState`, `SpellAura` → `React state`, `Spell aura` — labels people read. */
function titleCase(text) {
  const spaced = String(text ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : '';
}

const unique = (list) => [...new Set(list)];

function mergeTags(tags, searchTags) {
  const list = [];
  if (Array.isArray(tags)) list.push(...tags);
  if (typeof searchTags === 'string') list.push(...searchTags.split(/\s+/));
  return unique(list.map((tag) => String(tag).toLowerCase()).filter(Boolean));
}

const SOURCE_TYPE_NAMES = {
  creature: 0, gameobject: 1, areatrigger: 2, event: 3, gossip: 4, quest: 5, spell: 6, transport: 7,
  instance: 8, timedactionlist: 9, timedactionlistid: 9, scene: 10, areatriggerentity: 11, areatriggerentityserver: 12,
  areatriggerentityserverside: 12,
};

function usableWith(text) {
  if (!text) return null;
  const ids = String(text)
    .split(',')
    .map((token) => SOURCE_TYPE_NAMES[token.trim().toLowerCase().replace(/[\s_]/g, '')])
    .filter((value) => value !== undefined);
  return ids.length ? unique(ids).sort((a, b) => a - b) : null;
}

const humanize = (name, prefix) =>
  name.replace(new RegExp(`^${prefix}`), '').replace(/META_/g, '').toLowerCase().split('_').filter(Boolean)
    .join(' ').replace(/^./, (c) => c.toUpperCase());

/** Turn template prose into tooltip prose: `{target}` reads better than `{pram2}`. */
function prose(text) {
  return String(text ?? '')
    .replace(/\{(target|targetid\d*|targetcoords|source|sourceid|o)(?:[:}])/g, (all, key) => (key === 'o' ? 'orientation ' : `the ${key === 'targetid0' ? 'target id' : key.startsWith('target') ? 'target' : 'source'} `).concat(all.slice(1 + key.length)))
    .replace(/\{pram\d+(value)?/gi, '{value')
    .replace(/(the target|the source|orientation) \}/g, '$1')
    .trim();
}

/**
 * WDE descriptions are a small template language (`{pram1value:choose(0):a|b}`,
 * `[s]emphasis[/s]`). A tooltip wants prose, so drop the expressions — nested
 * ones included — and tidy what is left around them.
 */
function cleanDescription(text) {
  let cleaned = String(text).replace(/\[\/?s\]/g, '').replace(/&\w+;/g, ' ');
  // `{ … { … } … }` needs repeated passes until no placeholder survives.
  while (/\{[^{}]*\}/.test(cleaned)) cleaned = cleaned.replace(/\{[^{}]*\}/g, '');
  cleaned = cleaned
    .replace(/\[[a-z]+=?[^\]]*\]/gi, '') // template remnants like `[spell=]`
    .replace(/\s*[|]\s*/g, ' or ')
    .replace(/\s{2,}/g, ' ')
    .replace(/([,;:.])\1+/g, '$1')
    .trim();
  // Leading separators and dangling connectives are template residue.
  cleaned = cleaned.replace(/^[-–|:,(\s]+/g, '').replace(/\s(or|and|to|in|of|with|for|:|,|-|[(|])$/gi, '').trim();
  return cleaned.replace(/[-–|:,\s]+$/, '').trim() || null;
}

function build(page) {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'resources', 'metadata', 'index.json'), 'utf8'));
  const entities = index.entities;
  const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'resources', 'metadata', 'tables', 'world.json'), 'utf8'));
  const smartScripts = world.tables.find((table) => table.name === 'smart_scripts');
  if (!smartScripts) throw new Error('world.smart_scripts is missing from the generated metadata');
  const columnNames = new Set(smartScripts.columns.map((column) => column.name));
  const schemaColumns = new Map(smartScripts.columns.map((column) => [column.name, column]));
  const report = [];

  // The wiki's enum tabset (PowerType & friends) is referenced from param labels.
  const enums = {};
  const enumSection = section(page.text, 'TabSet');
  for (const match of enumSection.matchAll(/^####\s+(.+)$/gm)) {
    const name = match[1].trim();
    const start = (match.index ?? 0) + match[0].length;
    const next = enumSection.indexOf('\n#### ', start);
    const rows = firstTable(enumSection.slice(start, next > 0 ? next : undefined));
    const values = rows
      .map((row) => {
        const entries = Object.values(row);
        return { name: stripTags(entries[0] ?? ''), value: Number.parseInt(String(entries[1] ?? ''), 10) };
      })
      .filter((entry) => entry.name && Number.isFinite(entry.value));
    if (values.length) {
      enums[name] = values.map((entry) => ({
        name: entry.name,
        label: entry.name.replace(/^[A-Z]+_/, '').replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()),
        value: entry.value,
      }));
    }
  }

  const context = { entities, columnNames, schemaColumns, enums, report };
  const definitions = {};
  for (const kind of Object.keys(KINDS)) {
    const config = KINDS[kind];
    const rows = firstTable(section(page.text, config.heading));
    if (!rows.length) throw new Error(`${path.relative(ROOT, page.file)} documents no ${kind} table`);
    const wde = wdeIndex(json(path.join(WDE, config.wdeFile)));
    const known = new Set(wde.keys());
    const built = [];
    for (const row of rows) {
      const name = String(row.Name ?? '').replace(/:warning:/g, '').replace(/`/g, '').trim().toUpperCase();
      const def = definitionFor(kind, row, name ? wde.get(name) ?? null : null, context);
      if (def) built.push(def);
      else report.push(`${kind}: skipped wiki row "${row.Name}"`);
    }
    definitions[kind] = built.sort((a, b) => a.id - b.id);
    // Actions/events documented by WDE but unknown to this core are kept out of
    // the picker on purpose — offering them would write values the server rejects.
    const wikiNames = new Set(built.map((def) => def.name.toUpperCase()));
    const unknownToCore = [...known].filter((name) => !wikiNames.has(name));
    // The wiki documents the newest core, which can already know constants this
    // 3.4.3 build does not. Those rows stay renderable (so existing data is never
    // hidden) but are kept out of the pickers, where they would write invalid ids.
    const valueSet = smartScripts.columns.find((column) => column.name === config.typeColumn)?.valueSet?.values ?? [];
    const supported = new Set(valueSet.map((value) => String(value.value)));
    let unsupported = 0;
    for (const def of definitions[kind]) {
      def.supported = !supported.size || supported.has(String(def.id));
      if (!def.supported) unsupported++;
      for (const param of def.params) {
        if (!columnNames.has(param.column)) throw new Error(`smart_scripts has no column ${param.column} (referenced by ${def.name})`);
      }
    }
    report.push(`${kind}: ${definitions[kind].length} definitions (${unsupported} newer than this core), ${unknownToCore.length} WDE-only names not offered`);

    const groups = json(path.join(WDE, config.wdeGroups))
      .map((group) => ({
        name: stripTags(group.name).replace(/;/g, ',').replace(/\s+/g, ' ').trim(),
        members: unique((group.group_members ?? []).map((member) => String(member).toUpperCase())).filter((member) => wikiNames.has(member)),
      }))
      .filter((group) => group.members.length >= 2);
    definitions[`${kind}Groups`] = groups;
  }

  const sourceTypes = (smartScripts.columns.find((column) => column.name === 'source_type')?.valueSet?.values ?? []).map((value) => ({
    value: Number(value.value),
    name: value.name,
    comment: value.comment ?? null,
    entity: { 0: 'creature', 1: 'gameobject', 4: 'gossipMenu', 5: 'quest', 6: 'spell' }[Number(value.value)] ?? null,
  }));
  if (!sourceTypes.length) throw new Error('smart_scripts.source_type has no value set — regenerate the metadata first');

  return {
    generated: 'tools/build-smartai.mjs — do not edit by hand',
    wiki: { page: 'world/smart_scripts.md', variant: page.variant, sha1: crypto.createHash('sha1').update(page.text).digest('hex').slice(0, 16) },
    smartData: { project: 'BAndysc/WoWDatabaseEditor', license: 'MIT', vendoredIn: 'tools/vendor/wde-smartdata' },
    sourceTypes,
    sourceTypeEntityForNegative: { 0: 'creatureSpawn', 1: 'gameobjectSpawn' },
    events: definitions.events,
    actions: definitions.actions,
    targets: definitions.targets,
    groups: { events: definitions.eventsGroups, actions: definitions.actionsGroups, targets: definitions.targetsGroups },
    flagSets: CURATED,
    notes: report,
  };
}

function main() {
  const failures = [];
  for (const variant of VARIANT_PRIORITY) {
    const page = wikiPage(variant);
    if (!page) {
      failures.push(`${variant}: no cached page (run npm run metadata:fetch-docs)`);
      continue;
    }
    try {
      const payload = build(page);
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 1)}\n`);
      console.log(`smartai (${variant} wiki): events ${payload.events.length}, actions ${payload.actions.length}, targets ${payload.targets.length} → ${path.relative(ROOT, OUT)}`);
      for (const line of payload.notes) console.log(`  note: ${line}`);
      return;
    } catch (err) {
      failures.push(`${variant}: ${(err && err.message) ? err.message : String(err)}`);
    }
  }
  throw new Error(`could not build SmartAI definitions:\n  ${failures.join('\n  ')}`);
}

main();
