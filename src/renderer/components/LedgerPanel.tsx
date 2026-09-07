import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import { copyText } from '../clipboard';
import { valueText } from '../../shared/values';
import type { StagedChange } from '../../shared/types';
import { ConfirmDialog } from './ConfirmDialog';

function describe(change: StagedChange): string {
  const key = Object.entries(change.key).map(([k, v]) => `${k}=${valueText(v)}`).join(', ');
  return change.kind === 'insert' ? `New row · ${key || 'server-generated / no unique key'}` : key;
}

export function LedgerPanel() {
  const { ledger, revert, clearLedger, openTable, setDialog, applyToDatabase, status, pendingMutations } = useStore();
  const [sql, setSql] = useState('');
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<'discard' | 'apply' | null>(null);
  const [expanded, setExpanded] = useState(false);
  const selectedIds = useMemo(() => selected.filter((id) => ledger.some((c) => c.id === id)), [selected, ledger]);
  const ids = selectedIds.length ? selectedIds : undefined;
  const busy = pendingMutations > 0;
  const live = status?.mode === 'live' && status.connected;
  const grouped = useMemo(() => {
    const map = new Map<string, StagedChange[]>();
    for (const change of ledger) { const key = `${change.database}.${change.table}`; map.set(key, [...map.get(key) ?? [], change]); }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [ledger]);

  useEffect(() => {
    let cancelled = false;
    setSqlError(null);
    if (!ledger.length) { setSql(''); setPreviewing(false); return; }
    setPreviewing(true);
    api.previewSql(ids).then((sql) => { if (!cancelled) setSql(sql); })
      .catch((err) => { if (!cancelled) { setSqlError(err.message); setSql(''); } })
      .finally(() => { if (!cancelled) setPreviewing(false); });
    return () => { cancelled = true; };
  }, [ledger, selectedIds]);

  const exportSelected = () => { setDialog('export'); useStore.setState({ exportIds: ids }); };
  const execute = async () => {
    if (confirm === 'discard') await clearLedger();
    else await applyToDatabase(ids);
    setConfirm(null); setSelected([]);
  };

  return <section className={`ledger ${expanded ? 'ledger-expanded' : ''}`} aria-label="Staged changes">
    <header className="ledger-head"><h2>Staged changes <span className="badge">{ledger.length}</span></h2>
      <div className="spacer" />
      {selectedIds.length > 0 && <button className="btn btn-ghost btn-quick" onClick={() => setSelected([])}>Clear selection ({selectedIds.length})</button>}
      <button className="btn btn-ghost btn-quick" disabled={!selectedIds.length || busy} onClick={() => void revert(selectedIds)}>Revert selected</button>
      <button className="btn btn-ghost btn-quick" disabled={!ledger.length || busy} onClick={() => setConfirm('discard')}>Discard all</button>
      <button className="btn btn-quick" disabled={!ledger.length || !live || busy} title={live ? 'Apply the reviewed changes to the connected server' : 'Demo mode: connect a server to apply changes'} onClick={() => setConfirm('apply')}>Apply to server</button>
      <button className="btn btn-accent btn-quick" disabled={!ledger.length || busy} onClick={exportSelected}>{ids ? `Export selected (${ids.length})` : 'Export all…'}</button>
      <button className="btn btn-ghost btn-quick" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Reduce panel' : 'Expand panel'}</button>
      <button className="btn btn-ghost btn-quick" aria-label="Close staged changes" onClick={() => useStore.setState({ showLedger: false })}>✕</button>
    </header>
    <div className="ledger-note"><label className="checkbox"><input type="checkbox" aria-label="Select all staged changes" checked={ledger.length > 0 && selectedIds.length === ledger.length}
      onChange={(e) => setSelected(e.target.checked ? ledger.map((c) => c.id) : [])} />Select all</label>
      <span>{live ? 'Review before applying. Changes below are saved locally, not on the server.' : 'Demo mode · export SQL, or connect a server to apply changes.'}</span></div>
    <div className="ledger-body">
      <div className="ledger-list">
        {!ledger.length && <div className="ledger-empty"><strong>No pending changes</strong><p>Cell edits, new rows and deletions will appear here for review.</p></div>}
        {grouped.map(([table, changes]) => <div key={table} className="ledger-group">
          <button className="ledger-group-head" onClick={() => void openTable(changes[0].database, changes[0].table)}>{table} <span className="count">{changes.length}</span></button>
          {changes.map((change) => <div key={change.id} className={`ledger-item kind-${change.kind}`}>
            <label className="ledger-select"><input type="checkbox" aria-label={`Select ${change.kind} ${change.table} ${describe(change)}`} checked={selectedIds.includes(change.id)} onChange={() => setSelected((s) => s.includes(change.id) ? s.filter((id) => id !== change.id) : [...s, change.id])} /></label>
            <span className={`kind kind-${change.kind}`}>{change.kind}</span>
            <div className="ledger-detail"><div className="ledger-key">{describe(change)}</div>
              {change.kind === 'update' && <div className="ledger-values">{Object.entries(change.values).map(([column, delta]) => <span key={column} className="delta"><b>{column}</b><s>{valueText(delta.before)}</s>→<i>{valueText(delta.after)}</i></span>)}</div>}
              {change.snapshot && <details className="snapshot-details"><summary>{change.kind === 'insert' ? 'New row values' : 'Original row values'}</summary><dl>{Object.entries(change.snapshot).map(([column, value]) => <div key={column}><dt>{column}</dt><dd>{valueText(value)}</dd></div>)}</dl></details>}
              {change.note && <div className="muted small">{change.note}</div>}
            </div>
            <button className="btn btn-ghost btn-mini" disabled={busy} aria-label={`Revert ${change.kind} ${change.table} ${describe(change)}`} onClick={() => void revert([change.id])}>↺</button>
          </div>)}
        </div>)}
      </div>
      <div className="ledger-sql"><div className="ledger-sql-head"><span>SQL preview · {ids ? `${ids.length} selected` : 'all changes'}{previewing ? ' · updating…' : ''}</span>
        <button className="btn btn-ghost btn-quick" disabled={!sql || previewing || Boolean(sqlError)} onClick={() => void copyText(sql, 'SQL')}>Copy SQL</button></div>
        {sqlError && <div className="error-box" role="alert">Could not preview SQL: {sqlError}</div>}
        <pre tabIndex={0}>{sql || '-- nothing staged'}</pre>
      </div>
    </div>
    {confirm && <ConfirmDialog title={confirm === 'discard' ? 'Discard all staged changes?' : 'Apply changes to the live server?'} confirmLabel={confirm === 'discard' ? 'Discard all changes' : `Apply ${ids?.length ?? ledger.length} changes`} busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => void execute()}>
      {confirm === 'discard' ? <p>This will permanently discard all {ledger.length} staged changes. The database itself will not be changed.</p> : <><p>You are about to write <strong>{ids?.length ?? ledger.length} changes</strong> to <strong>{status?.profile?.name} · {status?.profile?.host}:{status?.profile?.port}</strong>.</p><p>Each InnoDB row change uses a transaction. Any failed changes stay staged for review; changes that succeed cannot be reverted from this ledger.</p></>}
    </ConfirmDialog>}
  </section>;
}
