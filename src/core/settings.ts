import fs from 'node:fs';
import { writeJsonAtomic } from './persistence.js';
import { versionError } from '../shared/values.js';
import path from 'node:path';
import { appHome, defaultExportRoot } from './paths.js';
import type { AppSettings, ConnectionProfile } from '../shared/types.js';
import { DATABASES } from '../shared/types.js';

/**
 * Settings live next to the ledger. Passwords are stored only if the user asks
 * for it. Both transports use this validation and atomic persistence path.
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

function validate(settings: AppSettings): AppSettings {
  if (!Number.isInteger(settings.pageSize) || settings.pageSize < 1 || settings.pageSize > 500) throw new Error('Page size must be between 1 and 500.');
  const error = versionError(settings.version);
  if (error) throw new Error(error);
  if (typeof settings.exportRoot !== 'string' || !settings.exportRoot.trim()) throw new Error('Choose an export directory.');
  if (typeof settings.author !== 'string') throw new Error('Author must be text.');
  if (!['demo', 'live'].includes(settings.mode)) throw new Error('Unknown connection mode.');
  if (!Array.isArray(settings.profiles)) throw new Error('Profiles must be a list.');
  const seen = new Set<string>();
  const profiles = settings.profiles.map((profile) => {
    if (!profile || !profile.id || seen.has(profile.id)) throw new Error('Each server profile needs a unique ID.');
    seen.add(profile.id);
    if (['id', 'name', 'host', 'user', 'password'].some((key) => typeof profile[key as keyof ConnectionProfile] !== 'string')) throw new Error('Profile name, host, user and password must be text.');
    if (!Number.isInteger(profile.port) || profile.port < 1 || profile.port > 65535) throw new Error('Profile ports must be between 1 and 65535.');
    if (!profile.databases || DATABASES.some((db) => profile.databases[db] !== undefined && typeof profile.databases[db] !== 'string')) throw new Error('Database schema names must be text.');
    return { ...profile, databases: Object.fromEntries(DATABASES.map((db) => [db, profile.databases[db] ?? ''])) as ConnectionProfile['databases'] };
  });
  return { ...settings, profiles, activeProfileId: profiles.some((p) => p.id === settings.activeProfileId) ? settings.activeProfileId : null };
}

export function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(FILE())) {
      const parsed = JSON.parse(fs.readFileSync(FILE(), 'utf8')) as Partial<AppSettings>;
      return validate({ ...structuredClone(DEFAULT_SETTINGS), ...parsed });
    }
  } catch {
    const backup = `${FILE()}.corrupt`;
    try { fs.copyFileSync(FILE(), backup, fs.constants.COPYFILE_EXCL); fs.chmodSync(backup, 0o600); } catch { /* Preserve any existing recovery copy. */ }
    console.warn('Settings could not be loaded. Using defaults; the original settings file has not been deleted.');
  }
  return structuredClone(DEFAULT_SETTINGS);
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = validate({ ...loadSettings(), ...patch });
  next.profiles = next.profiles.map((profile) => ({ ...profile, password: profile.rememberPassword === true ? profile.password : '' }));
  writeJsonAtomic(FILE(), next);
  return next;
}
