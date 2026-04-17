import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Colors } from '../constants/theme';
import { useCatalogRegion } from '../context/CatalogRegionContext';
import { fetchCatalogServices, type CatalogService } from '../lib/catalog';
import { catalogServiceHeroImageUri } from '../utils/catalogServiceImage';

export function CategoryServicesPage() {
  const { categoryKey = '' } = useParams();
  const [searchParams] = useSearchParams();
  const label = searchParams.get('label') || 'Services';
  const navigate = useNavigate();
  const { catalogApiQuery } = useCatalogRegion();

  const [items, setItems] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { services } = await fetchCatalogServices(catalogApiQuery);
      const filtered = services.filter((s) => s.catClass === categoryKey);
      setItems(filtered);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [catalogApiQuery, categoryKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = useMemo(() => decodeURIComponent(label), [label]);

  return (
    <div className="cat-page pwa-page">
      <header className="cat-head">
        <button type="button" className="cat-back" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1 className="cat-title">{title}</h1>
        <Link to="/tabs/home" className="cat-home">
          Home
        </Link>
      </header>
      <div className="cat-body">
        {loading ? <p className="cat-muted">Loading…</p> : null}
        {err ? <p className="cat-err">{err}</p> : null}
        {!loading && !err && items.length === 0 ? <p className="cat-muted">No services in this category.</p> : null}
        <ul className="cat-list">
          {items.map((s) => {
            const img = catalogServiceHeroImageUri(s);
            return (
              <li key={s.slug}>
                <button
                  type="button"
                  className="cat-row"
                  onClick={() => navigate(`/service/${encodeURIComponent(s.slug)}`)}
                >
                  <div className="cat-thumb">{img ? <img src={img} alt="" /> : null}</div>
                  <div className="cat-meta">
                    <div className="cat-name">{s.name}</div>
                    <div className="cat-desc">
                      {s.description.slice(0, 90)}
                      {s.description.length > 90 ? '…' : ''}
                    </div>
                    <div className="cat-price">₹{Math.round(s.priceAmount)}</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <style>{`
        .cat-page {
          background: #f8fafc;
          display: flex;
          flex-direction: column;
        }
        .cat-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: calc(var(--cs-safe-top) + 8px) 16px 12px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
        }
        .cat-back {
          border: none;
          background: none;
          font-size: 18px;
          font-weight: 800;
          color: ${Colors.primary};
        }
        .cat-title {
          flex: 1;
          margin: 0;
          font-size: 18px;
          font-weight: 800;
        }
        .cat-home {
          font-size: 14px;
          font-weight: 700;
          color: ${Colors.primary};
          text-decoration: none;
        }
        .cat-body {
          padding: 16px;
          flex: 1;
        }
        .cat-muted {
          color: #64748b;
        }
        .cat-err {
          color: #b91c1c;
        }
        .cat-list {
          list-style: none;
          margin: 12px 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cat-row {
          width: 100%;
          display: flex;
          gap: 14px;
          text-align: left;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 12px;
          background: #fff;
          cursor: pointer;
        }
        .cat-thumb {
          width: 88px;
          height: 88px;
          border-radius: 12px;
          overflow: hidden;
          background: #e2e8f0;
          flex-shrink: 0;
        }
        .cat-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cat-name {
          font-weight: 800;
          color: #0f172a;
        }
        .cat-desc {
          margin-top: 6px;
          font-size: 13px;
          color: #64748b;
          line-height: 18px;
        }
        .cat-price {
          margin-top: 8px;
          font-weight: 800;
          color: #0f172a;
        }
      `}</style>
    </div>
  );
}
