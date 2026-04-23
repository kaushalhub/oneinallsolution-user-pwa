import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { HomeLocationSheet } from '../components/HomeLocationSheet';
import { APP_PRODUCT_NAME } from '../constants/branding';
import { Colors } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { useCatalogRegion } from '../context/CatalogRegionContext';
import { useCurrentLocation } from '../context/CurrentLocationStub';
import { fetchMyBookings, type BookingRecord } from '../lib/booking';
import {
  fetchCatalogBanners,
  fetchCatalogCategories,
  fetchCatalogServices,
  type CatalogBanner,
  type CatalogCategory,
  type CatalogService,
} from '../lib/catalog';
import { resolveMediaUrl } from '../lib/api';
import { getSession } from '../lib/session';
import { fetchUserAddresses, formatAddressOneLine, selectUserAddress, type UserAddress } from '../lib/userApi';
import { useCatalogFetchQuery } from '../hooks/useCatalogFetchQuery';
import { catalogPriceCityLine } from '../utils/catalogPriceRegion';
import { formatCitySlugForDisplay } from '../utils/citySlug';
import { catalogServiceHeroImageUri } from '../utils/catalogServiceImage';
import { IonIcon } from '../utils/ionIcon';
import { resolveServiceIonicon } from '../utils/serviceIcon';

