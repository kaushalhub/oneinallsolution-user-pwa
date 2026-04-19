import type { CatalogService } from '../lib/catalog';
import { resolveMediaUrl } from '../lib/api';

export function catalogServiceHeroImageUri(s: CatalogService): string | null {
  const beforeList = resolveMediaUrl(s.beforeImageUrl ?? null);
  if (beforeList) return beforeList;
  const primary = resolveMediaUrl(s.imageUrl);
  if (primary) return primary;
  for (const raw of s.imageUrls ?? []) {
    const u = resolveMediaUrl(raw);
    if (u) return u;
  }
  const tile = resolveMediaUrl(s.iconUrl);
  if (tile) return tile;
  return null;
}
