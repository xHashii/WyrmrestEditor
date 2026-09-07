import { useStore } from '../store';

export function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return <div className={`toast toast-${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
    <span>{toast.message}</span><button className="btn btn-ghost btn-mini" aria-label="Dismiss notification" onClick={() => useStore.setState({ toast: null })}>✕</button>
  </div>;
}
