import { API_BASE_URL, apiRequest } from './api';
import type { UserProfile } from './authApi';

export type { UserProfile };

export type UpdateUserProfileBody = {
  name?: string;
  email?: string;
  dateOfBirth?: string | null;
  gender?: string;
};

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

export function formatAddressOneLine(a: UserAddress): string {
  const parts = [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(', '), a.pincode].filter(
    (x) => x && String(x).trim()
  );
  return parts.join(', ');
}

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
    lat?: number;
    lng?: number;
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

export async function deleteUserAddress(token: string, addressId: string) {
  return apiRequest<{ addresses: UserAddress[] }>(`/user/address/${encodeURIComponent(addressId)}`, {
    method: 'DELETE',
    token,
  });
}

export async function updateUserProfile(token: string, body: UpdateUserProfileBody) {
  return apiRequest<{ message: string; user: UserProfile }>('/user/update', {
    method: 'PUT',
    token,
    body,
  });
}

export async function uploadUserProfilePhoto(token: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  const url = `${API_BASE_URL}/user/profile/photo`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Access-Token': token,
      },
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  const data = (await response.json().catch(() => ({}))) as { message?: string; user?: UserProfile };
  if (!response.ok) {
    throw new Error(data.message || `Upload failed (${response.status})`);
  }
  return data as { message: string; user: UserProfile; url: string };
}
