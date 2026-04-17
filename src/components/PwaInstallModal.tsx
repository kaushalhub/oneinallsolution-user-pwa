import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { IonIcon } from '../utils/ionIcon';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const STORAGE_SNOOZE_CHROMIUM = 'cleanswift_pwa_install_snooze_until';
const STORAGE_SNOOZE_IOS = 'cleanswift_pwa_ios_install_hint_until';
const CHROMIUM_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const IOS_SNOOZE_MS = 5 * 24 * 60 * 60 * 1000;

const AUTH_WARM_PATHS = ['/login', '/otp', '/onboarding', '/location'];

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iphone|ipad|ipod/i.test(ua);
  const webkit = /WebKit/i.test(ua);
  const noCriOS = !/CriOS/i.test(ua);
  const noFxiOS = !/FxiOS/i.test(ua);
  return iOS && webkit && noCriOS && noFxiOS;
}

function isSnoozed(key: string): boolean {
  try {
    const v = localStorage.getItem(key);
    if (!v) return false;
    const until = Number(v);
    return !Number.isNaN(until) && Date.now() < until;
  } catch {
    return false;
  }
}

function snooze(key: string, ms: number) {
  try {
    localStorage.setItem(key, String(Date.now() + ms));
  } catch {
    /* ignore */
  }
}

function shouldSkipPathForIosHint(pathname: string): boolean {
  if (pathname === '/') return true;
  return AUTH_WARM_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}?`));
}

/**
 * Full-screen install sheet on mobile web: Chromium when `beforeinstallprompt` fires;
 * iOS Safari once after entering `/tabs/*` (snoozable).
 */
export function PwaInstallModal() {
  const location = useLocation();
  const [standalone, setStandalone] = useState(isStandalone);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'chromium' | 'ios' | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const iosTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iosShownRef = useRef(false);

  useEffect(() => {
    if (standalone) return;

    const mq = window.matchMedia('(display-mode: standalone)');
    const onMq = () => setStandalone(mq.matches);
    mq.addEventListener('change', onMq);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      if (isSnoozed(STORAGE_SNOOZE_CHROMIUM)) return;
      setDeferred(e as BeforeInstallPromptEvent);
      setKind('chromium');
      setOpen(true);
    };
    const onInstalled = () => {
      setStandalone(true);
      setDeferred(null);
      setOpen(false);
      setKind(null);
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
    if (standalone || !isIosSafari()) return;
    if (iosShownRef.current) return;
    if (isSnoozed(STORAGE_SNOOZE_IOS)) return;
    if (!location.pathname.startsWith('/tabs')) return;
    if (shouldSkipPathForIosHint(location.pathname)) return;

    iosTimerRef.current = window.setTimeout(() => {
      if (isStandalone()) return;
      iosShownRef.current = true;
      setKind('ios');
      setOpen(true);
    }, 1600);

    return () => {
      if (iosTimerRef.current) {
        window.clearTimeout(iosTimerRef.current);
        iosTimerRef.current = null;
      }
    };
  }, [location.pathname, standalone]);

  const close = useCallback(() => {
    setOpen(false);
    setKind(null);
  }, []);

  const onLater = useCallback(() => {
    if (kind === 'chromium') {
      snooze(STORAGE_SNOOZE_CHROMIUM, CHROMIUM_SNOOZE_MS);
      setDeferred(null);
    }
    if (kind === 'ios') {
      snooze(STORAGE_SNOOZE_IOS, IOS_SNOOZE_MS);
    }
    close();
  }, [kind, close]);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } finally {
      setDeferred(null);
      close();
    }
  }, [deferred, close]);

  if (standalone || !open || !kind) return null;

  return (
    <div className="pim-root" role="dialog" aria-modal="true" aria-labelledby="pim-title">
      <button type="button" className="pim-backdrop" aria-label="Close" onClick={onLater} />
      <div className="pim-sheet">
        <div className="pim-handle" aria-hidden />
        <div className="pim-iconWrap">
          <IonIcon ionName="grid-outline" size={36} color="#7c77b9" />
        </div>
        <h2 id="pim-title" className="pim-title">
          {kind === 'ios' ? 'Add AO CLEAN to your home screen' : 'Install AO CLEAN'}
        </h2>
        {kind === 'chromium' ? (
          <p className="pim-desc">Open like a real app — faster launch, full screen, and optional updates.</p>
        ) : (
          <p className="pim-desc">
            On iPhone: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
          </p>
        )}
        <div className="pim-actions">
          {kind === 'chromium' ? (
            <>
              <button type="button" className="pim-primary" onClick={() => void install()}>
                Install
              </button>
              <button type="button" className="pim-secondary" onClick={onLater}>
                Not now
              </button>
            </>
          ) : (
            <button type="button" className="pim-primary" onClick={onLater}>
              Got it
            </button>
          )}
        </div>
      </div>
      <style>{`
        .pim-root {
          position: fixed;
          inset: 0;
          z-index: 280;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .pim-backdrop {
          position: absolute;
          inset: 0;
          border: none;
          background: rgba(15, 23, 42, 0.5);
          cursor: pointer;
        }
        .pim-sheet {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 480px;
          background: #fff;
          border-radius: 22px 22px 0 0;
          padding: 10px 22px calc(22px + var(--cs-safe-bottom, 0px));
          box-shadow: 0 -16px 48px rgba(15, 23, 42, 0.18);
        }
        .pim-handle {
          width: 40px;
          height: 5px;
          border-radius: 3px;
          background: #e2e8f0;
          margin: 0 auto 14px;
        }
        .pim-iconWrap {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: linear-gradient(145deg, #f1f0ff, #e8e6ff);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
        }
        .pim-title {
          margin: 0 0 10px;
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          text-align: center;
          letter-spacing: -0.4px;
        }
        .pim-desc {
          margin: 0 0 22px;
          font-size: 15px;
          line-height: 23px;
          color: #475569;
          text-align: center;
        }
        .pim-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pim-primary {
          width: 100%;
          min-height: 52px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #9a95ca, #7c77b9);
          color: #fff;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
        }
        .pim-secondary {
          width: 100%;
          min-height: 48px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #475569;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
