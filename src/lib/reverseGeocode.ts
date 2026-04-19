import { parseGeocodeResult } from './parseGoogleGeocode';
import { slugifyCityForCatalog } from '../utils/citySlug';

/**
 * Reverse geocode via HTTP Geocoding API (no Maps JS load). Requires Geocoding API enabled for the key.
 */
export async function reverseGeocodeLatLng(
  lat: number,
  lng: number,
  apiKey: string
): Promise<{ geocodedRegion: string | null; geocodedCityKey: string | null } | null> {
  const key = apiKey.trim();
  if (!key) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${lat},${lng}`);
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      address_components: google.maps.GeocoderAddressComponent[];
      formatted_address: string;
    }>;
  };

  if (data.status !== 'OK' || !data.results?.[0]) return null;

  const parsed = parseGeocodeResult(data.results[0] as google.maps.GeocoderResult);
  const state = parsed.state.trim();
  const city = parsed.city.trim();
  if (!state) return null;

  const geocodedCityKey = city ? slugifyCityForCatalog(city) : null;
  return { geocodedRegion: state, geocodedCityKey };
}
