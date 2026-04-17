import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AddressMapPicker, type MapResolvedAddress } from '../components/AddressMapPicker';
import {
  addUserAddress,
  deleteUserAddress,
  fetchUserAddresses,
  formatAddressOneLine,
  selectUserAddress,
  type UserAddress,
} from '../lib/userApi';
import { getSession } from '../lib/session';
import { IonIcon } from '../utils/ionIcon';

const GOOGLE_MAPS_KEY =
  typeof import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'string' ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY : undefined;

export function SavedAddressesPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [formLabel, setFormLabel] = useState('Home');
  const [formLine1, setFormLine1] = useState('');
  const [formLine2, setFormLine2] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formDefault, setFormDefault] = useState(true);
  const [pinnedLat, setPinnedLat] = useState<number | null>(null);
  const [pinnedLng, setPinnedLng] = useState<number | null>(null);

  const resetForm = () => {
    setFormLabel('Home');
    setFormLine1('');
    setFormLine2('');
    setFormCity('');
    setFormState('');
    setFormPin('');
    setFormDefault(true);
    setPinnedLat(null);
    setPinnedLng(null);
  };

  const onMapResolved = useCallback((p: MapResolvedAddress) => {
    setFormLine1(p.line1);
    setFormLine2(p.line2);
    setFormCity(p.city);
    setFormState(p.state);
    setFormPin(p.pincode);
    setPinnedLat(p.lat);
    setPinnedLng(p.lng);
    setErr(null);
  }, []);

  const load = useCallback(async (silent: boolean) => {
    setErr(null);
    if (!silent) setLoading(true);
    try {
      const session = getSession();
      if (!session?.token) {
        setToken(null);
        setAddresses([]);
        return;
      }
      setToken(session.token);
      const { addresses: list } = await fetchUserAddresses(session.token);
      setAddresses(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load addresses');
      setAddresses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load(true);
  };

  const onSetDefault = async (addr: UserAddress) => {
    if (!token || addr.isDefault) return;
    try {
      const { addresses: next } = await selectUserAddress(token, addr._id);
      setAddresses(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update default');
    }
  };

  const onDelete = (addr: UserAddress) => {
    if (!token) return;
    if (!window.confirm(`Remove address?\n${formatAddressOneLine(addr)}`)) return;
    void (async () => {
      try {
        const { addresses: next } = await deleteUserAddress(token, addr._id);
        setAddresses(next);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not remove');
      }
    })();
  };

  const submitNewAddress = async () => {
    if (!token) return;
    if (!formLine1.trim()) {
      setErr('Please enter address line 1.');
      return;
    }
    setAddSaving(true);
    setErr(null);
    try {
      const { addresses: next } = await addUserAddress(token, {
        label: formLabel.trim() || 'Home',
        line1: formLine1.trim(),
        line2: formLine2.trim(),
        city: formCity.trim(),
        state: formState.trim(),
        pincode: formPin.trim(),
        ...(pinnedLat != null && pinnedLng != null ? { lat: pinnedLat, lng: pinnedLng } : {}),
        setAsDefault: formDefault,
      });
      setAddresses(next);
      setAddOpen(false);
      resetForm();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setAddSaving(false);
    }
  };

  if (!loading && !token) {
    return (
      <div className="addr-page">
        <header className="addr-bar">
          <button type="button" className="addr-back" onClick={() => navigate(-1)} aria-label="Back">
            <IonIcon ionName="chevron-back" size={24} color="#2C3435" />
          </button>
          <h1 className="addr-title">Saved addresses</h1>
          <span style={{ width: 40 }} />
        </header>
        <div className="addr-guest">
          <p className="addr-guestT">Log in to save addresses</p>
          <p className="addr-guestS">Your saved homes and offices will show here for faster booking.</p>
          <button type="button" className="addr-primary" onClick={() => navigate('/login')}>
            Log in
          </button>
        </div>
        <style>{addrStyles}</style>
      </div>
    );
  }

  return (
    <div className="addr-page">
      <header className="addr-bar">
        <button type="button" className="addr-back" onClick={() => navigate(-1)} aria-label="Back">
          <IonIcon ionName="chevron-back" size={24} color="#2C3435" />
        </button>
        <h1 className="addr-title">Saved addresses</h1>
        <button type="button" className="addr-add" onClick={() => setAddOpen(true)} aria-label="Add address">
          <IonIcon ionName="add" size={26} color="#7c77b9" />
        </button>
      </header>

      {loading ? (
        <p className="addr-load">Loading…</p>
      ) : (
        <div className="addr-scroll">
          <button type="button" className="addr-refreshLnk" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          {err ? <p className="addr-err">{err}</p> : null}
          <p className="addr-hint">
            Tap an address to set it as default for new bookings. These addresses also appear on the booking screen.
          </p>

          {addresses.length === 0 ? (
            <div className="addr-empty">
              <IonIcon ionName="location-outline" size={40} color="#94A3B8" />
              <p className="addr-emptyT">No saved address yet</p>
              <p className="addr-emptyS">Add your home or office so checkout is faster.</p>
              <button type="button" className="addr-primary" onClick={() => setAddOpen(true)}>
                Add address
              </button>
            </div>
          ) : (
            addresses.map((addr) => (
              <div key={addr._id} className={`addr-card ${addr.isDefault ? 'addr-card--def' : ''}`}>
                <button type="button" className="addr-cardMain" onClick={() => void onSetDefault(addr)}>
                  <div className={addr.isDefault ? 'addr-iconB' : 'addr-iconG'}>
                    <IonIcon ionName="location" size={22} color={addr.isDefault ? '#1E3A8A' : '#586161'} />
                  </div>
                  <div className="addr-body">
                    <div className="addr-rowT">
                      <span className="addr-lbl">{addr.label || 'Home'}</span>
                      {addr.isDefault ? (
                        <span className="addr-tag">DEFAULT</span>
                      ) : (
                        <span className="addr-hintSm">Tap to set default</span>
                      )}
                    </div>
                    <p className="addr-line">{formatAddressOneLine(addr)}</p>
                  </div>
                </button>
                <button type="button" className="addr-trash" onClick={() => onDelete(addr)} aria-label="Delete">
                  <IonIcon ionName="trash-outline" size={20} color="#AC3434" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {addOpen ? (
        <div className="addr-modalRoot">
          <button type="button" className="addr-modalBackdrop" aria-label="Close" onClick={() => setAddOpen(false)} />
          <div className="addr-modalCard">
            <div className="addr-modalAccent" aria-hidden />
            <div className="addr-modalHead">
              <div>
                <p className="addr-modalKicker">Add delivery address</p>
                <h2 className="addr-modalTitle">New address</h2>
              </div>
              <button type="button" className="addr-modalClose" onClick={() => setAddOpen(false)}>
                <IonIcon ionName="close" size={22} color="#64748B" />
              </button>
            </div>
            <div className="addr-modalBody">
              <AddressMapPicker apiKey={GOOGLE_MAPS_KEY} onResolved={onMapResolved} disabled={addSaving} />
              <div className="addr-fieldBlock">
                <p className="addr-secKicker">Details</p>
                <p className="addr-secHint">You can edit any field after the map fills them.</p>
                <label className="addr-fldLbl">Label</label>
                <input
                  className="addr-fldInp"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Home, Office…"
                />
                <label className="addr-fldLbl">Address line 1 *</label>
                <input
                  className="addr-fldInp"
                  value={formLine1}
                  onChange={(e) => setFormLine1(e.target.value)}
                  placeholder="House / flat, street"
                />
                <label className="addr-fldLbl">Address line 2</label>
                <input
                  className="addr-fldInp"
                  value={formLine2}
                  onChange={(e) => setFormLine2(e.target.value)}
                  placeholder="Landmark (optional)"
                />
                <label className="addr-fldLbl">City</label>
                <input
                  className="addr-fldInp"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="City"
                />
                <label className="addr-fldLbl">State</label>
                <input
                  className="addr-fldInp"
                  value={formState}
                  onChange={(e) => setFormState(e.target.value)}
                  placeholder="State"
                />
                <label className="addr-fldLbl">PIN code</label>
                <input
                  className="addr-fldInp"
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value)}
                  placeholder="560001"
                  inputMode="numeric"
                />
                <label className="addr-check">
                  <input type="checkbox" checked={formDefault} onChange={(e) => setFormDefault(e.target.checked)} />
                  Set as default address
                </label>
                <button
                  type="button"
                  className="addr-save"
                  disabled={addSaving}
                  onClick={() => void submitNewAddress()}
                >
                  {addSaving ? 'Saving…' : 'Save address'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style>{addrStyles}</style>
    </div>
  );
}

const addrStyles = `
  .addr-page { flex: 1; display: flex; flex-direction: column; background: #f7fafa; min-height: 0; }
  .addr-bar {
    display: flex; flex-direction: row; align-items: center; justify-content: space-between;
    padding: calc(var(--cs-safe-top) + 8px) 12px 12px; background: #fff; border-bottom: 1px solid #e9efef;
  }
  .addr-back, .addr-add { width: 40px; height: 40px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .addr-title { margin: 0; font-size: 17px; font-weight: 700; color: #2c3435; }
  .addr-load { padding: 32px; text-align: center; color: #64748b; }
  .addr-scroll { flex: 1; overflow: auto; padding: 16px 20px 32px; display: flex; flex-direction: column; gap: 12px; }
  .addr-refreshLnk { align-self: flex-end; border: none; background: none; color: #7c77b9; font-weight: 700; font-size: 13px; cursor: pointer; }
  .addr-err { color: #ac3434; font-size: 14px; margin: 0; }
  .addr-hint { color: #586161; font-size: 13px; line-height: 19px; margin: 0; }
  .addr-guest { padding: 24px; display: flex; flex-direction: column; gap: 12px; }
  .addr-guestT { margin: 0; font-size: 20px; font-weight: 800; color: #2c3435; }
  .addr-guestS { margin: 0; font-size: 15px; color: #586161; line-height: 22px; }
  .addr-primary { align-self: flex-start; margin-top: 8px; background: #7c77b9; color: #fff; font-weight: 700; font-size: 15px; border: none; padding: 12px 24px; border-radius: 9999px; cursor: pointer; }
  .addr-empty { margin-top: 24px; padding: 28px; border-radius: 24px; background: #fff; border: 1px solid #eef2f6; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
  .addr-emptyT { margin: 8px 0 0; font-size: 18px; font-weight: 700; color: #2c3435; }
  .addr-emptyS { margin: 0; font-size: 14px; color: #64748b; line-height: 20px; }
  .addr-card { display: flex; flex-direction: row; align-items: stretch; background: #fff; border-radius: 16px; border: 1px solid #eef2f6; overflow: hidden; }
  .addr-card--def { border: 2px solid #7c77b9; }
  .addr-cardMain { flex: 1; display: flex; flex-direction: row; padding: 16px; gap: 14px; align-items: flex-start; border: none; background: transparent; cursor: pointer; text-align: left; min-width: 0; }
  .addr-iconB { width: 44px; height: 44px; border-radius: 22px; background: #a9c0ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .addr-iconG { width: 44px; height: 44px; border-radius: 22px; background: #dce4e5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .addr-body { flex: 1; min-width: 0; }
  .addr-rowT { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .addr-lbl { font-size: 16px; font-weight: 700; color: #2c3435; }
  .addr-tag { font-size: 10px; font-weight: 800; color: #00603e; background: #7efdbe; padding: 2px 8px; border-radius: 9999px; }
  .addr-hintSm { font-size: 11px; font-weight: 600; color: #006499; }
  .addr-line { margin: 6px 0 0; font-size: 14px; color: #586161; line-height: 21px; }
  .addr-trash { border: none; border-left: 1px solid #f1f5f9; background: #fff; padding: 0 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .addr-modalRoot { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; justify-content: flex-end; }
  .addr-modalBackdrop { position: absolute; inset: 0; background: rgba(15,23,42,0.45); border: none; cursor: pointer; }
  .addr-modalCard {
    position: relative; background: #fff; border-top-left-radius: 22px; border-top-right-radius: 22px;
    padding: 0 0 max(28px, env(safe-area-inset-bottom)); max-height: 92dvh; overflow: auto;
    box-shadow: 0 -12px 48px rgba(15, 23, 42, 0.12);
  }
  .addr-modalAccent {
    height: 4px; margin: 0 20px 0; border-radius: 4px;
    background: linear-gradient(90deg, #9a95ca, #7c77b9, #5b5699);
  }
  .addr-modalHead {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 16px 20px 8px; gap: 12px;
  }
  .addr-modalKicker { margin: 0 0 4px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #7c77b9; }
  .addr-modalTitle { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; }
  .addr-modalClose { border: none; background: #f1f5f9; width: 40px; height: 40px; border-radius: 12px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .addr-modalBody { padding: 8px 20px 0; display: flex; flex-direction: column; gap: 4px; }
  .addr-fieldBlock { margin-top: 4px; padding-top: 4px; border-top: 1px solid #eef2f6; }
  .addr-secKicker { margin: 12px 0 4px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; }
  .addr-secHint { margin: 0 0 8px; font-size: 13px; color: #94a3b8; line-height: 18px; }
  .addr-fldLbl { display: block; margin-top: 10px; font-size: 12px; font-weight: 700; color: #586161; text-transform: uppercase; }
  .addr-fldInp { margin-top: 6px; width: 100%; box-sizing: border-box; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; font-size: 16px; color: #2c3435; background: #fafbfc; }
  .addr-check { display: flex; align-items: center; gap: 10px; margin-top: 16px; font-size: 15px; font-weight: 600; color: #2c3435; cursor: pointer; }
  .addr-save { margin-top: 20px; width: 100%; background: #7c77b9; color: #fff; font-weight: 700; font-size: 16px; border: none; border-radius: 9999px; padding: 14px; cursor: pointer; }
  .addr-save:disabled { opacity: 0.7; }
`;
