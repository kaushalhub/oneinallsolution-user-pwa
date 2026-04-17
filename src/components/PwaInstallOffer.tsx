import { useCallback, useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
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

export function PwaInstallOffer() {
  const [standalone, setStandalone] = useState(isStandalone);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (standalone) return;

    const mq = window.matchMedia('(display-mode: standalone)');
    const onMq = () => setStandalone(mq.matches);
    mq.addEventListener('change', onMq);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setStandalone(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      mq.removeEventListener('change', onMq);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [standalone]);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } finally {
      setDeferred(null);
    }
  }, [deferred]);

  if (standalone) return null;

  if (deferred) {
    return (
      <>
        <button type="button" className="pwa-install-btn" onClick={install}>
          Install app
        </button>
        <style>{`
          .pwa-install-btn {
            margin-top: 20px;
            width: 100%;
            max-width: 320px;
            min-height: 50px;
            border-radius: 14px;
            border: none;
            background: #7c77b9;
            color: #fff;
            font-weight: 800;
            font-size: 15px;
          }
        `}</style>
      </>
    );
  }

  if (isIosSafari()) {
    return (
      <>
        <p className="pwa-install-hint">
          Add this app to your home screen: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
        </p>
        <style>{`
          .pwa-install-hint {
            margin-top: 20px;
            max-width: 320px;
            font-size: 13px;
            line-height: 1.45;
            color: #64748b;
            font-weight: 600;
            text-align: center;
          }
        `}</style>
      </>
    );
  }

  return null;
}
