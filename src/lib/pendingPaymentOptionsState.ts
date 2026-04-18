import type { PaymentOptionsLocationState } from '../types/bookingFlow';

const KEY = 'cleanswift_pending_payment_options_v1';

export function isValidPaymentOptionsState(s: PaymentOptionsLocationState | null | undefined): s is PaymentOptionsLocationState {
  if (!s || typeof s !== 'object') return false;
  if (!s.address || typeof s.address.line1 !== 'string' || !s.address.line1.trim()) return false;
  if (!s.selectedDate || !s.selectedTime) return false;
  if (typeof s.payTotal !== 'number' || s.payTotal <= 0) return false;
  return true;
}

export function savePendingPaymentOptionsState(payload: PaymentOptionsLocationState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readPendingPaymentOptionsState(): PaymentOptionsLocationState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PaymentOptionsLocationState;
    return isValidPaymentOptionsState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingPaymentOptionsState() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
