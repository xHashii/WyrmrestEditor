import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Workspace rendering failed', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="boot" role="alert"><div className="boot-logo">Wyrmrest Editor</div><h1>The workspace could not be displayed</h1>
      <p className="boot-error">{this.state.error}</p><p className="boot-note">Saved ledger changes are kept. Reload the workspace to try again.</p>
      <div><button className="btn btn-accent" onClick={() => window.location.reload()}>Reload workspace</button></div>
    </div>;
  }
}
