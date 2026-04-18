import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { HostedPaymentFrame } from '../components/HostedPaymentFrame';
import { Colors } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { finishOnlineBooking } from '../lib/finishOnlineBooking';
import { createBooking, type CreateBookingBody } from '../lib/booking';
import { createPaymentOrder, verifyPaymentOrder } from '../lib/paymentApi';
import { clearPendingPay, readPendingPay, savePendingPay } from '../lib/paymentPending';
import {
  clearPendingPaymentOptionsState,
  isValidPaymentOptionsState,
  readPendingPaymentOptionsState,
} from '../lib/pendingPaymentOptionsState';
import { getSession } from '../lib/session';
import { fetchWalletBalance } from '../lib/wallet';
import type { PaymentOptionsLocationState } from '../types/bookingFlow';
import { computeCheckoutGstBreakdown } from '../utils/checkoutBill';
import {
  formatRupeeInr,
  formatRupeeInrDecimals,
  formatRupeeInrGstLine,
  formatRupeeInrWholeFloor,
} from '../utils/price';
import { readBackendJwtUserId } from '../utils/backendJwt';
import { IonIcon } from '../utils/ionIcon';

type PayKind = 'online' | 'cod' | 'wallet';

type BookingPaySessionState = {
  payment_session_id: string;
  order_id: string;
  environment: 'SANDBOX' | 'PRODUCTION';
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

type PendingBase = Omit<CreateBookingBody, 'paymentMode' | 'cashfreeOrderId'> & { walletAmountUsed?: number };

function paymentSetupAlertBody(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const statusCode =
    err && typeof err === 'object' && 'statusCode' in err ? (err as { statusCode?: number }).statusCode : undefined;
  const phonePeServerConfig =
    /PhonePe API rejected the server credentials/i.test(msg) || /PHONEPE_CLIENT_ID/i.test(msg);
  if (statusCode === 502 && phonePeServerConfig) {
    return "We're updating our payment system. Please choose cash on delivery for now, or try online payment again later.";
  }
  if (statusCode === 502) {
    return "The payment service didn't respond. Try again in a moment, or use cash on delivery.";
  }
  return msg.trim() || 'Please try again.';
}

export function PaymentOptionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checkout, setCheckout] = useState<PaymentOptionsLocationState | null | undefined>(undefined);
  const { clearCart } = useCart();

  const [payKind, setPayKind] = useState<PayKind>('online');
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWalletOnline, setUseWalletOnline] = useState(false);
  const [walletApplyAmount, setWalletApplyAmount] = useState(0);
  const [walletAmountStr, setWalletAmountStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingPaySession, setBookingPaySession] = useState<BookingPaySessionState | null>(null);
  const [bookingPayLoading, setBookingPayLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const pendingBaseBookingRef = useRef<PendingBase | null>(null);
  const bookingPayVerifyLock = useRef(false);
  const onlineBookingCompletedRef = useRef(false);

  useLayoutEffect(() => {
    const s = location.state as PaymentOptionsLocationState | null;
    if (isValidPaymentOptionsState(s)) {
      clearPendingPaymentOptionsState();
      setCheckout(s);
      return;
    }
    const pending = readPendingPaymentOptionsState();
    if (isValidPaymentOptionsState(pending)) {
      setCheckout(pending);
      clearPendingPaymentOptionsState();
      return;
    }
    setCheckout(null);
  }, [location.state, location.key]);

  const p = checkout === undefined ? null : checkout;

  useEffect(() => {
    if (checkout === undefined) return;
    if (!isValidPaymentOptionsState(checkout)) {
      navigate('/tabs/home', { replace: true });
    }
  }, [checkout, navigate]);

  const multi = Boolean(p?.multi);
  const cartLines = p?.cartLines;
  const serviceLineTitle = p?.serviceLineTitle ?? 'Booking';
  const payTotal = p?.payTotal ?? 0;
  const subtotalBeforeDiscount = p?.subtotalBeforeDiscount ?? payTotal;
  const appliedCoupon = p?.appliedCoupon;

  const gstBill = useMemo(
    () =>
      computeCheckoutGstBreakdown({
        multi,
        cartLines,
        single:
          !multi && p
            ? {
                basePrice: p.basePrice,
                totalPrice: p.totalPrice,
                gstPercent: p.gstPercent,
                serviceBaseExGst: p.serviceBaseExGst,
                serviceGstAmount: p.serviceGstAmount,
              }
            : undefined,
      }),
    [multi, cartLines, p]
  );

  const baseBooking = useMemo(() => {
    if (!p) return null;
    const bb: PendingBase = {
      service: serviceLineTitle,
      price: Number(payTotal.toFixed(2)),
      date: p.selectedDate,
      time: p.selectedTime,
      address: p.address,
      ...(multi && cartLines?.length
        ? {
            lineItems: cartLines.map((l) => ({
              slug: l.slug,
              title: (l.quantity ?? 1) > 1 ? `${l.title} ×${l.quantity}` : l.title,
              price: l.lineTotal,
            })),
          }
        : {}),
      ...(appliedCoupon
        ? {
            couponCode: appliedCoupon.code,
            subtotalBeforeDiscount: Number(subtotalBeforeDiscount.toFixed(2)),
          }
        : {}),
    };
    return bb;
  }, [serviceLineTitle, payTotal, p, multi, cartLines, appliedCoupon, subtotalBeforeDiscount]);

  const maxWalletApply = roundMoney(Math.min(walletBalance, payTotal));
  const walletPortionLive =
    payKind === 'online'
      ? useWalletOnline
        ? roundMoney(Math.min(Math.max(0, walletApplyAmount), maxWalletApply))
        : 0
      : 0;
  const ctaOnlineAmount = roundMoney(payTotal - walletPortionLive);

  useEffect(() => {
    setWalletApplyAmount((a) => roundMoney(Math.min(Math.max(0, a), maxWalletApply)));
  }, [maxWalletApply]);

  useEffect(() => {
    if (!useWalletOnline || payKind !== 'online') return;
    setWalletApplyAmount((a) => {
      const c = roundMoney(Math.min(Math.max(0, a), maxWalletApply));
      setWalletAmountStr(String(c));
      return c;
    });
  }, [maxWalletApply, useWalletOnline, payKind]);

  const loadWallet = useCallback(async () => {
    try {
      const s = getSession();
      if (!s?.token) {
        setWalletBalance(0);
        return;
      }
      const { wallet } = await fetchWalletBalance(s.token);
      setWalletBalance(Number(wallet) || 0);
    } catch {
      setWalletBalance(0);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const completeBookingPayment = useCallback(
    async (orderId: string) => {
      if (onlineBookingCompletedRef.current) return;
      if (bookingPayVerifyLock.current) return;
      bookingPayVerifyLock.current = true;
      setBookingPayLoading(true);
      try {
        const s = getSession();
        if (!s?.token) {
          setAlertMsg('Sign in required — log in again to finish your booking.');
          setBookingPaySession(null);
          return;
        }
        const v = await verifyPaymentOrder(s.token, orderId);
        if (!v.success) return;
        const pending = pendingBaseBookingRef.current;
        if (!pending) {
          const stored = readPendingPay();
          if (stored && stored.orderId === orderId) {
            const { booking } = await finishOnlineBooking(s.token, orderId, stored.bookingPayload);
            onlineBookingCompletedRef.current = true;
            if (stored.multi) clearCart();
            clearPendingPay();
            setBookingPaySession(null);
            navigate('/confirmation', { replace: true, state: { booking } });
          }
          return;
        }
        if (onlineBookingCompletedRef.current) return;
        const { walletAmountUsed = 0, ...bookingRest } = pending;
        const { booking } = await createBooking(s.token, {
          ...bookingRest,
          paymentMode: 'online',
          cashfreeOrderId: orderId,
          walletAmountUsed,
        });
        onlineBookingCompletedRef.current = true;
        if (multi) clearCart();
        pendingBaseBookingRef.current = null;
        clearPendingPay();
        setBookingPaySession(null);
        navigate('/confirmation', { replace: true, state: { booking } });
      } catch (e) {
        setAlertMsg(e instanceof Error ? e.message : 'Could not complete booking.');
      } finally {
        setBookingPayLoading(false);
        bookingPayVerifyLock.current = false;
      }
    },
    [clearCart, multi, navigate]
  );

  useEffect(() => {
    if (!bookingPaySession) return;
    const oid = bookingPaySession.order_id;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      void (async () => {
        try {
          const s = getSession();
          if (!s?.token || cancelled) return;
          const v = await verifyPaymentOrder(s.token, oid);
          if (cancelled || !v.success) return;
          await completeBookingPayment(oid);
        } catch {
          /* retry */
        }
      })();
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [bookingPaySession, completeBookingPayment]);

  const handlePrimaryPay = async () => {
    if (!p || !baseBooking) return;
    const s = getSession();
    const token = s?.token;
    if (!token) {
      setAlertMsg('Please log in to pay.');
      return;
    }
    if (submitting) return;

    if (payKind === 'cod') {
      setSubmitting(true);
      try {
        const { booking } = await createBooking(token, { ...baseBooking, paymentMode: 'cod' });
        if (multi) clearCart();
        navigate('/confirmation', { replace: true, state: { booking } });
      } catch (e) {
        setAlertMsg(e instanceof Error ? e.message : 'Could not book');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (payKind === 'wallet') {
      setSubmitting(true);
      try {
        const { booking } = await createBooking(token, {
          ...baseBooking,
          paymentMode: 'wallet',
          walletAmountUsed: Number(payTotal.toFixed(2)),
        });
        if (multi) clearCart();
        navigate('/confirmation', { replace: true, state: { booking } });
      } catch (e) {
        setAlertMsg(e instanceof Error ? e.message : 'Could not book');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const wPortion =
      payKind === 'online'
        ? useWalletOnline
          ? roundMoney(Math.min(Math.max(0, walletApplyAmount), maxWalletApply))
          : 0
        : 0;
    const onlineAmt = roundMoney(payTotal - wPortion);

    if (onlineAmt <= 0) {
      setSubmitting(true);
      try {
        const { booking } = await createBooking(token, {
          ...baseBooking,
          paymentMode: 'wallet',
          walletAmountUsed: Number(payTotal.toFixed(2)),
        });
        if (multi) clearCart();
        navigate('/confirmation', { replace: true, state: { booking } });
      } catch (e) {
        setAlertMsg(e instanceof Error ? e.message : 'Could not book');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const userId = String(s.userId || readBackendJwtUserId(token) || '').trim();
      if (!userId) {
        setAlertMsg('Session incomplete — sign in again (user id missing).');
        return;
      }
      const idempotency_key = `booking_${userId}_${Date.now()}`;
      const created = await createPaymentOrder(token, {
        amount: Number(onlineAmt.toFixed(2)),
        customer_id: userId,
        customer_phone: s.phone ?? '',
        order_note: `Booking · ${serviceLineTitle}`.slice(0, 200),
        idempotency_key,
      });
      onlineBookingCompletedRef.current = false;
      pendingBaseBookingRef.current = { ...baseBooking, walletAmountUsed: wPortion };
      savePendingPay({
        multi,
        bookingPayload: { ...baseBooking, walletAmountUsed: wPortion },
        orderId: created.order_id,
      });
      setBookingPaySession({
        payment_session_id: created.payment_session_id,
        order_id: created.order_id,
        environment: created.environment,
      });
    } catch (e) {
      setAlertMsg(paymentSetupAlertBody(e));
    } finally {
      setSubmitting(false);
    }
  };

  const ctaLabel = useMemo(() => {
    if (payKind === 'cod') return 'Place order';
    if (payKind === 'wallet') return `Pay ${formatRupeeInrWholeFloor(payTotal)} from wallet`;
    if (ctaOnlineAmount <= 0) return `Pay ${formatRupeeInrWholeFloor(payTotal)} from wallet`;
    return `Pay ${formatRupeeInrWholeFloor(ctaOnlineAmount)} with PhonePe`;
  }, [payKind, payTotal, ctaOnlineAmount]);

  if (!p || !baseBooking) return null;

  const subtitleParts = [
    `${p.itemCount} item${p.itemCount !== 1 ? 's' : ''}`,
    `Total ${formatRupeeInrWholeFloor(payTotal)}`,
    appliedCoupon ? `Saved ${formatRupeeInr(appliedCoupon.discountAmount)}` : null,
  ].filter(Boolean);

  const CTA_GREEN = '#059669';

  return (
    <div className="pay-page pwa-page">
      {alertMsg ? (
        <div className="pay-alert" role="alert">
          <span>{alertMsg}</span>
          <button type="button" onClick={() => setAlertMsg(null)}>
            OK
          </button>
        </div>
      ) : null}
      <header className="pay-top">
        <button type="button" className="pay-back" onClick={() => navigate(-1)} aria-label="Go back">
          <IonIcon ionName="chevron-back" size={24} color="#0f172a" />
        </button>
        <div>
          <div className="pay-kicker">Step 2 of 2 · Pay now</div>
          <h1 className="pay-title">Payment</h1>
          <p className="pay-sub">{subtitleParts.join(' · ')}</p>
        </div>
      </header>

      <div className="pay-addr">
        <span className="pay-addr-line" />
        <IonIcon ionName="location" size={16} color="#7c77b9" />
        <p className="pay-addr-txt">{p.addressSummary}</p>
      </div>

      <div className="pay-scroll">
        {gstBill.showSplit ? (
          <section className="pay-sum">
            <h2 className="pay-sum-h">Price details</h2>
            <div className="pay-row">
              <span>Service (ex GST)</span>
              <span>{formatRupeeInrDecimals(gstBill.serviceExGst)}</span>
            </div>
            <div className="pay-row">
              <span>GST ({gstBill.gstPercentLabel}%)</span>
              <span>{formatRupeeInrGstLine(gstBill.gstAmount)}</span>
            </div>
            {gstBill.addonsTotal > 0 ? (
              <div className="pay-row">
                <span>Add-ons</span>
                <span>{formatRupeeInrDecimals(gstBill.addonsTotal)}</span>
              </div>
            ) : null}
            <div className="pay-row">
              <span>Subtotal</span>
              <span>{formatRupeeInrWholeFloor(subtotalBeforeDiscount)}</span>
            </div>
            {appliedCoupon ? (
              <div className="pay-row">
                <span>Coupon ({appliedCoupon.code})</span>
                <span className="pay-disc">-{formatRupeeInrDecimals(appliedCoupon.discountAmount)}</span>
              </div>
            ) : null}
            <div className="pay-row pay-row-total">
              <span>Total payable</span>
              <span>{formatRupeeInrWholeFloor(payTotal)}</span>
            </div>
          </section>
        ) : null}

        <h3 className="pay-sec">Wallet</h3>
        <div className="pay-card">
          <button
            type="button"
            className={`pay-opt ${payKind === 'wallet' ? 'pay-opt--on' : ''}`}
            onClick={() => {
              if (walletBalance + 0.005 < payTotal) {
                setAlertMsg(
                  'Insufficient balance. Add money in Wallet or pay online. You can use wallet for part of the total with PhonePe below.'
                );
                return;
              }
              setPayKind('wallet');
              setUseWalletOnline(false);
            }}
          >
            <span className="pay-ico pay-ico--wallet">
              <IonIcon ionName="wallet-outline" size={22} color="#5f5a92" />
            </span>
            <div className="pay-opt-txt">
              <div className="pay-opt-title">Pay from wallet</div>
              <div className="pay-opt-sub">
                {walletBalance + 0.005 < payTotal
                  ? `Balance ${formatRupeeInr(walletBalance)} · Need ${formatRupeeInrWholeFloor(payTotal)}`
                  : `Balance ${formatRupeeInr(walletBalance)}`}
              </div>
            </div>
            {payKind === 'wallet' ? (
              <IonIcon ionName="checkmark-circle" size={24} color={CTA_GREEN} />
            ) : (
              <span className="pay-radio" />
            )}
          </button>

          {payKind === 'online' && walletBalance > 0 ? (
            <div className="pay-split">
              <div className="pay-split-head">
                <span>Use wallet + pay rest online</span>
                <input
                  type="checkbox"
                  checked={useWalletOnline}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setUseWalletOnline(v);
                    if (v) {
                      setWalletApplyAmount(maxWalletApply);
                      setWalletAmountStr(String(maxWalletApply));
                    }
                  }}
                />
              </div>
              {useWalletOnline ? (
                <div className="pay-split-body">
                  <p className="pay-split-hint">
                    Wallet {formatRupeeInrWholeFloor(walletPortionLive)} · Online{' '}
                    {formatRupeeInrWholeFloor(ctaOnlineAmount)}
                  </p>
                  <div className="pay-wal-inp">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={walletAmountStr}
                      onChange={(e) => setWalletAmountStr(e.target.value)}
                      onBlur={() => {
                        const n = Number.parseFloat(walletAmountStr.replace(/,/g, ''));
                        const c = Number.isFinite(n) ? roundMoney(Math.min(Math.max(0, n), maxWalletApply)) : 0;
                        setWalletApplyAmount(c);
                        setWalletAmountStr(String(c));
                      }}
                    />
                    <button
                      type="button"
                      className="pay-max"
                      onClick={() => {
                        setWalletApplyAmount(maxWalletApply);
                        setWalletAmountStr(String(maxWalletApply));
                      }}
                    >
                      Max
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <h3 className="pay-sec">Pay online</h3>
        <div className="pay-card">
          <button
            type="button"
            className={`pay-opt ${payKind === 'online' ? 'pay-opt--on' : ''}`}
            onClick={() => setPayKind('online')}
          >
            <span className="pay-ico pay-ico--pp">
              <img src="/phonepe.png" alt="" width={22} height={22} />
            </span>
            <div className="pay-opt-txt">
              <div className="pay-opt-title">PhonePe</div>
              <div className="pay-opt-sub">UPI and cards on PhonePe</div>
            </div>
            {payKind === 'online' ? (
              <IonIcon ionName="checkmark-circle" size={24} color={CTA_GREEN} />
            ) : (
              <span className="pay-radio" />
            )}
          </button>
        </div>

        <h3 className="pay-sec">Cash</h3>
        <div className="pay-card pay-card-last">
          <button
            type="button"
            className={`pay-opt ${payKind === 'cod' ? 'pay-opt--on' : ''}`}
            onClick={() => {
              setPayKind('cod');
              setUseWalletOnline(false);
            }}
          >
            <span className="pay-ico pay-ico--cash">
              <IonIcon ionName="cash-outline" size={22} color="#2E7D32" />
            </span>
            <div className="pay-opt-txt">
              <div className="pay-opt-title">Cash on delivery</div>
              <div className="pay-opt-sub">Pay when the professional arrives</div>
            </div>
            {payKind === 'cod' ? (
              <IonIcon ionName="checkmark-circle" size={24} color={CTA_GREEN} />
            ) : (
              <span className="pay-radio" />
            )}
          </button>
        </div>
        <div className="pay-spacer" />
      </div>

      <footer className="pay-foot">
        <button type="button" className="pay-cta" disabled={submitting} onClick={() => void handlePrimaryPay()}>
          {submitting ? 'Please wait…' : ctaLabel}
        </button>
      </footer>

      {bookingPaySession ? (
        <div className="pay-modal">
          <div className="pay-modal-bg" />
          <div className="pay-modal-panel">
            <header className="pay-modal-head">
              <button
                type="button"
                className="pay-modal-close"
                disabled={bookingPayLoading}
                onClick={() => {
                  if (bookingPayLoading) return;
                  onlineBookingCompletedRef.current = false;
                  setBookingPaySession(null);
                  pendingBaseBookingRef.current = null;
                }}
                aria-label="Close"
              >
                <IonIcon ionName="close" size={26} color="#0F172A" />
              </button>
              <h2>PhonePe checkout</h2>
            </header>
            <p className="pay-modal-hint">
              Complete payment on PhonePe’s secure page. We confirm your booking when payment succeeds — we recheck
              automatically every few seconds.
            </p>
            <div className="pay-modal-frameSlot">
              <HostedPaymentFrame checkoutUri={bookingPaySession.payment_session_id} />
            </div>
            {bookingPayLoading ? (
              <div className="pay-modal-overlay">
                <p>Confirming your booking…</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <style>{`
        .pay-page {
          display: flex;
          flex-direction: column;
          background: #fff;
          min-height: 100dvh;
        }
        .pay-alert {
          position: fixed;
          top: 12px;
          left: 12px;
          right: 12px;
          z-index: 400;
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 12px 14px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          font-size: 14px;
          color: #991b1b;
        }
        .pay-alert button {
          border: none;
          background: #fff;
          font-weight: 800;
          color: ${Colors.primary};
        }
        .pay-top {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: calc(var(--cs-safe-top) + 8px) 16px 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .pay-back {
          width: 44px;
          height: 44px;
          border-radius: 22px;
          border: none;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pay-kicker {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .pay-title {
          margin: 4px 0 0;
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }
        .pay-sub {
          margin: 2px 0 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
        }
        .pay-addr {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          position: relative;
        }
        .pay-addr-line {
          position: absolute;
          left: 22px;
          top: 18px;
          bottom: 18px;
          width: 2px;
          background: #c4b5fd;
          border-radius: 1px;
        }
        .pay-addr-txt {
          margin: 0 0 0 8px;
          flex: 1;
          font-size: 13px;
          color: #334155;
          font-weight: 600;
          line-height: 18px;
        }
        .pay-scroll {
          flex: 1;
          overflow: auto;
          padding: 8px 16px 100px;
        }
        .pay-sum {
          padding: 12px 0 16px;
          margin-bottom: 4px;
          border-bottom: 1px solid #e2e8f0;
        }
        .pay-sum-h {
          margin: 0 0 10px;
          font-size: 16px;
          font-weight: 800;
        }
        .pay-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 14px;
          color: #64748b;
        }
        .pay-row span:last-child {
          color: #0f172a;
          font-weight: 600;
        }
        .pay-disc {
          color: #047857 !important;
        }
        .pay-row-total {
          margin-top: 8px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          font-weight: 800;
          color: #0f172a !important;
        }
        .pay-row-total span {
          color: #0f172a !important;
          font-weight: 800 !important;
        }
        .pay-sec {
          margin: 16px 0 6px;
          font-size: 12px;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.6px;
          text-transform: uppercase;
        }
        .pay-sec:first-of-type {
          margin-top: 8px;
        }
        .pay-card {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 10px;
          margin-bottom: 4px;
        }
        .pay-card-last {
          border-bottom: none;
        }
        .pay-opt {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 0;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
        }
        .pay-opt--on {
          background: rgba(124, 119, 185, 0.06);
          border-radius: 12px;
          padding-left: 8px;
          padding-right: 8px;
        }
        .pay-ico {
          width: 44px;
          height: 44px;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pay-ico--wallet {
          background: #ede9fe;
        }
        .pay-ico--pp {
          background: #f1f5f9;
        }
        .pay-ico--cash {
          background: #e8f5e9;
        }
        .pay-opt-txt {
          flex: 1;
          min-width: 0;
        }
        .pay-opt-title {
          font-weight: 700;
          color: #0f172a;
          font-size: 16px;
        }
        .pay-opt-sub {
          margin-top: 2px;
          font-size: 13px;
          color: #64748b;
        }
        .pay-radio {
          width: 22px;
          height: 22px;
          border-radius: 11px;
          border: 2px solid #cbd5e1;
        }
        .pay-split {
          padding: 0 0 8px 56px;
        }
        .pay-split-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
          font-size: 14px;
        }
        .pay-split-body {
          margin-top: 10px;
        }
        .pay-split-hint {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 8px;
        }
        .pay-wal-inp {
          display: flex;
          gap: 8px;
        }
        .pay-wal-inp input {
          flex: 1;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 12px;
          font-weight: 600;
        }
        .pay-max {
          border: none;
          background: #f1f5f9;
          font-weight: 800;
          padding: 0 14px;
          border-radius: 10px;
          color: ${Colors.primary};
        }
        .pay-spacer {
          height: 40px;
        }
        .pay-foot {
          position: sticky;
          bottom: 0;
          padding: 12px 16px calc(16px + var(--cs-safe-bottom));
          background: #fff;
          border-top: 1px solid #e2e8f0;
        }
        .pay-cta {
          width: 100%;
          min-height: 52px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #9a95ca, #7c77b9);
          color: #fff;
          font-size: 16px;
          font-weight: 800;
        }
        .pay-cta:disabled {
          opacity: 0.85;
        }
        .pay-modal {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .pay-modal-bg {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
        }
        .pay-modal-panel {
          position: relative;
          margin-top: auto;
          flex: 1;
          min-height: 0;
          max-height: 96dvh;
          height: min(96dvh, 100%);
          background: #fff;
          border-radius: 16px 16px 0 0;
          display: flex;
          flex-direction: column;
          padding: 12px 0 calc(12px + var(--cs-safe-bottom));
          overflow: hidden;
        }
        .pay-modal-head {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 16px 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .pay-modal-head h2 {
          margin: 0;
          flex: 1;
          font-size: 17px;
          font-weight: 800;
        }
        .pay-modal-close {
          border: none;
          background: #f1f5f9;
          width: 40px;
          height: 40px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pay-modal-hint {
          flex-shrink: 0;
          margin: 10px 16px;
          font-size: 13px;
          color: #64748b;
          line-height: 19px;
        }
        .pay-modal-frameSlot {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 0 8px;
        }
        .pay-modal-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
