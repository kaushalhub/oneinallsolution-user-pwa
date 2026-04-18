import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppBrandMark } from '../components/AppBrandMark';
import { APP_POWERED_BY } from '../constants/branding';
import { onboardingSlides } from '../constants/data';
import { Colors, Radius, Spacing } from '../constants/theme';
import { IonIcon } from '../utils/ionIcon';

const H_PAD = Spacing.lg;

const SLIDE_ICON: Record<string, string> = {
  calendar: 'calendar-outline',
  'shield-checkmark': 'shield-checkmark-outline',
  cash: 'cash-outline',
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [winW, setWinW] = useState(typeof window !== 'undefined' ? window.innerWidth : 360);

  const slideW = useMemo(() => Math.max(280, winW - H_PAD * 2), [winW]);

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const x = el.scrollLeft;
    const next = Math.round(x / slideW);
    setIndex(Math.min(Math.max(next, 0), onboardingSlides.length - 1));
  }, [slideW]);

  return (
    <div className="onb-root pwa-page">
      <div className="onb-gradient" />
      <div className="onb-safe" style={{ paddingLeft: H_PAD, paddingRight: H_PAD }}>
        <div className="onb-top">
          <button type="button" className="onb-skip" onClick={() => navigate('/tabs/home')}>
            Skip
          </button>
        </div>
        <AppBrandMark variant="screen" />
        <p className="onb-tagline">Pristine spaces, just a tap away.</p>

        <div className="onb-main">
          <div className="onb-slide-card" style={{ width: slideW }}>
            <div
              ref={scrollerRef}
              className="onb-scroller"
              onScroll={onScroll}
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {onboardingSlides.map((item) => (
                <div
                  key={item.id}
                  className="onb-slide"
                  style={{ width: slideW, scrollSnapAlign: 'start', flex: '0 0 auto' }}
                >
                  <div className="onb-icon-outer">
                    <div className="onb-icon-gradient">
                      <div className="onb-icon-inner">
                        <IonIcon
                          ionName={SLIDE_ICON[item.icon] ?? 'ellipse-outline'}
                          size={36}
                          color={Colors.primary}
                        />
                      </div>
                    </div>
                  </div>
                  <h2 className="onb-title">{item.title}</h2>
                  <p className="onb-desc">{item.description}</p>
                  <div className="onb-subrow">
                    <div className="onb-subcard">
                      <div className="onb-subicon onb-subicon--green">
                        <IonIcon ionName="shield-checkmark" size={18} color="#059669" />
                      </div>
                      <span className="onb-subtitle">Verified professionals</span>
                    </div>
                    <div className="onb-subcard">
                      <div className="onb-subicon onb-subicon--tint">
                        <IonIcon ionName="cash" size={18} color={Colors.primary} />
                      </div>
                      <span className="onb-subtitle">Affordable pricing</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="onb-dots">
            {onboardingSlides.map((dot, i) => (
              <span key={dot.id} className={`onb-dot ${i === index ? 'onb-dot--active' : ''}`} />
            ))}
          </div>

          <button type="button" className="onb-cta" onClick={() => navigate('/tabs/home')}>
            Get Started
          </button>
          <button type="button" className="onb-login-row" onClick={() => navigate('/login')}>
            <span className="onb-login">Already have an account? </span>
            <span className="onb-login-bold">Log in</span>
          </button>
        </div>

        <p className="onb-powered">{APP_POWERED_BY}</p>
      </div>
      <style>{`
        .onb-root {
          position: relative;
          background: #f5f7fb;
          overflow: hidden;
        }
        .onb-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, #f8faff 0%, #eef2f9 55%, #f5f7fb 100%);
        }
        .onb-safe {
          position: relative;
          z-index: 1;
          min-height: 100dvh;
          padding-top: calc(var(--cs-safe-top) + 8px);
          padding-bottom: calc(var(--cs-safe-bottom) + ${Spacing.sm}px);
          display: flex;
          flex-direction: column;
        }
        .onb-top {
          display: flex;
          justify-content: flex-end;
          min-height: 40px;
          margin-bottom: ${Spacing.xs}px;
        }
        .onb-skip {
          border: 1px solid rgba(15, 20, 27, 0.06);
          background: rgba(255, 255, 255, 0.65);
          border-radius: ${Radius.pill}px;
          padding: 8px 12px;
          font-size: 14px;
          font-weight: 700;
          color: #64748b;
        }
        .onb-tagline {
          color: #64748b;
          text-align: center;
          margin: 6px 0 ${Spacing.lg}px;
          font-size: 15px;
          font-weight: 600;
          line-height: 22px;
          padding: 0 ${Spacing.md}px;
        }
        .onb-main {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .onb-slide-card {
          align-self: center;
          border-radius: ${Radius.xl}px;
          overflow: hidden;
          background: #fff;
          border: 1px solid rgba(15, 20, 27, 0.06);
        }
        .onb-scroller {
          display: flex;
          overflow-x: auto;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        .onb-scroller::-webkit-scrollbar {
          display: none;
        }
        .onb-slide {
          padding: ${Spacing.xl}px ${Spacing.xl}px calc(${Spacing.xl}px + 4px);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .onb-icon-outer {
          border-radius: 36px;
          padding: 3px;
          margin-bottom: ${Spacing.md}px;
          background: linear-gradient(135deg, #c7dbff, #e8f0ff);
        }
        .onb-icon-gradient {
          border-radius: 33px;
          padding: 3px;
        }
        .onb-icon-inner {
          width: 84px;
          height: 84px;
          border-radius: 30px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .onb-title {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          text-align: center;
          letter-spacing: -0.3px;
        }
        .onb-desc {
          text-align: center;
          color: #475569;
          font-size: 15px;
          line-height: 24px;
          margin: ${Spacing.sm}px 0 0;
          max-width: 300px;
        }
        .onb-subrow {
          display: flex;
          gap: ${Spacing.sm}px;
          margin-top: ${Spacing.xl}px;
          align-self: stretch;
        }
        .onb-subcard {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f1f5f9;
          border-radius: ${Radius.md}px;
          padding: 12px;
          border: 1px solid rgba(148, 163, 184, 0.25);
        }
        .onb-subicon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .onb-subicon--green {
          background: rgba(52, 211, 153, 0.14);
        }
        .onb-subicon--tint {
          background: rgba(10, 94, 231, 0.12);
        }
        .onb-subtitle {
          flex: 1;
          color: #1e293b;
          font-size: 13px;
          font-weight: 700;
          line-height: 18px;
        }
        .onb-dots {
          display: flex;
          align-self: center;
          gap: 7px;
          margin: ${Spacing.lg}px 0;
        }
        .onb-dot {
          width: 7px;
          height: 7px;
          border-radius: 4px;
          background: #cbd5e1;
        }
        .onb-dot--active {
          width: 26px;
          background: ${Colors.primary};
        }
        .onb-cta {
          border: none;
          border-radius: 16px;
          min-height: 54px;
          font-size: 16px;
          font-weight: 800;
          color: #fff;
          background: linear-gradient(135deg, #9a95ca, #7c77b9);
        }
        .onb-login-row {
          margin-top: ${Spacing.md}px;
          background: none;
          border: none;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          padding: 4px;
        }
        .onb-login {
          font-size: 15px;
          font-weight: 600;
          color: #64748b;
        }
        .onb-login-bold {
          font-size: 15px;
          font-weight: 800;
          color: ${Colors.primary};
        }
        .onb-powered {
          margin-top: ${Spacing.md}px;
          padding-top: ${Spacing.sm}px;
          text-align: center;
          font-size: 11px;
          line-height: 16px;
          font-weight: 600;
          color: #94a3b8;
          padding-left: ${Spacing.sm}px;
          padding-right: ${Spacing.sm}px;
        }
      `}</style>
    </div>
  );
}
