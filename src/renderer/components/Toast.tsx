import { useStore } from '../store';

export function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.kind}`} onClick={() => useStore.setState({ toast: null })}>
      {toast.message}
    </div>
  );
}
