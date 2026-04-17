/**
 * Google Maps embed for booking address.
 * - Prefer `VITE_GOOGLE_MAPS_API_KEY` + Maps Embed API (enable "Maps Embed API" in Google Cloud).
 * - Without a key, uses legacy `output=embed` URL (may be limited by Google; add a key for production).
 */
export function getBookingMapEmbedUrl(options: {
  apiKey?: string;
  lat: number | null;
  lng: number | null;
  addressLine: string;
}): string | null {
  const line = options.addressLine.trim();
  const q =
    options.lat != null && options.lng != null && Number.isFinite(options.lat) && Number.isFinite(options.lng)
      ? `${options.lat},${options.lng}`
      : line;
  if (!q) return null;

  const key = String(options.apiKey || '').trim();
  if (key) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&zoom=16`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed&iwloc=near`;
}
