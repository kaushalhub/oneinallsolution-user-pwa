import type { CreateBookingBody } from './booking';

const KEY = 'cleanswift_pwa_pending_pay_v1';

export type PendingPayPayload = Omit<CreateBookingBody, 'paymentMode' | 'cashfreeOrderId'>;

export type PendingPay = {
  multi: boolean;
  bookingPayload: PendingPayPayload;
  orderId: string;
};

export function savePendingPay(p: PendingPay): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function readPendingPay(): PendingPay | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingPay;
  } catch {
    return null;
  }
}

export function clearPendingPay(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
