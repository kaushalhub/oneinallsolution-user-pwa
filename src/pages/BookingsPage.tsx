import { useCallback, useEffect, useState } from 'react';

import { Colors } from '../constants/theme';
import { fetchMyBookings, type BookingRecord } from '../lib/booking';
import { getSession } from '../lib/session';

export function BookingsPage() {
  const [rows, setRows] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = getSession();
    if (!s?.token) return;
    setLoading(true);
    setErr(null);
    try {
      const { bookings } = await fetchMyBookings(s.token);
      setRows(bookings);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="book-page">
      <header className="book-head">
        <h1 className="book-title">Bookings</h1>
      </header>
      <div className="book-body">
        {loading ? <p className="book-muted">Loading…</p> : null}
        {err ? <p className="book-err">{err}</p> : null}
        {!loading && !err && rows.length === 0 ? <p className="book-muted">No bookings yet.</p> : null}
        <ul className="book-list">
          {rows.map((b) => (
            <li key={b.bookingId || b._id || b.service}>
              <div className="book-row">
                <div className="book-svc">{b.service}</div>
                <div className="book-meta">
                  {b.date} · ₹{b.price}
                </div>
                <div className="book-status">{b.status || 'Scheduled'}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        .book-page {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          min-height: 0;
        }
        .book-head {
          padding: calc(var(--cs-safe-top) + 12px) 20px 12px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
        }
        .book-title {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
        }
        .book-body {
          padding: 16px;
          flex: 1;
          overflow: auto;
        }
        .book-muted {
          color: #64748b;
        }
        .book-err {
          color: #b91c1c;
        }
        .book-list {
          list-style: none;
          margin: 12px 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .book-row {
          width: 100%;
          text-align: left;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px 16px;
          background: #fff;
        }
        .book-svc {
          font-weight: 800;
          color: #0f172a;
        }
        .book-meta {
          margin-top: 6px;
          font-size: 13px;
          color: #64748b;
        }
        .book-status {
          margin-top: 8px;
          font-size: 12px;
          font-weight: 700;
          color: ${Colors.primary};
        }
      `}</style>
    </div>
  );
}
