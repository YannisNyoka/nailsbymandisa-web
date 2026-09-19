import { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// §7.6 — every modal traps focus, closes on Escape, and is marked as a dialog for
// assistive tech. This is the single Modal every confirmation/form dialog in the app
// should be built on top of (see ConfirmDialog) rather than each screen rolling its own.
export function Modal({ isOpen, onClose, title, children, footer }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const previouslyFocused = useRef(null);
  // Every call site passes an inline `onClose={() => ...}`, so its identity changes on
  // every render of the parent — including every keystroke in a field inside this modal,
  // since that updates the parent's form state. Reading it through a ref (always current,
  // no effect re-run needed) instead of a dependency is what keeps the effect below from
  // re-running on every keystroke — it used to, and its body steals focus to the dialog's
  // first focusable element each time it reruns, which made typing anything in a modal
  // form effectively impossible (§bug-fix, found via real admin usage).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocused.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll(FOCUSABLE_SELECTOR);
    (focusable?.[0] || dialog)?.focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = dialog.querySelectorAll(FOCUSABLE_SELECTOR);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="ds-modal__backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="ds-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="ds-modal__header">
          <h2 id={titleId} className="ds-modal__title">
            {title}
          </h2>
          <button className="ds-modal__close" aria-label="Close dialog" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="ds-modal__body">{children}</div>
        {footer && <div className="ds-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
