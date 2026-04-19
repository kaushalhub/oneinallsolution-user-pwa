/** Match backend `normalizeCityInput` for catalog query `city` param. */
export function slugifyCityForCatalog(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/g, '')
    .replace(/-+$/g, '');
}

/** "indore" / "new-delhi" → readable label for UI */
export function formatCitySlugForDisplay(slug: string): string {
  const s = String(slug || '').trim();
  if (!s) return '';
  return s
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
