import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCart } from '../context/CartContext';
import { finishOnlineBooking } from '../lib/finishOnlineBooking';
import { clearPendingPay, readPendingPay } from '../lib/paymentPending';
import { getSession } from '../lib/session';

/**
 * When PhonePe (or nginx) redirects the browser to `/payment-result?order_id=…`,
 * complete the booking using the payload saved at payment start.
 */
export function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [msg, setMsg] = useState('Confirming payment…');

  useEffect(() => {
    const orderId = searchParams.get('order_id')?.trim();
    if (!orderId) {
      setMsg('Missing order reference.');
      return;
    }
    let cancelled = false;
    void (async () => {
      const s = getSession();
      if (!s?.token) {
        if (!cancelled) setMsg('Please log in again.');
        return;
      }
      const pending = readPendingPay();
      if (!pending || pending.orderId !== orderId) {
        if (!cancelled) setMsg('No pending booking found — open the app from the same browser, or check Bookings.');
        return;
      }
      try {
        const { booking } = await finishOnlineBooking(s.token, orderId, pending.bookingPayload);
        if (cancelled) return;
        clearPendingPay();
        if (pending.multi) clearCart();
        navigate('/confirmation', { replace: true, state: { booking } });
      } catch (e) {
        if (!cancelled) setMsg(e instanceof Error ? e.message : 'Could not confirm.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate, clearCart]);

  return (
    <div className="pr-page pwa-page">
      <p>{msg}</p>
      <style>{`
        .pr-page {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
          font-weight: 600;
          color: #334155;
        }
      `}</style>
    </div>
  );
}
