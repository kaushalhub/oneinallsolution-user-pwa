import { useMemo } from 'react';

import { useCatalogRegion } from '../context/CatalogRegionContext';
import type { UserAddress } from '../lib/userApi';
import { slugifyCityForCatalog } from '../utils/citySlug';

/**
 * Query passed to `/catalog/*` APIs. When the user has not pinned a city but we know their
 * default address in the same state (auto mode), we add `city` so backend returns city-wise
 * ServicePricing. Skips merge when the user explicitly chose “whole state” (pinned, no city).
 */
export function useCatalogFetchQuery(defaultAddress: UserAddress | null | undefined) {
  const { catalogApiQuery, indianStates, mode, pinnedCitySlug } = useCatalogRegion();

  return useMemo(() => {
    const q = catalogApiQuery;
    if (!q?.state) return q;
    if (q.city) return q;
    if (mode === 'pinned' && !pinnedCitySlug) return q;

    if (!defaultAddress?.city?.trim() || !defaultAddress?.state?.trim()) return q;

    const addrState = defaultAddress.state.trim();
    const code =
      indianStates.find((s) => s.label.toLowerCase() === addrState.toLowerCase())?.code ??
      indianStates.find((s) => s.code.replace(/-/g, ' ').toLowerCase() === addrState.toLowerCase())?.code;

    if (!code || code !== q.state) return q;

    const city = slugifyCityForCatalog(defaultAddress.city);
    if (!city) return q;

    return { state: q.state, city };
  }, [catalogApiQuery, defaultAddress, indianStates, mode, pinnedCitySlug]);
}
