import { useMemo, useState } from 'react';
import { useStore } from '../store';

/** Ctrl+K table finder across all four databases. */
export function CommandPalette() {
  const { catalogue, openTable, setDialog, database } = useStore();
  const [term, setTerm] = useState('');
  const [cursor, setCursor] = useState(0);

  const results = useMemo(() => {
    const query = term.trim().toLowerCase();
    const scored = catalogue
      .map((table) => {
        const name = table.name.toLowerCase();
        let score = 0;
        if (!query) score = table.featured ? 3 : table.database === database ? 1 : 0;
        else if (name === query) score = 100;
        else if (name.startsWith(query)) score = 60;
        else if (name.includes(query)) score = 40;
        else if (table.label.toLowerCase().includes(query)) score = 20;
        else if ((table.description ?? '').toLowerCase().includes(query)) score = 5;
        if (score && table.database === database) score += 2;
        if (score && table.featured) score += 1;
        return { table, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.table.name.localeCompare(b.table.name))
      .slice(0, 40);
    return scored.map((s) => s.table);
  }, [catalogue, term, database]);

  return (
    <div className="modal-backdrop top" onMouseDown={() => setDialog(null)}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Search tables in auth, characters, world and hotfixes…"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setCursor(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setCursor((c) => Math.min(c + 1, results.length - 1));
            if (e.key === 'ArrowUp') setCursor((c) => Math.max(c - 1, 0));
            if (e.key === 'Enter' && results[cursor]) {
              void openTable(results[cursor].database, results[cursor].name);
              setDialog(null);
            }
          }}
        />
        <div className="palette-list">
          {results.map((table, i) => (
            <button
              key={`${table.database}.${table.name}`}
              className={`palette-item ${i === cursor ? 'active' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => {
                void openTable(table.database, table.name);
                setDialog(null);
              }}
            >
              <span className={`palette-db db-${table.database}`}>{table.database}</span>
              <span className="palette-name">{table.name}</span>
              <span className="palette-desc">{table.description ?? table.label}</span>
            </button>
          ))}
          {!results.length && <div className="muted palette-empty">No table matches “{term}”.</div>}
        </div>
      </div>
    </div>
  );
}
