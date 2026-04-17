import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppBrandMark } from '../components/AppBrandMark';
import { clearSession, getSession } from '../lib/session';
import { getProfileWithSessionToken } from '../lib/authApi';
import { IonIcon } from '../utils/ionIcon';

export function SplashPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const bootstrap = async () => {
      await new Promise((r) => setTimeout(r, 1200));
      const session = getSession();
      let resumeTo: 'main' | 'onboarding' = 'onboarding';
      if (session?.token) {
        try {
          await getProfileWithSessionToken(session.token);
          resumeTo = 'main';
        } catch {
          clearSession();
          resumeTo = 'onboarding';
        }
      }
      navigate(`/location?resume=${resumeTo}`, { replace: true });
    };
    void bootstrap();
  }, [navigate]);

  return (
    <div className="splash-root pwa-page">
      <div className="splash-orb splash-orb--top" />
      <div className="splash-orb splash-orb--bottom" />
      <div className="splash-content">
        <div className="splash-logo-shell">
          <div className="splash-logo-ring">
            <div className="splash-logo-inner">
              <img src="/brandlogo.png" alt="" className="splash-logo-img" width={72} height={72} />
            </div>
          </div>
        </div>
        <AppBrandMark variant="screen" />
        <p className="splash-tagline">Pristine spaces, just a tap away.</p>
        <div className="splash-progress-track">
          <div className="splash-progress-fill" />
        </div>
        <p className="splash-hint">Getting things ready…</p>
        <div className="splash-badges">
          <div className="splash-badge">
            <IonIcon ionName="shield-checkmark" size={15} color="#059669" />
            <span>Verified pros</span>
          </div>
          <div className="splash-badge">
            <IonIcon ionName="ribbon" size={15} color="#9a95ca" />
            <span>Fully insured</span>
          </div>
        </div>
      </div>
      <style>{`
        .splash-root {
          position: relative;
          background: #fff;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .splash-orb {
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          pointer-events: none;
        }
        .splash-orb--top {
          top: -80px;
          right: -100px;
          background: #8c86c4;
          opacity: 0.06;
        }
        .splash-orb--bottom {
          bottom: 12%;
          left: -120px;
          background: #34d399;
          opacity: 0.05;
        }
        .splash-content {
          position: relative;
          z-index: 1;
          padding: calc(var(--cs-safe-top) + 12px) 28px calc(var(--cs-safe-bottom) + 8px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          max-width: 100%;
        }
        .splash-logo-shell {
          margin-bottom: 28px;
        }
        .splash-logo-ring {
          padding: 3px;
          border-radius: 36px;
          background: linear-gradient(135deg, rgba(124, 119, 185, 0.15), rgba(124, 119, 185, 0.06));
        }
        .splash-logo-inner {
          width: 112px;
          height: 112px;
          border-radius: 32px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }
        .splash-logo-img {
          display: block;
          object-fit: contain;
        }
        .splash-tagline {
          color: #64748b;
          font-size: 15px;
          margin-top: 10px;
          font-weight: 600;
          line-height: 22px;
          max-width: 280px;
        }
        .splash-progress-track {
          align-self: stretch;
          max-width: 260px;
          height: 5px;
          border-radius: 5px;
          background: #e2e8f0;
          overflow: hidden;
          margin-top: 36px;
        }
        .splash-progress-fill {
          height: 100%;
          border-radius: 5px;
          background: #7c77b9;
          animation: cs-splash-bar 1.65s cubic-bezier(0.33, 1, 0.68, 1) forwards;
        }
        .splash-hint {
          margin-top: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          letter-spacing: 0.2px;
        }
        .splash-badges {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 40px;
        }
        .splash-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.06);
          font-size: 12px;
          font-weight: 700;
          color: #334155;
        }
      `}</style>
    </div>
  );
}
