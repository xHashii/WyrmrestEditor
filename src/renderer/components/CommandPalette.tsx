import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { Modal } from './Modal';

export function CommandPalette() {
  const { catalogue, openTable, setDialog, database } = useStore();
  const [term, setTerm] = useState('');
  const [cursor, setCursor] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    const query = term.trim().toLowerCase();
    return catalogue.map((table) => {
      const name = table.name.toLowerCase();
      let score = !query ? (table.featured ? 3 : table.database === database ? 1 : 0) :
        name === query || `${table.database}.${name}` === query ? 100 : name.startsWith(query) ? 60 :
          name.includes(query) || `${table.database}.${name}`.includes(query) ? 40 : table.label.toLowerCase().includes(query) ? 20 :
            (table.description ?? '').toLowerCase().includes(query) ? 5 : 0;
      if (score && table.database === database) score += 2;
      if (score && table.featured) score++;
      return { table, score };
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score || a.table.name.localeCompare(b.table.name)).slice(0, 60).map((r) => r.table);
  }, [catalogue, term, database]);
  useEffect(() => { list.current?.querySelector<HTMLElement>('.active')?.scrollIntoView?.({ block: 'nearest' }); }, [cursor]);
  const close = () => setDialog(null);
  const open = (index: number) => { const table = results[index]; if (table) { void openTable(table.database, table.name); close(); } };

  return <Modal label="Find a table" className="palette" backdropClassName="modal-backdrop top" onClose={close}>
    <header className="palette-head"><h2>Find a table</h2><span className="muted small">{catalogue.length.toLocaleString()} tables · all databases</span><button className="btn btn-ghost btn-quick" aria-label="Close table search" onClick={close}>✕</button></header>
    <input autoFocus aria-label="Search all tables" role="combobox" aria-autocomplete="list" aria-controls="table-search-results" aria-expanded="true"
      aria-activedescendant={results[cursor] ? `table-result-${cursor}` : undefined} placeholder="Table name, description, or database.table…" value={term}
      onChange={(e) => { setTerm(e.target.value); setCursor(0); }} onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, Math.max(0, results.length - 1))); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
        if (e.key === 'Enter') { e.preventDefault(); open(cursor); }
      }} />
    <div className="palette-list" id="table-search-results" role="listbox" aria-label="Matching tables" ref={list}>
      {results.map((table, i) => <button key={`${table.database}.${table.name}`} id={`table-result-${i}`} role="option" aria-selected={i === cursor} tabIndex={-1}
        className={`palette-item ${i === cursor ? 'active' : ''}`} onMouseEnter={() => setCursor(i)} onClick={() => open(i)}>
        <span className={`palette-db db-${table.database}`}>{table.database}</span><span className="palette-name">{table.name}</span><span className="palette-desc">{table.description ?? table.label}</span>
      </button>)}
      {!results.length && <div className="muted palette-empty" role="status">No table matches “{term}”. Try a shorter name.</div>}
    </div>
    <footer className="palette-footer">↑ ↓ to choose · Enter to open · Esc to close <span>{results.length}{results.length === 60 ? '+' : ''} results</span></footer>
  </Modal>;
}
