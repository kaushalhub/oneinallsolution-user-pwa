import { useCallback, useEffect, useRef, useState } from 'react';

import { loadGoogleMapsJs } from '../lib/loadGoogleMapsJs';
import { parseGeocodeResult, type ParsedMapAddress } from '../lib/parseGoogleGeocode';
import { IonIcon } from '../utils/ionIcon';

const DEFAULT_IN: google.maps.LatLngLiteral = { lat: 28.6139, lng: 77.209 };

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

export type MapResolvedAddress = ParsedMapAddress & { lat: number; lng: number };

type Props = {
  apiKey: string | undefined;
  /** When user has granted location, center the pin here first. */
  initialCenter?: google.maps.LatLngLiteral | null;
  onResolved: (addr: MapResolvedAddress) => void;
  disabled?: boolean;
};

export function AddressMapPicker({ apiKey, initialCenter, onResolved, disabled }: Props) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [mapBusy, setMapBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const icLat = initialCenter?.lat;
  const icLng = initialCenter?.lng;
  const onResolvedRef = useRef(onResolved);
  useEffect(() => {
    onResolvedRef.current = onResolved;
  }, [onResolved]);

  const runGeocode = useCallback((latLng: google.maps.LatLng) => {
    if (!window.google?.maps) return;
    setMapBusy(true);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, (results, status) => {
      setMapBusy(false);
      if (status !== 'OK' || !results?.[0]) {
        setLoadErr('Could not read address for this pin. Try moving it slightly.');
        return;
      }
      setLoadErr(null);
      const parsed = parseGeocodeResult(results[0]);
      onResolvedRef.current({
        ...parsed,
        lat: latLng.lat(),
        lng: latLng.lng(),
      });
    });
  }, []);

  useEffect(() => {
    if (!apiKey || disabled || !mapElRef.current) return;
    let cancelled = false;
    setMapReady(false);

    void (async () => {
      try {
        await loadGoogleMapsJs(apiKey);
      } catch (e) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Maps failed to load');
        return;
      }
      if (cancelled || !mapElRef.current || !window.google?.maps) return;

      const hasHint = icLat != null && icLng != null;
      const center = hasHint ? { lat: icLat, lng: icLng } : DEFAULT_IN;
      const map = new google.maps.Map(mapElRef.current, {
        center,
        zoom: hasHint ? 17 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy',
        clickableIcons: false,
        styles: MAP_STYLES,
      });
      const marker = new google.maps.Marker({
        position: center,
        map,
        draggable: true,
        animation: google.maps.Animation.DROP,
      });
      mapRef.current = map;
      markerRef.current = marker;

      const syncFromMarker = () => {
        const p = marker.getPosition();
        if (p) runGeocode(p);
      };

      marker.addListener('dragend', syncFromMarker);
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        marker.setPosition(e.latLng);
        map.panTo(e.latLng);
        runGeocode(e.latLng);
      });

      window.setTimeout(() => {
        if (cancelled) return;
        google.maps.event.trigger(map, 'resize');
        map.setCenter(center);
      }, 120);

      syncFromMarker();
      if (!cancelled) setMapReady(true);
    })();

    return () => {
      cancelled = true;
      setMapReady(false);
      const m = markerRef.current;
      const mp = mapRef.current;
      if (m) google.maps.event.clearInstanceListeners(m);
      if (mp) google.maps.event.clearInstanceListeners(mp);
      m?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [apiKey, disabled, icLat, icLng, runGeocode]);

  const useMyLocation = () => {
    if (!mapReady || !window.google?.maps) return;
    if (!navigator.geolocation) {
      setLoadErr('Location is not available on this device.');
      return;
    }
    setGeoBusy(true);
    setLoadErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        const latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        const map = mapRef.current;
        const marker = markerRef.current;
        if (map && marker) {
          marker.setPosition(latLng);
          map.panTo(latLng);
          map.setZoom(17);
          runGeocode(latLng);
        }
      },
      () => {
        setGeoBusy(false);
        setLoadErr('Location permission denied. Drag the pin or tap the map.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  if (!apiKey?.trim()) {
    return (
      <div className="amp-skip">
        <div className="amp-skipIcon">
          <IonIcon ionName="map-outline" size={28} color="#64748b" />
        </div>
        <p className="amp-skipTitle">Map pinning disabled</p>
        <p className="amp-skipText">
          Add <code className="amp-code">VITE_GOOGLE_MAPS_API_KEY</code> and enable <strong>Maps JavaScript API</strong>{' '}
          plus <strong>Geocoding API</strong> in Google Cloud Console. You can still type the address manually.
        </p>
        <style>{ampCss}</style>
      </div>
    );
  }

  return (
    <div className="amp-root">
      <div className="amp-head">
        <div className="amp-headText">
          <span className="amp-kicker">Location</span>
          <h3 className="amp-title">Pin on map</h3>
          <p className="amp-sub">Drag the pin or tap the map — we&apos;ll fill the form below.</p>
        </div>
        <button type="button" className="amp-gps" disabled={geoBusy || disabled || !mapReady} onClick={useMyLocation}>
          <IonIcon ionName="navigate" size={18} color="#fff" />
          {geoBusy ? 'Locating…' : 'My location'}
        </button>
      </div>

      <div className={`amp-mapWrap ${mapBusy ? 'amp-mapWrap--busy' : ''}`}>
        <div ref={mapElRef} className="amp-map" role="application" aria-label="Map: drag pin to set address" />
        {mapBusy ? (
          <div className="amp-overlay" aria-live="polite">
            <span className="amp-spinner" />
            Resolving address…
          </div>
        ) : null}
      </div>

      {loadErr ? (
        <p className="amp-err" role="alert">
          {loadErr}
        </p>
      ) : null}

      <style>{ampCss}</style>
    </div>
  );
}