function truncateHomeDesc(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function findSlugForServiceTitle(list: CatalogService[], title: string): string | undefined {
  const t = title.trim().toLowerCase();
  return list.find((s) => s.name.trim().toLowerCase() === t)?.slug;
}

function catalogIconLooksLikeSvg(resolvedUri: string): boolean {
  try {
    return new URL(resolvedUri).pathname.toLowerCase().endsWith('.svg');
  } catch {
    return /\.svg(\?|#|$)/i.test(resolvedUri);
  }
}

export function HomePage() {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { catalogRegionLabel, mode: regionMode, regionReady } = useCatalogRegion();
  const { coords: liveCoords, locationError: liveLocationError, accuracyMeters: liveAccuracyM } =
    useCurrentLocation();

  const [services, setServices] = useState<CatalogService[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [banners, setBanners] = useState<CatalogBanner[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogErr, setCatalogErr] = useState<string | null>(null);
  const [lastBooking, setLastBooking] = useState<BookingRecord | null>(null);
  const [repeatSessionChecked, setRepeatSessionChecked] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [headerElevated, setHeaderElevated] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesErr, setAddressesErr] = useState<string | null>(null);

  const activeAddr = useMemo(() => {
    if (addresses.length === 0) return null;
    return addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  }, [addresses]);

  const catalogFetchQuery = useCatalogFetchQuery(activeAddr);

  const recommendedPriceRegionLine = useMemo(() => catalogPriceCityLine(catalogFetchQuery), [catalogFetchQuery]);

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 400;

  const loadRepeatBooking = useCallback(async () => {
    try {
      const s = getSession();
      if (!s?.token) {
        setUserLoggedIn(false);
        setLastBooking(null);
        return;
      }
      setUserLoggedIn(true);
      const { bookings } = await fetchMyBookings(s.token);
      setLastBooking(bookings[0] ?? null);
    } catch {
      setLastBooking(null);
    } finally {
      setRepeatSessionChecked(true);
    }
  }, []);

  const refreshCatalog = useCallback(async () => {
    setCatalogErr(null);
    try {
      const q = catalogFetchQuery;
      const [svc, ban, cat] = await Promise.all([
        fetchCatalogServices(q),
        fetchCatalogBanners(),
        // Categories: show full home grid in every region; services list stays regional via `q` above.
        fetchCatalogCategories().catch(() => ({
          categories: [] as CatalogCategory[],
        })),
      ]);
      setServices(svc.services);
      setBanners(ban.banners);
      setCategories(cat.categories ?? []);
    } catch (e) {
      setCatalogErr(e instanceof Error ? e.message : 'Could not load catalog');
    } finally {
      setCatalogLoading(false);
    }
  }, [catalogFetchQuery]);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    void loadRepeatBooking();
  }, [loadRepeatBooking]);

  const loadAddresses = useCallback(async () => {
    const s = getSession();
    setAddressesErr(null);
    if (!s?.token) {
      setAddresses([]);
      return;
    }
    setAddressesLoading(true);
    try {
      const { addresses: list } = await fetchUserAddresses(s.token);
      setAddresses(list);
    } catch (e) {
      setAddressesErr(e instanceof Error ? e.message : 'Could not load addresses');
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses, userLoggedIn]);

  useEffect(() => {
    if (locationSheetOpen) void loadAddresses();
  }, [locationSheetOpen, loadAddresses]);

  const repeatSubtitle = useMemo(() => {
    if (!repeatSessionChecked) return 'Loading…';
    if (!userLoggedIn) return 'Log in to rebook in one tap';
    if (!lastBooking) return 'No bookings yet — pick a category below';
    const when = lastBooking.date;
    const time = lastBooking.time?.replace(/\s+/g, ' ').trim() || '';
    return time ? `${lastBooking.service} • ${when} • ${time}` : `${lastBooking.service} • ${when}`;
  }, [repeatSessionChecked, userLoggedIn, lastBooking]);

  const repeatNavigate = useCallback(() => {
    if (!lastBooking) return;
    const slug = findSlugForServiceTitle(services, lastBooking.service);
    if (slug) navigate(`/service/${encodeURIComponent(slug)}`);
  }, [lastBooking, navigate, services]);

  const addressSubtitle = useMemo(() => {
    if (activeAddr) return truncateHomeDesc(formatAddressOneLine(activeAddr), 56);
    if (regionMode === 'pinned') return 'Tap to change area or add address';
    return 'Tap to set your area';
  }, [activeAddr, regionMode]);

  const primaryLocationTitle = useMemo(() => {
    if (activeAddr) {
      const lab = activeAddr.label.trim();
      if (lab) return lab;
      return truncateHomeDesc(activeAddr.line1, 32) || 'Delivery location';
    }
    return catalogRegionLabel;
  }, [activeAddr, catalogRegionLabel]);

  const openLocationEntry = useCallback(() => {
    void loadAddresses();
    setLocationSheetOpen(true);
  }, [loadAddresses]);

  const onSelectSheetAddress = useCallback(async (addr: UserAddress) => {
    const s = getSession();
    if (!s?.token) return;
    setAddressesErr(null);
    try {
      const { addresses: list } = await selectUserAddress(s.token, addr._id);
      setAddresses(list);
      setLocationSheetOpen(false);
    } catch (e) {
      setAddressesErr(e instanceof Error ? e.message : 'Could not update address');
    }
  }, []);

  const CATEGORY_GRID_GUTTER = 8;
  const categoryTileWidth = useMemo(
    () => Math.max(72, Math.floor((windowWidth - 48 - 3 * CATEGORY_GRID_GUTTER) / 4)),
    [windowWidth]
  );
  const categoryCellMarginRight = (slotIndex: number) => ((slotIndex + 1) % 4 === 0 ? 0 : CATEGORY_GRID_GUTTER);

  const recommendedServices = useMemo(() => services.slice(0, 8), [services]);

  const promoTopSpacer = `calc(var(--cs-safe-top) + 76px)`;

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const y = (e.target as HTMLDivElement).scrollTop;
    setHeaderElevated(y > 36);
  };

  const locRipple = headerElevated ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.14)';

  const showLiveLocationBadge =
    regionMode === 'auto' && liveCoords != null && !liveLocationError;

  return (
    <div className="home-page">
      <div className="home-shell">
        <div className="home-scroll" onScroll={onScroll}>
          <div
            className="home-hero-gradient"
            style={{
              width: windowWidth,
              background: `linear-gradient(180deg, ${Colors.homePromoGradientTop}, ${Colors.homePromoGradientBottom})`,
            }}
          >
            <div style={{ height: promoTopSpacer }} />
            <div className="home-banner-row">
              {banners.map((b) => {
                const src = resolveMediaUrl(b.imageUrl);
                if (!src) return null;
                return (
                  <div key={b.id} className="home-banner-card">
                    <img src={src} alt={b.title} className="home-banner-img" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="home-padded">
            {catalogLoading ? <div className="home-spinner-wrap">Loading catalog…</div> : null}
            {catalogErr ? (
              <div className="home-err">
                <p>{catalogErr}</p>
                <button type="button" className="home-retry" onClick={() => void refreshCatalog()}>
                  Try again
                </button>
              </div>
            ) : null}

            <section className="home-section">
              <div
                className={`home-repeat ${!lastBooking ? 'home-repeat--disabled' : ''}`}
                onClick={() => lastBooking && repeatNavigate()}
                onKeyDown={(e) => e.key === 'Enter' && lastBooking && repeatNavigate()}
                role="button"
                tabIndex={0}
              >
                <div className="home-repeat-left">
                  <div className="home-repeat-icon">
                    <IonIcon ionName="calendar-outline" size={22} color="#059669" />
                  </div>
                  <div>
                    <div className="home-repeat-title">Book again</div>
                    <div className="home-repeat-sub">{repeatSubtitle}</div>
                  </div>
                </div>
                <IonIcon ionName="chevron-forward" size={20} color="#94a3b8" />
              </div>
            </section>

            <section className="home-section">
              <h2 className="home-section-title">Services</h2>
              <div className="home-cat-grid">
                {categories.length === 0 && !catalogLoading ? (
                  <p className="home-empty">Is area ke liye abhi koi category nahi.</p>
                ) : (
                  categories.map((c, catIndex) => {
                    const catIcon = Math.min(26, Math.max(20, Math.round(categoryTileWidth * 0.3)));
                    const tilePx = Math.round(categoryTileWidth * 0.6);
                    const resolved = c.iconUrl ? resolveMediaUrl(c.iconUrl) : null;
                    return (
                      <div
                        key={c.key}
                        style={{
                          width: categoryTileWidth,
                          marginRight: categoryCellMarginRight(catIndex),
                          marginBottom: 12,
                        }}
                      >
                        <button
                          type="button"
                          className="home-cat-btn"
                          onClick={() =>
                            navigate(`/category/${encodeURIComponent(c.key)}?label=${encodeURIComponent(c.label)}`)
                          }
                        >
                          <div
                            className="home-cat-icon-wrap"
                            style={{
                              width: tilePx,
                              height: tilePx,
                              backgroundColor: c.iconBg,
                            }}
                          >
                            {resolved && !catalogIconLooksLikeSvg(resolved) ? (
                              <img src={resolved} alt="" className="home-cat-img" />
                            ) : resolved && catalogIconLooksLikeSvg(resolved) ? (
                              <img src={resolved} alt="" className="home-cat-img" />
                            ) : (
                              <IonIcon ionName={resolveServiceIonicon(c.icon)} size={catIcon} color={c.iconColor} />
                            )}
                          </div>
                          <span className="home-cat-label">{c.label}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {recommendedServices.length > 0 ? (
              <section className="home-section">
                <h2 className="home-section-title">Recommended for you</h2>
                {recommendedPriceRegionLine ? (
                  <p className="home-section-sub">{recommendedPriceRegionLine}</p>
                ) : null}
                <div className="home-rec-list">
                  {recommendedServices.map((s) => {
                    const img = catalogServiceHeroImageUri(s);
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        className="home-rec-card"
                        onClick={() => navigate(`/service/${encodeURIComponent(s.slug)}`)}
                      >
                        <div className="home-rec-img-wrap">{img ? <img src={img} alt="" /> : null}</div>
                        <div className="home-rec-body">
                          <div className="home-rec-title">{s.name}</div>
                          <div className="home-rec-sub">{truncateHomeDesc(s.description, 80)}</div>
                          <div className="home-rec-meta">
                            <span className="home-rec-price">
                              ₹{Math.round(s.priceAmount)}
                              {catalogFetchQuery?.city ? (
                                <span className="home-rec-price-city">
                                  {' '}
                                  · {formatCitySlugForDisplay(catalogFetchQuery.city)}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <footer className="home-footer" style={{ width: windowWidth }}>
              <div className="home-footer-inner">
                <div className="home-footer-row">
                  <span className="home-footer-tag">Proudly made in India</span>
                  <IonIcon ionName="heart" size={32} color="#ef4444" />
                </div>
                <div className="home-footer-rule" />
                <div className="home-footer-brand">{APP_PRODUCT_NAME}</div>
              </div>
            </footer>
          </div>
        </div>

        <header
          className={`home-header ${headerElevated ? 'home-header--elevated' : ''}`}
          style={{
            paddingTop: 'var(--cs-safe-top)',
          }}
        >
          <button
            type="button"
            className="home-header-loc"
            style={{ '--loc-ripple': locRipple } as React.CSSProperties}
            onClick={openLocationEntry}
          >
            <div className="home-header-title-row">
              <div className="home-header-title-left">
                <span className={`home-header-primary ${headerElevated ? 'home-header-primary--dark' : ''}`}>
                  {regionReady || activeAddr ? primaryLocationTitle : 'Loading…'}
                </span>
                {showLiveLocationBadge ? (
                  <span
                    className={`home-live-loc ${headerElevated ? 'home-live-loc--dark' : ''}`}
                    title={liveAccuracyM != null ? `Live location · ±${liveAccuracyM} m` : 'Live location'}
                  >
                    <span className="home-live-dot" />
                    Live
                  </span>
                ) : null}
              </div>
              <IonIcon
                ionName="chevron-forward"
                size={18}
                color={headerElevated ? '#94a3b8' : 'rgba(255,255,255,0.75)'}
              />
            </div>
            <span className={`home-header-secondary ${headerElevated ? 'home-header-secondary--dark' : ''}`}>
              {addressSubtitle}
            </span>
          </button>
          <Link to="/cart" className="home-cart-btn" aria-label="Cart">
            <IonIcon ionName="cart-outline" size={28} color={headerElevated ? Colors.primary : '#FFFFFF'} />
            {itemCount > 0 ? <span className="home-cart-badge">{itemCount > 9 ? '9+' : String(itemCount)}</span> : null}
          </Link>
        </header>
      </div>

      <HomeLocationSheet
        open={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        addresses={addresses}
        loading={addressesLoading}
        error={addressesErr}
        activeAddressId={activeAddr?._id ?? null}
        onSelectAddress={onSelectSheetAddress}
      />

      <style>{`
        .home-page {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #f4f6f8;
        }
        .home-shell {
          position: relative;
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .home-scroll {
          flex: 1;
          min-height: 0;
          overflow-x: hidden;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          touch-action: pan-y;
          padding-bottom: calc(24px + var(--cs-safe-bottom));
        }
        .home-hero-gradient {
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
        }
        .home-banner-row {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 0 24px 12px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x;
          overscroll-behavior-x: contain;
        }
        .home-banner-card {
          flex: 0 0 auto;
          width: min(320px, 86vw);
          border-radius: 16px;
          overflow: hidden;
          scroll-snap-align: start;
          background: rgba(255, 255, 255, 0.2);
        }
        .home-banner-img {
          width: 100%;
          height: 140px;
          object-fit: cover;
          display: block;
        }
        .home-padded {
          padding: 12px 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .home-spinner-wrap {
          text-align: center;
          color: #64748b;
          font-weight: 600;
        }
        .home-err {
          background: #fef2f2;
          border-radius: 12px;
          padding: 14px;
          border: 1px solid #fecaca;
          color: #991b1b;
          font-size: 14px;
        }
        .home-retry {
          margin-top: 10px;
          border: none;
          border-radius: 10px;
          padding: 8px 14px;
          background: #7c77b9;
          color: #fff;
          font-weight: 700;
        }
        .home-section {
          margin-top: 4px;
        }
        .home-section-title {
          margin: 0;
          color: #0f172a;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.3px;
        }
        .home-section-sub {
          margin: 6px 0 0;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
        }
        .home-repeat {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 4px;
          border-bottom: 1px solid #e2e8f0;
          cursor: pointer;
        }
        .home-repeat--disabled {
          opacity: 0.5;
          cursor: default;
        }
        .home-repeat-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }
        .home-repeat-icon {
          width: 48px;
          height: 48px;
          border-radius: 24px;
          background: #d1fae5;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .home-repeat-title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }
        .home-repeat-sub {
          color: #64748b;
          font-size: 13px;
          margin-top: 3px;
          line-height: 18px;
        }
        .home-cat-grid {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          width: 100%;
          margin-top: 14px;
        }
        .home-cat-btn {
          width: 100%;
          border: none;
          background: none;
          padding: 6px 0;
          cursor: pointer;
        }
        .home-cat-icon-wrap {
          margin: 0 auto 8px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .home-cat-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .home-cat-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #334155;
          text-align: center;
          line-height: 14px;
          padding: 0 2px;
        }
        .home-empty {
          color: #586161;
          font-size: 14px;
          padding: 8px 0;
        }
        .home-rec-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-top: 12px;
          padding-bottom: 4px;
        }
        .home-rec-card {
          width: 100%;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #fff;
          overflow: hidden;
          text-align: left;
          cursor: pointer;
        }
        .home-rec-img-wrap {
          height: 120px;
          background: #e2e8f0;
        }
        .home-rec-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .home-rec-body {
          padding: 12px;
        }
        .home-rec-title {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }
        .home-rec-sub {
          margin-top: 6px;
          font-size: 12px;
          color: #64748b;
          line-height: 17px;
        }
        .home-rec-meta {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
        }
        .home-rec-price {
          color: #0f172a;
        }
        .home-rec-price-city {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
        }
        .home-footer {
          margin: 8px calc(50% - 50vw) 0;
          padding: 28px 0 32px;
        }
        .home-footer-inner {
          padding: 0 24px;
          text-align: center;
        }
        .home-footer-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .home-footer-tag {
          font-size: 26px;
          font-weight: 800;
          color: #a9a9a9;
          letter-spacing: -0.8px;
          line-height: 32px;
        }
        .home-footer-rule {
          height: 1px;
          background: rgba(51, 51, 51, 0.18);
          margin-top: 22px;
        }
        .home-footer-brand {
          margin-top: 12px;
          font-size: 20px;
          font-weight: 700;
          color: #a9a9a9;
        }
        .home-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          padding-left: 20px;
          padding-right: 20px;
          padding-bottom: 10px;
          gap: 8px;
          pointer-events: none;
          background: transparent;
        }
        .home-header--elevated {
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
        }
        .home-header-loc,
        .home-cart-btn {
          pointer-events: auto;
        }
        .home-header-loc {
          flex: 1;
          min-width: 0;
          border: none;
          background: none;
          text-align: left;
          padding: 4px 4px 4px 0;
          cursor: pointer;
        }
        .home-header-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .home-header-title-left {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .home-header-primary {
          flex: 1;
          min-width: 0;
          font-size: 16px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .home-live-loc {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.95);
        }
        .home-live-loc--dark {
          color: #059669;
        }
        .home-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #6ee7b7;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35);
          animation: home-live-pulse 1.6s ease-in-out infinite;
        }
        .home-live-loc--dark .home-live-dot {
          background: #10b981;
          box-shadow: none;
        }
        @keyframes home-live-pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.55;
            transform: scale(0.88);
          }
        }
        .home-header-primary--dark {
          color: #0f172a;
        }
        .home-header-secondary {
          display: -webkit-box;
          margin-top: 3px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.88);
          line-height: 16px;
          padding-right: 22px;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .home-header-secondary--dark {
          color: #64748b;
        }
        .home-cart-btn {
          position: relative;
          width: 50px;
          height: 50px;
          border-radius: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        .home-cart-badge {
          position: absolute;
          top: 2px;
          right: 0;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          background: #7c77b9;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }
      `}</style>
    </div>
  );
}
