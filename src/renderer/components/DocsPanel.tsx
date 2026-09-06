import { useStore } from '../store';

/**
 * Documentation inspector: everything TrinityCore's wiki (and the schema
 * itself) knows about the selected column.
 */
export function DocsPanel() {
  const { meta, selected, entities, openTable } = useStore();
  const column = meta && selected ? meta.columns.find((c) => c.name === selected.column) ?? null : null;

  if (!meta) return <aside className="docs" />;

  if (!column) {
    return (
      <aside className="docs">
        <div className="docs-head">
          <h2>{meta.label}</h2>
          <code>{meta.database}.{meta.name}</code>
        </div>
        {meta.description && <p className="docs-desc">{meta.description}</p>}
        <dl className="docs-facts">
          <div>
            <dt>Engine</dt>
            <dd>{meta.engine ?? '—'}</dd>
          </div>
          <div>
            <dt>Primary key</dt>
            <dd>{meta.primaryKey.join(', ') || <span className="muted">none</span>}</dd>
          </div>
          <div>
            <dt>Columns</dt>
            <dd>{meta.columns.length}</dd>
          </div>
          {meta.uniqueKeys.length > 0 && (
            <div>
              <dt>Unique</dt>
              <dd>{meta.uniqueKeys.map((k) => k.columns.join('+')).join(', ')}</dd>
            </div>
          )}
          {meta.indexes.length > 0 && (
            <div>
              <dt>Indexes</dt>
              <dd>{meta.indexes.map((k) => k.columns.join('+')).join(', ')}</dd>
            </div>
          )}
          {meta.docSources.length > 0 && (
            <div>
              <dt>Docs</dt>
              <dd>
                {meta.docSources.map((src) => (
                  <a
                    key={src}
                    href={`https://trinitycore.info/en/database/${src}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {src.split('/')[0]}
                  </a>
                ))}
              </dd>
            </div>
          )}
        </dl>
        <p className="muted">Select a cell to see the column reference.</p>
      </aside>
    );
  }

  const entity = column.reference?.entity ? entities[column.reference.entity] : null;

  return (
    <aside className="docs">
      <div className="docs-head">
        <h2>{column.label}</h2>
        <code>
          {meta.name}.{column.name}
        </code>
      </div>

      <div className="docs-type">
        <span className="tag">{column.rawType}</span>
        {column.inPrimaryKey && <span className="tag tag-pk">primary key</span>}
        {!column.nullable && <span className="tag">NOT NULL</span>}
        {column.autoIncrement && <span className="tag">auto increment</span>}
        <span className="tag tag-soft">{column.editor} editor</span>
      </div>

      {column.hint && <p className="docs-hint">{column.hint}</p>}
      {column.description && column.description !== column.hint && (
        <div className="docs-body">
          {column.description
            .split('\n')
            .filter(Boolean)
            .map((line, i) => (
              <p key={i}>{line.replace(/^>\s*/, '')}</p>
            ))}
        </div>
      )}

      <dl className="docs-facts">
        <div>
          <dt>Default</dt>
          <dd>{column.hasDefault ? String(column.default ?? 'NULL') : <span className="muted">none</span>}</dd>
        </div>
        {column.range && (
          <div>
            <dt>Range</dt>
            <dd>
              {column.range.min} … {column.range.max}
            </dd>
          </div>
        )}
        {column.valueSetSource && (
          <div>
            <dt>Values from</dt>
            <dd>{column.valueSetSource}</dd>
          </div>
        )}
        {column.docSource && (
          <div>
            <dt>Docs</dt>
            <dd>{column.docSource === 'wiki' ? 'TrinityCore wiki' : 'schema comment'}</dd>
          </div>
        )}
      </dl>

      {column.reference && (
        <section className="docs-section">
          <h3>Links to</h3>
          <button
            className="link-button"
            onClick={() => void openTable(column.reference!.database, column.reference!.table)}
          >
            {column.reference.database}.{column.reference.table}.{column.reference.column}
          </button>
          <div className="muted small">
            {entity ? `${entity.label} picker` : 'foreign key'} · detected from {column.reference.source}
          </div>
        </section>
      )}

      {column.dbc && column.dbc.length > 0 && (
        <section className="docs-section">
          <h3>Client data</h3>
          {column.dbc.map((d) => (
            <div key={d.dbc} className="muted small">
              {d.label} → {d.dbc}
              {d.column ? `.${d.column}` : ''}
            </div>
          ))}
        </section>
      )}

      {column.valueSet && (
        <section className="docs-section">
          <h3>{column.valueSet.kind === 'flags' ? 'Flags' : 'Values'}</h3>
          <div className="value-list">
            {column.valueSet.values.map((v) => (
              <div key={String(v.value)} className="value-row">
                <span className="value-key">{String(v.value)}</span>
                <span className="value-name">{v.name}</span>
                {v.comment && <span className="value-comment">{v.comment}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
