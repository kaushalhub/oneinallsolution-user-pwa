import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { IonIcon } from '../utils/ionIcon';

const tabs = [
  { to: '/tabs/home', label: 'Home', ion: 'home-outline', ionActive: 'home-outline' },
  { to: '/tabs/bookings', label: 'Bookings', ion: 'calendar-outline', ionActive: 'calendar-outline' },
  { to: '/tabs/wallet', label: 'Wallet', ion: 'wallet-outline', ionActive: 'wallet-outline' },
  { to: '/tabs/profile', label: 'Profile', ion: 'person-outline', ionActive: 'person-outline' },
] as const;

export function MainTabLayout() {
  const location = useLocation();
  const bottomPad = 'max(10px, env(safe-area-inset-bottom, 0px))';
  const tabBarHeight = `calc(52px + ${bottomPad})`;

  return (
    <div className="tabs-root">
      <div className="tabs-outlet">
        <Outlet />
      </div>
      <nav className="tabs-nav" style={{ height: tabBarHeight, paddingBottom: bottomPad }}>
        {tabs.map((t) => {
          const active = location.pathname === t.to || location.pathname.startsWith(`${t.to}/`);
          return (
            <NavLink
              key={t.to}
              to={t.to}
              className={() => `tabs-item ${active ? 'tabs-item--active' : ''}`}
              style={{ paddingTop: 6 }}
            >
              <span className="tabs-icon">
                <IonIcon ionName={t.ion} size={23} color={active ? '#7c77b9' : '#94A3AF'} />
              </span>
              <span className="tabs-label">{t.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <style>{`
        .tabs-root {
          display: flex;
          flex-direction: column;
          height: 100dvh;
          height: 100vh;
          background: #fff;
        }
        .tabs-outlet {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .tabs-nav {
          flex-shrink: 0;
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          justify-content: space-around;
          padding-top: 6px;
          padding-left: 2px;
          padding-right: 2px;
          background: #fff;
          border-top: 1px solid #e5e9ec;
        }
        .tabs-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          color: #94a3af;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2px;
          gap: 2px;
          padding-top: 2px;
        }
        .tabs-item--active {
          color: #7c77b9;
        }
        .tabs-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tabs-label {
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
