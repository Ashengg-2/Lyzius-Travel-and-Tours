/**
 * Parse Philippine-peso-ish amount strings ("PHP 1,234.50", "1234", "−500").
 */
export function parseMoneyPhp(input: string | undefined): number {
  if (input == null) return 0;
  let s = String(input)
    .replace(/PHP/gi, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .replace(/−|–|—/g, "-")
    .trim();
  const neg = /^-/.test(s);
  s = s.replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return neg ? -Math.abs(n) : n;
}

export function formatMoneyPhp(amount: number): string {
  const a = Number.isFinite(amount) ? amount : 0;
  return a.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface MoneyTotals {
  adultBaseFareFmt: string;
  adultOtherChargesFmt: string;
  adultTotalFareFmt: string;
  roomRateFmt: string;
  roomTaxesFmt: string;
  totalRoomRateFmt: string;
  supplementsSumFmt: string;
  originalTotalFmt: string;
  savingsFmt: string;
  totalDueFmt: string;
}

export interface MoneyTotalsInput {
  adultBaseFare: string;
  adultOtherCharges: string;
  roomRate: string;
  roomTaxes: string;
  savings: string;
  supplements: { amount: string }[];
}

/** Summations used for itinerary PDF + payment section; savings reduces subtotal once. */
export function deriveMoneyTotals(i: MoneyTotalsInput): MoneyTotals {
  const base = parseMoneyPhp(i.adultBaseFare);
  const other = parseMoneyPhp(i.adultOtherCharges);
  const adultTotal = base + other;

  const room = parseMoneyPhp(i.roomRate);
  const tax = parseMoneyPhp(i.roomTaxes);
  const roomTotal = room + tax;

  let sup = 0;
  for (const row of i.supplements) {
    sup += parseMoneyPhp(row.amount);
  }

  const original = adultTotal + roomTotal + sup;
  const savingsRaw = Math.abs(parseMoneyPhp(i.savings));
  const due = Math.max(0, original - savingsRaw);

  return {
    adultBaseFareFmt: formatMoneyPhp(base),
    adultOtherChargesFmt: formatMoneyPhp(other),
    adultTotalFareFmt: formatMoneyPhp(adultTotal),
    roomRateFmt: formatMoneyPhp(room),
    roomTaxesFmt: formatMoneyPhp(tax),
    totalRoomRateFmt: formatMoneyPhp(roomTotal),
    supplementsSumFmt: formatMoneyPhp(sup),
    originalTotalFmt: formatMoneyPhp(original),
    savingsFmt: formatMoneyPhp(savingsRaw),
    totalDueFmt: formatMoneyPhp(due),
  };
}
