import { createContext, useContext, useMemo, type ReactNode } from 'react';

type CurrentLocationValue = {
  geocodedRegion: string | null;
  geocodedCityKey: string | null;
  isLocationLoading: boolean;
};

const CurrentLocationContext = createContext<CurrentLocationValue | null>(null);

export function CurrentLocationProvider({ children }: { children: ReactNode }) {
  const value = useMemo(
    () => ({
      geocodedRegion: null,
      geocodedCityKey: null,
      isLocationLoading: false,
    }),
    []
  );
  return <CurrentLocationContext.Provider value={value}>{children}</CurrentLocationContext.Provider>;
}

export function useCurrentLocation(): CurrentLocationValue {
  const ctx = useContext(CurrentLocationContext);
  if (!ctx) throw new Error('useCurrentLocation must be used within CurrentLocationProvider');
  return ctx;
}
