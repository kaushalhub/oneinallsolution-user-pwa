import { createBooking } from './booking';
import type { PendingPayPayload } from './paymentPending';
import { verifyPaymentOrder } from './paymentApi';

export async function finishOnlineBooking(token: string, orderId: string, pending: PendingPayPayload) {
  const v = await verifyPaymentOrder(token, orderId);
  if (!v.success) {
    throw new Error(v.order_status ? `Status: ${v.order_status}` : 'Payment not completed or pending.');
  }
  return createBooking(token, {
    ...pending,
    paymentMode: 'online',
    cashfreeOrderId: orderId,
  });
}
