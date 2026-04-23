import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchMpAddons, fetchMpPackages, type MpAddon, type MpPackage } from './mpApi';

const CITIES = [
  { value: 'mumbai', label: 'Mumbai' },
  { value: 'bangalore', label: 'Bangalore' },
  { value: 'delhi', label: 'Delhi (base price fallback)' },
];

export function MpServicePage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<MpPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<string>('');
  const [addons, setAddons] = useState<MpAddon[]>([]);
  const [addonPick, setAddonPick] = useState<Record<string, boolean>>({});
  const [city, setCity] = useState('mumbai');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) return;
    fetchMpPackages(serviceId)
      .then((r) => {
        const list = r.packages || [];
        setPackages(list);
        setSelectedPkg((p) => p || (list[0] ? list[0].id : ''));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [serviceId]);

  useEffect(() => {
    if (!selectedPkg) return;
    fetchMpAddons(selectedPkg)
      .then((r) => setAddons(r.addons || []))
      .catch(() => setAddons([]));
  }, [selectedPkg]);

  const selectedAddonIds = useMemo(
    () => addons.filter((a) => addonPick[a.id]).map((a) => a.id),
    [addons, addonPick]
  );

  const goCheckout = () => {
    if (!selectedPkg) return;
    navigate('/mp/checkout', {
      state: { packageId: selectedPkg, city, addonIds: selectedAddonIds },
    });
  };

  return (
    <>
      <div className="mp-card">
        <h2>City</h2>
        <select className="mp-select" value={city} onChange={(e) => setCity(e.target.value)}>
          {CITIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      {err ? <p className="mp-note">{err}</p> : null}
      <div className="mp-card">
        <h2>Packages (ex-GST)</h2>
        <p className="mp-note">GST (18%) is added at checkout on subtotal.</p>
        {packages.map((p) => (
          <label key={p.id} className="mp-row" style={{ cursor: 'pointer' }}>
            <span>
              <input
                type="radio"
                name="pkg"
                checked={selectedPkg === p.id}
                onChange={() => setSelectedPkg(p.id)}
              />{' '}
              <strong>{p.name}</strong>
              <div className="mp-note">{p.duration}</div>
            </span>
            <span className="mp-badge">₹{p.basePrice}</span>
          </label>
        ))}
      </div>
      {addons.length > 0 ? (
        <div className="mp-card">
          <h2>Add-ons (ex-GST)</h2>
          {addons.map((a) => (
            <label key={a.id} className="mp-row" style={{ cursor: 'pointer' }}>
              <span>
                <input
                  type="checkbox"
                  checked={!!addonPick[a.id]}
                  onChange={(e) => setAddonPick((prev) => ({ ...prev, [a.id]: e.target.checked }))}
                />{' '}
                {a.name}
              </span>
              <span>₹{a.price}</span>
            </label>
          ))}
        </div>
      ) : null}
      <button type="button" className="mp-btn" disabled={!selectedPkg} onClick={goCheckout}>
        Continue to checkout
      </button>
      <p className="mp-note" style={{ textAlign: 'center', marginTop: 16 }}>
        <Link to="/mp">All services</Link>
      </p>
    </>
  );
}
