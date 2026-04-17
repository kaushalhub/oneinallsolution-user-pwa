import type { BookingCartLine } from '../types/bookingFlow';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type CheckoutGstBreakdown = {
  showSplit: boolean;
  serviceExGst: number;
  gstAmount: number;
  gstPercentLabel: number;
  addonsTotal: number;
};

export function computeCheckoutGstBreakdown(input: {
  multi: boolean;
  cartLines?: BookingCartLine[];
  single?: {
    basePrice?: number;
    totalPrice?: number;
    gstPercent?: number;
    serviceBaseExGst?: number;
    serviceGstAmount?: number;
  };
}): CheckoutGstBreakdown {
  if (input.multi && input.cartLines?.length) {
    const lines = input.cartLines;
    let addons = 0;
    for (const l of lines) {
      const q = l.quantity ?? 1;
      addons += round2(Math.max(0, l.lineTotal - l.basePrice * q));
    }
    const allHaveGst = lines.every(
      (l) => l.gstPercent != null && l.gstPercent > 0 && l.serviceBaseExGst != null && l.serviceGstAmount != null
    );
    if (!allHaveGst) {
      return {
        showSplit: false,
        serviceExGst: 0,
        gstAmount: 0,
        gstPercentLabel: 0,
        addonsTotal: round2(addons),
      };
    }
    let ex = 0;
    let gst = 0;
    let pct = 0;
    for (const l of lines) {
      const q = l.quantity ?? 1;
      ex += round2((l.serviceBaseExGst ?? 0) * q);
      gst += round2((l.serviceGstAmount ?? 0) * q);
      pct = l.gstPercent ?? pct;
    }
    return {
      showSplit: true,
      serviceExGst: round2(ex),
      gstAmount: round2(gst),
      gstPercentLabel: pct,
      addonsTotal: round2(addons),
    };
  }

  const s = input.single ?? {};
  const basePrice = Number(s.basePrice) || 0;
  const totalPrice = s.totalPrice != null ? Number(s.totalPrice) : basePrice;
  const addons = round2(Math.max(0, totalPrice - basePrice));
  if (s.gstPercent != null && s.gstPercent > 0 && s.serviceBaseExGst != null && s.serviceGstAmount != null) {
    return {
      showSplit: true,
      serviceExGst: round2(Number(s.serviceBaseExGst)),
      gstAmount: round2(Number(s.serviceGstAmount)),
      gstPercentLabel: Number(s.gstPercent),
      addonsTotal: addons,
    };
  }
  return {
    showSplit: false,
    serviceExGst: round2(basePrice),
    gstAmount: 0,
    gstPercentLabel: 0,
    addonsTotal: addons,
  };
}
