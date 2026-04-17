import { apiRequest } from './api';

export type CreateBookingAddress = {
  label?: string;
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
};

export type BookingLineItem = {
  slug?: string;
  title: string;
  price: number;
};

export type CreateBookingBody = {
  service: string;
  price: number;
  date: string;
  time: string;
  address: CreateBookingAddress;
  paymentMode: 'cod' | 'online' | 'wallet';
  cashfreeOrderId?: string;
  walletAmountUsed?: number;
  couponCode?: string;
  subtotalBeforeDiscount?: number;
  lineItems?: BookingLineItem[];
};

export type BookingAddressRecord = {
  label?: string;
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat?: number | null;
  lng?: number | null;
};

export type BookingCleanerSummary = {
  _id: string;
  name: string;
  phone: string;
  rating?: number;
  location?: { lat: number; lng: number };
};

export type BookingRecord = {
  _id: string;
  userId?: string;
  bookingId?: string;
  service: string;
  lineItems?: BookingLineItem[];
  price: number;
  date: string;
  time?: string;
  status: string;
  paymentMode?: string;
  cashfreeOrderId?: string | null;
  walletAmountUsed?: number;
  address?: BookingAddressRecord;
  cleanerId?: string | BookingCleanerSummary | null;
  createdAt?: string;
  updatedAt?: string;
  ratingStars?: number | null;
  ratingComment?: string | null;
  ratedAt?: string | null;
};

export async function fetchMyBookings(token: string) {
  return apiRequest<{ bookings: BookingRecord[] }>('/booking/my-bookings', { token });
}

export async function fetchBooking(token: string, bookingId: string) {
  return apiRequest<{ booking: BookingRecord }>(`/booking/${encodeURIComponent(bookingId)}`, { token });
}

export async function rateBooking(token: string, bookingId: string, stars: number, comment?: string) {
  return apiRequest<{ message: string; booking: BookingRecord }>(`/booking/${encodeURIComponent(bookingId)}/rate`, {
    method: 'PATCH',
    token,
    body: { stars, ...(comment != null && comment !== '' ? { comment } : {}) },
  });
}

export async function createBooking(token: string, body: CreateBookingBody) {
  return apiRequest<{ message: string; booking: BookingRecord; cleanerAssigned: boolean }>('/booking/create', {
    method: 'POST',
    token,
    body,
  });
}
