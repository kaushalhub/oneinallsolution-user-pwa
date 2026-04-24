import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Colors } from '../constants/theme';
import { useCart, type CartLine } from '../context/CartContext';
import { useCatalogFetchQuery } from '../hooks/useCatalogFetchQuery';
import { useDefaultUserAddress } from '../hooks/useDefaultUserAddress';
import { fetchCatalogServices, type CatalogService } from '../lib/catalog';
import { catalogServiceHeroImageUri } from '../utils/catalogServiceImage';
import { computeMultiCartPayable } from '../utils/checkoutBill';
import { formatRupeeInr } from '../utils/price';
import { IonIcon } from '../utils/ionIcon';
import type { BookingCartLine } from '../types/bookingFlow';

function cartLineHint(item: CartLine): string {
  const qty = item.quantity ?? 1;
  const basePortion = item.basePrice * qty;
  const hasAddons = item.lineTotal > basePortion;
  if (!hasAddons) return 'Standard package';
  if (item.basePrice <= 0) return 'Includes add-ons';
  return `Includes add-ons · from ${formatRupeeInr(item.basePrice)} each`;
}

function RecCard({ service, onPress }: { service: CatalogService; onPress: () => void }) {
  const uri = catalogServiceHeroImageUri(service);
  return (
    <button type="button" className="cart-rec" onClick={onPress}>
      <div className="cart-rec-img-wrap">
        {uri ? <img src={uri} alt="" className="cart-rec-img" /> : <div className="cart-rec-ph" />}
      </div>
      <div className="cart-rec-body">
        <div className="cart-rec-title">{service.name}</div>
        <div className="cart-rec-meta">{service.duration}</div>
        <div className="cart-rec-price">{service.price}</div>
      </div>
    </button>
  );
}

