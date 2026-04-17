import { useCallback, useEffect, useState } from 'react';

import { fetchCatalogCities, type CatalogCityOption, type IndianStateOption } from '../lib/catalog';

type Props = {
  open: boolean;
  onClose: () => void;
  indianStates: IndianStateOption[];
  onPickPinned: (input: { code: string; citySlug?: string; cityLabel?: string }) => void;
};

export function RegionPickerModal({ open, onClose, indianStates, onPickPinned }: Props) {
  const [step, setStep] = useState<'menu' | 'state' | 'city'>('menu');
  const [code, setCode] = useState<string | null>(null);
  const [cities, setCities] = useState<CatalogCityOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('menu');
      setCode(null);
      setCities([]);
    }
  }, [open]);

  const openStateList = useCallback(() => setStep('state'), []);
  const pickState = useCallback(async (stateCode: string) => {
    setCode(stateCode);
    setLoadingCities(true);
    setStep('city');
    try {
      const r = await fetchCatalogCities(stateCode);
      setCities(r.cities || []);
    } catch {
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  if (!open) return null;

  return (
    <div className="rpm-overlay" role="dialog" aria-modal="true">
      <button type="button" className="rpm-backdrop" aria-label="Close" onClick={onClose} />
      <div className="rpm-sheet">
        <div className="rpm-handle" />
        {step === 'menu' ? (
          <>
            <h2 className="rpm-title">Service area</h2>
            <p className="rpm-desc">Choose your state and city for accurate prices and availability.</p>
            <button type="button" className="rpm-primary" onClick={openStateList}>
              Choose state & city
            </button>
          </>
        ) : null}
        {step === 'state' ? (
          <>
            <button type="button" className="rpm-linkback" onClick={() => setStep('menu')}>
              ← Back
            </button>
            <h2 className="rpm-title">Select state</h2>
            <div className="rpm-list">
              {indianStates.map((s) => (
                <button key={s.code} type="button" className="rpm-row" onClick={() => void pickState(s.code)}>
                  {s.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {step === 'city' && code ? (
          <>
            <button type="button" className="rpm-linkback" onClick={() => setStep('state')}>
              ← Back
            </button>
            <h2 className="rpm-title">Select city</h2>
            {loadingCities ? <p className="rpm-muted">Loading cities…</p> : null}
            <div className="rpm-list">
              <button
                type="button"
                className="rpm-row"
                onClick={() => {
                  onPickPinned({ code });
                  onClose();
                }}
              >
                Whole state (no city)
              </button>
              {cities.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  className="rpm-row"
                  onClick={() => {
                    onPickPinned({ code, citySlug: c.slug, cityLabel: c.label });
                    onClose();
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
      <style>{`
        .rpm-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .rpm-backdrop {
          position: absolute;
          inset: 0;
          border: none;
          background: rgba(15, 23, 42, 0.45);
        }
        .rpm-sheet {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 520px;
          max-height: 85dvh;
          overflow: auto;
          background: #fff;
          border-radius: 20px 20px 0 0;
          padding: 12px 20px calc(20px + var(--cs-safe-bottom));
          box-shadow: 0 -8px 40px rgba(15, 23, 42, 0.12);
        }
        .rpm-handle {
          width: 44px;
          height: 5px;
          border-radius: 3px;
          background: #e2e8f0;
          margin: 4px auto 12px;
        }
        .rpm-title {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 800;
        }
        .rpm-desc {
          margin: 0 0 16px;
          color: #64748b;
          font-size: 14px;
          line-height: 21px;
        }
        .rpm-primary {
          width: 100%;
          min-height: 50px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #9a95ca, #7c77b9);
          color: #fff;
          font-weight: 800;
          font-size: 15px;
        }
        .rpm-linkback {
          border: none;
          background: none;
          color: #64748b;
          font-weight: 700;
          margin-bottom: 8px;
          padding: 4px 0;
        }
        .rpm-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
        }
        .rpm-row {
          text-align: left;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 14px;
          background: #fff;
          font-weight: 600;
          color: #0f172a;
        }
        .rpm-muted {
          color: #64748b;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
