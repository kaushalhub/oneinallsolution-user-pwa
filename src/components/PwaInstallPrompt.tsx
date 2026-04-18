import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

  const backdropCls = motionOpen ? 'opacity-100 backdrop-blur-[2px]' : 'opacity-0 backdrop-blur-0';
  const sheetCls = motionOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0';

  const onPrimary =
    variant === 'chromium'
      ? () => void onInstallChromium()
      : variant === 'ios_chrome'
        ? () => void onCopyUrl()
        : dismiss;

  return (
    <div
      className="fixed inset-0 z-[280] flex items-end justify-center font-sans"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close install prompt"
        className={`absolute inset-0 bg-slate-900/50 transition-all duration-320 ease-out ${backdropCls}`}
        onClick={onBackdropPointerDown}
      />
      <div
        className={`relative z-[1] m-0 w-full max-w-lg rounded-t-[22px] bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom,0px))] pt-3 shadow-[0_-16px_48px_rgba(15,23,42,0.18)] transition-all duration-320 ease-out ${sheetCls}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" aria-hidden />
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-100 ring-1 ring-slate-100">
            <img src={iconSrc} alt="" className="h-14 w-14 rounded-xl object-cover" width={56} height={56} />
          </div>
          <h2 id="pwa-install-title" className="mb-2 text-xl font-extrabold tracking-tight text-slate-900">
            {appName}
          </h2>
          <p className="mb-1 text-[15px] leading-relaxed text-slate-600">{appDescription}</p>

          {variant === 'ios_safari' && (
            <ol className="mb-5 mt-3 w-full max-w-sm space-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm text-slate-700 ring-1 ring-slate-100">
              <li className="flex gap-2">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-indigo-600 ring-1 ring-slate-200">
                  1
                </span>
                <span>
                  Tap the <strong className="font-semibold text-slate-900">Share</strong> icon{' '}
                  <span className="whitespace-nowrap">(square with arrow up)</span> in the toolbar.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-indigo-600 ring-1 ring-slate-200">
                  2
                </span>
                <span>
                  Scroll and tap <strong className="font-semibold text-slate-900">Add to Home Screen</strong>, then
                  confirm.
                </span>
              </li>
            </ol>
          )}

          {variant === 'ios_chrome' && (
            <div className="mb-5 mt-3 w-full max-w-sm rounded-2xl bg-amber-50 px-4 py-3 text-left text-sm leading-relaxed text-amber-950 ring-1 ring-amber-100">
              <p className="font-semibold text-amber-950">Open this page in Safari to install the app.</p>
              <p className="mt-1 text-amber-900/90">
                Chrome on iOS cannot add PWAs to the home screen. Copy the link, open it in Safari, then use Share →
                Add to Home Screen.
              </p>
            </div>
          )}

          {variant === 'chromium' && (
            <p className="mb-5 mt-1 text-sm text-slate-500">
              When you install, your browser may ask you to confirm — choose Add or Install to continue.
            </p>
          )}

          <div className="flex w-full flex-col gap-2.5">
            <button
              type="button"
              className="min-h-[52px] w-full rounded-2xl bg-gradient-to-r from-[#9a95ca] to-[#7c77b9] text-base font-extrabold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
            <button
              type="button"
              className="min-h-[48px] w-full rounded-2xl border border-slate-200 bg-white text-[15px] font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.99]"
              onClick={dismiss}
            >
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
