import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

let openDialogs = 0;
let workspaceFocus: HTMLElement | null = null;
const focusable = 'button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]';

/** A real viewport-level dialog, never a child of a transformed virtual row.
 * Shared focus trapping and restoration keeps every editing surface usable by
 * keyboard and prevents shortcuts from changing the table behind a dialog. */
export function Modal({ children, label, className = 'modal', backdropClassName = 'modal-backdrop', onClose, busy = false }: {
  children: ReactNode; label: string; className?: string; backdropClassName?: string; onClose(): void; busy?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const previousFocus = useRef(document.activeElement as HTMLElement | null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    const root = document.getElementById('root');
    if (openDialogs === 0) workspaceFocus = previousFocus.current;
    openDialogs++;
    root?.setAttribute('inert', '');
    root?.setAttribute('aria-hidden', 'true');
    const surface = ref.current!;
    if (!surface.contains(document.activeElement)) {
      (surface.querySelector<HTMLElement>('input:not(:disabled), textarea:not(:disabled), select:not(:disabled)') ?? surface.querySelector<HTMLElement>(focusable) ?? surface).focus();
    }
    const keydown = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('.dialog-surface');
      if (dialogs[dialogs.length - 1] !== surface) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!busyRef.current) closeRef.current();
      }
      if ((event.ctrlKey || event.metaKey) && ['s', 'e'].includes(event.key.toLowerCase())) event.preventDefault();
      if (event.key === 'Tab') {
        const elements = [...surface.querySelectorAll<HTMLElement>(focusable)].filter((e) => !e.closest('[hidden]'));
        const first = elements[0] ?? surface;
        const last = elements[elements.length - 1] ?? surface;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === surface)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      openDialogs--;
      if (openDialogs === 0) {
        root?.removeAttribute('inert'); root?.removeAttribute('aria-hidden');
        // Nested dialogs can unmount parent-first. Restore the workspace opener
        // only once the last dialog has removed inertness from the app.
        const target = workspaceFocus?.isConnected ? workspaceFocus : document.querySelector<HTMLElement>('.grid');
        workspaceFocus = null;
        target?.focus({ preventScroll: true });
      } else if (previousFocus.current?.isConnected && previousFocus.current.closest('.dialog-surface')) {
        previousFocus.current.focus({ preventScroll: true });
      }
    };
  }, []);

  return createPortal(
    <div className={backdropClassName}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); e.stopPropagation(); }}
      onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <div ref={ref} className={`${className} dialog-surface`} role="dialog" aria-modal="true" aria-label={label} aria-busy={busy} tabIndex={-1}>
        {children}
      </div>
    </div>, document.body,
  );
}
