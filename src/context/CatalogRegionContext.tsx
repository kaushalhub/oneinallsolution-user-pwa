import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchIndianStates, type IndianStateOption } from '../lib/catalog';
import { useCurrentLocation } from './CurrentLocationStub';

const KEY_MODE = 'cleanswift_catalog_region_mode';
const KEY_CODE = 'cleanswift_catalog_region_code';
const KEY_CITY_SLUG = 'cleanswift_catalog_region_city_slug';
const KEY_CITY_LABEL = 'cleanswift_catalog_region_city_label';

export type CatalogRegionMode = 'auto' | 'pinned';

export type RegionPreferenceInput = {
  mode: CatalogRegionMode;
  code?: string;
  citySlug?: string;
  cityLabel?: string;
};

function matchRegionToStateCode(region: string | null | undefined, states: IndianStateOption[]): string | undefined {
  if (!region?.trim() || !states.length) return undefined;
  const t = region.trim().toLowerCase();
  if (t === 'orissa') {
    return states.find((s) => s.code === 'odisha')?.code;
  }
  for (const s of states) {
    if (s.label.toLowerCase() === t) return s.code;
    const codeAsWords = s.code.replace(/-/g, ' ');
    if (codeAsWords === t) return s.code;
  }
  return undefined;
}

export type CatalogRegionContextValue = {
  mode: CatalogRegionMode;
  pinnedCode: string | undefined;
  pinnedCitySlug: string | undefined;
  pinnedCityLabel: string | undefined;
  setRegionPreference: (next: RegionPreferenceInput) => Promise<void>;
  catalogStateQuery: string | undefined;
  catalogApiQuery: { state: string; city?: string } | undefined;
  indianStates: IndianStateOption[];
  regionReady: boolean;
  catalogRegionLabel: string;
  geocodedMatchCode: string | undefined;
  geocodedRegion: string | null;
  geocodedCityKey: string | null;
  locationLoading: boolean;
};

const CatalogRegionContext = createContext<CatalogRegionContextValue | null>(null);

