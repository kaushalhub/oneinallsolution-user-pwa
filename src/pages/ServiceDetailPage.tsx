import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Colors } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { useCatalogRegion } from '../context/CatalogRegionContext';
import { resolveMediaUrl } from '../lib/api';
import { fetchServiceDetail, type ServiceDetail } from '../lib/catalog';
import {
  formatRupeeInrDecimals,
  formatRupeeInrGstLine,
  formatRupeeInrWholeFloor,
  parseRupeesToNumber,
} from '../utils/price';
import { IonIcon } from '../utils/ionIcon';

const HIGHLIGHT_ICONS = ['sparkles-outline', 'ellipse-outline', 'shield-checkmark-outline'] as const;

export function ServiceDetailPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { catalogApiQuery } = useCatalogRegion();
  const { addLine } = useCart();

  const [data, setData] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [addedToast, setAddedToast] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchServiceDetail(slug, catalogApiQuery);
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [slug, catalogApiQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const addonTotal = useMemo(() => {
    if (!data) return 0;
    return selectedAddonIds.reduce((sum, id) => {
      const a = data.addons.find((x) => x.id === id);
      return sum + (a ? parseRupeesToNumber(a.price) : 0);
    }, 0);
  }, [data, selectedAddonIds]);

  const grandTotal = (data?.price ?? 0) + addonTotal;
  const heroUri = data?.imageUrls?.[0] ? resolveMediaUrl(data.imageUrls[0]) : null;

  const toggleAddon = useCallback((id: string) => {
    setSelectedAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const addToCart = useCallback(() => {
    if (!data) return;
    addLine({
      slug: data.slug,
      title: data.title,
      basePrice: data.price,
      lineTotal: grandTotal,
      selectedAddonIds: [...selectedAddonIds],
      imageUri: heroUri ?? null,
      ...(data.gstPercent != null &&
      data.gstPercent > 0 &&
      data.baseAmount != null &&
      data.gstAmount != null &&
      Number(data.gstAmount) > 0
        ? {
            gstPercent: data.gstPercent,
            serviceBaseExGst: data.baseAmount,
            serviceGstAmount: data.gstAmount,
          }
        : {}),
    });
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2200);
  }, [addLine, data, grandTotal, heroUri, selectedAddonIds]);

  if (loading) {
    return (
      <div className="svc-page pwa-page">
        <p className="svc-muted">Loading…</p>
      </div>
    );
  }
  if (err || !data) {
    return (
      <div className="svc-page pwa-page">
        <p className="svc-err">{err || 'Not found'}</p>
        <button type="button" className="svc-backlink" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  const highlights = data.scopeItems.slice(0, 3).map((title, i) => ({
    icon: HIGHLIGHT_ICONS[i % HIGHLIGHT_ICONS.length],
    title,
  }));

  return (
    <div className="svc-page pwa-page">
      {addedToast ? (
        <div className="svc-toast" role="status">
          Added to cart
          <button type="button" onClick={() => navigate('/cart')}>
            View cart
          </button>
        </div>
      ) : null}
      <header className="svc-head">
        <button type="button" className="svc-back" onClick={() => navigate(-1)} aria-label="Back">
          <IonIcon ionName="arrow-back" size={16} color="#64748B" />
        </button>
        <h1 className="svc-nav-title">{data.navTitle || data.title}</h1>
      </header>

      <div className="svc-scroll">
        <div className="svc-hero-wrap">
          {heroUri ? <img src={heroUri} alt="" className="svc-hero" /> : <div className="svc-hero svc-hero--ph" />}
          <div className="svc-badges">
            <span className="svc-badge">
              <IonIcon ionName="sparkles-outline" size={12} color="#7c77b9" /> Professional Grade
            </span>
            <span className="svc-badge svc-badge--green">
              <IonIcon ionName="shield-checkmark-outline" size={12} color="#00603E" /> Verified Professionals
            </span>
          </div>
        </div>

        <div className="svc-pad">
          <h2 className="svc-title">{data.title}</h2>
          <div className="svc-rating">
            <IonIcon ionName="star" size={14} color="#EAB308" />
            <span>4.8</span>
            <span className="svc-rating-sub">reviews</span>
          </div>
          <p className="svc-cat">{data.category}</p>
          <p className="svc-desc">{data.description}</p>

          <div className="svc-warn">
            <IonIcon ionName="information-circle" size={16} color="#AC3434" />
            <span>High demand — book your slot</span>
          </div>

          <div className="svc-price-block">
            <div className="svc-price-label">You pay (incl. taxes)</div>
            <div className="svc-price-big">
              {Number(data.gstPercent) > 0 &&
              data.baseAmount != null &&
              data.gstAmount != null &&
              Number(data.gstAmount) > 0
                ? formatRupeeInrWholeFloor(Number(data.totalAmount ?? data.price))
                : `₹${data.price.toLocaleString('en-IN')}`}
            </div>
            {Number(data.gstPercent) > 0 &&
            data.baseAmount != null &&
            data.gstAmount != null &&
            Number(data.gstAmount) > 0 ? (
              <div className="svc-gst">
                <div>Base {formatRupeeInrDecimals(Number(data.baseAmount))}</div>
                <div>
                  GST ({Number(data.gstPercent)}%) {formatRupeeInrGstLine(Number(data.gstAmount))}
                </div>
                <div className="svc-gst-total">
                  Total {formatRupeeInrWholeFloor(Number(data.totalAmount ?? data.price))}
                </div>
              </div>
            ) : null}
          </div>

          {data.addons.length > 0 ? (
            <section className="svc-section">
              <h3 className="svc-sec-title">Add-ons</h3>
              {data.addons.map((a) => {
                const on = selectedAddonIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`svc-addon ${on ? 'svc-addon--on' : ''}`}
                    onClick={() => toggleAddon(a.id)}
                  >
                    <span className="svc-addon-check">
                      {on ? (
                        <IonIcon ionName="checkmark-circle" size={22} color="#059669" />
                      ) : (
                        <span className="svc-ring" />
                      )}
                    </span>
                    <span className="svc-addon-name">{a.name}</span>
                    <span className="svc-addon-price">{a.price}</span>
                  </button>
                );
              })}
            </section>
          ) : null}

          <section className="svc-section">
            <h3 className="svc-sec-title">What’s included</h3>
            {highlights.map((h) => (
              <div key={h.title} className="svc-hl">
                <IonIcon ionName={h.icon} size={20} color={Colors.primary} />
                <div>
                  <div className="svc-hl-title">{h.title}</div>
                  <div className="svc-hl-body">Included in this service package.</div>
                </div>
              </div>
            ))}
          </section>

          <div className="svc-bottom-spacer" />
        </div>
      </div>

      <footer className="svc-bar">
        <div className="svc-bar-inner">
          <div>
            <div className="svc-bar-label">Total</div>
            <div className="svc-bar-total">{formatRupeeInrWholeFloor(grandTotal)}</div>
          </div>
          <button type="button" className="svc-add-cta" onClick={addToCart}>
            Add to cart
          </button>
        </div>
      </footer>

      <style>{`
        .svc-page {
          display: flex;
          flex-direction: column;
          background: #fff;
          min-height: 100dvh;
        }
        .svc-toast {
          position: fixed;
          bottom: calc(88px + var(--cs-safe-bottom));
          left: 16px;
          right: 16px;
          z-index: 50;
          background: #0f172a;
          color: #fff;
          padding: 12px 16px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
        }
        .svc-toast button {
          border: none;
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 8px;
        }
        .svc-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: calc(var(--cs-safe-top) + 8px) 12px 10px;
          border-bottom: 1px solid #e2e8f0;
          background: #fff;
        }
        .svc-back {
          width: 40px;
          height: 40px;
          border-radius: 20px;
          border: none;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .svc-nav-title {
          flex: 1;
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .svc-scroll {
          flex: 1;
          overflow: auto;
          padding-bottom: 100px;
        }
        .svc-hero-wrap {
          position: relative;
        }
        .svc-hero {
          width: 100%;
          height: 240px;
          object-fit: cover;
          display: block;
        }
        .svc-hero--ph {
          background: #e2e8f0;
        }
        .svc-badges {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .svc-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          font-size: 11px;
          font-weight: 800;
          color: #334155;
        }
        .svc-badge--green {
          color: #065f46;
        }
        .svc-pad {
          padding: 20px 20px 0;
        }
        .svc-title {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.4px;
        }
        .svc-rating {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          font-weight: 800;
          font-size: 14px;
        }
        .svc-rating-sub {
          font-weight: 600;
          color: #94a3b8;
          font-size: 13px;
        }
        .svc-cat {
          margin: 6px 0 0;
          color: #64748b;
          font-weight: 600;
        }
        .svc-desc {
          margin-top: 12px;
          color: #475569;
          line-height: 24px;
          font-size: 15px;
        }
        .svc-warn {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border-radius: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          font-size: 14px;
          font-weight: 700;
          color: #7f1d1d;
        }
        .svc-price-block {
          margin-top: 20px;
        }
        .svc-price-label {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
        }
        .svc-price-big {
          margin-top: 4px;
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
        }
        .svc-gst {
          margin-top: 10px;
          font-size: 13px;
          color: #64748b;
          line-height: 20px;
        }
        .svc-gst-total {
          margin-top: 4px;
          font-weight: 800;
          color: #0f172a;
        }
        .svc-section {
          margin-top: 28px;
        }
        .svc-sec-title {
          margin: 0 0 12px;
          font-size: 17px;
          font-weight: 800;
        }
        .svc-addon {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          margin-bottom: 8px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #fff;
          text-align: left;
          cursor: pointer;
        }
        .svc-addon--on {
          border-color: ${Colors.primary};
          background: rgba(124, 119, 185, 0.06);
        }
        .svc-addon-check {
          width: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .svc-ring {
          width: 22px;
          height: 22px;
          border-radius: 11px;
          border: 2px solid #cbd5e1;
          display: inline-block;
        }
        .svc-addon-name {
          flex: 1;
          font-weight: 700;
          color: #0f172a;
        }
        .svc-addon-price {
          font-weight: 800;
          color: ${Colors.primary};
        }
        .svc-hl {
          display: flex;
          gap: 12px;
          margin-bottom: 14px;
        }
        .svc-hl-title {
          font-weight: 800;
          color: #0f172a;
        }
        .svc-hl-body {
          margin-top: 4px;
          font-size: 13px;
          color: #64748b;
        }
        .svc-bottom-spacer {
          height: 24px;
        }
        .svc-bar {
          position: sticky;
          bottom: 0;
          padding: 12px 16px calc(12px + var(--cs-safe-bottom));
          background: rgba(255, 255, 255, 0.96);
          border-top: 1px solid #e2e8f0;
        }
        .svc-bar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          max-width: 560px;
          margin: 0 auto;
        }
        .svc-bar-label {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
        }
        .svc-bar-total {
          font-size: 20px;
          font-weight: 800;
        }
        .svc-add-cta {
          flex-shrink: 0;
          min-width: 140px;
          min-height: 48px;
          padding: 0 20px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #9a95ca, #7c77b9);
          color: #fff;
          font-weight: 800;
          font-size: 15px;
        }
        .svc-muted,
        .svc-err {
          padding: 24px;
          text-align: center;
        }
        .svc-err {
          color: #b91c1c;
        }
        .svc-backlink {
          display: block;
          margin: 12px auto;
          border: none;
          background: none;
          color: ${Colors.primary};
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}
