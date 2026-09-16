import { useState } from 'react';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';

// §7.2/§7.1 — the one confirmation dialog every destructive action in the app uses,
// replacing window.confirm(). Policy: any action that changes money owed, removes data
// permanently, or affects more than one client must go through this with a `summary`
// describing exactly what will happen — never a bare "are you sure?".
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, summary, confirmLabel = 'Confirm', danger = false }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={handleConfirm} loading={submitting}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{summary}</p>
    </Modal>
  );
}
