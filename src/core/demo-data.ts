import { allTables, tableMeta } from './metadata.js';
import type { CellValue, DatabaseName, Row, TableMeta } from '../shared/types.js';

/**
 * Offline demo dataset.
 *
 * Wyrmrest Editor is normally pointed at a live TrinityCore 3.4.3 server, but
 * the app must be usable (and demoable, and testable) without one. This module
 * fabricates a small, self-consistent world from the *real* parsed schema:
 * every row is built from the table's actual columns and defaults, then a
 * handful of well known values are layered on top.
 */

type Seed = Record<string, Record<string, Row[]>>;

function defaultsFor(meta: TableMeta): Row {
  const row: Row = {};
  for (const col of meta.columns) {
    if (col.default !== null && col.default !== undefined && col.hasDefault) {
      if (col.kind === 'integer') row[col.name] = Number.parseInt(col.default, 10) || 0;
      else if (col.kind === 'float') row[col.name] = Number.parseFloat(col.default) || 0;
      else if (/^current_timestamp/i.test(col.default)) row[col.name] = new Date().toISOString().slice(0, 19).replace('T', ' ');
      else row[col.name] = col.default;
    } else if (col.nullable) {
      row[col.name] = null;
    } else if (col.kind === 'integer' || col.kind === 'float') {
      row[col.name] = 0;
    } else if (col.kind === 'datetime') {
      row[col.name] = '2024-01-01 00:00:00';
    } else {
      row[col.name] = '';
    }
  }
  return row;
}

const CREATURES: [number, string, string, number, number, number, number][] = [
  // entry, name, subname, faction, minlevel-ish rank, npcflag, type
  [448, 'Hogger', '', 14, 1, 0, 7],
  [1234, 'Defias Bandit', '', 168, 0, 0, 7],
  [3057, 'Innkeeper Farley', 'Innkeeper', 12, 0, 65539, 7],
  [1102, 'Grimtak', 'Butcher', 29, 0, 129, 7],
  [295, 'Kobold Miner', '', 14, 0, 0, 7],
  [4949, 'Thrall', 'Warchief', 29, 3, 3, 7],
  [1748, 'Sergeant Willem', 'Stormwind Guard', 12, 1, 2, 7],
  [6491, 'Spirit Healer', '', 35, 0, 16384, 7],
  [8666, 'Deathguard Bartrand', '', 68, 0, 1, 7],
  [11832, 'Blackbreath Crony', '', 14, 0, 0, 7],
  [12796, 'Warchief Rend Blackhand', '', 14, 3, 0, 7],
  [15990, 'Kel\'Thuzad', 'The Lich King\'s Champion', 21, 3, 0, 6],
  [17591, 'Ashyen', 'Guardian of Cenarius', 1638, 2, 1, 7],
  [24949, 'Blightcaller', '', 14, 3, 0, 6],
  [28860, 'Sindragosa', 'Queen of the Frostbrood', 14, 3, 0, 2],
];

const ITEMS: [number, string][] = [
  [6948, 'Hearthstone'],
  [2589, 'Linen Cloth'],
  [858, 'Lesser Healing Potion'],
  [12466, "Coldrage Dagger"],
  [19019, 'Thunderfury, Blessed Blade of the Windseeker'],
  [49623, 'Shadowmourne'],
  [40395, 'Torch of Holy Fire'],
  [7005, 'Skinning Knife'],
];

const SPELLS: [number, string][] = [
  [133, 'Fireball'],
  [8092, 'Mind Blast'],
  [1130, "Hunter's Mark"],
  [11976, 'Cleave'],
  [20271, 'Judgement of Light'],
  [47540, 'Penance'],
  [61999, 'Raise Ally'],
];

const MAPS: [number, string, string][] = [
  [0, 'Azeroth', 'Eastern Kingdoms'],
  [1, 'Kalimdor', 'Kalimdor'],
  [530, 'Expansion01', 'Outland'],
  [571, 'Northrend', 'Northrend'],
  [603, 'Ulduar', 'Ulduar'],
];

const AREAS: [number, string, string][] = [
  [1, 'Dun Morogh', 'Dun Morogh'],
  [12, 'Elwynn Forest', 'Elwynn Forest'],
  [40, 'Westfall', 'Westfall'],
  [1519, 'Stormwind City', 'Stormwind City'],
  [4395, 'Dalaran', 'Dalaran'],
];

const FACTIONS: [number, string][] = [
  [14, 'Monster'],
  [12, 'Stormwind'],
  [29, 'Orgrimmar'],
  [35, 'Friendly'],
  [68, 'Undercity'],
  [168, 'Defias Brotherhood'],
  [1638, 'Cenarion Expedition'],
];

