import type { CreateBookingAddress } from '../lib/booking';

/** One row in a multi-service cart (passed into Booking / Payment). */
export type BookingCartLine = {
  slug: string;
  title: string;
  basePrice: number;
  lineTotal: number;
  selectedAddonIds?: string[];
  quantity?: number;
  gstPercent?: number;
  serviceBaseExGst?: number;
  serviceGstAmount?: number;
};

export type PaymentOptionsLocationState = {
  serviceLineTitle: string;
  payTotal: number;
  subtotalBeforeDiscount: number;
  multi: boolean;
  cartLines?: BookingCartLine[];
  basePrice?: number;
  totalPrice?: number;
  gstPercent?: number;
  serviceBaseExGst?: number;
  serviceGstAmount?: number;
  appliedCoupon: { code: string; discountAmount: number; newTotal: number } | null;
  selectedDate: string;
  selectedTime: string;
  address: CreateBookingAddress;
  addressSummary: string;
  itemCount: number;
};
