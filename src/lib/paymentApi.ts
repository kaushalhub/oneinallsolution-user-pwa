import { apiRequest } from './api';
import { readBackendJwtUserId } from '../utils/backendJwt';

export type CreateOrderResponse = {
  payment_session_id: string;
  order_id: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  idempotent?: boolean;
};

export async function createPaymentOrder(
  token: string,
  body: {
    amount: number;
    customer_id: string;
    customer_phone: string;
    order_note?: string;
    purpose?: 'generic' | 'wallet_topup';
    idempotency_key?: string;
  }
) {
  const trimmedToken = String(token || '').trim();
  if (!trimmedToken) throw new Error('Please log in again.');

  const fromJwt = readBackendJwtUserId(trimmedToken);
  const customer_id = String(fromJwt || body.customer_id || '').trim();
  if (!customer_id) throw new Error('Please log in again.');

  return apiRequest<CreateOrderResponse>('/create-order', {
    method: 'POST',
    token: trimmedToken,
    body: { ...body, customer_id },
  });
}

export type VerifyPaymentResponse = {
  success: boolean;
  order_id: string;
  order_status?: string;
  order_amount?: number;
  payment_session_id?: string;
  message?: string;
};

export async function verifyPaymentOrder(token: string, orderId: string) {
  const path = `/verify-payment/${encodeURIComponent(orderId)}`;
  return apiRequest<VerifyPaymentResponse>(path, { method: 'GET', token });
}