const BROADCAST_TEXTS: [number, string][] = [
  [1, 'Hello there, $N. What can I do for you?'],
  [2, 'You will pay for your insolence!'],
  [3, 'Safe travels, friend.'],
  [4, 'The Light shall burn you!'],
];

function buildSeed(): Seed {
  const seed: Seed = { world: {}, hotfixes: {}, characters: {}, auth: {} };
  const rows = (db: DatabaseName, table: string, list: Row[]) => {
    seed[db][table] = list;
  };
  const make = (db: DatabaseName, table: string, overrides: Row): Row | null => {
    let meta: TableMeta;
    try {
      meta = tableMeta(db, table);
    } catch {
      return null;
    }
    const row = defaultsFor(meta);
    for (const [k, v] of Object.entries(overrides)) {
      if (meta.columns.some((c) => c.name === k)) row[k] = v;
    }
    return row;
  };
  const collect = (db: DatabaseName, table: string, list: Row[]) => {
    const built = list.map((o) => make(db, table, o)).filter((r): r is Row => Boolean(r));
    if (built.length) rows(db, table, built);
  };

  collect(
    'world',
    'creature_template',
    CREATURES.map(([entry, name, subname, faction, rank, npcflag, type]) => ({
      entry,
      name,
      subname,
      faction,
      npcflag,
      type,
      rank,
      Classification: rank,
      minlevel: rank === 3 ? 83 : 10 + (entry % 20),
      maxlevel: rank === 3 ? 83 : 12 + (entry % 20),
      unit_class: 1,
      AIName: entry % 3 === 0 ? 'SmartAI' : '',
      MovementType: entry % 2,
      speed_walk: 1,
      speed_run: 1.14286,
      scale: rank === 3 ? 1.5 : 1,
      RegenHealth: 1,
      lootid: entry % 4 === 0 ? entry : 0,
      gossip_menu_id: npcflag & 1 ? 100 + (entry % 20) : 0,
      VerifiedBuild: 48120,
    })),
  );

  collect(
    'world',
    'creature',
    CREATURES.flatMap(([entry], i) =>
      [0, 1].map((n) => ({
        guid: 100000 + i * 10 + n,
        id: entry,
        map: i % 2,
        zoneId: AREAS[i % AREAS.length][0],
        areaId: AREAS[i % AREAS.length][0],
        spawnDifficulties: '',
        spawnMask: 1,
        phaseMask: 1,
        position_x: -8900 + i * 12.5 + n,
        position_y: -130 + i * 7.25,
        position_z: 80 + (i % 5),
        orientation: (i * 0.7) % 6.28,
        spawntimesecs: 300,
        wander_distance: i % 2 === 0 ? 5 : 0,
        MovementType: i % 2,
        curhealth: 1,
        VerifiedBuild: 48120,
      })),
    ),
  );

  collect(
    'world',
    'creature_template_addon',
    CREATURES.slice(0, 6).map(([entry], i) => ({
      entry,
      path_id: 0,
      mount: 0,
      StandState: 0,
      emote: i % 2 === 0 ? 0 : 10,
      auras: i === 0 ? '' : '',
    })),
  );

  collect(
    'world',
    'creature_text',
    CREATURES.slice(0, 5).flatMap(([entry, name], i) =>
      [0, 1].map((g) => ({
        CreatureID: entry,
        GroupID: g,
        ID: 0,
        Text: g === 0 ? `${name} greets you.` : `${name} roars in anger!`,
        Type: g === 0 ? 0 : 1,
        Probability: 100,
        Emote: g === 0 ? 1 : 15,
        Duration: 0,
        Sound: 0,
        BroadcastTextId: BROADCAST_TEXTS[(i + g) % BROADCAST_TEXTS.length][0],
        comment: `${name} - ${g === 0 ? 'greeting' : 'aggro'}`,
      })),
    ),
  );

  collect(
    'world',
    'smart_scripts',
    CREATURES.slice(0, 4).flatMap(([entry, name], i): Row[] => [
      {
        entryorguid: entry,
        source_type: 0,
        id: 0,
        link: 0,
        event_type: 4, // aggro
        event_chance: 100,
        action_type: 1, // talk
        action_param1: 1,
        target_type: 1,
        comment: `${name} - On Aggro - Say Line 1`,
      },
      {
        entryorguid: entry,
        source_type: 0,
        id: 1,
        link: 0,
        event_type: 0, // update in combat
        event_chance: 100,
        event_param1: 3000,
        event_param2: 5000,
        event_param3: 8000,
        event_param4: 12000,
        action_type: 11, // cast
        action_param1: SPELLS[i % SPELLS.length][0],
        target_type: 2,
        comment: `${name} - In Combat - Cast ${SPELLS[i % SPELLS.length][1]}`,
      },
    ]),
  );

  collect(
    'world',
    'quest_template',
    [
      { ID: 176, LogTitle: 'Wanted: Hogger', QuestLevel: 10, MinLevel: 8, QuestSortID: 12, RewardMoney: 250 },
      { ID: 26, LogTitle: 'Kobold Camp Cleanup', QuestLevel: 6, MinLevel: 3, QuestSortID: 12, RewardMoney: 100 },
      { ID: 13188, LogTitle: 'Rescue from Town Square', QuestLevel: 71, MinLevel: 68, QuestSortID: 4395, RewardMoney: 5600 },
    ].map((q) => ({ ...q, QuestType: 2, Flags: 8, RewardXPDifficulty: 2, VerifiedBuild: 48120 })),
  );

  collect('world', 'creature_queststarter', [
    { id: 448, quest: 176 },
    { id: 295, quest: 26 },
  ]);

  collect(
    'world',
    'gossip_menu',
    CREATURES.filter(([, , , , , npcflag]) => npcflag & 1).map(([entry], i) => ({
      MenuID: 100 + (entry % 20),
      TextID: 500 + i,
      VerifiedBuild: 48120,
    })),
  );

  collect('world', 'gossip_menu_option', [
    { MenuID: 103, OptionID: 0, OptionNpc: 1, OptionText: 'I want to browse your goods.', OptionType: 3 },
    { MenuID: 103, OptionID: 1, OptionNpc: 0, OptionText: 'Tell me about the Defias.', OptionType: 1, ActionMenuID: 104 },
    { MenuID: 104, OptionID: 0, OptionNpc: 0, OptionText: 'Where can I find them?', OptionType: 1 },
  ]);

  collect(
    'world',
    'npc_text',
    [500, 501, 502, 503].map((id, i) => ({
      ID: id,
      Probability0: 1,
      BroadcastTextId0: BROADCAST_TEXTS[i % BROADCAST_TEXTS.length][0],
      VerifiedBuild: 48120,
    })),
  );

  collect(
    'world',
    'creature_loot_template',
    CREATURES.filter((_, i) => i % 4 === 0).flatMap(([entry]) =>
      ITEMS.slice(0, 4).map(([item], j) => ({
        Entry: entry,
        Item: item,
        Reference: 0,
        Chance: [100, 45, 12.5, 3][j],
        QuestRequired: 0,
        LootMode: 1,
        GroupId: 0,
        MinCount: 1,
        MaxCount: j === 1 ? 3 : 1,
        Comment: null,
      })),
    ),
  );

  collect(
    'world',
    'npc_vendor',
    ITEMS.slice(0, 5).map(([item], i) => ({
      entry: 1102,
      slot: i,
      item,
      maxcount: 0,
      incrtime: 0,
      ExtendedCost: 0,
      type: 1,
      VerifiedBuild: 48120,
    })),
  );

  collect('world', 'conditions', [
    {
      SourceTypeOrReferenceId: 15,
      SourceGroup: 103,
      SourceEntry: 1,
      SourceId: 0,
      ElseGroup: 0,
      ConditionTypeOrReference: 9,
      ConditionTarget: 0,
      ConditionValue1: 176,
      NegativeCondition: 0,
      Comment: 'Show gossip option only while on quest Wanted: Hogger',
    },
    {
      SourceTypeOrReferenceId: 1,
      SourceGroup: 448,
      SourceEntry: 2589,
      SourceId: 0,
      ElseGroup: 0,
      ConditionTypeOrReference: 27,
      ConditionTarget: 0,
      ConditionValue1: 10,
      ConditionValue2: 3,
      NegativeCondition: 0,
      Comment: 'Linen Cloth drops only for players below level 10',
    },
  ]);

  collect(
    'world',
    'waypoint_data',
    [0, 1, 2, 3].map((point) => ({
      id: 44800,
      point,
      position_x: -8900 + point * 5,
      position_y: -130 + point * 3,
      position_z: 80,
      orientation: null,
      delay: point === 3 ? 5000 : 0,
      move_type: 0,
    })),
  );

  collect('world', 'game_event', [
    { eventEntry: 1, description: 'Midsummer Fire Festival', start_time: '2024-06-21 00:00:00', occurence: 525600, length: 20160 },
    { eventEntry: 2, description: "Hallow's End", start_time: '2024-10-18 00:00:00', occurence: 525600, length: 20160 },
  ]);

  collect(
    'hotfixes',
    'item_sparse',
    ITEMS.map(([id, name]) => ({ ID: id, Display: name, OverallQualityID: 2, ItemLevel: 60, VerifiedBuild: 48120 })),
  );
  collect(
    'hotfixes',
    'item',
    ITEMS.map(([id]) => ({ ID: id, ClassID: 4, SubclassID: 0, InventoryType: 1, VerifiedBuild: 48120 })),
  );
  collect(
    'hotfixes',
    'spell_name',
    SPELLS.map(([id, name]) => ({ ID: id, Name: name, VerifiedBuild: 48120 })),
  );
  collect(
    'hotfixes',
    'faction',
    FACTIONS.map(([id, name]) => ({ ID: id, Name: name, ReputationIndex: -1, VerifiedBuild: 48120 })),
  );
  collect(
    'hotfixes',
    'map',
    MAPS.map(([id, dir, name]) => ({ ID: id, Directory: dir, MapName: name, InstanceType: 0, VerifiedBuild: 48120 })),
  );
  collect(
    'hotfixes',
    'area_table',
    AREAS.map(([id, area, zone]) => ({ ID: id, AreaName: area, ZoneName: zone, ContinentID: 0, VerifiedBuild: 48120 })),
  );
  collect(
    'hotfixes',
    'broadcast_text',
    BROADCAST_TEXTS.map(([id, text]) => ({ ID: id, Text: text, Text1: text, LanguageID: 0, VerifiedBuild: 48120 })),
  );
  collect('hotfixes', 'emotes', [
    { ID: 1, EmoteSlashCommand: 'ONESHOT_TALK', AnimID: 60, VerifiedBuild: 48120 },
    { ID: 5, EmoteSlashCommand: 'ONESHOT_BOW', AnimID: 66, VerifiedBuild: 48120 },
    { ID: 15, EmoteSlashCommand: 'ONESHOT_ROAR', AnimID: 75, VerifiedBuild: 48120 },
  ]);
  collect('hotfixes', 'sound_kit', [
    { ID: 1, SoundType: 1, VolumeFloat: 1, VerifiedBuild: 48120 },
    { ID: 6197, SoundType: 5, VolumeFloat: 1, VerifiedBuild: 48120 },
  ]);
  collect('hotfixes', 'chr_classes', [
    { ID: 1, Name: 'Warrior', VerifiedBuild: 48120 },
    { ID: 2, Name: 'Paladin', VerifiedBuild: 48120 },
    { ID: 8, Name: 'Mage', VerifiedBuild: 48120 },
  ]);
  collect('hotfixes', 'chr_races', [
    { ID: 1, Name: 'Human', VerifiedBuild: 48120 },
    { ID: 2, Name: 'Orc', VerifiedBuild: 48120 },
    { ID: 4, Name: 'Night Elf', VerifiedBuild: 48120 },
  ]);

  collect('characters', 'characters', [
    { guid: 1, account: 1, name: 'Wyrmrest', race: 1, class: 1, level: 80, zone: 1519, map: 0 },
    { guid: 2, account: 1, name: 'Chronormu', race: 4, class: 8, level: 80, zone: 4395, map: 571 },
  ]);
  collect('auth', 'account', [
    { id: 1, username: 'ADMIN', email: 'admin@example.com', expansion: 2 },
    { id: 2, username: 'TESTER', email: 'tester@example.com', expansion: 2 },
  ]);
  collect('auth', 'realmlist', [
    { id: 1, name: 'Wyrmrest Accord', address: '127.0.0.1', port: 8085, gamebuild: 48120 },
  ]);

  return seed;
}

let cache: Map<string, Row[]> | null = null;

/** All demo rows keyed by `${database}.${table}`. Tables without a seed are empty. */
export function demoTables(): Map<string, Row[]> {
  if (cache) return cache;
  cache = new Map();
  const seed = buildSeed();
  for (const db of Object.keys(seed) as DatabaseName[]) {
    for (const [table, rows] of Object.entries(seed[db])) cache.set(`${db}.${table}`, rows);
  }
  return cache;
}

export function demoRows(database: DatabaseName, table: string): Row[] {
  const key = `${database}.${table}`;
  const tables = demoTables();
  if (!tables.has(key)) tables.set(key, []);
  return tables.get(key)!;
}

export function demoTableCount(database: DatabaseName): number {
  return allTables(database).length;
}

export function resetDemoData(): void {
  cache = null;
}

export function coerceForColumn(meta: TableMeta, column: string, value: CellValue): CellValue {
  const col = meta.columns.find((c) => c.name === column);
  if (!col || value === null) return value;
  if (col.kind === 'integer') {
    const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
    return Number.isFinite(n) ? n : 0;
  }
  if (col.kind === 'float') {
    const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
    return Number.isFinite(n) ? n : 0;
  }
  return typeof value === 'string' ? value : String(value);
}
