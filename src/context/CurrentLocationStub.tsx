import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { reverseGeocodeLatLng } from '../lib/reverseGeocode';

/** Approximate distance in km between two WGS84 points. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type CurrentLocationValue = {
  geocodedRegion: string | null;
  geocodedCityKey: string | null;
  isLocationLoading: boolean;
  /** Latest GPS fix from `watchPosition` (live updates). */
  coords: { lat: number; lng: number } | null;
  accuracyMeters: number | null;
  locationError: string | null;
};

const CurrentLocationContext = createContext<CurrentLocationValue | null>(null);

const GEO_DEBOUNCE_MS = 450;
/** Skip reverse geocode if moved less than this since last geocode (km). */
const GEO_MIN_MOVE_KM = 0.12;
/** Minimum time between geocode calls (ms). */
const GEO_MIN_INTERVAL_MS = 20_000;

export function CurrentLocationProvider({ children }: { children: ReactNode }) {
  const [geocodedRegion, setGeocodedRegion] = useState<string | null>(null);
  const [geocodedCityKey, setGeocodedCityKey] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const lastGeocodeRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setIsLocationLoading(false);
      setLocationError('Geolocation is not supported in this browser.');
      return;
    }

    const apiKey =
      typeof import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'string'
        ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY.trim()
        : '';

    const runGeocode = async (lat: number, lng: number) => {
      if (!apiKey) {
        setIsLocationLoading(false);
        return;
      }

      const prev = lastGeocodeRef.current;
      const now = Date.now();
      if (prev) {
        const moved = haversineKm(prev.lat, prev.lng, lat, lng);
        const soon = now - prev.at < GEO_MIN_INTERVAL_MS;
        if (soon && moved < GEO_MIN_MOVE_KM) return;
      }

      try {
        const r = await reverseGeocodeLatLng(lat, lng, apiKey);
        lastGeocodeRef.current = { lat, lng, at: Date.now() };
        if (r?.geocodedRegion) {
          setGeocodedRegion(r.geocodedRegion);
          setGeocodedCityKey(r.geocodedCityKey);
        }
      } catch {
        // keep previous region/city
      } finally {
        setIsLocationLoading(false);
      }
    };

    const scheduleGeocode = (lat: number, lng: number) => {
      pendingCoordsRef.current = { lat, lng };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const p = pendingCoordsRef.current;
        if (!p) return;
        void runGeocode(p.lat, p.lng);
      }, GEO_DEBOUNCE_MS);
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocationError(null);
        setCoords({ lat: latitude, lng: longitude });
        setAccuracyMeters(
          accuracy != null && Number.isFinite(accuracy) && accuracy > 0 && accuracy < 50_000
            ? Math.round(accuracy)
            : null
        );

        if (!apiKey) {
          setIsLocationLoading(false);
          return;
        }
        scheduleGeocode(latitude, longitude);
      },
      (err) => {
        setIsLocationLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location permission denied');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError('Location unavailable');
        } else if (err.code === err.TIMEOUT) {
          setLocationError('Location request timed out');
        } else {
          setLocationError('Could not read location');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 25_000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const value = useMemo(
    () => ({
      geocodedRegion,
      geocodedCityKey,
      isLocationLoading,
      coords,
      accuracyMeters,
      locationError,
    }),
    [geocodedRegion, geocodedCityKey, isLocationLoading, coords, accuracyMeters, locationError]
  );

  return <CurrentLocationContext.Provider value={value}>{children}</CurrentLocationContext.Provider>;
}

export function useCurrentLocation(): CurrentLocationValue {
  const ctx = useContext(CurrentLocationContext);
  if (!ctx) throw new Error('useCurrentLocation must be used within CurrentLocationProvider');
  return ctx;
}
