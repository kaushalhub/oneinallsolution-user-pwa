import { apiRequest } from './api';

export type AuthUser = {
  _id: string;
  phone?: string;
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

export type PasswordAuthResponse = {
  message: string;
  sessionToken: string | null;
  isNewUser: boolean;
  user: AuthUser;
};

export type SignupPasswordInput = {
  password: string;
  name?: string;
  email?: string;
  mobile?: string;
  referralCode?: string;
};

export async function signupPassword(opts: SignupPasswordInput) {
  const { password, name, email, mobile, referralCode } = opts;
  return apiRequest<PasswordAuthResponse>('/auth/signup-password', {
    method: 'POST',
    body: {
      password,
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(email?.trim() ? { email: email.trim() } : {}),
      ...(mobile?.trim() ? { mobile: mobile.trim() } : {}),
      ...(referralCode ? { referralCode } : {}),
    },
  });
}

export async function loginPassword(identifier: string, password: string) {
  return apiRequest<PasswordAuthResponse>('/auth/login-password', {
    method: 'POST',
    body: { identifier: identifier.trim(), password },
  });
}

export async function getProfileWithSessionToken(sessionToken: string) {
  return apiRequest<{ user: AuthUser }>('/user/profile', {
    method: 'GET',
    token: sessionToken,
  });
}
