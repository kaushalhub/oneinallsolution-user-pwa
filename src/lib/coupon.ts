import { apiRequest } from './api';

export type ValidateCouponResponse = {
  code: string;
  discountPct: number;
  maxCap: number;
  discountAmount: number;
  subtotal: number;
  newTotal: number;
};

export async function validateCoupon(code: string, subtotal: number) {
  return apiRequest<ValidateCouponResponse>('/catalog/coupon/validate', {
    method: 'POST',
    body: { code: code.trim().toUpperCase(), subtotal },
  });
}
