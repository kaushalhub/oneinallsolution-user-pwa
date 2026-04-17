import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { rateBooking } from '../lib/booking';
import { getSession } from '../lib/session';
import { IonIcon } from '../utils/ionIcon';

export function RateBookingPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!bookingId) return;
    setErr(null);
    setSaving(true);
    try {
      const session = getSession();
      if (!session?.token) {
        setErr('Please log in again.');
        return;
      }
      await rateBooking(session.token, bookingId, stars, comment.trim() || undefined);
      navigate(-1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not submit rating');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rb-page pwa-page">
      <header className="rb-head">
        <button type="button" className="rb-back" onClick={() => navigate(-1)} aria-label="Close">
          <IonIcon ionName="close" size={24} color="#64748B" />
        </button>
        <h1 className="rb-title">Rate your service</h1>
        <span style={{ width: 40 }} />
      </header>
      <div className="rb-body">
        <p className="rb-lbl">How was your cleaning?</p>
        <div className="rb-stars">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" className="rb-starBtn" onClick={() => setStars(s)} aria-label={`${s} stars`}>
              <IonIcon ionName={s <= stars ? 'star' : 'star-outline'} size={40} color="#F6C344" />
            </button>
          ))}
        </div>
        <p className="rb-lbl">Comments (optional)</p>
        <textarea
          className="rb-ta"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us what stood out…"
          maxLength={500}
          rows={5}
        />
        {err ? <p className="rb-err">{err}</p> : null}
        <button type="button" className="rb-btn" disabled={saving} onClick={() => void submit()}>
          {saving ? 'Submitting…' : 'Submit rating'}
        </button>
      </div>
      <style>{`
        .rb-page {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
          background: #f7fafa;
        }
        .rb-head {
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: calc(var(--cs-safe-top) + 6px) 12px 10px;
          background: #fff;
          border-bottom: 1px solid #e9efef;
        }
        .rb-back {
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .rb-title {
          flex: 1;
          margin: 0;
          text-align: center;
          font-size: 17px;
          font-weight: 700;
          color: #2c3435;
        }
        .rb-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .rb-lbl {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #586161;
        }
        .rb-stars {
          display: flex;
          flex-direction: row;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .rb-starBtn {
          border: none;
          background: none;
          padding: 4px;
          cursor: pointer;
          line-height: 0;
        }
        .rb-ta {
          min-height: 100px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 14px;
          font-size: 16px;
          color: #2c3435;
          font-family: inherit;
          resize: vertical;
        }
        .rb-err {
          margin: 0;
          color: #ac3434;
          font-size: 14px;
        }
        .rb-btn {
          margin-top: 8px;
          background: #7c77b9;
          border-radius: 9999px;
          padding: 14px;
          border: none;
          color: #fff;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
        }
        .rb-btn:disabled {
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
