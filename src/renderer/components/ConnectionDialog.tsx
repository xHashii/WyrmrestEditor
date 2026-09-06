import { useMemo, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import type { ConnectionProfile, ConnectionStatus } from '../../shared/types';
import { DATABASES } from '../../shared/types';

const DEFAULT_DATABASES = { auth: 'auth', characters: 'characters', world: 'world', hotfixes: 'hotfixes' } as const;

function blankProfile(id: string, name: string): ConnectionProfile {
  return {
    id,
    name,
    host: '127.0.0.1',
    port: 3306,
    user: 'trinity',
    password: '',
    databases: { ...DEFAULT_DATABASES },
  };
}

/** One-click starting points — WoW private server cores almost always follow one of these. */
const PRESETS: { label: string; description: string; patch: Partial<ConnectionProfile> }[] = [
  {
    label: 'Local TrinityCore',
    description: '127.0.0.1 · user trinity',
    patch: { host: '127.0.0.1', port: 3306, user: 'trinity', password: '', databases: { ...DEFAULT_DATABASES } },
  },
  {
    label: 'Docker / MySQL root',
    description: '127.0.0.1 · user root',
    patch: { host: '127.0.0.1', port: 3306, user: 'root', password: 'root', databases: { ...DEFAULT_DATABASES } },
  },
  {
    label: 'AzerothCore',
    description: 'ac-db schema names',
    patch: {
      host: '127.0.0.1',
      port: 3306,
      user: 'acore',
      password: 'acore',
      databases: { auth: 'acore_auth', characters: 'acore_characters', world: 'acore_world', hotfixes: 'hotfixes' },
    },
  },
  {
    label: 'Remote server',
    description: 'Fill in the host yourself',
    patch: { host: '', port: 3306, user: 'trinity', password: '', databases: { ...DEFAULT_DATABASES } },
  },
];

export function ConnectionDialog() {
  const { settings, status, setDialog, notify, saveSettings, refresh } = useStore();

  const [profiles, setProfiles] = useState<ConnectionProfile[]>(
    settings?.profiles?.length ? settings.profiles : [blankProfile('local', 'Local TrinityCore')],
  );
  const [activeId, setActiveId] = useState<string | null>(settings?.activeProfileId ?? profiles[0]?.id ?? null);
  const [profile, setProfile] = useState<ConnectionProfile>(
    profiles.find((p) => p.id === (settings?.activeProfileId ?? profiles[0]?.id)) ?? profiles[0],
  );
  const [busy, setBusy] = useState<'connect' | 'test' | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Result of the most recent Test / Connect, per database. */
  const [probe, setProbe] = useState<ConnectionStatus | null>(null);

  const live = status?.mode === 'live' && status.connected;

  const patch = (p: Partial<ConnectionProfile>) => {
    setProfile((prev) => ({ ...prev, ...p }));
    setProbe(null);
  };

  const persistProfiles = async (next: ConnectionProfile[], active: string | null) => {
    setProfiles(next);
    await saveSettings({ profiles: next, activeProfileId: active });
  };

  const selectProfile = (id: string) => {
    const found = profiles.find((p) => p.id === id);
    if (found) {
      setProfile(found);
      setActiveId(id);
      setProbe(null);
      setError(null);
    }
  };

  const newProfile = () => {
    const id = `profile-${Date.now().toString(36)}`;
    const created = blankProfile(id, `Server ${profiles.length + 1}`);
    const next = [...profiles, created];
    void persistProfiles(next, activeId);
    setProfile(created);
    setActiveId(id);
    setProbe(null);
  };

  const deleteProfile = async (id: string) => {
    let next = profiles.filter((p) => p.id !== id);
    if (!next.length) next = [blankProfile('local', 'Local TrinityCore')];
    await persistProfiles(next, activeId === id ? null : activeId);
    if (profile.id === id) {
      setProfile(next[0]);
      setActiveId(next[0].id);
    }
    setProbe(null);
  };

  const runTest = async (): Promise<ConnectionStatus | null> => {
    setBusy('test');
    setError(null);
    try {
      const result = await api.testConnection(profile);
      setProbe(result);
      if (result.connected) notify('success', `Reached ${profile.host}:${profile.port}`);
      else setError(result.message ?? 'connection failed');
      return result;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const connect = async () => {
    setBusy('connect');
    setError(null);
    try {
      // Remember the (possibly edited) profile before connecting.
      const nextProfiles = profiles.some((p) => p.id === profile.id)
        ? profiles.map((p) => (p.id === profile.id ? profile : p))
        : [...profiles, profile];
      await persistProfiles(nextProfiles, profile.id);
      const next = await api.connect(profile);
      useStore.setState({ status: next });
      if (next.mode === 'live' && next.connected) {
        notify('success', `Connected to ${profile.host}:${profile.port}`);
        setDialog(null);
        void refresh();
      } else {
        setProbe(next);
        setError(next.message ?? 'connection failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const useDemo = async () => {
    const next = await api.useDemo();
    useStore.setState({ status: next });
    await saveSettings({ mode: 'demo', activeProfileId: null });
    void refresh();
    setDialog(null);
    notify('info', 'Switched to built-in demo data');
  };

  const disconnect = async () => {
    const next = await api.disconnect();
    useStore.setState({ status: next });
    await saveSettings({ mode: 'demo', activeProfileId: null });
    void refresh();
    notify('info', 'Disconnected — back to demo data');
  };

  const shownStatus = probe ?? status;
  const dbEntries = useMemo(
    () => Object.entries(shownStatus?.databases ?? {}),
    [shownStatus],
  );

  return (
    <div className="modal-backdrop" onMouseDown={() => setDialog(null)}>
      <div className="modal modal-wide-900" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Database connection</h2>
          <button className="btn btn-ghost" onClick={() => setDialog(null)}>
            ✕
          </button>
        </header>

        <p className="muted">
          Point the editor at a TrinityCore 3.4.3 MySQL server. Table metadata always comes from the parsed
          schema dumps, so the UI is identical whether you are connected or exploring the built-in sample data.
        </p>

        <div className="preset-row">
          <span className="preset-label">Quick setups:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              className="btn btn-preset"
              title={preset.description}
              onClick={() => patch({ ...preset.patch })}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="conn-layout">
          <div className="conn-profiles">
            <div className="conn-profiles-head">
              <span>Saved servers</span>
              <button className="btn btn-ghost btn-mini" onClick={newProfile} title="Add a new saved server">
                +
              </button>
            </div>
            {profiles.map((p) => (
              <div
                key={p.id}
                className={`conn-profile ${p.id === profile.id ? 'active' : ''} ${
                  live && status?.profile && p.host === status.profile.host && p.port === status.profile.port
                    ? 'connected'
                    : ''
                }`}
                onClick={() => selectProfile(p.id)}
              >
                <div className="conn-profile-name">{p.name}</div>
                <div className="conn-profile-host">
                  {p.host}:{p.port} · {p.user}
                </div>
                {profiles.length > 1 && (
                  <button
                    className="btn btn-ghost btn-mini conn-profile-del"
                    title="Delete this saved server"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteProfile(p.id);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="conn-form">
            <label className="wide-field">
              <span>Profile name</span>
              <input value={profile.name} onChange={(e) => patch({ name: e.target.value })} />
            </label>
            <div className="modal-grid">
              <label>
                <span>Host</span>
                <input value={profile.host} placeholder="127.0.0.1" onChange={(e) => patch({ host: e.target.value })} />
              </label>
              <label>
                <span>Port</span>
                <input
                  type="number"
                  value={profile.port}
                  onChange={(e) => patch({ port: Number(e.target.value) || 3306 })}
                />
              </label>
              <label>
                <span>User</span>
                <input value={profile.user} autoComplete="off" onChange={(e) => patch({ user: e.target.value })} />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={profile.password}
                  autoComplete="new-password"
                  onChange={(e) => patch({ password: e.target.value })}
                />
              </label>
              {DATABASES.map((db) => (
                <label key={db}>
                  <span>{db} schema</span>
                  <input
                    value={profile.databases[db]}
                    onChange={(e) =>
                      patch({ ...profile, databases: { ...profile.databases, [db]: e.target.value } })
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {dbEntries.length > 0 && (
          <div className="status-grid">
            {dbEntries.map(([db, info]) => (
              <div key={db} className={`status-pill ${info?.available ? 'ok' : 'off'}`}>
                <strong>{db}</strong>
                <span>
                  {info?.available
                    ? `${info.tables} tables`
                    : info?.error
                      ? info.error.length > 48
                        ? `${info.error.slice(0, 48)}…`
                        : info.error
                      : 'unavailable'}
                </span>
              </div>
            ))}
          </div>
        )}

        <footer className="modal-foot">
          <button className="btn btn-ghost" onClick={() => void useDemo()} disabled={busy !== null}>
            Demo data
          </button>
          {live && (
            <button className="btn btn-ghost" onClick={() => void disconnect()} disabled={busy !== null}>
              Disconnect
            </button>
          )}
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={() => void runTest()} disabled={busy !== null || !profile.host}>
            {busy === 'test' ? 'Testing…' : 'Test connection'}
          </button>
          <button className="btn btn-accent" disabled={busy !== null || !profile.host} onClick={() => void connect()}>
            {busy === 'connect' ? 'Connecting…' : 'Connect'}
          </button>
        </footer>
      </div>
    </div>
  );
}
