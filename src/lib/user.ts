import { apiRequest } from './api';

export type UserAddress = {
  _id: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  isDefault?: boolean;
};

export async function fetchUserAddresses(token: string) {
  return apiRequest<{ addresses: UserAddress[] }>('/user/address', { token });
}

export async function addUserAddress(
  token: string,
  body: {
    label?: string;
    line1: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    setAsDefault?: boolean;
  }
) {
  return apiRequest<{ addresses: UserAddress[] }>('/user/address', {
    method: 'POST',
    body,
    token,
  });
}

export async function selectUserAddress(token: string, addressId: string) {
  return apiRequest<{ addresses: UserAddress[] }>('/user/address/select', {
    method: 'PATCH',
    body: { addressId },
    token,
  });
}

export function formatAddressOneLine(a: UserAddress): string {
  const parts = [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(', '), a.pincode].filter(
    (x) => x && String(x).trim()
  );
  return parts.join(', ');
}