export function CatalogRegionProvider({ children }: { children: ReactNode }) {
  const { geocodedRegion, geocodedCityKey, isLocationLoading } = useCurrentLocation();
  const [mode, setMode] = useState<CatalogRegionMode>('auto');
  const [pinnedCode, setPinnedCode] = useState<string | undefined>(undefined);
  const [pinnedCitySlug, setPinnedCitySlug] = useState<string | undefined>(undefined);
  const [pinnedCityLabel, setPinnedCityLabel] = useState<string | undefined>(undefined);
  const [indianStates, setIndianStates] = useState<IndianStateOption[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetchIndianStates()
      .then((r) => {
        if (!cancel) setIndianStates(r.states || []);
      })
      .catch(() => {
        if (!cancel) setIndianStates([]);
      })
      .finally(() => {
        if (!cancel) setStatesLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    try {
      const m = localStorage.getItem(KEY_MODE);
      const code = localStorage.getItem(KEY_CODE);
      const citySlug = localStorage.getItem(KEY_CITY_SLUG);
      const cityLabel = localStorage.getItem(KEY_CITY_LABEL);
      if (m === 'pinned' || m === 'auto') setMode(m);
      else if (m === 'all') {
        setMode('auto');
        localStorage.setItem(KEY_MODE, 'auto');
      }
      if (code) setPinnedCode(code);
      if (citySlug) setPinnedCitySlug(citySlug);
      if (cityLabel) setPinnedCityLabel(cityLabel);
    } finally {
      setHydrated(true);
    }
  }, []);

  const geocodedMatchCode = useMemo(
    () => (indianStates.length ? matchRegionToStateCode(geocodedRegion, indianStates) : undefined),
    [geocodedRegion, indianStates]
  );

  const catalogStateQuery = useMemo(() => {
    if (!hydrated) return undefined;
    if (mode === 'pinned') return pinnedCode?.trim() || undefined;
    return geocodedMatchCode;
  }, [hydrated, mode, pinnedCode, geocodedMatchCode]);

  const catalogApiQuery = useMemo((): { state: string; city?: string } | undefined => {
    if (!hydrated) return undefined;
    if (mode === 'pinned') {
      const state = pinnedCode?.trim();
      if (!state) return undefined;
      const city = pinnedCitySlug?.trim();
      return city ? { state, city } : { state };
    }
    const state = geocodedMatchCode;
    if (!state) return undefined;
    if (geocodedCityKey) return { state, city: geocodedCityKey };
    return { state };
  }, [hydrated, mode, pinnedCode, pinnedCitySlug, geocodedMatchCode, geocodedCityKey]);

  const catalogRegionLabel = useMemo(() => {
    if (mode === 'pinned' && pinnedCode) {
      const st = indianStates.find((s) => s.code === pinnedCode)?.label ?? pinnedCode;
      if (pinnedCitySlug) {
        const c = pinnedCityLabel || pinnedCitySlug.replace(/-/g, ' ');
        return `${c} · ${st}`;
      }
      return st;
    }
    if (geocodedMatchCode) {
      const st = indianStates.find((s) => s.code === geocodedMatchCode)?.label ?? geocodedMatchCode;
      if (geocodedCityKey) {
        const c = geocodedCityKey.replace(/-/g, ' ');
        return `${c} · ${st}`;
      }
      return st;
    }
    return 'Set your area';
  }, [mode, pinnedCode, pinnedCitySlug, pinnedCityLabel, geocodedMatchCode, geocodedCityKey, indianStates]);

  const setRegionPreference = useCallback(async (next: RegionPreferenceInput) => {
    setMode(next.mode);
    if (next.mode === 'pinned' && next.code) {
      setPinnedCode(next.code);
      const slug = next.citySlug?.trim();
      const label = next.cityLabel?.trim();
      setPinnedCitySlug(slug || undefined);
      setPinnedCityLabel(label || undefined);
      localStorage.setItem(KEY_MODE, next.mode);
      localStorage.setItem(KEY_CODE, next.code);
      if (slug) {
        localStorage.setItem(KEY_CITY_SLUG, slug);
        if (label) localStorage.setItem(KEY_CITY_LABEL, label);
        else localStorage.removeItem(KEY_CITY_LABEL);
      } else {
        localStorage.removeItem(KEY_CITY_SLUG);
        localStorage.removeItem(KEY_CITY_LABEL);
      }
      return;
    }
    setPinnedCode(undefined);
    setPinnedCitySlug(undefined);
    setPinnedCityLabel(undefined);
    localStorage.setItem(KEY_MODE, 'auto');
    localStorage.removeItem(KEY_CODE);
    localStorage.removeItem(KEY_CITY_SLUG);
    localStorage.removeItem(KEY_CITY_LABEL);
  }, []);

  const regionReady = hydrated && !statesLoading;

  const value = useMemo(
    () => ({
      mode,
      pinnedCode,
      pinnedCitySlug,
      pinnedCityLabel,
      setRegionPreference,
      catalogStateQuery,
      catalogApiQuery,
      indianStates,
      regionReady,
      catalogRegionLabel,
      geocodedMatchCode,
      geocodedRegion,
      geocodedCityKey,
      locationLoading: isLocationLoading,
    }),
    [
      mode,
      pinnedCode,
      pinnedCitySlug,
      pinnedCityLabel,
      setRegionPreference,
      catalogStateQuery,
      catalogApiQuery,
      indianStates,
      regionReady,
      catalogRegionLabel,
      geocodedMatchCode,
      geocodedRegion,
      geocodedCityKey,
      isLocationLoading,
    ]
  );

  return <CatalogRegionContext.Provider value={value}>{children}</CatalogRegionContext.Provider>;
}

export function useCatalogRegion(): CatalogRegionContextValue {
  const ctx = useContext(CatalogRegionContext);
  if (!ctx) throw new Error('useCatalogRegion must be used within CatalogRegionProvider');
  return ctx;
}
