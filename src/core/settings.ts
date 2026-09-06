import fs from 'node:fs';
import path from 'node:path';
import { appHome, defaultExportRoot } from './paths.js';
import type { AppSettings, ConnectionProfile } from '../shared/types.js';

/**
 * Settings live next to the ledger. Passwords are stored only if the user asks
 * for it (profiles are written verbatim); the file sits in the app home which
 * is gitignored.
 */

const FILE = () => path.join(appHome(), 'settings.json');

const DEFAULT_PROFILE: ConnectionProfile = {
  id: 'local',
  name: 'Local TrinityCore',
  host: '127.0.0.1',
  port: 3306,
  user: 'trinity',
  password: '',
  databases: {
    auth: 'auth',
    characters: 'characters',
    world: 'world',
    hotfixes: 'hotfixes',
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  exportRoot: defaultExportRoot(),
  version: '3.4.3',
  author: '',
  pageSize: 100,
  profiles: [DEFAULT_PROFILE],
  activeProfileId: null,
  mode: 'demo',
};

export function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(FILE())) {
      const parsed = JSON.parse(fs.readFileSync(FILE(), 'utf8')) as Partial<AppSettings>;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        profiles: parsed.profiles?.length ? parsed.profiles : DEFAULT_SETTINGS.profiles,
      };
    }
  } catch (err) {
    console.warn(`settings: ${(err as Error).message}`);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...patch };
  fs.mkdirSync(path.dirname(FILE()), { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify(next, null, 2));
  return next;
}
