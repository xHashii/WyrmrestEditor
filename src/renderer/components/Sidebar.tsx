import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import type { CatalogueEntry } from '../../shared/types';

export function Sidebar() {
  const { catalogue, database, tableName, openTable, index } = useStore();
  const [filter, setFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const { featured, groups } = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const tables = catalogue.filter((t) => t.database === database);
    const matches = (t: CatalogueEntry) =>
      !term || t.name.toLowerCase().includes(term) || t.label.toLowerCase().includes(term);

    const featuredTables = tables.filter((t) => t.featured && matches(t));
    const byCategory = new Map<string, CatalogueEntry[]>();
    for (const table of tables) {
      if (!matches(table)) continue;
      const list = byCategory.get(table.category) ?? [];
      list.push(table);
      byCategory.set(table.category, list);
    }
    return {
      featured: featuredTables,
      groups: [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [catalogue, database, filter]);

  useEffect(() => setFilter(''), [database]);

  const stats = index?.summary?.[database];

  const item = (table: CatalogueEntry) => (
    <button
      key={`${table.database}.${table.name}`}
      className={`table-item ${tableName === table.name ? 'active' : ''}`}
      onClick={() => { void openTable(table.database, table.name); if (window.innerWidth <= 900) useStore.setState({ showSidebar: false }); }}
      aria-current={tableName === table.name ? 'page' : undefined}
      title={`${table.name} · ${table.columns} columns${table.description ? `\n${table.description}` : ''}`}
    >
      <span className="table-item-name">{table.name}</span>
      <span className="table-item-meta">
        {table.readOnly && <span className="tag tag-mini">ro</span>}
        {table.columns}
      </span>
    </button>
  );

  return (
    <aside className="sidebar" aria-label="Table browser">
      <div className="sidebar-heading"><strong>{database}</strong><span className="muted small">{stats?.tables ?? 0} tables</span><button className="btn btn-ghost btn-mini" aria-label="Close table browser" onClick={() => useStore.setState({ showSidebar: false })}>✕</button></div>
      <div className="sidebar-search">
        <input
          aria-label={`Filter ${database} tables`}
          value={filter}
          placeholder={`Filter ${database} tables…`}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="sidebar-scroll">
        {!groups.length && <div className="sidebar-empty"><p>No tables match “{filter}”.</p><button className="btn btn-quick" onClick={() => setFilter('')}>Clear table filter</button></div>}
        {featured.length > 0 && (
          <section className="table-group">
            <div className="table-group-title">Frequently edited</div>
            {featured.map(item)}
          </section>
        )}

        {groups.map(([category, tables]) => (
          <section className="table-group" key={category}>
            <button
              className="table-group-title toggle"
              aria-expanded={Boolean(filter) || !collapsed[category]}
              onClick={() => setCollapsed((c) => ({ ...c, [category]: !c[category] }))}
            >
              <span className={`caret ${collapsed[category] ? 'closed' : ''}`}>▾</span>
              {category}
              <span className="count">{tables.length}</span>
            </button>
            {(filter || !collapsed[category]) && tables.map(item)}
          </section>
        ))}
      </div>

      {stats && (
        <footer className="sidebar-foot">
          <div>
            <strong>{stats.tables}</strong> tables · <strong>{stats.columns}</strong> columns
          </div>
          <div className="muted">
            {stats.documented} documented · {stats.references} pickers · {stats.valueSets} value sets
          </div>
        </footer>
      )}
    </aside>
  );
}
