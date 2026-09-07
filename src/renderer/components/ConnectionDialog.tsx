import { useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import type { ConnectionProfile, ConnectionStatus } from '../../shared/types';
import { DATABASES } from '../../shared/types';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';

const DEFAULT_DATABASES = { auth: 'auth', characters: 'characters', world: 'world', hotfixes: 'hotfixes' };
const blankProfile = (id: string, name: string): ConnectionProfile => ({ id, name, host: '127.0.0.1', port: 3306, user: 'trinity', password: '', rememberPassword: false, databases: { ...DEFAULT_DATABASES } });
const PRESETS: { label: string; description: string; patch: Partial<ConnectionProfile> }[] = [
  { label: 'Local TrinityCore', description: '127.0.0.1 · user trinity', patch: { host: '127.0.0.1', port: 3306, user: 'trinity', password: '', databases: { ...DEFAULT_DATABASES } } },
  { label: 'Docker / MySQL root', description: '127.0.0.1 · user root', patch: { host: '127.0.0.1', port: 3306, user: 'root', password: 'root', databases: { ...DEFAULT_DATABASES } } },
  { label: 'AzerothCore', description: 'Schema-name preset only; table definitions remain TrinityCore 3.4.3.', patch: { host: '127.0.0.1', port: 3306, user: 'acore', password: 'acore', databases: { auth: 'acore_auth', characters: 'acore_characters', world: 'acore_world', hotfixes: '' } } },
  { label: 'Remote server', description: 'Enter the host of your MySQL server.', patch: { host: '', port: 3306, user: 'trinity', password: '', databases: { ...DEFAULT_DATABASES } } },
];

export function ConnectionDialog() {
  const { settings, status, ledger, setDialog, notify, saveSettings, connectionChanged } = useStore();
  const initial = settings?.profiles?.length ? settings.profiles : [blankProfile('local', 'Local TrinityCore')];
  const [profiles, setProfiles] = useState(initial);
  const [selectedId, setSelectedId] = useState(settings?.activeProfileId && initial.some((p) => p.id === settings.activeProfileId) ? settings.activeProfileId : initial[0].id);
  const [savedProfiles, setSavedProfiles] = useState(JSON.stringify(initial));
  const [busy, setBusy] = useState<'connect' | 'test' | 'save' | 'demo' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [probe, setProbe] = useState<ConnectionStatus | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [presetNote, setPresetNote] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const profile = profiles.find((p) => p.id === selectedId) ?? profiles[0];
  const live = status?.mode === 'live' && status.connected;
  const dirty = JSON.stringify(profiles) !== savedProfiles;
  const validation = !profile.name.trim() || !profile.host.trim() || !profile.user.trim() ? 'Profile name, host and user are required.' :
    !Number.isInteger(profile.port) || profile.port < 1 || profile.port > 65535 ? 'Port must be between 1 and 65535.' :
      !DATABASES.some((db) => profile.databases[db].trim()) ? 'Enter at least one schema name. Leave unused schemas blank.' : null;

  const patch = (patch: Partial<ConnectionProfile>) => {
    setProfiles((all) => all.map((p) => p.id === profile.id ? { ...p, ...patch } : p));
    setProbe(null); setError(null);
  };
  const close = () => dirty ? setConfirmClose(true) : setDialog(null);
  const persist = async (next: ConnectionProfile[]) => {
    await saveSettings({ profiles: next, ...(!next.some((p) => p.id === settings?.activeProfileId) ? { activeProfileId: null } : {}) });
    setSavedProfiles(JSON.stringify(next));
  };
  const save = async () => {
    setBusy('save'); setError(null);
    try { await persist(profiles); notify('success', 'Server profiles saved. The active connection has not changed.'); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(null); }
  };
  const remove = async (id: string) => {
    setBusy('save'); setError(null);
    const remaining = profiles.filter((p) => p.id !== id);
    const next = remaining.length ? remaining : [blankProfile('local', 'Local TrinityCore')];
    try {
      await persist(next); setProfiles(next);
      if (id === profile.id) setSelectedId(next[0].id);
      setProbe(null);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(null); }
  };
  const run = async (action: 'connect' | 'test') => {
    if (validation) { setError(validation); return; }
    setBusy(action); setError(null); setProbe(null);
    const normalized = { ...profile, name: profile.name.trim(), host: profile.host.trim(), user: profile.user.trim(), databases: Object.fromEntries(DATABASES.map((db) => [db, profile.databases[db].trim()])) as ConnectionProfile['databases'] };
    try {
      const next = action === 'test' ? await api.testConnection(normalized) : await api.connect(normalized);
      setProbe(next);
      if (action === 'connect') {
        await connectionChanged(next);
        notify('success', `Connected to ${normalized.host}:${normalized.port}.`);
        const partial = DATABASES.some((db) => normalized.databases[db] && !next.databases[db]?.available);
        if (!partial) setDialog(null);
      } else if (!next.connected) setError(next.message ?? 'Connection test failed.');
      else notify('success', 'Connection test complete. Review the schema results below.');
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(null); }
  };
  const demo = async () => {
    setBusy('demo'); setError(null);
    try { await connectionChanged(await api.disconnect()); close(); notify('info', 'Using built-in sample data. Staged changes remain in your ledger.'); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(null); }
  };

  return <><Modal label="Database connection" className="modal modal-wide-900" onClose={close} busy={busy !== null}>
    <header className="modal-head"><h2>Database connection</h2><button className="btn btn-ghost" aria-label="Close connection settings" disabled={busy !== null} onClick={close}>✕</button></header>
    <p className="muted">Connect to a TrinityCore 3.4.3 MySQL server, or safely explore sample data. Testing a server never changes your current connection.</p>
    <div className="connection-current"><strong>Current session</strong><span>{live ? `${status.profile?.name} · ${status.profile?.host}:${status.profile?.port}` : 'Demo data · no live server connected'}</span></div>
    {ledger.length > 0 && <p className="notice">{ledger.length} changes are staged in this workspace. They will stay staged when you switch servers. Review their target before applying.</p>}
    <fieldset className="connection-fields" disabled={busy !== null}>
      <div className="preset-row"><span className="preset-label">Quick setups:</span>{PRESETS.map((preset) => <button key={preset.label} className="btn btn-preset" title={preset.description} onClick={() => { patch(preset.patch); setPresetNote(preset.description); }}>{preset.label}</button>)}</div>
      {presetNote && <p className="muted small">{presetNote}</p>}
      <div className="conn-layout">
        <div className="conn-profiles">
          <div className="conn-profiles-head"><span>Saved servers</span><button className="btn btn-ghost btn-mini" aria-label="Add saved server" onClick={() => {
            const created = blankProfile(`server-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`, `Server ${profiles.length + 1}`);
            setProfiles([...profiles, created]); setSelectedId(created.id); setProbe(null); setError(null);
          }}>+ Add</button></div>
          {profiles.map((p) => <div key={p.id} className={`conn-profile ${p.id === profile.id ? 'active' : ''}`}>
            <button className="profile-select" aria-pressed={p.id === profile.id} onClick={() => { setSelectedId(p.id); setProbe(null); setError(null); setPresetNote(''); }}>
              <span className="conn-profile-name">{p.name || 'Unnamed server'}</span><span className="conn-profile-host">{p.host || 'No host'}:{p.port} · {p.user}</span>
              {live && status.profile?.id === p.id && <span className="profile-live">● Current connection</span>}
            </button>
            {profiles.length > 1 && <button className="btn btn-ghost btn-mini conn-profile-del" disabled={live && status.profile?.id === p.id}
              title={live && status.profile?.id === p.id ? 'Disconnect before deleting the active profile' : 'Delete this saved server'} aria-label={`Delete ${p.name}`} onClick={() => void remove(p.id)}>✕</button>}
          </div>)}
          <p className="profile-save-note">{dirty ? 'Unsaved profile changes' : 'Profiles saved in editor settings'}</p>
        </div>
        <div className="conn-form">
          <label className="wide-field"><span>Profile name</span><input value={profile.name} onChange={(e) => patch({ name: e.target.value })} /></label>
          <div className="modal-grid">
            <label><span>Host</span><input value={profile.host} placeholder="127.0.0.1" spellCheck={false} onChange={(e) => patch({ host: e.target.value })} /></label>
            <label><span>Port</span><input type="number" min={1} max={65535} value={profile.port || ''} onChange={(e) => patch({ port: Number(e.target.value) })} /></label>
            <label><span>User</span><input value={profile.user} autoComplete="off" onChange={(e) => patch({ user: e.target.value })} /></label>
            <label><span>Password</span><div className="password-field"><input type={showPassword ? 'text' : 'password'} value={profile.password} autoComplete="new-password" onChange={(e) => patch({ password: e.target.value })} /><button className="btn btn-quick" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
            {DATABASES.map((db) => <label key={db}><span>{db} schema</span><input value={profile.databases[db]} placeholder="Leave blank if unused" spellCheck={false} onChange={(e) => patch({ databases: { ...profile.databases, [db]: e.target.value } })} /></label>)}
          </div>
          <label className="checkbox remember-password"><input type="checkbox" checked={profile.rememberPassword ?? false} onChange={(e) => patch({ rememberPassword: e.target.checked })} />Remember password in editor settings</label>
          <p className="muted small">{profile.rememberPassword ? 'The password is stored in your local settings file as plain text. Only enable this on a trusted device.' : 'The password is used for this session only and is not saved to disk.'} Leave unused schemas blank.</p>
        </div>
      </div>
    </fieldset>
    {(error || validation) && <div className="error-box" role="alert">{error ?? validation}</div>}
    {probe && <section className="connection-results"><h3>{probe.connected ? 'Connection results' : 'Connection test failed'} · {probe.profile?.host}:{probe.profile?.port}</h3>
      <div className="status-grid">{DATABASES.map((db) => { const info = probe.databases[db]; return <div key={db} className={`status-pill ${info?.available ? 'ok' : 'off'}`}>
        <strong>{info?.available ? '✓' : '—'} {db}</strong><span>{info?.available ? `${info.tables} tables available` : info?.error ?? 'Unavailable'}</span>
      </div>; })}</div></section>}
    <footer className="modal-foot">
      <button className="btn btn-ghost" disabled={busy !== null} onClick={() => void demo()}>{busy === 'demo' ? 'Disconnecting…' : live ? 'Disconnect · use demo' : 'Demo data'}</button>
      <div className="spacer" />
      <button className="btn" disabled={busy !== null || !dirty} onClick={() => void save()}>{busy === 'save' ? 'Saving…' : 'Save profiles'}</button>
      <button className="btn" disabled={busy !== null || Boolean(validation)} onClick={() => void run('test')}>{busy === 'test' ? 'Testing…' : 'Test connection'}</button>
      <button className="btn btn-accent" disabled={busy !== null || Boolean(validation)} onClick={() => void run('connect')}>{busy === 'connect' ? 'Connecting…' : 'Connect'}</button>
    </footer>
  </Modal>{confirmClose && <ConfirmDialog title="Discard unsaved profile changes?" confirmLabel="Discard profile changes" onCancel={() => setConfirmClose(false)} onConfirm={() => setDialog(null)}><p>Your connection profile edits have not been saved. Go back and use Save profiles to keep them. Staged database changes will not be affected.</p></ConfirmDialog>}</>;
}
