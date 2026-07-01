/** PHP money parsing and itinerary fare totals (ported from itineraryMoney.ts) */
(function (global) {
  function parseMoneyPhp(input) {
    if (input == null) return 0;
    let s = String(input)
      .replace(/PHP/gi, '')
      .replace(/,/g, '')
      .replace(/\s+/g, '')
      .replace(/[\u2212\u2013\u2014]/g, '-')
      .trim();
    const neg = /^-/.test(s);
    s = s.replace(/[^\d.-]/g, '');
    const n = parseFloat(s);
    if (!Number.isFinite(n)) return 0;
    return neg ? -Math.abs(n) : n;
  }

  function formatMoneyPhp(amount) {
    const a = Number.isFinite(amount) ? amount : 0;
    return a.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function deriveMoneyTotals(input) {
    const base = parseMoneyPhp(input.adultBaseFare);
    const other = parseMoneyPhp(input.adultOtherCharges);
    const adultTotal = base + other;
    const room = parseMoneyPhp(input.roomRate);
    const tax = parseMoneyPhp(input.roomTaxes);
    const roomTotal = room + tax;
    let sup = 0;
    (input.supplements || []).forEach((row) => {
      sup += parseMoneyPhp(row.amount);
    });
    const original = adultTotal + roomTotal + sup;
    const savingsRaw = Math.abs(parseMoneyPhp(input.savings));
    const due = Math.max(0, original - savingsRaw);
    return {
      adultTotalFareFmt: formatMoneyPhp(adultTotal),
      totalRoomRateFmt: formatMoneyPhp(roomTotal),
      originalTotalFmt: formatMoneyPhp(original),
      totalDueFmt: formatMoneyPhp(due),
    };
  }

  global.LyziusMoney = { parseMoneyPhp, formatMoneyPhp, deriveMoneyTotals };
})(window);
