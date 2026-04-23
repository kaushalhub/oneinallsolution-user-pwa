import { Link, useLocation } from 'react-router-dom';

export function MpConfirmPage() {
  const { state } = useLocation() as {
    state?: { booking?: { id: string; totalAmount: number; gstAmount: number; baseAmount: number }; payNote?: string };
  };
  const b = state?.booking;

  return (
    <div className="mp-card">
      <h2>Confirmed</h2>
      {state?.payNote ? <p className="mp-note">{state.payNote}</p> : null}
      {b ? (
        <>
          <p className="mp-note">Booking id: {b.id}</p>
          <p className="mp-total">Paid total ₹{b.totalAmount}</p>
          <p className="mp-note">
            Includes GST ₹{b.gstAmount} on subtotal ₹{b.baseAmount}
          </p>
        </>
      ) : (
        <p className="mp-note">No booking in session.</p>
      )}
      <p style={{ marginTop: 24 }}>
        <Link to="/mp">Browse again</Link>
      </p>
    </div>
  );
}
