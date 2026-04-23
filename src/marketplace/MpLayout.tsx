import { Link, Outlet } from 'react-router-dom';
import './marketplace.css';

export function MpLayout() {
  return (
    <div className="mp-root">
      <header className="mp-top">
        <h1>Home services</h1>
        <p className="mp-sub">Demo checkout with 18% GST (India)</p>
        <Link to="/tabs/home" style={{ fontSize: 13, fontWeight: 700, color: 'var(--mp-primary-dark)' }}>
          ← Back to app home
        </Link>
      </header>
      <div className="mp-body">
        <Outlet />
      </div>
    </div>
  );
}
