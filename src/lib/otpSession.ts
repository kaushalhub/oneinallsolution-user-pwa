let currentRequestId = '';
let currentPhoneNumber = '';

export function setOtpSession(requestId: string | undefined, phoneNumber: string) {
  currentRequestId = requestId || '';
  currentPhoneNumber = phoneNumber;
}

export function getOtpSession() {
  return { requestId: currentRequestId, phoneNumber: currentPhoneNumber };
}

export function clearOtpSession() {
  currentRequestId = '';
  currentPhoneNumber = '';
}
