import { Link } from 'react-router-dom';

import type { UserAddress } from '../lib/userApi';

type Props = {
  open: boolean;
  onClose: () => void;
  addresses: UserAddress[];
  loading: boolean;
  error: string | null;
  activeAddressId: string | null;
  onSelectAddress: (addr: UserAddress) => void | Promise<void>;
  onChangeCity: () => void;
};

export function HomeLocationSheet({
  open,
  onClose,
  addresses,
  loading,
  error,
  activeAddressId,
  onSelectAddress,
  onChangeCity,
}: Props) {
  if (!open) return null;

  return (
    <div className="hls-overlay" role="dialog" aria-modal="true" aria-labelledby="hls-title">
      <button type="button" className="hls-backdrop" aria-label="Close" onClick={onClose} />
      <div className="hls-sheet">
        <div className="hls-handle" />
        <h2 id="hls-title" className="hls-title">
          Delivery location
        </h2>
        <p className="hls-desc">Choose a saved address or change your service area.</p>

        {error ? <p className="hls-err">{error}</p> : null}

        {loading ? <p className="hls-muted">Loading addresses…</p> : null}

        {!loading && addresses.length === 0 ? (
          <div className="hls-empty">
            <p className="hls-empty-title">No saved address yet</p>
            <p className="hls-muted">Add an address for faster checkout, or pick your city below.</p>
          </div>
        ) : null}

        {!loading && addresses.length > 0 ? (
          <div className="hls-list">
            {addresses.map((a) => {
              const selected = activeAddressId && a._id === activeAddressId;
              return (
                <button
                  key={a._id}
                  type="button"
                  className={`hls-row ${selected ? 'hls-row--active' : ''}`}
                  onClick={() => void onSelectAddress(a)}
                >
                  <div className="hls-row-top">
                    <span className="hls-row-label">{a.label.trim() || 'Address'}</span>
                    {a.isDefault ? <span className="hls-badge">Default</span> : null}
                  </div>
                  <div className="hls-row-sub">{oneLinePreview(a)}</div>
                </button>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          className="hls-secondary"
          onClick={() => {
            onClose();
            onChangeCity();
          }}
        >
          Change city / state
        </button>

        <Link to="/profile/saved-addresses" className="hls-manage" onClick={onClose}>
          Manage or add addresses
        </Link>
      </div>
      <style>{`
        .hls-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .hls-backdrop {
          position: absolute;
          inset: 0;
          border: none;
          background: rgba(15, 23, 42, 0.45);
        }
        .hls-sheet {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 520px;
          max-height: 85dvh;
          overflow: auto;
          background: #fff;
          border-radius: 20px 20px 0 0;
          padding: 12px 20px calc(20px + var(--cs-safe-bottom));
          box-shadow: 0 -8px 40px rgba(15, 23, 42, 0.12);
        }
        .hls-handle {
          width: 44px;
          height: 5px;
          border-radius: 3px;
          background: #e2e8f0;
          margin: 4px auto 12px;
        }
        .hls-title {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
        }
        .hls-desc {
          margin: 0 0 16px;
          color: #64748b;
          font-size: 14px;
          line-height: 21px;
        }
        .hls-err {
          margin: 0 0 12px;
          color: #b91c1c;
          font-size: 14px;
          font-weight: 600;
        }
        .hls-muted {
          margin: 0 0 12px;
          color: #64748b;
          font-size: 14px;
        }
        .hls-empty {
          margin-bottom: 12px;
        }
        .hls-empty-title {
          margin: 0 0 6px;
          font-weight: 800;
          color: #0f172a;
        }
        .hls-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 14px;
        }
        .hls-row {
          text-align: left;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px 14px;
          background: #fff;
          cursor: pointer;
        }
        .hls-row--active {
          border-color: #9a95ca;
          box-shadow: 0 0 0 1px rgba(154, 149, 202, 0.35);
        }
        .hls-row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .hls-row-label {
          font-weight: 800;
          color: #0f172a;
          font-size: 15px;
        }
        .hls-badge {
          font-size: 11px;
          font-weight: 800;
          color: #7c77b9;
          background: rgba(124, 119, 185, 0.12);
          padding: 3px 8px;
          border-radius: 8px;
        }
        .hls-row-sub {
          margin-top: 6px;
          font-size: 13px;
          color: #64748b;
          line-height: 18px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .hls-secondary {
          width: 100%;
          min-height: 48px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-weight: 700;
          color: #334155;
          margin-bottom: 10px;
          cursor: pointer;
        }
        .hls-manage {
          display: block;
          text-align: center;
          font-weight: 700;
          font-size: 14px;
          color: #7c77b9;
          text-decoration: none;
          padding: 8px 0 4px;
        }
      `}</style>
    </div>
  );
}

function oneLinePreview(a: UserAddress): string {
  const parts = [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(', '), a.pincode].filter(
    (x) => x && String(x).trim()
  );
  return parts.join(', ');
}
