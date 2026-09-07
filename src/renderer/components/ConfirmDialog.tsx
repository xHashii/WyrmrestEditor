import type { ReactNode } from 'react';
import { Modal } from './Modal';

export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel, busy = false }: {
  title: string; children: ReactNode; confirmLabel: string; onConfirm(): void; onCancel(): void; busy?: boolean;
}) {
  return <Modal label={title} className="modal confirm-dialog" onClose={onCancel} busy={busy}>
    <header className="modal-head"><h2>{title}</h2></header>
    <div className="confirmation-copy">{children}</div>
    <footer className="modal-foot"><div className="spacer" /><button className="btn" autoFocus disabled={busy} onClick={onCancel}>Cancel</button>
      <button className="btn btn-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : confirmLabel}</button>
    </footer>
  </Modal>;
}
