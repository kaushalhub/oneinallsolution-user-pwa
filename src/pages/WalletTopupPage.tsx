import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { HostedPaymentFrame } from '../components/HostedPaymentFrame';
import { createPaymentOrder, verifyPaymentOrder } from '../lib/paymentApi';
import { getSession } from '../lib/session';
import { formatRupeeInr } from '../utils/price';
import { readBackendJwtUserId } from '../utils/backendJwt';
import { IonIcon } from '../utils/ionIcon';

type Phase = 'pick' | 'checkout' | 'result';

function topupAlertBody(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const statusCode =
    err && typeof err === 'object' && 'statusCode' in err ? (err as { statusCode?: number }).statusCode : undefined;
  const phonePeServerConfig =
    /PhonePe API rejected the server credentials/i.test(msg) || /PHONEPE_CLIENT_ID/i.test(msg);
  if (statusCode === 502 && phonePeServerConfig) {
    return "We're updating our payment system. Please try wallet top-up again later.";
  }
  if (statusCode === 502) {
    return 'The payment service did not respond. Try again in a moment.';
  }
  return msg.trim() || 'Please try again.';
}

export function WalletTopupPage() {
  const navigate = useNavigate();
  const [amountStr, setAmountStr] = useState('100');
  const [phase, setPhase] = useState<Phase>('pick');
  const [resultOk, setResultOk] = useState<boolean | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [session, setSession] = useState<{
    payment_session_id: string;
    order_id: string;
    environment: 'SANDBOX' | 'PRODUCTION';
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const verifyRunLock = useRef(false);

  const amountNum = useMemo(() => {
    const n = Number.parseFloat(amountStr.replace(/,/g, ''));
    return Number.isFinite(n) ? n : NaN;
  }, [amountStr]);

  const finishWithOrderId = useCallback(async (orderId: string) => {
    if (verifyRunLock.current) return;
    verifyRunLock.current = true;
    setLoading(true);
    setVerifyMsg(null);
    try {
      const s = getSession();
      if (!s?.token) {
        setResultOk(false);
        setVerifyMsg('Session expired. Sign in again.');
        setPhase('result');
        return;
      }
      const v = await verifyPaymentOrder(s.token, orderId);
      setResultOk(Boolean(v.success));
      setVerifyMsg(
        v.success
          ? 'Money has been added to your wallet.'
          : v.order_status
            ? `Status: ${v.order_status}`
            : 'Payment not completed or pending.'
      );
      setPhase('result');
      setSession(null);
    } catch (e) {
      setResultOk(false);
      setVerifyMsg(e instanceof Error ? e.message : 'Verification failed');
      setPhase('result');
      setSession(null);
    } finally {
      setLoading(false);
      verifyRunLock.current = false;
    }
  }, []);

  useEffect(() => {
    if (phase !== 'checkout' || !session?.order_id) return;
    let cancelled = false;
    const oid = session.order_id;
    const tick = () => {
      if (cancelled) return;
      void (async () => {
        try {
          const s = getSession();
          if (!s?.token || cancelled) return;
          const v = await verifyPaymentOrder(s.token, oid);
          if (cancelled) return;
          if (v.success) await finishWithOrderId(oid);
        } catch {
          /* retry */
        }
      })();
    };
    tick();
    const id = window.setInterval(tick, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [phase, session?.order_id, finishWithOrderId]);

  const startCheckout = useCallback(async () => {
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setAlertMsg('Enter a valid amount in INR.');
      return;
    }
    setLoading(true);
    setAlertMsg(null);
    try {
      const s = getSession();
      if (!s?.token) {
        setAlertMsg('Please log in again.');
        return;
      }
      const userId = String(s.userId || readBackendJwtUserId(s.token) || '').trim();
      if (!userId) {
        setAlertMsg('Session incomplete — sign in again.');
        return;
      }
      const idempotency_key = `wallet_${userId}_${Date.now()}`;
      const created = await createPaymentOrder(s.token, {
        amount: Math.round(amountNum * 100) / 100,
        customer_id: userId,
        customer_phone: s.phone ?? '',
        order_note: `Add money · wallet top-up`,
        purpose: 'wallet_topup',
        idempotency_key,
      });
      setSession({
        payment_session_id: created.payment_session_id,
        order_id: created.order_id,
        environment: created.environment,
      });
      setPhase('checkout');
    } catch (e) {
      setAlertMsg(topupAlertBody(e));
    } finally {
      setLoading(false);
    }
  }, [amountNum]);

  if (phase === 'checkout' && session) {
    return (
      <div className="wtp-checkout">
        {alertMsg ? (
          <div className="wtp-alert" role="alert">
            <span>{alertMsg}</span>
            <button type="button" onClick={() => setAlertMsg(null)}>
              OK
            </button>
          </div>
        ) : null}
        <header className="wtp-top wtp-top--shrink">
          <button type="button" className="wtp-back" onClick={() => setPhase('pick')} aria-label="Back">
            <IonIcon ionName="chevron-back" size={24} color="#0f172a" />
          </button>
          <h1 className="wtp-title">Pay {formatRupeeInr(amountNum)}</h1>
          <span style={{ width: 40 }} />
        </header>
        <p className="wtp-hint wtp-hint--shrink">
          Done paying but stuck? Stay on this screen — we recheck payment every few seconds and show success here.
        </p>
        <div className="wtp-frameSlot">
          <HostedPaymentFrame checkoutUri={session.payment_session_id} />
        </div>
        {loading ? <div className="wtp-overlay">Verifying…</div> : null}
        <style>{`
          .wtp-checkout {
            min-height: 100dvh;
            max-height: 100dvh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: #f8fafc;
          }
          .wtp-top--shrink,
          .wtp-hint--shrink {
            flex-shrink: 0;
          }
          .wtp-frameSlot {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .wtp-alert {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 16px;
            background: #fef3c7;
            color: #92400e;
            font-size: 14px;
          }
          .wtp-alert button {
            border: none;
            background: #fff;
            padding: 6px 12px;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
          }
          .wtp-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: calc(var(--cs-safe-top) + 8px) 12px 12px;
            background: #fff;
            border-bottom: 1px solid #e2e8f0;
          }
          .wtp-back {
            border: none;
            background: transparent;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }
          .wtp-title {
            margin: 0;
            font-size: 17px;
            font-weight: 800;
            color: #0f172a;
          }
          .wtp-hint {
            margin: 0;
            padding: 12px 16px;
            font-size: 13px;
            color: #64748b;
            line-height: 1.45;
            background: #fff;
            border-bottom: 1px solid #e2e8f0;
          }
          .wtp-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            color: #fff;
            z-index: 50;
          }
        `}</style>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="wtp-res">
        <div className={`wtp-resCard ${resultOk ? 'wtp-resCard--ok' : 'wtp-resCard--bad'}`}>
          <h1 className="wtp-resH">{resultOk ? 'Success' : 'Payment'}</h1>
          <p className="wtp-resMsg">{verifyMsg}</p>
          <button type="button" className="wtp-resBtn" onClick={() => navigate('/tabs/wallet', { replace: true })}>
            Back to wallet
          </button>
        </div>
        <style>{`
          .wtp-res {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: #f7fafa;
          }
          .wtp-resCard {
            max-width: 360px;
            width: 100%;
            border-radius: 24px;
            padding: 28px;
            text-align: center;
            background: #fff;
            border: 1px solid #e2e8f0;
          }
          .wtp-resCard--ok {
            border-color: rgba(0, 109, 71, 0.25);
          }
          .wtp-resCard--bad {
            border-color: rgba(172, 52, 52, 0.2);
          }
          .wtp-resH {
            margin: 0 0 12px;
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
          }
          .wtp-resMsg {
            margin: 0 0 24px;
            font-size: 15px;
            color: #475569;
            line-height: 1.5;
          }
          .wtp-resBtn {
            width: 100%;
            min-height: 48px;
            border: none;
            border-radius: 14px;
            background: #7c77b9;
            color: #fff;
            font-weight: 800;
            font-size: 15px;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="wtp-pick">
      {alertMsg ? (
        <div className="wtp-alert" role="alert">
          <span>{alertMsg}</span>
          <button type="button" onClick={() => setAlertMsg(null)}>
            OK
          </button>
        </div>
      ) : null}
      <header className="wtp-top">
        <button type="button" className="wtp-back" onClick={() => navigate(-1)} aria-label="Back">
          <IonIcon ionName="chevron-back" size={24} color="#0f172a" />
        </button>
        <h1 className="wtp-title">Add money</h1>
        <span style={{ width: 40 }} />
      </header>
      <div className="wtp-body">
        <label className="wtp-lbl">Amount (INR)</label>
        <input
          className="wtp-inp"
          inputMode="decimal"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
        />
        <p className="wtp-note">You will pay securely on PhonePe&apos;s page (UPI, card, or netbanking).</p>
        <button type="button" className="wtp-cta" disabled={loading} onClick={() => void startCheckout()}>
          {loading ? 'Starting…' : `Continue · ${formatRupeeInr(amountNum)}`}
        </button>
      </div>
      <style>{`
        .wtp-pick {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: #f8fafc;
        }
        .wtp-alert {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          background: #fef3c7;
          color: #92400e;
          font-size: 14px;
        }
        .wtp-alert button {
          border: none;
          background: #fff;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }
        .wtp-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: calc(var(--cs-safe-top) + 8px) 12px 12px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
        }
        .wtp-back {
          border: none;
          background: transparent;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .wtp-title {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
        }
        .wtp-body {
          padding: 24px;
          flex: 1;
        }
        .wtp-lbl {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #586161;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .wtp-inp {
          margin-top: 8px;
          width: 100%;
          max-width: 400px;
          padding: 14px 16px;
          font-size: 18px;
          font-weight: 700;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #0f172a;
        }
        .wtp-note {
          margin-top: 16px;
          font-size: 14px;
          color: #64748b;
          line-height: 1.45;
          max-width: 400px;
        }
        .wtp-cta {
          margin-top: 28px;
          width: 100%;
          max-width: 400px;
          min-height: 52px;
          border: none;
          border-radius: 14px;
          background: #7c77b9;
          color: #fff;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
        }
        .wtp-cta:disabled {
          opacity: 0.65;
        }
      `}</style>
    </div>
  );
}
