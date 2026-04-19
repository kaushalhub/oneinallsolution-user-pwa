import { useEffect, useState } from 'react';

import { getSession } from '../lib/session';
import { fetchUserAddresses, type UserAddress } from '../lib/userApi';

/** Default or first saved address for logged-in users (for city-wise catalog pricing). */
export function useDefaultUserAddress() {
  const [addr, setAddr] = useState<UserAddress | null>(null);

  useEffect(() => {
    let cancel = false;
    const s = getSession();
    if (!s?.token) {
      setAddr(null);
      return;
    }
    void fetchUserAddresses(s.token)
      .then((r) => {
        if (cancel) return;
        const list = r.addresses || [];
        setAddr(list.find((a) => a.isDefault) ?? list[0] ?? null);
      })
      .catch(() => {
        if (!cancel) setAddr(null);
      });
    return () => {
      cancel = true;
    };
  }, []);

  return addr;
}
