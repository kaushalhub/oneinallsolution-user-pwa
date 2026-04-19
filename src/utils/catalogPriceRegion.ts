import { formatCitySlugForDisplay } from './citySlug';

/** Short line for UI when catalog query includes a city slug */
export function catalogPriceCityLine(query: { state?: string; city?: string } | undefined): string | null {
  if (!query?.city) return null;
  const label = formatCitySlugForDisplay(query.city);
  return label ? `Prices for ${label}` : null;
}
