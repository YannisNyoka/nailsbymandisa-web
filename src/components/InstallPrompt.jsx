import { useEffect, useState } from 'react';
import { Button } from '../design-system';
import './InstallPrompt.css';

const DISMISSED_KEY = 'nbm-install-prompt-dismissed';

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// §4.13 — custom install prompt for Android/Chrome (via the real beforeinstallprompt
// event, not a fake "install" button that does nothing), and a manual "Add to Home
// Screen" guide for iOS Safari, which has no install API to hook into at all.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY) === '1') setDismissed(true);
    } catch {
      // localStorage unavailable (private mode etc.) — just don't persist the dismissal.
    }

    if (isStandalone()) return undefined;

    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (isIos()) setShowIosGuide(true);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Fine to just not persist it.
    }
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (dismissed || (!deferredPrompt && !showIosGuide)) return null;

  return (
    <div className="install-prompt" role="status">
      {deferredPrompt ? (
        <>
          <span>Install NailsByMandisa for quicker access.</span>
          <Button size="sm" onClick={handleInstall}>Install</Button>
        </>
      ) : (
        <span>
          Install this app: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
        </span>
      )}
      <button type="button" className="install-prompt__dismiss" onClick={dismiss} aria-label="Dismiss install prompt">
        &times;
      </button>
    </div>
  );
}
