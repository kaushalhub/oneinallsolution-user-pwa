import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { APP_BRAND_SHORT } from '../constants/branding';
import { fetchBooking, type BookingCleanerSummary, type BookingRecord } from '../lib/booking';
import { getBookingMapEmbedUrl } from '../lib/googleMapEmbed';
import { getSession } from '../lib/session';
import { formatRupeeInr } from '../utils/price';
import { IonIcon } from '../utils/ionIcon';

function shortBookingRef(id: string): string {
  const hex = id.replace(/[^a-f0-9]/gi, '');
  const tail = hex.slice(-6).toUpperCase();
  return tail || 'BOOKING';
}

function getCleaner(b: BookingRecord | undefined): BookingCleanerSummary | null {
  const c = b?.cleanerId;
  if (c && typeof c === 'object' && 'name' in c) return c as BookingCleanerSummary;
  return null;
}

function formatAddressLine(addr: BookingRecord['address']): string {
  if (!addr) return '';
  const parts = [addr.line1, addr.line2, [addr.city, addr.state].filter(Boolean).join(', '), addr.pincode].filter(
    (x) => x && String(x).trim()
  );
  return parts.join(', ');
}

function formatScheduleDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

function toRadians(v: number) {
  return (v * Math.PI) / 180;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

function formatConfirmedTime(iso?: string): string {
  if (!iso) {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function AssigningProfessionalBlock() {
  return (
    <div className="cf-assignRow">
      <div className="cf-radar">
        <span className="cf-ripple" />
        <span className="cf-ripple cf-ripple--d1" />
        <span className="cf-ripple cf-ripple--d2" />
        <div className="cf-orbHost">
          <span className="cf-orbGlow" />
          <span className="cf-orbSpin">
            <IonIcon ionName="sync-outline" size={22} color="#FFFFFF" />
          </span>
        </div>
      </div>
      <div className="cf-assignTxt">
        <div className="cf-cleanerName">Assigning your professional</div>
        <p className="cf-assignSub">
          Hang tight — we&apos;re matching you with the best available cleaner for this slot.
        </p>
        <div className="cf-searchRow">
          <span className="cf-searchLbl">Searching nearby</span>
          <span className="cf-dots">
            <span className="cf-dot" />
            <span className="cf-dot cf-dot--d1" />
            <span className="cf-dot cf-dot--d2" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function ConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const paramBooking = (location.state as { booking?: BookingRecord } | null)?.booking;
  const bookingId = paramBooking?._id;

  const [booking, setBooking] = useState<BookingRecord | null>(paramBooking ?? null);

  useEffect(() => {
    const b = (location.state as { booking?: BookingRecord } | null)?.booking;
    if (b) setBooking(b);
  }, [location.key, location.state]);

  const load = useCallback(async () => {
    if (!bookingId) return;
    try {
      const session = getSession();
      if (!session?.token) return;
      const { booking: b } = await fetchBooking(session.token, bookingId);
      setBooking(b);
    } catch {
      /* keep last */
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const shouldPollConfirmation = useMemo(() => {
    const s = booking?.status;
    return s === 'pending' || s === 'assigned' || s === 'in_progress';
  }, [booking?.status]);

  useEffect(() => {
    if (!shouldPollConfirmation || !bookingId) return;
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, [shouldPollConfirmation, bookingId, load]);

  const cleaner = getCleaner(booking ?? undefined);
  const serviceTitle = booking?.service ?? 'Service';
  const idLine = booking
    ? `ID #${shortBookingRef(booking._id)} • ${serviceTitle.toUpperCase()}`
    : 'COMPLETE A BOOKING TO SEE DETAILS';

  const addressLine = formatAddressLine(booking?.address);
  const addr = booking?.address;
  const lat = typeof addr?.lat === 'number' ? addr.lat : null;
  const lng = typeof addr?.lng === 'number' ? addr.lng : null;
  const cLat = cleaner?.location?.lat;
  const cLng = cleaner?.location?.lng;

  let distanceKm: number | null = null;
  let etaMins: number | null = null;
  if (cleaner && lat != null && lng != null && typeof cLat === 'number' && typeof cLng === 'number') {
    distanceKm = haversineKm(cLat, cLng, lat, lng);
    etaMins = Math.max(12, Math.round((distanceKm / 22) * 60));
  }

  const paymentBlurb =
    booking?.paymentMode === 'wallet'
      ? 'Paid from wallet'
      : booking?.paymentMode === 'online'
        ? (booking.walletAmountUsed ?? 0) > 0
          ? 'Wallet + online paid'
          : 'Payment verified'
        : booking?.paymentMode === 'cod'
          ? 'Pay on delivery'
          : 'Booking confirmed';
  const confirmTime = formatConfirmedTime(booking?.createdAt);
  const scheduledDateLabel = booking?.date ? formatScheduleDate(booking.date) : '—';
  const isAssigned = Boolean(booking?.status === 'assigned' && cleaner);

  const step2Title = isAssigned ? `${cleaner!.name} is assigned` : 'Matching a professional';
  const step2Sub = isAssigned
    ? 'They will arrive at your address at the scheduled time.'
    : "We're finding the nearest available cleaner for your slot.";
  const step3Sub = booking
    ? `${serviceTitle} • ${scheduledDateLabel} at ${booking.time ?? '—'}`
    : 'Your service slot is saved.';

  const priceLine = booking ? formatRupeeInr(booking.price) : null;

  const mapsApiKey =
    typeof import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'string' ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY : '';
  const mapEmbedSrc = useMemo(
    () =>
      booking?._id
        ? getBookingMapEmbedUrl({
            apiKey: mapsApiKey || undefined,
            lat,
            lng,
            addressLine,
          })
        : null,
    [booking?._id, mapsApiKey, lat, lng, addressLine]
  );

  const openMaps = () => {
    if (lat != null && lng != null) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (addressLine) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  const openCall = () => {
    const phone = cleaner?.phone?.replace(/\s/g, '');
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const openSms = () => {
    const phone = cleaner?.phone?.replace(/\s/g, '');
    if (!phone) return;
    window.location.href = `sms:${phone}`;
  };

  if (!booking && !paramBooking) {
    return (
      <div className="cf-page cf-page--empty pwa-page">
        <p className="cf-emptyTxt">No booking details here.</p>
        <Link to="/tabs/home" className="cf-homeLink">
          Back to home
        </Link>
        <style>{pageCss}</style>
      </div>
    );
  }

  return (
    <div className="cf-page pwa-page">
      <header className="cf-head">
        <div className="cf-brand">
          <IonIcon ionName="location-outline" size={16} color="#5f5a92" />
          <span className="cf-brandTxt">{APP_BRAND_SHORT}</span>
        </div>
        <div className="cf-headR">
          <div className="cf-safePill">
            <IonIcon ionName="shield-outline" size={10} color="#AC3434" />
            <span className="cf-safeTxt">SAFETY</span>
          </div>
          <button type="button" className="cf-iconBtn" aria-label="Search">
            <IonIcon ionName="search-outline" size={18} color="#64748B" />
          </button>
        </div>
      </header>

      <div className="cf-scroll">
        <div className="cf-success">
          <div className="cf-successGlow" />
          <div className="cf-ok">
            <IonIcon ionName="checkmark" size={24} color="#006D47" />
          </div>
          <h1 className="cf-successTitle">Booking Confirmed!</h1>
          <p className="cf-id">{idLine}</p>
          {priceLine ? <p className="cf-priceHint">{priceLine} total</p> : null}
        </div>

        <div className="cf-mapCard">
          <div className="cf-mapFrameShell">
            {mapEmbedSrc ? (
              <iframe
                className="cf-mapFrame"
                title="Service address on map"
                src={mapEmbedSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <div className="cf-mapFallback" aria-hidden />
            )}
          </div>
          <div className="cf-mapCtl">
            <button
              type="button"
              className="cf-mapCtlBtn"
              disabled={!booking?._id || ((lat == null || lng == null) && !addressLine.trim())}
              onClick={openMaps}
              aria-label="Open in Google Maps"
            >
              <IonIcon ionName="locate-outline" size={20} color="#2C3435" />
            </button>
            <button
              type="button"
              className="cf-mapCtlBtn"
              disabled={!booking?._id || ((lat == null || lng == null) && !addressLine.trim())}
              onClick={openMaps}
              aria-label="Open map in Google Maps"
            >
              <IonIcon ionName="layers-outline" size={18} color="#2C3435" />
            </button>
          </div>
          {addressLine ? (
            <button type="button" className="cf-addrBanner" onClick={openMaps}>
              <IonIcon ionName="navigate-outline" size={14} color="#7c77b9" />
              <span className="cf-addrBannerTxt">{addressLine}</span>
            </button>
          ) : null}
          <div className="cf-eta">
            <div className="cf-etaL">
              <div className="cf-scooter">
                <IonIcon ionName="bicycle-outline" size={25} color="#fff" />
                <span className="cf-greenDot" />
              </div>
              <div>
                <div className="cf-etaLbl">{etaMins != null ? 'EST. TRAVEL TIME' : 'SCHEDULED VISIT'}</div>
                <div className="cf-etaVal">{etaMins != null ? `${etaMins} min` : (booking?.time ?? '—')}</div>
              </div>
            </div>
            <div className="cf-etaDiv" />
            <div>
              <div className="cf-etaLbl">{distanceKm != null ? 'DISTANCE' : 'DATE'}</div>
              <div className="cf-distVal">
                {distanceKm != null ? `${distanceKm.toFixed(1)} km` : scheduledDateLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="cf-cleanerCard">
          <div className={`cf-cleanerTop ${!cleaner ? 'cf-cleanerTop--assign' : ''}`}>
            {cleaner ? (
              <>
                <div className="cf-avatarWrap">
                  <img className="cf-avatar" src="/favicon.png" alt="" />
                  <div className="cf-onlineBadge">
                    <IonIcon ionName="shield-checkmark" size={10} color="#fff" />
                    <span className="cf-onlineBadgeTxt">Verified</span>
                  </div>
                </div>
                <div className="cf-cleanerBody">
                  <div className="cf-cleanerName">{cleaner.name}</div>
                  <div className="cf-ratingRow">
                    <div className="cf-ratingPill">
                      <IonIcon ionName="star" size={12} color="#F59E0B" />
                      <span className="cf-ratingPillTxt">
                        {typeof cleaner.rating === 'number' ? cleaner.rating.toFixed(1) : '—'}
                      </span>
                    </div>
                    <span className="cf-reviewsTxt">Your professional</span>
                  </div>
                  <span className="cf-levelTag">Assigned cleaner</span>
                </div>
              </>
            ) : (
              <AssigningProfessionalBlock />
            )}
          </div>
          <div className="cf-actions">
            <button
              type="button"
              className="cf-actionBtn"
              disabled={!booking?._id}
              onClick={() => booking?._id && navigate('/profile/help-support')}
            >
              <IonIcon ionName="chatbubbles-outline" size={20} color="#7c77b9" />
              <span className="cf-actionTxt">Support</span>
            </button>
            <button type="button" className="cf-actionBtn" disabled={!cleaner?.phone} onClick={openSms}>
              <IonIcon ionName="chatbubble-outline" size={20} color="#7c77b9" />
              <span className="cf-actionTxt">SMS</span>
            </button>
            <button type="button" className="cf-actionBtn" disabled={!cleaner?.phone} onClick={openCall}>
              <IonIcon ionName="call" size={18} color="#7c77b9" />
              <span className="cf-actionTxt">Call</span>
            </button>
          </div>
        </div>

        <div className="cf-timeline">
          <div className="cf-tlHead">
            <span className="cf-tlTitle">Service Timeline</span>
            <span className="cf-livePill">
              <span className="cf-liveTxt">LIVE UPDATES</span>
            </span>
          </div>

          <div className="cf-stepRow">
            <div className="cf-rail">
              <span className="cf-dotDone" />
              <span className="cf-lineDone" />
            </div>
            <div>
              <div className="cf-stepDoneTitle">Booking Confirmed</div>
              <p className="cf-stepSub">
                {paymentBlurb} • {confirmTime}
              </p>
            </div>
          </div>

          <div className="cf-stepRow">
            <div className="cf-rail">
              <span className="cf-dotActive" />
              <span className="cf-linePending" />
            </div>
            <div>
              <div className="cf-stepActiveTitle">{step2Title}</div>
              <p className="cf-stepSub">{step2Sub}</p>
            </div>
          </div>

          <div className="cf-stepRow">
            <div className="cf-rail">
              <span className="cf-dotPending" />
            </div>
            <div>
              <div className="cf-stepPenTitle">Scheduled service</div>
              <p className="cf-stepSub">{step3Sub}</p>
            </div>
          </div>
        </div>

        {booking?.status === 'completed' && booking.ratingStars == null && booking._id ? (
          <button type="button" className="cf-rateCta" onClick={() => navigate(`/rate-booking/${booking._id}`)}>
            <IonIcon ionName="star-outline" size={22} color="#7c77b9" />
            <span className="cf-rateTxt">Rate this service</span>
            <IonIcon ionName="chevron-forward" size={16} color="#7c77b9" />
          </button>
        ) : null}
      </div>

      <button type="button" className="cf-homeBtn" onClick={() => navigate('/tabs/home', { replace: true })}>
        Back To Home
      </button>

      <style>{pageCss}</style>
    </div>
  );
}

const pageCss = `
@keyframes cf-ripple-anim {
  0% { transform: scale(0.75); opacity: 0.45; }
  100% { transform: scale(2.15); opacity: 0; }
}
@keyframes cf-orb-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.07); }
}
@keyframes cf-orb-spin {
  to { transform: rotate(360deg); }
}
@keyframes cf-dot-bounce {
  0%, 100% { opacity: 0.35; transform: translateY(0) scale(1); }
  50% { opacity: 1; transform: translateY(-5px) scale(1.25); }
}

.cf-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: #f7fafa;
  position: relative;
}
.cf-page--empty {
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
}
.cf-emptyTxt { margin: 0; color: #64748b; font-weight: 600; }
.cf-homeLink {
  color: #7c77b9;
  font-weight: 800;
  text-decoration: none;
}

.cf-head {
  flex-shrink: 0;
  height: 72px;
  padding: 16px 24px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background: #fff;
}
.cf-brand { display: flex; flex-direction: row; align-items: center; gap: 12px; }
.cf-brandTxt { color: #5f5a92; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
.cf-headR { display: flex; flex-direction: row; align-items: center; gap: 8px; }
.cf-safePill {
  height: 28px;
  border-radius: 9999px;
  padding: 0 12px;
  background: rgba(172,52,52,0.1);
  display: flex;
  align-items: center;
  gap: 6px;
}
.cf-safeTxt { color: #ac3434; font-size: 12px; font-weight: 700; }
.cf-iconBtn {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cf-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px 16px calc(120px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cf-success {
  position: relative;
  min-height: 187px;
  border-radius: 32px;
  background: #fff;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.cf-successGlow {
  position: absolute;
  right: -40px;
  top: -40px;
  width: 128px;
  height: 128px;
  border-radius: 64px;
  background: rgba(169,192,255,0.2);
}
.cf-ok {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 32px;
  background: #7efdbe;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cf-successTitle {
  position: relative;
  margin: 12px 0 0;
  color: #2c3435;
  font-size: 20px;
  font-weight: 700;
}
.cf-id {
  position: relative;
  margin: 4px 0 0;
  color: #586161;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-align: center;
  padding: 0 8px;
  line-height: 1.4;
}
.cf-priceHint {
  position: relative;
  margin: 8px 0 0;
  color: #7c77b9;
  font-size: 14px;
  font-weight: 700;
}

.cf-mapCard {
  position: relative;
  height: 360px;
  border-radius: 32px;
  border: 1px solid rgba(171,179,180,0.1);
  overflow: hidden;
  background: #0a3c52;
  padding: 0;
  width: 100%;
}
.cf-mapFrameShell {
  position: absolute;
  inset: 0;
  background: #0a3c52;
}
.cf-mapFrame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
.cf-mapFallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(165deg, #0a3c52 0%, #0e4a63 45%, #0a3c52 100%);
}
.cf-mapCtl {
  position: absolute;
  top: 17px;
  right: 17px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 3;
}
.cf-mapCtlBtn {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  border: none;
  background: rgba(255,255,255,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
}
.cf-mapCtlBtn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.cf-addrBanner {
  position: absolute;
  left: 17px;
  right: 17px;
  top: 17px;
  z-index: 3;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.92);
  border: none;
  cursor: pointer;
  text-align: left;
  font: inherit;
  box-shadow: 0 1px 6px rgba(15, 23, 42, 0.08);
}
.cf-addrBannerTxt {
  flex: 1;
  color: #2c3435;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  text-align: left;
}
.cf-eta {
  position: absolute;
  left: 17px;
  right: 17px;
  bottom: 25px;
  z-index: 3;
  min-height: 98px;
  border-radius: 16px;
  background: rgba(255,255,255,0.86);
  border: 1px solid #fff;
  padding: 16px 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.08);
}
.cf-etaL { display: flex; flex-direction: row; align-items: center; gap: 16px; flex: 1; min-width: 0; }
.cf-scooter {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #7c77b9;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}
.cf-greenDot {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 6px;
  right: -4px;
  top: -4px;
  background: #006d47;
  border: 2px solid #fff;
}
.cf-etaLbl {
  color: #586161;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.cf-etaVal { color: #7c77b9; font-size: 22px; font-weight: 800; }
.cf-etaDiv { width: 1px; height: 40px; background: rgba(171,179,180,0.3); flex-shrink: 0; }
.cf-distVal { color: #2c3435; font-size: 18px; font-weight: 800; max-width: 120px; }

.cf-cleanerCard {
  min-height: 224px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(171,179,180,0.1);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.cf-cleanerTop { display: flex; flex-direction: row; align-items: center; }
.cf-cleanerTop--assign { align-items: flex-start; }
.cf-assignRow { display: flex; flex-direction: row; align-items: flex-start; }
.cf-radar {
  width: 96px;
  height: 96px;
  margin-right: 16px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cf-ripple {
  position: absolute;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  border: 2.5px solid rgba(124,119,185,0.5);
  animation: cf-ripple-anim 2.2s ease-out infinite;
}
.cf-ripple--d1 { animation-delay: 0.75s; }
.cf-ripple--d2 { animation-delay: 1.5s; }
.cf-orbHost {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: #7c77b9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  animation: cf-orb-pulse 1.7s ease-in-out infinite;
}
.cf-orbGlow {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.22);
  border-radius: 18px;
}
.cf-orbSpin {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: cf-orb-spin 2.8s linear infinite;
}
.cf-assignTxt { flex: 1; min-width: 0; }
.cf-assignSub {
  margin: 6px 0 0;
  color: #586161;
  font-size: 13px;
  line-height: 18px;
}
.cf-searchRow {
  margin-top: 14px;
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.cf-searchLbl {
  color: #7c77b9;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.cf-dots { display: flex; flex-direction: row; align-items: center; gap: 5px; }
.cf-dot {
  width: 7px;
  height: 7px;
  border-radius: 4px;
  background: #7c77b9;
  animation: cf-dot-bounce 0.68s ease-in-out infinite;
}
.cf-dot--d1 { animation-delay: 0.15s; }
.cf-dot--d2 { animation-delay: 0.3s; }

.cf-avatarWrap { width: 96px; height: 96px; margin-right: 20px; position: relative; flex-shrink: 0; }
.cf-avatar {
  width: 96px;
  height: 96px;
  border-radius: 16px;
  border: 4px solid #e9efef;
  object-fit: cover;
  display: block;
}
.cf-onlineBadge {
  position: absolute;
  left: 7px;
  right: 7px;
  bottom: -8px;
  height: 26px;
  border-radius: 9999px;
  background: #006d47;
  border: 2px solid #fff;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.cf-onlineBadgeTxt { color: #fff; font-size: 9px; font-weight: 900; }
.cf-cleanerBody { flex: 1; min-width: 0; }
.cf-cleanerName { color: #2c3435; font-size: 20px; font-weight: 700; }
.cf-ratingRow {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.cf-ratingPill {
  height: 26px;
  border-radius: 6px;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  padding: 0 8px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
}
.cf-ratingPillTxt { color: #b45309; font-size: 14px; font-weight: 700; }
.cf-reviewsTxt { color: #586161; font-size: 12px; font-weight: 500; }
.cf-levelTag {
  margin-top: 4px;
  align-self: flex-start;
  background: rgba(124,119,185,0.08);
  border-radius: 6px;
  padding: 4px 8px;
  color: #7c77b9;
  font-size: 12px;
  font-weight: 600;
}

.cf-actions {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 8px;
}
.cf-actionBtn {
  flex: 1;
  min-width: 0;
  height: 54px;
  border-radius: 48px;
  background: #e9efef;
  border: 1px solid rgba(171,179,180,0.1);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 4px;
}
.cf-actionBtn:disabled { opacity: 0.45; }
.cf-actionTxt { color: #2c3435; font-size: 16px; font-weight: 700; }

.cf-timeline {
  min-height: 280px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(171,179,180,0.1);
  padding: 24px;
}
.cf-tlHead {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.cf-tlTitle { color: #2c3435; font-size: 18px; font-weight: 700; }
.cf-livePill {
  height: 23px;
  border-radius: 9999px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  background: rgba(124,119,185,0.12);
}
.cf-liveTxt { color: #7c77b9; font-size: 10px; font-weight: 700; }
.cf-stepRow { margin-top: 24px; display: flex; flex-direction: row; gap: 20px; }
.cf-rail { width: 20px; display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.cf-dotDone {
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #006d47;
  flex-shrink: 0;
}
.cf-lineDone { width: 2px; height: 54px; background: #006d47; flex-shrink: 0; }
.cf-dotActive {
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #7c77b9;
  border: 4px solid rgba(124,119,185,0.25);
  box-sizing: border-box;
}
.cf-linePending { width: 2px; height: 77px; background: #dce4e5; flex-shrink: 0; }
.cf-dotPending {
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #dce4e5;
  flex-shrink: 0;
}
.cf-stepDoneTitle { color: #2c3435; font-size: 14px; font-weight: 700; }
.cf-stepActiveTitle { color: #7c77b9; font-size: 14px; font-weight: 700; }
.cf-stepPenTitle { color: rgba(44,52,53,0.4); font-size: 14px; font-weight: 700; }
.cf-stepSub {
  margin: 2px 0 0;
  color: #586161;
  font-size: 12px;
  line-height: 16px;
  max-width: 262px;
}

.cf-rateCta {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 18px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid rgba(124,119,185,0.25);
  cursor: pointer;
  width: 100%;
  text-align: left;
}
.cf-rateTxt { flex: 1; font-size: 16px; font-weight: 700; color: #7c77b9; }

.cf-homeBtn {
  position: fixed;
  left: 24px;
  right: 24px;
  bottom: max(16px, env(safe-area-inset-bottom, 0px));
  height: 48px;
  border-radius: 16px;
  background: #7c77b9;
  border: none;
  color: #fff;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  z-index: 20;
}
`;
