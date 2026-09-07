import { useStore } from '../store';
import { recentKey, recentSource } from '../recent';

const QUICK_TABLES = [
  { table: 'creature_template', label: 'Creature templates', icon: 'creature', detail: 'NPCs, stats, factions and models.' },
  { table: 'gameobject_template', label: 'Game objects', icon: 'object', detail: 'Doors, chests and world objects.' },
  { table: 'quest_template', label: 'Quests', icon: 'quest', detail: 'Quest text, objectives and rewards.' },
  { table: 'creature_text', label: 'Creature dialogue', icon: 'dialogue', detail: 'Speech, emotes and broadcast text.' },
] as const;

type IconName = 'script' | 'table' | 'creature' | 'object' | 'quest' | 'dialogue' | 'connection';
export function StartIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    script: <><path d="M5 4h6v6H5zM13 14h6v6h-6zM8 10v7h5M11 7h6v7" /><path d="m15 12 2 2 2-2" /></>,
    table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M10 10v10" /></>,
    creature: <><path d="m5 3 2 5-3 4 3 8h10l3-8-3-4 2-5-6 4h-2zM8 12l2 1m6-1-2 1M10 17h4" /></>,
    object: <><path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M7 5.8l9 5V15" /></>,
    quest: <><path d="M7 3h10l2 3v15l-7-3-7 3V6zM12 7v5M12 15h.01" /></>,
    dialogue: <><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9l-6 3v-4a2 2 0 0 1-1-1V6a2 2 0 0 1 2-2zM7 9h10M7 13h7" /></>,
    connection: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  };
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

/** WDE-style launch surface; all shortcuts use the existing staged editor. */
export function QuickStart() {
  const state = useStore();
  const { catalogue, status, ledger, tableName, smart, recentItems, historySaved } = state;
  const source = recentSource(status);
  const recent = recentItems.filter((item) => item.source === source && (item.kind === 'script' ||
    catalogue.some((table) => table.database === item.database && table.name === item.table))).slice(0, 10);
  const demo = status?.mode !== 'live';

  return <div className="quick-start" role="region" aria-labelledby="quick-start-title">
    <div className="start-content">
      <header className="start-heading">
        <div><p className="start-eyebrow">Your TrinityCore workspace · 3.4.3</p><h1 id="quick-start-title">Quick Start</h1>
          <p>Pick an editor, load a script, and get straight to work.</p></div>
        {tableName && <button className="btn resume-workspace" onClick={state.resumeEditor}>
          <span>Return to workspace →</span><small>{smart.view === 'script' && smart.entryorguid ? `SmartAI · ${smart.subject ?? `entry ${smart.entryorguid}`}` : `${state.database}.${tableName}`}</small>
        </button>}
      </header>

      <div className="start-columns">
        <section className="start-load" aria-labelledby="quick-load-title">
          <div className="start-section-head"><h2 id="quick-load-title">Quick load</h2><span>No table hunting required</span></div>
          <div className="quick-load-grid">
            <button className="quick-card quick-card-smart" aria-label="SmartAI editor" onClick={() => void state.openSmartEditor()}>
              <span className="quick-card-icon"><StartIcon name="script" /></span>
              <span className="quick-card-copy"><span className="start-eyebrow">Visual script editor</span><strong>SmartAI editor</strong>
                <span>Load a creature, game object, quest or spell script by name or ID. Edit events, actions and targets together.</span>
                <span className="quick-card-cta">Choose a script <span aria-hidden="true">→</span></span></span>
            </button>
            {QUICK_TABLES.filter((item) => catalogue.some((table) => table.database === 'world' && table.name === item.table)).map((item) =>
              <button key={item.table} className="quick-card" aria-label={item.label} data-quick-table={item.table} onClick={() => void state.openTable('world', item.table)}>
                <span className="quick-card-icon"><StartIcon name={item.icon} /></span><span className="quick-card-copy"><strong>{item.label}</strong><span>{item.detail}</span><code>world.{item.table}</code></span>
              </button>)}
            <button className="quick-card quick-card-browse" onClick={() => state.setDialog('palette')}>
              <span className="quick-card-icon"><StartIcon name="table" /></span><span className="quick-card-copy"><strong>Browse all tables</strong>
                <span>{catalogue.length.toLocaleString()} tables across auth, characters, world and hotfixes.</span></span><kbd>Ctrl/Cmd K</kbd>
            </button>
          </div>
          <p className="start-safety"><span aria-hidden="true">◇</span> Opening an editor never changes your database. Edits are saved in the staged ledger for review and SQL export.</p>
        </section>

        <div className="start-side">
          <section className="start-panel" aria-labelledby="start-connection-title">
            <div className="start-section-head"><h2 id="start-connection-title">Connection</h2><span className={`tag ${demo ? 'tag-warn' : 'tag-soft'}`}>{demo ? 'Offline demo' : 'Live server'}</span></div>
            <strong className="start-connection-name">{demo ? 'Explore with sample data' : status?.profile?.name}</strong>
            <p>{demo ? 'Try the editor with Hogger and other built-in examples, or connect your own MySQL server.' : 'Quick loads and recently opened items use this connection. Review staged changes when switching servers.'}</p>
            <button className="btn start-connect" onClick={() => state.setDialog('connection')}><StartIcon name="connection" />{demo ? 'Connect a database' : 'Connection settings'}</button>
          </section>

          <section className="start-panel start-recent" aria-labelledby="recent-title">
            <div className="start-section-head"><h2 id="recent-title">Recently opened</h2>{recent.length > 0 && <button className="link-button small" onClick={state.clearRecentItems}>Clear history</button>}</div>
            <p className="small muted">{demo ? 'Demo workspace' : 'This server profile'} · shortcuts only, not saved row data.</p>
            {recent.length ? <ul className="recent-list">{recent.map((item) => <li key={recentKey(item)}>
              <button className="recent-item" onClick={() => item.kind === 'table' ? void state.openTable(item.database, item.table) : void state.openSmartEditor(item)}>
                <StartIcon name={item.kind === 'script' ? 'script' : 'table'} /><span><strong>{item.label}</strong>
                  <small>{item.kind === 'script' ? `SmartAI · entry ${item.entryorguid} · type ${item.sourceType}` : `${item.database}.${item.table}`}</small></span><span aria-hidden="true">↗</span>
              </button>
            </li>)}</ul> : <div className="recent-empty">Your next session starts here.<br /><span>Open a table or script to add a shortcut.</span></div>}
            {!historySaved && <p className="notice">History is available for this session only because local storage is unavailable.</p>}
          </section>
          {ledger.length > 0 && <button className="start-staged" onClick={() => useStore.setState({ showLedger: true })}>
            <strong>{ledger.length} staged change{ledger.length === 1 ? '' : 's'}</strong><span>Saved locally, not applied. Review your work →</span>
          </button>}
        </div>
      </div>
    </div>
  </div>;
}
