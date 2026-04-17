import { apiRequest } from './api';

export async function fetchWallet(token: string) {
  return apiRequest<{ wallet: number }>('/wallet', { token });
}

/** Alias matching user-app naming. */
export async function fetchWalletBalance(token: string) {
  return fetchWallet(token);
}

export type WalletTransactionRecord = {
  _id: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  meta?: Record<string, unknown>;
  createdAt?: string;
};

export async function fetchWalletTransactions(token: string) {
  return apiRequest<{ transactions: WalletTransactionRecord[] }>('/wallet/transactions', { token });
}
