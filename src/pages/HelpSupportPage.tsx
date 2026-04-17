import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { createSupportTicket, fetchSupportTickets, type SupportTicket } from '../lib/supportApi';
import { getSession } from '../lib/session';
import { IonIcon } from '../utils/ionIcon';

export function HelpSupportPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async (silent: boolean) => {
    setErr(null);
    if (!silent) setLoading(true);
    try {
      const session = getSession();
      if (!session?.token) {
        setTickets([]);
        return;
      }
      const { tickets: list } = await fetchSupportTickets(session.token);
      setTickets(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const submit = async () => {
    const session = getSession();
    if (!session?.token) return;
    const s = subject.trim();
    const b = body.trim();
    if (!s || !b) {
      setErr('Subject and message are required.');
      return;
    }
    setSending(true);
    setErr(null);
    try {
      await createSupportTicket(session.token, s, b);
      setSubject('');
      setBody('');
      await load(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create ticket');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="hlp-page">
      <header className="hlp-head">
        <button type="button" className="hlp-back" onClick={() => navigate(-1)} aria-label="Back">
          <IonIcon ionName="chevron-back" size={22} color="#5f5a92" />
        </button>
        <h1 className="hlp-title">Help &amp; Support</h1>
        <button
          type="button"
          className="hlp-refresh"
          onClick={() => {
            setRefreshing(true);
            void load(true);
          }}
          disabled={refreshing}
        >
          {refreshing ? '…' : '↻'}
        </button>
      </header>

      <div className="hlp-scroll">
        <p className="hlp-intro">Submit a ticket — our team will respond (status updates coming soon).</p>
        {err ? <p className="hlp-err">{err}</p> : null}

        <label className="hlp-lbl">Subject</label>
        <input
          className="hlp-inp"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief issue title"
        />

        <label className="hlp-lbl">Message</label>
        <textarea
          className="hlp-ta"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe what happened…"
          rows={5}
        />

        <button type="button" className="hlp-submit" disabled={sending} onClick={() => void submit()}>
          {sending ? 'Sending…' : 'Submit ticket'}
        </button>

        <h2 className="hlp-sec">Your tickets</h2>
        {loading ? <p className="hlp-muted">Loading…</p> : null}
        {!loading && tickets.length === 0 ? <p className="hlp-empty">No tickets yet.</p> : null}
        {tickets.map((t) => (
          <div key={t._id} className="hlp-card">
            <div className="hlp-cardTop">
              <span className="hlp-subj">{t.subject}</span>
              <span className="hlp-st">{t.status}</span>
            </div>
            <p className="hlp-body">{t.body}</p>
          </div>
        ))}
      </div>

      <style>{`
        .hlp-page { flex: 1; display: flex; flex-direction: column; background: #f7fafa; min-height: 0; }
        .hlp-head {
          display: flex; flex-direction: row; align-items: center; padding: calc(var(--cs-safe-top) + 6px) 12px 10px;
          background: #fff; border-bottom: 1px solid #e9efef; gap: 8px;
        }
        .hlp-back { width: 40px; height: 40px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .hlp-title { flex: 1; margin: 0; text-align: center; font-size: 17px; font-weight: 700; color: #2c3435; }
        .hlp-refresh { width: 40px; height: 36px; border: none; background: #f1f5f9; border-radius: 8px; font-weight: 800; color: #7c77b9; cursor: pointer; }
        .hlp-scroll { flex: 1; overflow: auto; padding: 16px 16px 40px; display: flex; flex-direction: column; gap: 10px; }
        .hlp-intro { margin: 0 0 8px; font-size: 14px; color: #586161; line-height: 21px; }
        .hlp-err { color: #ac3434; font-size: 14px; margin: 0; }
        .hlp-lbl { margin-top: 8px; font-size: 12px; font-weight: 700; color: #586161; text-transform: uppercase; }
        .hlp-inp, .hlp-ta {
          margin-top: 6px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; font-size: 16px;
          background: #fff; color: #2c3435; width: 100%; box-sizing: border-box; font-family: inherit;
        }
        .hlp-ta { min-height: 100px; resize: vertical; }
        .hlp-submit {
          margin-top: 12px; background: #7c77b9; color: #fff; font-weight: 700; font-size: 16px; border: none;
          border-radius: 9999px; padding: 14px; cursor: pointer;
        }
        .hlp-submit:disabled { opacity: 0.7; }
        .hlp-sec { margin: 28px 0 0; font-size: 16px; font-weight: 800; color: #2c3435; }
        .hlp-muted { color: #64748b; margin: 8px 0; }
        .hlp-empty { color: #94a3b8; margin-top: 8px; }
        .hlp-card { margin-top: 10px; padding: 16px; border-radius: 16px; background: #fff; border: 1px solid #eef2f6; }
        .hlp-cardTop { display: flex; flex-direction: row; justify-content: space-between; gap: 12px; }
        .hlp-subj { flex: 1; font-size: 16px; font-weight: 700; color: #2c3435; }
        .hlp-st { font-size: 11px; font-weight: 800; color: #006499; text-transform: uppercase; }
        .hlp-body { margin: 8px 0 0; font-size: 14px; color: #586161; line-height: 20px; white-space: pre-wrap; }
      `}</style>
    </div>
  );
}
