import { apiRequest } from './api';

export type AuthUser = {
  _id: string;
  phone: string;
  name: string;
  email?: string;
  dateOfBirth?: string | null;
  gender?: string;
  profilePhotoUrl?: string;
  wallet?: number;
  referralCode?: string;
};

/** Same shape as mobile `UserProfile`. */
export type UserProfile = AuthUser;

type SendOtpResponse = {
  message: string;
  requestId?: string;
  otpSessionId?: string;
};

type VerifyOtpResponse = {
  message: string;
  sessionToken: string | null;
  isNewUser: boolean;
  user: AuthUser;
};

export async function sendOtp(phone: string) {
  return apiRequest<SendOtpResponse>('/auth/send-otp', {
    method: 'POST',
    body: { phone },
  });
}

export async function resendOtp(phone: string, requestId?: string) {
  return apiRequest<SendOtpResponse>('/auth/resend-otp', {
    method: 'POST',
    body: {
      phone,
      ...(requestId ? { requestId } : {}),
    },
  });
}

export async function verifyOtp(phone: string, otp: string, requestId?: string, referralCode?: string) {
  return apiRequest<VerifyOtpResponse>('/auth/verify-otp', {
    method: 'POST',
    body: {
      phone,
      otp,
      ...(requestId ? { requestId } : {}),
      ...(referralCode ? { referralCode } : {}),
    },
  });
}

export async function getProfileWithSessionToken(sessionToken: string) {
  return apiRequest<{ user: AuthUser }>('/user/profile', {
    method: 'GET',
    token: sessionToken,
  });
}
