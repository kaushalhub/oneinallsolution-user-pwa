import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import './PwaInstallPrompt.css';

/** Chromium `beforeinstallprompt` event (not in standard TypeScript DOM lib). */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type PwaInstallPromptProps = {
  /** When true, user is treated as "after login" for prompt eligibility. */
  isLoggedIn?: boolean;
  /** Sheet title (default matches product copy). */
  appName?: string;
  /** Supporting line under the title. */
  appDescription?: string;
  /** App icon shown in the sheet (192px or larger PNG works well). */
  iconSrc?: string;
  /** Prefix for localStorage keys (avoid collisions across apps). */
  storagePrefix?: string;
};

const DEFAULT_APP_NAME = 'Install App';
const DEFAULT_DESCRIPTION =
  'Install this app for quicker access, offline support where available, and a full-screen experience.';
const DEFAULT_ICON = '/pwa-192.png';
const ELIGIBLE_AFTER_MS = 30_000;

let visitIncrementedThisPageLoad = false;

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  // iPadOS 13+ may report as desktop Mac with touch.
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/** True for Google Chrome (desktop/Android) and Chrome on iOS (`CriOS`). Excludes Edge and Opera. */
export function isChrome(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/Edg/i.test(ua)) return false;
  if (/OPR|Opera/i.test(ua)) return false;
  return /Chrome|CriOS/i.test(ua);
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isChromeIOS(): boolean {
  return isIOS() && /CriOS/i.test(navigator.userAgent);
}

function readDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(key: string) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

type InstallVariant = 'chromium' | 'ios_safari' | 'ios_chrome';

export function PwaInstallPrompt({
  isLoggedIn = false,
  appName = DEFAULT_APP_NAME,
  appDescription = DEFAULT_DESCRIPTION,
  iconSrc = DEFAULT_ICON,
  storagePrefix = 'cleanswift_pwa_install_v2',
}: PwaInstallPromptProps) {
  const visitKey = `${storagePrefix}_visits`;
  const dismissedKey = `${storagePrefix}_dismissed`;

  const [standalone, setStandalone] = useState(isStandalonePWA);
  const [dismissed, setDismissed] = useState(() => readDismissed(dismissedKey));
  const [visitCount, setVisitCount] = useState(0);
  const [timeOk, setTimeOk] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [motionOpen, setMotionOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const eligible = useMemo(() => {
    if (standalone || dismissed) return false;
    return visitCount >= 2 || isLoggedIn || timeOk;
  }, [standalone, dismissed, visitCount, isLoggedIn, timeOk]);

  const variant: InstallVariant | null = useMemo(() => {
    if (standalone || dismissed) return null;
    if (isIOS()) {
      return isChromeIOS() ? 'ios_chrome' : 'ios_safari';
    }
    if (deferredPrompt) return 'chromium';
    return null;
  }, [standalone, dismissed, deferredPrompt]);

  const shouldOffer = Boolean(eligible && variant);

  useEffect(() => {
    if (standalone) return;

    const mq = window.matchMedia('(display-mode: standalone)');
    const onMq = () => setStandalone(mq.matches);
    mq.addEventListener('change', onMq);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setStandalone(true);
      setDeferredPrompt(null);
      setSheetOpen(false);
      setMotionOpen(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      mq.removeEventListener('change', onMq);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [standalone]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(visitKey);
      let n = raw ? parseInt(raw, 10) || 0 : 0;
      if (!visitIncrementedThisPageLoad) {
        visitIncrementedThisPageLoad = true;
        n += 1;
        localStorage.setItem(visitKey, String(n));
      }
      setVisitCount(n);
    } catch {
      setVisitCount(1);
    }
  }, [visitKey]);

  useEffect(() => {
    const id = window.setTimeout(() => setTimeOk(true), ELIGIBLE_AFTER_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!shouldOffer) {
      setSheetOpen(false);
      setMotionOpen(false);
      return;
    }
    setSheetOpen(true);
    const id = requestAnimationFrame(() => setMotionOpen(true));
    return () => cancelAnimationFrame(id);
  }, [shouldOffer]);

  useEffect(() => {
    return () => {
      if (closingTimerRef.current) window.clearTimeout(closingTimerRef.current);
    };
  }, []);

  const dismiss = useCallback(() => {
    writeDismissed(dismissedKey);
    setDismissed(true);
    setMotionOpen(false);
    closingTimerRef.current = window.setTimeout(() => {
      setSheetOpen(false);
      closingTimerRef.current = null;
    }, 320);
  }, [dismissedKey]);

  const onBackdropPointerDown = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const onInstallChromium = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      /* prompt may throw if already used or unsupported */
    } finally {
      setDeferredPrompt(null);
      dismiss();
    }
  }, [deferredPrompt, dismiss]);

  const onCopyUrl = useCallback(async () => {
    const url = window.location.href;
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2000);
    }
  }, []);

  if (standalone || !sheetOpen || !variant) return null;

  const onPrimary =
    variant === 'chromium'
      ? () => void onInstallChromium()
      : variant === 'ios_chrome'
        ? () => void onCopyUrl()
        : dismiss;

  return (
    <div className="pip-root" role="presentation">
      <button
        type="button"
        aria-label="Close install prompt"
        className={`pip-backdrop${motionOpen ? ' pip-backdrop--open' : ''}`}
        onClick={onBackdropPointerDown}
      />
      <div
        className={`pip-sheet${motionOpen ? ' pip-sheet--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
      >
        <div className="pip-handle" aria-hidden />
        <div className="pip-body">
          <div className="pip-iconWrap">
            <img src={iconSrc} alt="" className="pip-icon" width={56} height={56} />
          </div>
          <h2 id="pwa-install-title" className="pip-title">
            {appName}
          </h2>
          <p className="pip-desc">{appDescription}</p>

          {variant === 'ios_safari' && (
            <ol className="pip-steps">
              <li className="pip-step">
                <span className="pip-stepNum" aria-hidden>
                  1
                </span>
                <span>
                  Tap the <strong>Share</strong> icon <span className="nowrap">(square with arrow up)</span> in the
                  toolbar.
                </span>
              </li>
              <li className="pip-step">
                <span className="pip-stepNum" aria-hidden>
                  2
                </span>
                <span>
                  Scroll and tap <strong>Add to Home Screen</strong>, then confirm.
                </span>
              </li>
            </ol>
          )}

          {variant === 'ios_chrome' && (
            <div className="pip-chromeNote">
              <p className="pip-chromeNote-title">Open this page in Safari to install the app.</p>
              <p>
                Chrome on iOS cannot add PWAs to the home screen. Copy the link, open it in Safari, then use Share → Add
                to Home Screen.
              </p>
            </div>
          )}

          {variant === 'chromium' && (
            <p className="pip-chromiumHint">
              When you install, your browser may ask you to confirm — choose Add or Install to continue.
            </p>
          )}

          <div className="pip-actions">
            <button
              type="button"
              className="pip-primary"
              onClick={onPrimary}
              disabled={variant === 'chromium' && !deferredPrompt}
            >
              {variant === 'chromium'
                ? 'Install'
                : variant === 'ios_chrome'
                  ? copyDone
                    ? 'Link copied'
                    : 'Copy page link'
                  : 'Got it'}
            </button>
            <button type="button" className="pip-secondary" onClick={dismiss}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use `PwaInstallPrompt` — alias kept for existing imports. */
export const PwaInstallModal = PwaInstallPrompt;
