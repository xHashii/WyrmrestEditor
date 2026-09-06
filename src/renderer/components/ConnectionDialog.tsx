import { useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import type { ConnectionProfile } from '../../shared/types';
import { DATABASES } from '../../shared/types';

export function ConnectionDialog() {
  const { settings, status, setDialog, notify, refreshStatus } = useStore();
  const existing = settings?.profiles?.[0];
  const [profile, setProfile] = useState<ConnectionProfile>(
    existing ?? {
      id: 'local',
      name: 'Local TrinityCore',
      host: '127.0.0.1',
      port: 3306,
      user: 'trinity',
      password: '',
      databases: { auth: 'auth', characters: 'characters', world: 'world', hotfixes: 'hotfixes' },
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await api.connect(profile);
      useStore.setState({ status: next });
      if (next.mode === 'live' && next.connected) {
        notify('success', `Connected to ${profile.host}:${profile.port}`);
        setDialog(null);
        void useStore.getState().refresh();
      } else {
        setError(next.message ?? 'connection failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={() => setDialog(null)}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
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

        <div className="modal-grid">
          <label>
            <span>Host</span>
            <input value={profile.host} onChange={(e) => setProfile({ ...profile, host: e.target.value })} />
          </label>
          <label>
            <span>Port</span>
            <input
              type="number"
              value={profile.port}
              onChange={(e) => setProfile({ ...profile, port: Number(e.target.value) || 3306 })}
            />
          </label>
          <label>
            <span>User</span>
            <input value={profile.user} onChange={(e) => setProfile({ ...profile, user: e.target.value })} />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={profile.password}
              onChange={(e) => setProfile({ ...profile, password: e.target.value })}
            />
          </label>
          {DATABASES.map((db) => (
            <label key={db}>
              <span>{db} schema</span>
              <input
                value={profile.databases[db]}
                onChange={(e) =>
                  setProfile({ ...profile, databases: { ...profile.databases, [db]: e.target.value } })
                }
              />
            </label>
          ))}
        </div>

        {error && <div className="error-box">{error}</div>}

        {status && (
          <div className="status-grid">
            {Object.entries(status.databases).map(([db, info]) => (
              <div key={db} className={`status-pill ${info?.available ? 'ok' : 'off'}`}>
                <strong>{db}</strong>
                <span>{info?.available ? `${info.tables} tables` : info?.error ?? 'unavailable'}</span>
              </div>
            ))}
          </div>
        )}

        <footer className="modal-foot">
          <button
            className="btn btn-ghost"
            onClick={async () => {
              const next = await api.useDemo();
              useStore.setState({ status: next });
              void useStore.getState().refresh();
              setDialog(null);
            }}
          >
            Use demo data
          </button>
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={() => void refreshStatus()}>
            Refresh status
          </button>
          <button className="btn btn-accent" disabled={busy} onClick={() => void connect()}>
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        </footer>
      </div>
    </div>
  );
}
