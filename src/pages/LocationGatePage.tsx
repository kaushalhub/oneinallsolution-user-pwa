import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { IonIcon } from '../utils/ionIcon';

type Resume = 'main' | 'onboarding';

export function LocationGatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resumeTo = (searchParams.get('resume') as Resume) || 'onboarding';

  const [isLoading, setIsLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const showSuccess = Boolean(completed && !isLoading && locationLabel && !permissionDenied);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setCompleted(true);
      setPermissionDenied(true);
      return;
    }
    setIsLoading(true);
    setPermissionDenied(false);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationLabel('Location enabled — we will use this for nearby services.');
        setCompleted(true);
        setIsLoading(false);
      },
      (err) => {
        setCompleted(true);
        setIsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setLocationLabel(null);
        } else {
          setLocationLabel(null);
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    );
  }, []);

  const goNext = useCallback(() => {
    if (resumeTo === 'main') {
      navigate('/tabs/home', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate, resumeTo]);

  const allowDisabled = isLoading;
  const primaryLabel = useMemo(() => {
    if (isLoading) return 'Finding your area…';
    return 'Allow location access';
  }, [isLoading]);

  return (
    <div className="loc-root pwa-page">
      <div className="loc-bg" />
      <div className="loc-safe">
        <div className="loc-hero">
          <div className="loc-radar">
            <span className="loc-ring loc-ring--d0" />
            <span className="loc-ring loc-ring--d1" />
            <span className="loc-ring loc-ring--d2" />
            <div className="loc-pin-outer">
              <div className="loc-pin-gradient">
                <IonIcon ionName="location-sharp" size={32} color="#FFFFFF" />
              </div>
            </div>
          </div>
          <h1 className="loc-title">Services near you</h1>
          <p className="loc-sub">
            Turn on location once to show the right categories and prices for your area. You can change this anytime
            from Home.
          </p>
          {showSuccess ? (
            <div className="loc-banner loc-banner--ok">
              <IonIcon ionName="checkmark-circle" size={20} color="#059669" />
              <span>{locationLabel}</span>
            </div>
          ) : null}
          {completed && permissionDenied ? (
            <div className="loc-banner loc-banner--warn">
              <IonIcon ionName="information-circle" size={20} color="#d97706" />
              <span>
                Permission off — you can still pick your state and city manually, or enable location in Settings later.
              </span>
            </div>
          ) : null}
        </div>
        <div className="loc-actions">
          {!showSuccess ? (
            <button type="button" className="loc-primary" disabled={allowDisabled} onClick={requestLocation}>
              <span className={`loc-primary-inner ${allowDisabled ? 'loc-primary-inner--muted' : ''}`}>
                {!isLoading ? <IonIcon ionName="navigate" size={20} color="#fff" /> : null}
                <span>{primaryLabel}</span>
              </span>
            </button>
          ) : null}
          <button type="button" className="loc-secondary" onClick={goNext}>
            <span>{completed ? 'Continue' : 'Not now'}</span>
            <IonIcon ionName="arrow-forward" size={18} color="#64748b" />
          </button>
        </div>
      </div>
      <style>{`
        .loc-root {
          position: relative;
          background: #fff;
          overflow: hidden;
        }
        .loc-bg {
          position: absolute;
          inset: 0;
          background: #fff;
        }
        .loc-safe {
          position: relative;
          z-index: 1;
          min-height: 100dvh;
          padding: calc(var(--cs-safe-top) + 8px) 24px calc(var(--cs-safe-bottom) + 20px);
          display: flex;
          flex-direction: column;
        }
        .loc-hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .loc-radar {
          position: relative;
          width: 200px;
          height: 200px;
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .loc-ring {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 2px solid rgba(124, 119, 185, 0.25);
          animation: cs-pulse-ring 2.4s ease-out infinite;
        }
        .loc-ring--d1 {
          animation-delay: 0.8s;
        }
        .loc-ring--d2 {
          animation-delay: 1.6s;
        }
        .loc-pin-outer {
          animation: cs-pin-pulse 1.8s ease-in-out infinite;
        }
        .loc-pin-gradient {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8c86c4, #7c77b9);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 40px rgba(124, 119, 185, 0.35);
        }
        .loc-title {
          margin: 28px 0 0;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.4px;
          color: #0f172a;
        }
        .loc-sub {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 23px;
          color: #64748b;
          max-width: 340px;
        }
        .loc-banner {
          margin-top: 20px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          text-align: left;
          padding: 12px 14px;
          border-radius: 14px;
          max-width: 400px;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
        }
        .loc-banner--ok {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
        }
        .loc-banner--warn {
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
        }
        .loc-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: auto;
        }
        .loc-primary {
          border: none;
          border-radius: 16px;
          padding: 0;
          overflow: hidden;
          background: transparent;
        }
        .loc-primary:disabled {
          opacity: 0.85;
        }
        .loc-primary-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 54px;
          padding: 0 20px;
          font-size: 16px;
          font-weight: 800;
          color: #fff;
          background: linear-gradient(135deg, #9a95ca, #7c77b9);
        }
        .loc-primary-inner--muted {
          background: linear-gradient(135deg, #64748b, #475569);
        }
        .loc-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 52px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-weight: 700;
          font-size: 15px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
