import { useEffect, useState } from 'react';
import { useStore } from './store';
import { Sidebar } from './components/Sidebar';
import { TableView } from './components/TableView';
import { DocsPanel } from './components/DocsPanel';
import { LedgerPanel } from './components/LedgerPanel';
import { ExportDialog } from './components/ExportDialog';
import { ConnectionDialog } from './components/ConnectionDialog';
import { CommandPalette } from './components/CommandPalette';
import { Toast } from './components/Toast';
import { Modal } from './components/Modal';
import { DATABASES } from '../shared/types';
import { isDesktop } from './api';

export function App() {
  const { ready, error, init, status, ledger, showSidebar, showDocs, showLedger, dialog, setDialog, database, pendingMutations } = useStore();
  const [compact, setCompact] = useState(window.innerWidth <= 900);

  useEffect(() => { void init(); }, [init]);
  useEffect(() => {
    const resize = () => {
      const narrow = window.innerWidth <= 900;
      setCompact((previous) => {
        if (narrow && !previous) useStore.setState({ showSidebar: false, showDocs: false });
        return narrow;
      });
    };
    if (window.innerWidth <= 900) useStore.setState({ showSidebar: false, showDocs: false });
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector('[role="dialog"]')) return;
      const command = event.ctrlKey || event.metaKey;
      const target = event.target as HTMLElement | null;
      const typing = target?.isContentEditable || Boolean(target?.closest?.('input, textarea, select'));
      const s = useStore.getState();
      const key = event.key.toLowerCase();
      if (command && key === 'k') { event.preventDefault(); setDialog('palette'); return; }
      if (command && (key === 'e' || key === 's')) {
        event.preventDefault();
        if (!typing && !s.editing) setDialog('export');
        return;
      }
      if (command && !typing && !s.editing && !s.pendingMutations) {
        if (key === 'i') { event.preventDefault(); void s.addRow(); }
        else if (key === 'd') { event.preventDefault(); void s.duplicateRow(); }
        else if (key === 'delete' || key === 'backspace') { event.preventDefault(); if (s.selected) void s.deleteRow(s.selected.rowKey); }
        else if (key === 'r') { event.preventDefault(); if (s.selected) void s.revertRow(s.selected.rowKey); }
      }
      if (event.key === 'Escape' && s.editing) s.beginEdit(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setDialog]);

  useEffect(() => {
    if (!isDesktop()) return;
    return window.wyrmrest?.onMenu((action) => {
      const s = useStore.getState();
      if (document.querySelector('[role="dialog"]') || s.editing || s.pendingMutations) return;
      if (action === 'export') setDialog('export');
      if (action === 'settings') setDialog('connection');
      if (action === 'new-row') void s.addRow();
      if (action === 'duplicate-row') void s.duplicateRow();
      if (action === 'delete-row' && s.selected) void s.deleteRow(s.selected.rowKey);
      if (action === 'revert-row' && s.selected) void s.revertRow(s.selected.rowKey);
    });
  }, [setDialog]);

  if (error) return <div className="boot" role="alert"><div className="boot-logo">Wyrmrest Editor</div><h1>Could not start the editor</h1>
    <div className="boot-error">{error}</div><p className="boot-note">Check that the editor service is running, then try again. Your staged changes remain saved.</p>
    <div><button className="btn btn-accent" onClick={() => void init()}>Retry connection</button></div></div>;
  if (!ready) return <div className="boot" role="status"><div className="boot-logo">Wyrmrest Editor</div><span className="spinner" /><div className="boot-note">Loading your workspace…</div></div>;

  const mode = status?.mode ?? 'demo';
  const staged = ledger.length;
  const dbStatus = status?.databases[database];
  return <div className={`app ${showDocs && !compact ? '' : 'no-docs'} ${showSidebar && !compact ? '' : 'no-sidebar'}`}>
    <header className="topbar">
      <div className="brand"><span className="brand-mark" aria-hidden /><span className="brand-name">Wyrmrest Editor</span><span className="brand-version">3.4.3</span></div>
      <nav className="db-tabs" aria-label="Databases">{DATABASES.map((db) => <button key={db} className={`db-tab ${db === database ? 'active' : ''}`}
        aria-current={db === database ? 'page' : undefined} onClick={() => useStore.getState().setDatabase(db)}>{db}</button>)}</nav>
      <div className="topbar-spacer" />
      <button className="find-table" onClick={() => setDialog('palette')}>Find table <kbd>Ctrl K</kbd></button>
      <div className="topbar-actions">
        <button className={`chip ${mode === 'live' ? 'chip-live' : 'chip-demo'}`} onClick={() => setDialog('connection')} title="Connection settings">
          <span className="dot" />{mode === 'live' ? 'Live connection' : 'demo data'}</button>
        <button className="chip panel-toggle" aria-expanded={showSidebar} onClick={() => useStore.setState({ showSidebar: !showSidebar })}>Tables</button>
        <button className="chip panel-toggle" aria-expanded={showDocs} onClick={() => useStore.setState({ showDocs: !showDocs })}>Inspector</button>
        <button className={`chip ${staged ? 'chip-staged' : ''}`} aria-expanded={showLedger} onClick={() => useStore.setState({ showLedger: !showLedger })}>
          Staged changes <span className="badge">{staged}</span></button>
        <button className="chip chip-primary" onClick={() => setDialog('export')} disabled={!staged || pendingMutations > 0}>Export SQL</button>
      </div>
    </header>
    <div className={`workspace-status ${mode === 'demo' ? 'workspace-demo' : ''}`}>
      <span>{mode === 'demo' ? 'Offline sample workspace' : `${status?.profile?.name} · ${status?.profile?.host}:${status?.profile?.port}`}</span>
      <span className="muted">{mode === 'demo' ? 'Real table definitions, sample rows only. Connect a server for your own data.' : dbStatus?.available ? `${database} → ${status?.profile?.databases[database]} · ${dbStatus.tables} tables` : `${database}: ${dbStatus?.error ?? 'unavailable'}`}</span>
      <span className="workspace-save" role="status">{pendingMutations ? 'Saving to ledger…' : staged ? `${staged} saved locally · not applied` : 'No pending changes'}</span>
    </div>
    {status?.warning && <div className="workspace-warning" role="alert"><span>{status.warning}</span><button className="btn btn-quick" onClick={() => setDialog('connection')}>Connection settings</button></div>}
    <div className="body">
      {showSidebar && !compact && <Sidebar />}
      <main className="main"><TableView /></main>
      {showDocs && !compact && <DocsPanel />}
    </div>
    {showLedger && <LedgerPanel />}
    {showSidebar && compact && <Modal className="panel-drawer" label="Table browser" onClose={() => useStore.setState({ showSidebar: false })}><Sidebar /></Modal>}
    {showDocs && compact && <Modal className="panel-drawer" label="Inspector" onClose={() => useStore.setState({ showDocs: false })}><DocsPanel /></Modal>}
    {dialog === 'export' && <ExportDialog />}
    {dialog === 'connection' && <ConnectionDialog />}
    {dialog === 'palette' && <CommandPalette />}
    <Toast />
  </div>;
}
