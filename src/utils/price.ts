export function parseRupeesToNumber(raw: string | number): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.round(raw);
  const s = String(raw).replace(/[₹,\s]/g, '');
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

export function formatRupeeInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatRupeeInrDecimals(amount: number): string {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatRupeeInrGstLine(amount: number): string {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatRupeeInrWholeFloor(amount: number): string {
  return `₹${Math.floor(Number(amount) + 1e-9).toLocaleString('en-IN')}`;
}
