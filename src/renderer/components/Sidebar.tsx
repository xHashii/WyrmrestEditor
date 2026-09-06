import { useMemo, useState } from 'react';
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

  const stats = index?.summary?.[database];

  const item = (table: CatalogueEntry) => (
    <button
      key={`${table.database}.${table.name}`}
      className={`table-item ${tableName === table.name ? 'active' : ''}`}
      onClick={() => void openTable(table.database, table.name)}
      title={table.description ?? table.name}
    >
      <span className="table-item-name">{table.name}</span>
      <span className="table-item-meta">
        {table.readOnly && <span className="tag tag-mini">ro</span>}
        {table.columns}
      </span>
    </button>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-search">
        <input
          value={filter}
          placeholder={`Filter ${database} tables…`}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="sidebar-scroll">
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
              onClick={() => setCollapsed((c) => ({ ...c, [category]: !c[category] }))}
            >
              <span className={`caret ${collapsed[category] ? 'closed' : ''}`}>▾</span>
              {category}
              <span className="count">{tables.length}</span>
            </button>
            {!collapsed[category] && tables.map(item)}
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