export function CartPage() {
  const navigate = useNavigate();
  const defaultAddr = useDefaultUserAddress();
  const catalogFetchQuery = useCatalogFetchQuery(defaultAddr);
  const { lines, removeLine, clearCart, itemCount } = useCart();
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    void fetchCatalogServices(catalogFetchQuery)
      .then((r) => {
        if (!cancelled) setCatalog(r.services ?? []);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogFetchQuery]);

  const inCartSlugs = useMemo(() => new Set(lines.map((l) => l.slug)), [lines]);
  const recommended = useMemo(
    () => catalog.filter((s) => s.slug && !inCartSlugs.has(s.slug)).slice(0, 10),
    [catalog, inCartSlugs]
  );

  const addonTotal = useMemo(
    () => lines.reduce((s, l) => s + Math.max(0, l.lineTotal - l.basePrice * (l.quantity ?? 1)), 0),
    [lines]
  );

  const cartPay = useMemo(
    () => (lines.length ? computeMultiCartPayable(lines as BookingCartLine[]) : null),
    [lines]
  );

  const checkout = useCallback(() => {
    if (!lines.length) return;
    const cartLines: BookingCartLine[] = lines.map((l) => ({
      slug: l.slug,
      title: l.title,
      basePrice: l.basePrice,
      lineTotal: l.lineTotal,
      selectedAddonIds: l.selectedAddonIds,
      quantity: l.quantity,
      ...(l.gstPercent != null && l.gstPercent > 0 && l.serviceBaseExGst != null && l.serviceGstAmount != null
        ? {
            gstPercent: l.gstPercent,
            serviceBaseExGst: l.serviceBaseExGst,
            serviceGstAmount: l.serviceGstAmount,
          }
        : {}),
    }));
    navigate('/booking', { state: { cartLines } });
  }, [lines, navigate]);

  return (
    <div className="cart-root pwa-page">
      <div className="cart-bg" />
      <header className="cart-top">
        <button type="button" className="cart-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <IonIcon ionName="chevron-back" size={24} color="#1e293b" />
        </button>
        <div className="cart-head-center">
          <h1 className="cart-h1">Basket</h1>
          {itemCount > 0 ? (
            <p className="cart-sub">
              {itemCount} item{itemCount === 1 ? '' : 's'} ·{' '}
              {formatRupeeInr(cartPay?.payableTotal ?? 0)}
            </p>
          ) : (
            <p className="cart-sub">Add what you need</p>
          )}
        </div>
        {lines.length > 0 ? (
          <button type="button" className="cart-clear" onClick={clearCart}>
            Clear
          </button>
        ) : (
          <span style={{ width: 48 }} />
        )}
      </header>

      <div className="cart-body">
        {lines.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-ico">
              <IonIcon ionName="bag-handle-outline" size={40} color="#7c77b9" />
            </div>
            <h2 className="cart-empty-title">Your basket is empty</h2>
            <p className="cart-empty-sub">Add home services — mix bathroom, kitchen, or deep clean in one booking.</p>
            <Link to="/tabs/home" className="cart-empty-cta">
              Explore services
              <IonIcon ionName="arrow-forward" size={18} color="#fff" />
            </Link>
          </div>
        ) : (
          <ul className="cart-lines">
            {lines.map((item, index) => (
              <li key={item.id} className="cart-line">
                <span className="cart-line-accent" />
                <div className="cart-line-badge">
                  <span>{index + 1}</span>
                </div>
                <div className="cart-line-main">
                  <div className="cart-line-title">
                    {item.title}
                    {(item.quantity ?? 1) > 1 ? <span className="cart-line-qty"> ×{item.quantity}</span> : null}
                  </div>
                  <div className="cart-line-hint">{cartLineHint(item)}</div>
                </div>
                <div className="cart-line-right">
                  <span className="cart-pill">{formatRupeeInr(item.lineTotal)}</span>
                  <button type="button" className="cart-rm" onClick={() => removeLine(item.id)} aria-label="Remove">
                    <IonIcon ionName="close-circle" size={22} color="#94A3B8" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className="cart-rec-sec">
          <div className="cart-rec-head">
            <div>
              <div className="cart-rec-k">Discover more</div>
              <h2 className="cart-rec-h">Recommended for you</h2>
            </div>
            <Link to="/tabs/home" className="cart-rec-all">
              See all
            </Link>
          </div>
          {catalogLoading ? <p className="cart-muted">Loading…</p> : null}
          {!catalogLoading && recommended.length === 0 ? (
            <p className="cart-muted">No other services right now.</p>
          ) : null}
          <div className="cart-rec-row">
            {recommended.map((s) => (
              <RecCard key={s.slug} service={s} onPress={() => navigate(`/service/${encodeURIComponent(s.slug)}`)} />
            ))}
          </div>
        </section>
      </div>

      {lines.length > 0 ? (
        <footer className="cart-foot">
          <div className="cart-foot-inner">
            {addonTotal > 0 ? (
              <div className="cart-sum-row">
                <span>Add-ons included</span>
                <span>{formatRupeeInr(addonTotal)}</span>
              </div>
            ) : null}
            {cartPay && cartPay.gstLineAmount > 0 ? (
              <div className="cart-sum-row">
                <span>{cartPay.gstLabel}</span>
                <span>{formatRupeeInr(cartPay.gstLineAmount)}</span>
              </div>
            ) : null}
            <div className="cart-sum-row cart-sum-total">
              <span>Total</span>
              <span>{formatRupeeInr(cartPay?.payableTotal ?? 0)}</span>
            </div>
            <button type="button" className="cart-checkout" onClick={checkout}>
              Proceed to book
              <IonIcon ionName="arrow-forward-circle" size={22} color="#fff" />
            </button>
          </div>
        </footer>
      ) : null}

      <style>{`
        .cart-root {
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
          background: #f0f4f8;
        }
        .cart-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, #f8faff 0%, #f0f4f8 40%);
          pointer-events: none;
        }
        .cart-top {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: calc(var(--cs-safe-top) + 8px) 16px 12px;
          background: rgba(255, 255, 255, 0.92);
          border-bottom: 1px solid #e2e8f0;
        }
        .cart-icon-btn {
          width: 48px;
          height: 48px;
          border: none;
          border-radius: 24px;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cart-head-center {
          flex: 1;
          min-width: 0;
        }
        .cart-h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
        }
        .cart-sub {
          margin: 4px 0 0;
          font-size: 14px;
          color: #64748b;
          font-weight: 600;
        }
        .cart-clear {
          border: none;
          background: none;
          color: ${Colors.primary};
          font-weight: 800;
          font-size: 15px;
          padding: 8px;
        }
        .cart-body {
          position: relative;
          z-index: 1;
          flex: 1;
          overflow: auto;
          padding: 16px 16px 24px;
        }
        .cart-empty {
          text-align: center;
          padding: 48px 20px 32px;
        }
        .cart-empty-ico {
          width: 88px;
          height: 88px;
          margin: 0 auto 20px;
          border-radius: 44px;
          background: linear-gradient(135deg, #e8f1ff, #f0f4ff);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cart-empty-title {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
        }
        .cart-empty-sub {
          margin: 10px auto 0;
          max-width: 300px;
          color: #64748b;
          line-height: 22px;
        }
        .cart-empty-cta {
          margin-top: 24px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 22px;
          border-radius: 14px;
          background: linear-gradient(135deg, #7c77b9, #5f5a92);
          color: #fff !important;
          font-weight: 800;
          text-decoration: none;
        }
        .cart-lines {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .cart-line {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }
        .cart-line-accent {
          position: absolute;
          left: 0;
          top: 12px;
          bottom: 12px;
          width: 3px;
          border-radius: 2px;
          background: linear-gradient(180deg, #7c77b9, #9a95ca);
        }
        .cart-line-badge {
          width: 36px;
          height: 36px;
          border-radius: 18px;
          background: linear-gradient(135deg, #7c77b9, #9a95ca);
          color: #fff;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 6px;
        }
        .cart-line-main {
          flex: 1;
          min-width: 0;
        }
        .cart-line-title {
          font-weight: 800;
          color: #0f172a;
          font-size: 16px;
          line-height: 1.3;
        }
        .cart-line-qty {
          font-weight: 800;
          color: #64748b;
        }
        .cart-line-hint {
          margin-top: 6px;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.4;
          color: #64748b;
        }
        .cart-line-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
        .cart-pill {
          background: #f1f5f9;
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: 800;
          font-size: 14px;
        }
        .cart-rm {
          border: none;
          background: none;
          padding: 0;
          cursor: pointer;
        }
        .cart-rec-sec {
          margin-top: 28px;
        }
        .cart-rec-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 12px;
        }
        .cart-rec-k {
          font-size: 12px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .cart-rec-h {
          margin: 4px 0 0;
          font-size: 18px;
          font-weight: 800;
        }
        .cart-rec-all {
          font-weight: 800;
          color: ${Colors.primary};
          text-decoration: none;
          font-size: 14px;
        }
        .cart-muted {
          color: #64748b;
          margin: 12px 0;
        }
        .cart-rec-row {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-bottom: 8px;
        }
        .cart-rec {
          width: 100%;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          border: none;
          padding: 0;
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          text-align: left;
          border: 1px solid #e2e8f0;
          cursor: pointer;
        }
        .cart-rec-img-wrap {
          width: 96px;
          min-height: 96px;
          flex-shrink: 0;
          background: #e2e8f0;
          position: relative;
        }
        .cart-rec-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cart-rec-ph {
          width: 100%;
          height: 100%;
        }
        .cart-rec-body {
          flex: 1;
          padding: 10px 14px 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }
        .cart-rec-title {
          font-weight: 800;
          font-size: 14px;
          color: #0f172a;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .cart-rec-meta {
          margin-top: 4px;
          font-size: 12px;
          color: #64748b;
        }
        .cart-rec-price {
          margin-top: 6px;
          font-weight: 800;
          color: ${Colors.primary};
        }
        .cart-foot {
          position: sticky;
          bottom: 0;
          z-index: 2;
          padding: 12px 16px calc(12px + var(--cs-safe-bottom));
          background: rgba(255, 255, 255, 0.96);
          border-top: 1px solid #e2e8f0;
        }
        .cart-foot-inner {
          max-width: 520px;
          margin: 0 auto;
        }
        .cart-sum-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #64748b;
          margin-bottom: 6px;
        }
        .cart-sum-total {
          font-weight: 800;
          color: #0f172a;
          font-size: 16px;
          margin: 10px 0 14px;
        }
        .cart-checkout {
          width: 100%;
          min-height: 52px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(90deg, #7c77b9, #5f5a92);
          color: #fff;
          font-size: 16px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