const ampCss = `
  .amp-root { margin: 0 0 4px; }
  .amp-head {
    display: flex; flex-direction: row; align-items: flex-start; justify-content: space-between;
    gap: 12px; margin-bottom: 10px;
  }
  .amp-headText { min-width: 0; flex: 1; }
  .amp-kicker {
    display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 0.12em;
    text-transform: uppercase; color: #7c77b9; margin-bottom: 2px;
  }
  .amp-title { margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
  .amp-sub { margin: 4px 0 0; font-size: 13px; color: #64748b; line-height: 18px; }
  .amp-gps {
    flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px;
    border: none; border-radius: 9999px; padding: 10px 14px; cursor: pointer;
    background: linear-gradient(135deg, #5b5699, #7c77b9); color: #fff; font-size: 12px; font-weight: 800;
    box-shadow: 0 4px 14px rgba(124, 119, 185, 0.35);
  }
  .amp-gps:disabled { opacity: 0.65; cursor: not-allowed; }
  .amp-mapWrap {
    position: relative; border-radius: 16px; overflow: hidden;
    border: 1px solid #e2e8f0; box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
    background: #e8eef7;
  }
  .amp-mapWrap--busy { pointer-events: none; }
  .amp-map { width: 100%; height: 220px; }
  .amp-overlay {
    position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; background: rgba(255,255,255,0.82); font-size: 13px; font-weight: 700; color: #334155;
  }
  .amp-spinner {
    width: 22px; height: 22px; border-radius: 50%;
    border: 3px solid #e2e8f0; border-top-color: #7c77b9; animation: amp-spin 0.7s linear infinite;
  }
  @keyframes amp-spin { to { transform: rotate(360deg); } }
  .amp-err { margin: 10px 0 0; font-size: 13px; color: #b91c1c; font-weight: 600; line-height: 18px; }
  .amp-skip {
    padding: 16px 14px; border-radius: 16px; background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px dashed #cbd5e1; margin-bottom: 8px;
  }
  .amp-skipIcon { margin-bottom: 8px; }
  .amp-skipTitle { margin: 0 0 6px; font-size: 15px; font-weight: 800; color: #334155; }
  .amp-skipText { margin: 0; font-size: 13px; color: #64748b; line-height: 20px; }
  .amp-code { font-size: 12px; background: #fff; padding: 1px 6px; border-radius: 6px; color: #0f172a; }
`;
