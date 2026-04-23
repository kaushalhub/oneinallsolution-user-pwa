import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMpServices, type MpService } from './mpApi';

export function MpHomePage() {
  const [services, setServices] = useState<MpService[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchMpServices()
      .then((r) => setServices(r.services || []))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  return (
    <>
      <div className="mp-card">
        <h2>Location</h2>
        <p className="mp-note">Use checkout to pick city for pricing. Browse services below.</p>
      </div>
      {err ? <p className="mp-note">{err}</p> : null}
      <div className="mp-card">
        <h2>Categories &amp; services</h2>
        {services.map((s) => (
          <Link key={s.id} to={`/mp/service/${s.id}`} className="mp-row">
            <span>
              <strong>{s.name}</strong>
              <div className="mp-note" style={{ marginTop: 4 }}>
                {s.category}
              </div>
            </span>
            <span className="mp-badge">{s.startsAt != null ? `From ₹${s.startsAt}` : 'View'}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
