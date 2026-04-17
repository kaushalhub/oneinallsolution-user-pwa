import { apiRequest } from './api';

export type SupportTicket = {
  _id: string;
  userId: string;
  subject: string;
  body: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchSupportTickets(token: string) {
  return apiRequest<{ tickets: SupportTicket[] }>('/support/tickets', { token });
}

export async function createSupportTicket(token: string, subject: string, body: string) {
  return apiRequest<{ ticket: SupportTicket }>('/support/tickets', {
    method: 'POST',
    token,
    body: { subject, body },
  });
}
