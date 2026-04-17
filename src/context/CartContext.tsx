import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const CART_KEY = 'cleanswift_pwa_cart_v1';

export type CartLine = {
  id: string;
  slug: string;
  title: string;
  basePrice: number;
  lineTotal: number;
  selectedAddonIds: string[];
  quantity?: number;
  gstPercent?: number;
  serviceBaseExGst?: number;
  serviceGstAmount?: number;
  imageUri?: string | null;
};

function newLineId() {
  return `l_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function addonSignature(ids: string[]): string {
  if (ids.length === 0) return '';
  return [...ids].sort().join('\u0001');
}

function sameCartSku(
  a: Pick<CartLine, 'slug' | 'selectedAddonIds'>,
  b: Pick<CartLine, 'slug' | 'selectedAddonIds'>
): boolean {
  return a.slug === b.slug && addonSignature(a.selectedAddonIds) === addonSignature(b.selectedAddonIds);
}

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  addLine: (input: Omit<CartLine, 'id'> & { id?: string }) => void;
  removeLine: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadLines);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(lines));
  }, [lines]);

  const addLine = useCallback((input: Omit<CartLine, 'id'> & { id?: string }) => {
    const {
      slug,
      title,
      basePrice,
      lineTotal,
      selectedAddonIds,
      imageUri,
      gstPercent,
      serviceBaseExGst,
      serviceGstAmount,
    } = input;
    const addonList = [...selectedAddonIds];

    setLines((prev) => {
      const idx = prev.findIndex((l) => sameCartSku(l, { slug, selectedAddonIds: addonList }));
      if (idx >= 0) {
        const existing = prev[idx];
        const q = existing.quantity ?? 1;
        const unitTotal = existing.lineTotal / q;
        const newQ = q + 1;
        const next = [...prev];
        next[idx] = {
          ...existing,
          quantity: newQ,
          lineTotal: Math.round(unitTotal * newQ * 100) / 100,
          imageUri: existing.imageUri ?? imageUri ?? null,
          gstPercent: existing.gstPercent ?? gstPercent,
          serviceBaseExGst: existing.serviceBaseExGst ?? serviceBaseExGst,
          serviceGstAmount: existing.serviceGstAmount ?? serviceGstAmount,
        };
        return next;
      }

      const id = input.id ?? newLineId();
      return [
        ...prev,
        {
          id,
          slug,
          title,
          basePrice,
          lineTotal,
          selectedAddonIds: addonList,
          quantity: 1,
          imageUri: imageUri ?? null,
          ...(gstPercent != null && gstPercent > 0 && serviceBaseExGst != null && serviceGstAmount != null
            ? { gstPercent, serviceBaseExGst, serviceGstAmount }
            : {}),
        },
      ];
    });
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
    const itemCount = lines.reduce((s, l) => s + (l.quantity ?? 1), 0);
    return {
      lines,
      itemCount,
      subtotal,
      addLine,
      removeLine,
      clearCart,
    };
  }, [lines, addLine, removeLine, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
