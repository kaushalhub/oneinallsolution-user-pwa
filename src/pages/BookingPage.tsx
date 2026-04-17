import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Colors } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { validateCoupon, type ValidateCouponResponse } from '../lib/coupon';
import { getSession } from '../lib/session';
import {
  addUserAddress,
  fetchUserAddresses,
  formatAddressOneLine,
  selectUserAddress,
  type UserAddress,
} from '../lib/user';
import type { BookingCartLine, PaymentOptionsLocationState } from '../types/bookingFlow';
import { getNextBookingDays, monthYearLabel } from '../utils/bookingDates';
import { IonIcon } from '../utils/ionIcon';

const TIME_SLOTS = ['09:00\nAM', '12:00 PM', '03:00 PM', '08:00 PM'];

export function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lines: cartCtxLines } = useCart();

  const fromNav = location.state as { cartLines?: BookingCartLine[] } | null;
  const cartLines = useMemo(() => {
    if (fromNav?.cartLines?.length) return fromNav.cartLines;
    if (!cartCtxLines.length) return [];
    return cartCtxLines.map((l) => ({
      slug: l.slug,
      title: l.title,
      basePrice: l.basePrice,
      lineTotal: l.lineTotal,
      selectedAddonIds: l.selectedAddonIds,
      quantity: l.quantity,
      gstPercent: l.gstPercent,
      serviceBaseExGst: l.serviceBaseExGst,
      serviceGstAmount: l.serviceGstAmount,
    }));
  }, [fromNav, cartCtxLines]);

  const hasCart = cartLines.length > 0;
  const multi = hasCart;
  const serviceLineTitle = multi
    ? cartLines.map((l) => ((l.quantity ?? 1) > 1 ? `${l.title} ×${l.quantity}` : l.title)).join(' + ')
    : 'Service';

  const totalPrice = multi ? cartLines.reduce((s, l) => s + l.lineTotal, 0) : 0;

  const bookingDays = useMemo(() => getNextBookingDays(10), []);
  const [selectedDate, setSelectedDate] = useState(() => bookingDays[0]?.id ?? '');
  const [selectedTime, setSelectedTime] = useState('09:00\nAM');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResponse | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponErr, setCouponErr] = useState<string | null>(null);

  const subtotalBeforeDiscount = totalPrice;
  const payTotal = appliedCoupon?.newTotal ?? totalPrice;

  useEffect(() => {
    setAppliedCoupon(null);
    setCouponErr(null);
  }, [totalPrice]);

  const [token, setToken] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressErr, setAddressErr] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [formLabel, setFormLabel] = useState('Home');
  const [formLine1, setFormLine1] = useState('');
  const [formLine2, setFormLine2] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formDefault, setFormDefault] = useState(true);

  useEffect(() => {
    const s = getSession();
    setToken(s?.token ?? null);
  }, []);

  const loadAddresses = useCallback(async () => {
    if (!token) {
      setAddresses([]);
      setSelectedAddressId(null);
      return;
    }
    setAddressLoading(true);
    setAddressErr(null);
    try {
      const { addresses: list } = await fetchUserAddresses(token);
      setAddresses(list);
    } catch (e) {
      setAddressErr(e instanceof Error ? e.message : 'Could not load addresses');
      setAddresses([]);
    } finally {
      setAddressLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    if (!addresses.length) {
      setSelectedAddressId(null);
      return;
    }
    setSelectedAddressId((id) => {
      if (id && addresses.some((a) => a._id === id)) return id;
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      return def._id;
    });
  }, [addresses]);

  const selectedAddr = addresses.find((a) => a._id === selectedAddressId);
  const scheduleMonthLabel = monthYearLabel(selectedDate || bookingDays[0]?.id || '');

  const onSelectAddressCard = async (addr: UserAddress) => {
    setSelectedAddressId(addr._id);
    if (!token || addresses.length < 2 || addr.isDefault) return;
    try {
      const { addresses: next } = await selectUserAddress(token, addr._id);
      setAddresses(next);
    } catch {
      /* keep */
    }
  };

  const submitNewAddress = async () => {
    if (!token) {
      setAddressErr('Please log in to save an address.');
      return;
    }
    if (!formLine1.trim()) {
      setAddressErr('Please enter address line 1.');
      return;
    }
    setAddSaving(true);
    setAddressErr(null);
    try {
      const { addresses: next } = await addUserAddress(token, {
        label: formLabel.trim() || 'Home',
        line1: formLine1.trim(),
        line2: formLine2.trim(),
        city: formCity.trim(),
        state: formState.trim(),
        pincode: formPin.trim(),
        setAsDefault: formDefault,
      });
      setAddresses(next);
      const pick = next.find((a) => a.isDefault) || next[next.length - 1];
      if (pick) setSelectedAddressId(pick._id);
      setAddOpen(false);
      setFormLabel('Home');
      setFormLine1('');
      setFormLine2('');
      setFormCity('');
      setFormState('');
      setFormPin('');
      setFormDefault(true);
    } catch (e) {
      setAddressErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setAddSaving(false);
    }
  };

  const applyCouponPress = async () => {
    const code = couponInput.trim();
    if (!code) {
      setCouponErr('Enter a coupon code.');
      return;
    }
    if (!token) {
      setCouponErr('Log in to apply a coupon.');
      return;
    }
    setCouponErr(null);
    setCouponLoading(true);
    try {
      const res = await validateCoupon(code, subtotalBeforeDiscount);
      setAppliedCoupon(res);
      setCouponInput(res.code);
    } catch (e) {
      setAppliedCoupon(null);
      setCouponErr(e instanceof Error ? e.message : 'Invalid coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleContinueToPayment = () => {
    if (!token) {
      setAddressErr('Please log in to place a booking.');
      return;
    }
    if (!selectedAddr) {
      setAddressErr('Add or select a service address.');
      return;
    }
    if (!selectedDate) {
      setAddressErr('Please choose a date.');
      return;
    }
    const timeNorm = selectedTime.replace(/\n/g, ' ').trim();
    const addressPayload = {
      label: selectedAddr.label,
      line1: selectedAddr.line1,
      line2: selectedAddr.line2,
      city: selectedAddr.city,
      state: selectedAddr.state,
      pincode: selectedAddr.pincode,
      ...(typeof selectedAddr.lat === 'number' ? { lat: selectedAddr.lat } : {}),
      ...(typeof selectedAddr.lng === 'number' ? { lng: selectedAddr.lng } : {}),
    };

    const payload: PaymentOptionsLocationState = {
      serviceLineTitle,
      payTotal: Number(payTotal.toFixed(2)),
      subtotalBeforeDiscount: Number(subtotalBeforeDiscount.toFixed(2)),
      multi,
      cartLines: multi ? cartLines : undefined,
      appliedCoupon: appliedCoupon
        ? {
            code: appliedCoupon.code,
            discountAmount: appliedCoupon.discountAmount,
            newTotal: appliedCoupon.newTotal,
          }
        : null,
      selectedDate,
      selectedTime: timeNorm,
      address: addressPayload,
      addressSummary: formatAddressOneLine(selectedAddr),
      itemCount: multi ? cartLines.length : 1,
    };
    navigate('/payment-options', { state: payload });
  };

  useEffect(() => {
    if (!hasCart || totalPrice <= 0) {
      navigate('/cart', { replace: true });
    }
  }, [hasCart, totalPrice, navigate]);

  if (!hasCart || totalPrice <= 0) return null;

  const headerLocationText = selectedAddr
    ? [selectedAddr.city, selectedAddr.state].filter(Boolean).join(', ') ||
      formatAddressOneLine(selectedAddr).slice(0, 28)
    : 'Add service address';

  return (
    <div className="bk-page pwa-page">
      <header className="bk-head">
        <button type="button" className="bk-back" onClick={() => navigate(-1)} aria-label="Back">
          <IonIcon ionName="chevron-back" size={22} color="#1e293b" />
        </button>
        <div>
          <div className="bk-kicker">Checkout</div>
          <h1 className="bk-title">Confirm & pay</h1>
        </div>
      </header>
      <div className="bk-loc-strip">
        <span className="bk-loc-accent" />
        <IonIcon ionName="location" size={16} color="#7c77b9" />
        <span className="bk-loc-txt">{headerLocationText}</span>
      </div>

      <div className="bk-scroll">
        <section className="bk-card">
          <h2 className="bk-h">Service</h2>
          <p className="bk-svc">{serviceLineTitle}</p>
          <p className="bk-price">₹{Math.round(totalPrice).toLocaleString('en-IN')}</p>
        </section>

        <section className="bk-card">
          <h2 className="bk-h">Coupon</h2>
          <div className="bk-coupon-row">
            <input
              className="bk-inp"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="CODE"
            />
            <button
              type="button"
              className="bk-btn-sec"
              disabled={couponLoading}
              onClick={() => void applyCouponPress()}
            >
              {couponLoading ? '…' : 'Apply'}
            </button>
          </div>
          {couponErr ? <p className="bk-err">{couponErr}</p> : null}
          {appliedCoupon ? (
            <p className="bk-ok">
              Saved {appliedCoupon.discountAmount} — new total ₹
              {Math.round(appliedCoupon.newTotal).toLocaleString('en-IN')}
            </p>
          ) : null}
        </section>

        <section className="bk-card">
          <h2 className="bk-h">Schedule · {scheduleMonthLabel}</h2>
          <div className="bk-days">
            {bookingDays.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`bk-day ${selectedDate === d.id ? 'bk-day--on' : ''}`}
                onClick={() => setSelectedDate(d.id)}
              >
                <span className="bk-day-d">{d.day}</span>
                <span className="bk-day-n">{d.date}</span>
              </button>
            ))}
          </div>
          <div className="bk-times">
            {TIME_SLOTS.map((t) => (
              <button
                key={t}
                type="button"
                className={`bk-time ${selectedTime === t ? 'bk-time--on' : ''}`}
                onClick={() => setSelectedTime(t)}
              >
                {t.replace('\n', ' ')}
              </button>
            ))}
          </div>
        </section>

        <section className="bk-card">
          <div className="bk-row-sp">
            <h2 className="bk-h">Address</h2>
            <button type="button" className="bk-link" onClick={() => setAddOpen(true)}>
              + Add
            </button>
          </div>
          {addressLoading ? <p className="bk-muted">Loading addresses…</p> : null}
          {addressErr ? <p className="bk-err">{addressErr}</p> : null}
          <div className="bk-addr-list">
            {addresses.map((a) => (
              <button
                key={a._id}
                type="button"
                className={`bk-addr ${selectedAddressId === a._id ? 'bk-addr--on' : ''}`}
                onClick={() => void onSelectAddressCard(a)}
              >
                <div className="bk-addr-label">{a.label}</div>
                <div className="bk-addr-line">{formatAddressOneLine(a)}</div>
              </button>
            ))}
          </div>
        </section>

        <div className="bk-spacer" />
      </div>

      <footer className="bk-foot">
        <button type="button" className="bk-cta" onClick={handleContinueToPayment}>
          Continue to payment
        </button>
      </footer>

      {addOpen ? (
        <div className="bk-modal">
          <div className="bk-modal-bg" onClick={() => !addSaving && setAddOpen(false)} />
          <div className="bk-modal-sheet" role="dialog" aria-labelledby="bk-new-addr-title">
            <h3 id="bk-new-addr-title" className="bk-modal-title">
              New address
            </h3>
            <div className="bk-modal-form">
              <div className="bk-field">
                <label className="bk-lab" htmlFor="bk-addr-label">
                  Label
                </label>
                <input
                  id="bk-addr-label"
                  className="bk-inp bk-inp--modal"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="bk-field">
                <label className="bk-lab" htmlFor="bk-addr-l1">
                  Line 1 *
                </label>
                <input
                  id="bk-addr-l1"
                  className="bk-inp bk-inp--modal"
                  value={formLine1}
                  onChange={(e) => setFormLine1(e.target.value)}
                  autoComplete="address-line1"
                />
              </div>
              <div className="bk-field">
                <label className="bk-lab" htmlFor="bk-addr-l2">
                  Line 2
                </label>
                <input
                  id="bk-addr-l2"
                  className="bk-inp bk-inp--modal"
                  value={formLine2}
                  onChange={(e) => setFormLine2(e.target.value)}
                  autoComplete="address-line2"
                />
              </div>
              <div className="bk-field">
                <span className="bk-lab" id="bk-addr-region-lab">
                  City / State / PIN
                </span>
                <div className="bk-field-stack" role="group" aria-labelledby="bk-addr-region-lab">
                  <input
                    className="bk-inp bk-inp--modal"
                    placeholder="City"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    autoComplete="address-level2"
                  />
                  <input
                    className="bk-inp bk-inp--modal"
                    placeholder="State"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    autoComplete="address-level1"
                  />
                  <input
                    className="bk-inp bk-inp--modal"
                    placeholder="PIN"
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value)}
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                </div>
              </div>
              <label className="bk-check-wrap">
                <input
                  type="checkbox"
                  className="bk-check-input"
                  checked={formDefault}
                  onChange={(e) => setFormDefault(e.target.checked)}
                />
                <span className="bk-check-ui" aria-hidden />
                <span className="bk-check-label">Set as default</span>
              </label>
            </div>
            <div className="bk-modal-actions">
              <button type="button" className="bk-btn-cancel" disabled={addSaving} onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="bk-btn-save"
                disabled={addSaving}
                onClick={() => void submitNewAddress()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .bk-page {
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          min-height: 100dvh;
        }
        .bk-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: calc(var(--cs-safe-top) + 8px) 16px 8px;
          background: #fff;
        }
        .bk-back {
          width: 44px;
          height: 44px;
          border-radius: 22px;
          border: none;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bk-kicker {
          font-size: 12px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .bk-title {
          margin: 2px 0 0;
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
        }
        .bk-loc-strip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          position: relative;
        }
        .bk-loc-accent {
          position: absolute;
          left: 22px;
          top: 12px;
          bottom: 12px;
          width: 2px;
          background: #c4b5fd;
          border-radius: 1px;
        }
        .bk-loc-txt {
          margin-left: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bk-scroll {
          flex: 1;
          overflow: auto;
          padding: 12px 16px 100px;
        }
        .bk-card {
          background: #fff;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 12px;
          border: 1px solid #e2e8f0;
        }
        .bk-h {
          margin: 0 0 10px;
          font-size: 15px;
          font-weight: 800;
        }
        .bk-svc {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #334155;
          line-height: 22px;
        }
        .bk-price {
          margin: 8px 0 0;
          font-size: 20px;
          font-weight: 800;
          color: ${Colors.primary};
        }
        .bk-coupon-row {
          display: flex;
          gap: 8px;
        }
        .bk-inp {
          width: 100%;
          border: 1px solid #d7dfe8;
          border-radius: 12px;
          padding: 12px 14px;
          font-weight: 600;
          color: #0f172a;
          background: #fff;
        }
        .bk-coupon-row .bk-inp {
          width: auto;
          flex: 1;
          min-width: 0;
        }
        .bk-btn-sec {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 12px;
          padding: 0 16px;
          font-weight: 800;
          color: #334155;
        }
        .bk-err {
          color: #b91c1c;
          font-size: 13px;
          margin: 8px 0 0;
        }
        .bk-ok {
          color: #047857;
          font-size: 13px;
          margin: 8px 0 0;
        }
        .bk-muted {
          color: #64748b;
          font-size: 14px;
        }
        .bk-days {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .bk-day {
          flex: 0 0 auto;
          width: 56px;
          padding: 10px 6px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .bk-day--on {
          border-color: ${Colors.primary};
          background: rgba(124, 119, 185, 0.1);
        }
        .bk-day-d {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
        }
        .bk-day-n {
          font-size: 18px;
          font-weight: 800;
        }
        .bk-times {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .bk-time {
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          padding: 10px 16px;
          font-weight: 700;
          background: #fff;
        }
        .bk-time--on {
          border-color: ${Colors.primary};
          background: rgba(124, 119, 185, 0.12);
          color: ${Colors.primaryDark};
        }
        .bk-row-sp {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .bk-link {
          border: none;
          background: none;
          color: ${Colors.primary};
          font-weight: 800;
        }
        .bk-addr-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .bk-addr {
          text-align: left;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          background: #fff;
        }
        .bk-addr--on {
          border-color: ${Colors.primary};
          background: rgba(124, 119, 185, 0.08);
        }
        .bk-addr-label {
          font-weight: 800;
        }
        .bk-addr-line {
          margin-top: 4px;
          font-size: 13px;
          color: #64748b;
        }
        .bk-spacer {
          height: 24px;
        }
        .bk-foot {
          position: sticky;
          bottom: 0;
          padding: 12px 16px calc(16px + var(--cs-safe-bottom));
          background: #fff;
          border-top: 1px solid #e2e8f0;
        }
        .bk-cta {
          width: 100%;
          min-height: 52px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #9a95ca, #7c77b9);
          color: #fff;
          font-size: 16px;
          font-weight: 800;
        }
        .bk-modal {
          position: fixed;
          inset: 0;
          z-index: 250;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .bk-modal-bg {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
        }
        .bk-modal-sheet {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 520px;
          max-height: 88dvh;
          overflow: auto;
          background: #fff;
          border-radius: 20px 20px 0 0;
          padding: 22px 20px calc(20px + var(--cs-safe-bottom));
          box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.12);
        }
        .bk-modal-title {
          margin: 0 0 18px;
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.3px;
        }
        .bk-modal-form {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .bk-field {
          margin-bottom: 14px;
        }
        .bk-field:last-of-type {
          margin-bottom: 0;
        }
        .bk-inp--modal {
          display: block;
          width: 100%;
          max-width: 100%;
        }
        .bk-field-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 6px;
        }
        .bk-lab {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          margin: 0 0 6px;
        }
        .bk-check-wrap {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          cursor: pointer;
          user-select: none;
        }
        .bk-check-input {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
          opacity: 0;
        }
        .bk-check-ui {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 2px solid #cbd5e1;
          background: #fff;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition:
            background 0.15s ease,
            border-color 0.15s ease;
        }
        .bk-check-input:checked + .bk-check-ui {
          background: #7c77b9;
          border-color: #7c77b9;
        }
        .bk-check-input:checked + .bk-check-ui::after {
          content: '';
          width: 5px;
          height: 10px;
          border: solid #fff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          margin-bottom: 2px;
        }
        .bk-check-input:focus-visible + .bk-check-ui {
          outline: 2px solid #7c77b9;
          outline-offset: 2px;
        }
        .bk-check-label {
          font-size: 15px;
          font-weight: 600;
          color: #334155;
        }
        .bk-modal-actions {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 12px;
          margin-top: 22px;
        }
        .bk-btn-cancel {
          flex: 0 0 auto;
          min-width: 108px;
          min-height: 48px;
          padding: 0 18px;
          border-radius: 12px;
          border: 1px solid #d7dfe8;
          background: #fff;
          font-size: 15px;
          font-weight: 800;
          color: #334155;
        }
        .bk-btn-save {
          flex: 1;
          min-width: 0;
          min-height: 48px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #9a95ca, #7c77b9);
          color: #fff;
          font-size: 15px;
          font-weight: 800;
        }
        .bk-btn-save:disabled,
        .bk-btn-cancel:disabled {
          opacity: 0.65;
        }
      `}</style>
    </div>
  );
}
