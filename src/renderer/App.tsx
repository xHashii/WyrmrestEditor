import { useEffect } from 'react';
import { useStore } from './store';
import { Sidebar } from './components/Sidebar';
import { TableView } from './components/TableView';
import { DocsPanel } from './components/DocsPanel';
import { LedgerPanel } from './components/LedgerPanel';
import { ExportDialog } from './components/ExportDialog';
import { ConnectionDialog } from './components/ConnectionDialog';
import { CommandPalette } from './components/CommandPalette';
import { Toast } from './components/Toast';
import { DATABASES } from '../shared/types';
import { isDesktop } from './api';

export function App() {
  const {
    ready,
    error,
    init,
    status,
    ledger,
    showDocs,
    showLedger,
    dialog,
    setDialog,
    database,
    tableName,
    meta,
  } = useStore();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta0 = event.ctrlKey || event.metaKey;
      if (meta0 && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setDialog(useStore.getState().dialog === 'palette' ? null : 'palette');
      }
      if (meta0 && (event.key.toLowerCase() === 'e' || event.key.toLowerCase() === 's')) {
        event.preventDefault();
        setDialog('export');
      }
      if (event.key === 'Escape') setDialog(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setDialog]);

  useEffect(() => {
    if (!isDesktop()) return;
    return window.wyrmrest?.onMenu((action) => {
      if (action === 'export') setDialog('export');
      if (action === 'settings') setDialog('connection');
    });
  }, [setDialog]);

  if (!ready) {
    return (
      <div className="boot">
        <div className="boot-logo">Wyrmrest Editor</div>
        <div className="boot-note">loading table metadata…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="boot">
        <div className="boot-logo">Wyrmrest Editor</div>
        <div className="boot-error">{error}</div>
        <div className="boot-note">Run `npm run metadata` to regenerate table metadata from the SQL dumps.</div>
      </div>
    );
  }

  const staged = ledger.length;
  const mode = status?.mode ?? 'demo';

  return (
    <div className={`app ${showDocs ? '' : 'no-docs'}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">Wyrmrest Editor</span>
          <span className="brand-version">3.4.3</span>
        </div>

        <nav className="db-tabs">
          {DATABASES.map((db) => (
            <button
              key={db}
              className={`db-tab ${db === database ? 'active' : ''}`}
              onClick={() => {
                useStore.setState({ database: db });
                setDialog('palette');
              }}
            >
              {db}
            </button>
          ))}
        </nav>

        <div className="topbar-spacer">
          {tableName && (
            <button className="crumb" onClick={() => setDialog('palette')} title="Switch table (Ctrl+K)">
              <span className="crumb-db">{database}</span>
              <span className="crumb-sep">/</span>
              <span className="crumb-table">{tableName}</span>
              {meta?.readOnly && <span className="tag tag-warn">read only</span>}
            </button>
          )}
        </div>

        <div className="topbar-actions">
          <button
            className={`chip ${mode === 'live' ? 'chip-live' : 'chip-demo'}`}
            onClick={() => setDialog('connection')}
            title={status?.message ?? ''}
          >
            <span className="dot" />
            {mode === 'live' ? `${status?.profile?.host ?? 'connected'}` : 'demo data'}
          </button>
          <button className="chip" onClick={() => useStore.setState({ showDocs: !showDocs })}>
            {showDocs ? 'Hide docs' : 'Show docs'}
          </button>
          <button
            className={`chip ${staged ? 'chip-staged' : ''}`}
            onClick={() => useStore.setState({ showLedger: !showLedger })}
          >
            Staged changes
            <span className="badge">{staged}</span>
          </button>
          <button className="chip chip-primary" onClick={() => setDialog('export')} disabled={!staged}>
            Export SQL
          </button>
        </div>
      </header>

      <div className="body">
        <Sidebar />
        <main className="main">
          <TableView />
        </main>
        {showDocs && <DocsPanel />}
      </div>

      {showLedger && <LedgerPanel />}
      {dialog === 'export' && <ExportDialog />}
      {dialog === 'connection' && <ConnectionDialog />}
      {dialog === 'palette' && <CommandPalette />}
      <Toast />
    </div>
  );
}
