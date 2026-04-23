import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSession } from '../lib/session';
import { postMpBooking, postMpQuote, postRazorpayOrder } from './mpApi';

type LocState = { packageId: string; city: string; addonIds: string[] };

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Razorpay script failed'));
    document.body.appendChild(s);
  });
}

export function MpCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocState;
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof postMpQuote>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state.packageId || !state.city) return;
    postMpQuote({ packageId: state.packageId, city: state.city, addonIds: state.addonIds || [] })
      .then(setQuote)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Quote failed'));
  }, [state.addonIds, state.city, state.packageId]);

  if (!state.packageId || !state.city) {
    return (
      <div className="mp-card">
        <p>Nothing to checkout.</p>
        <Link to="/mp">Browse services</Link>
      </div>
    );
  }

  const pay = async () => {
    const token = getSession()?.token || '';
    if (!token) {
      navigate('/login', { state: { from: '/mp/checkout', mpCheckout: state } });
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const { booking } = await postMpBooking(token, {
        packageId: state.packageId,
        city: state.city,
        addonIds: state.addonIds || [],
      });
      try {
        await loadRazorpayScript();
        const order = await postRazorpayOrder(token, booking.id);
        const rz = window.Razorpay;
        if (!rz) throw new Error('Razorpay unavailable');
        const rzp = new rz({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: 'Home services',
          description: `Booking ${booking.id}`,
          handler() {
            navigate('/mp/done', { state: { booking } });
          },
          modal: { ondismiss() {} },
        });
        rzp.open();
      } catch (e) {
        navigate('/mp/done', {
          state: {
            booking,
            payNote: e instanceof Error ? e.message : 'Configure Razorpay keys on server to pay online.',
          },
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mp-card">
        <h2>Checkout</h2>
        {err ? <p className="mp-note">{err}</p> : null}
        {quote ? (
          <div className="mp-break">
            <div className="line">
              <span>Package (ex-GST)</span>
              <span>₹{quote.packageUnitExGst}</span>
            </div>
            <div className="line">
              <span>Add-ons</span>
              <span>₹{quote.addonsTotal}</span>
            </div>
            <div className="sep" />
            <div className="line">
              <strong>Subtotal</strong>
              <strong>₹{quote.subtotal}</strong>
            </div>
            <div className="line">
              <span>GST (18%)</span>
              <span>₹{quote.gstAmount}</span>
            </div>
            <p className="mp-note">CGST 9%: ₹{quote.cgst} · SGST 9%: ₹{quote.sgst}</p>
            <p className="mp-total">Total ₹{quote.totalAmount}</p>
          </div>
        ) : (
          <p className="mp-note">Calculating…</p>
        )}
      </div>
      <button type="button" className="mp-btn" disabled={busy || !quote} onClick={() => void pay()}>
        Proceed to Pay
      </button>
      <p className="mp-note" style={{ textAlign: 'center' }}>
        <Link to="/mp">Cancel</Link>
      </p>
    </>
  );
}
