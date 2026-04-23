import { API_BASE_URL } from '../lib/api';

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

export type MpService = { id: string; name: string; category: string; image: string; startsAt: number | null };
export type MpPackage = {
  id: string;
  serviceId: string;
  name: string;
  basePrice: number;
  duration: string;
  includes: string[];
  excludes: string[];
};
export type MpAddon = { id: string; packageId: string; name: string; price: number };

export function fetchMpServices() {
  return j<{ services: MpService[] }>('/api/marketplace/services');
}

export function fetchMpPackages(serviceId: string) {
  return j<{ packages: MpPackage[] }>(`/api/marketplace/services/${encodeURIComponent(serviceId)}/packages`);
}

export function fetchMpAddons(packageId: string) {
  return j<{ addons: MpAddon[] }>(`/api/marketplace/packages/${encodeURIComponent(packageId)}/addons`);
}

export function postMpQuote(body: { packageId: string; city: string; addonIds: string[] }) {
  return j<{
    packageUnitExGst: number;
    addons: { addonId: string; name: string; price: number }[];
    addonsTotal: number;
    subtotal: number;
    gstRate: number;
    gstAmount: number;
    cgst: number;
    sgst: number;
    totalAmount: number;
  }>('/api/marketplace/quote', { method: 'POST', body: JSON.stringify(body) });
}

export function postMpBooking(token: string, body: { packageId: string; city: string; addonIds: string[] }) {
  return j<{ booking: { id: string; baseAmount: number; gstAmount: number; totalAmount: number } }>(
    '/api/marketplace/bookings',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }
  );
}

export function postRazorpayOrder(token: string, bookingId: string) {
  return j<{ keyId: string; orderId: string; amount: number; currency: string; bookingId: string }>(
    '/api/marketplace/payments/razorpay/order',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bookingId }),
    }
  );
}
