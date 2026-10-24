/**
 * pricing-page.js
 * Powers pricing.html: the interactive pricing simulator that lets
 * visitors drag sliders and watch the engine recompute in real time.
 */

(async () => {
  const { qs, formatCurrency, toInputDate } = window.DR.utils;
  const { pricing } = window.DR;

  const simulator = qs('#pricing-simulator');
  if (!simulator) return;

  const baseInput = qs('#sim-base');
  const daysInput = qs('#sim-days');
  const leadInput = qs('#sim-lead');
  const demandInput = qs('#sim-demand');
  const couponInput = qs('#sim-coupon');

  const baseVal = qs('#sim-base-val');
  const daysVal = qs('#sim-days-val');
  const leadVal = qs('#sim-lead-val');
  const demandVal = qs('#sim-demand-val');

  const resultAmount = qs('#sim-result-amount');
  const resultBreakdown = qs('#sim-result-breakdown');

  const demandTiers = ['low', 'medium', 'high', 'peak'];

  const run = () => {
    const base = Number(baseInput.value);
    const days = Number(daysInput.value);
    const lead = Number(leadInput.value);
    const demandTier = demandTiers[Number(demandInput.value)];

    baseVal.textContent = formatCurrency(base);
    daysVal.textContent = `${days} day${days > 1 ? 's' : ''}`;
    leadVal.textContent = lead === 0 ? 'Booking today' : `${lead} days ahead`;
    demandVal.textContent = pricing.getDemandInfo(demandTier).label;

    const start = new Date();
    start.setDate(start.getDate() + lead);
    const end = new Date(start);
    end.setDate(end.getDate() + days);

    const result = pricing.calculate({
      basePrice: base,
      demandTier,
      startDate: toInputDate(start),
      endDate: toInputDate(end),
      couponCode: couponInput.value,
    });

    resultAmount.textContent = formatCurrency(result.finalTotal);
    resultAmount.classList.remove('price-tick');
    void resultAmount.offsetWidth;
    resultAmount.classList.add('price-tick');

    const maxAbs = Math.max(...result.steps.map((s) => Math.abs(s.amount)), 1);
    resultBreakdown.innerHTML = result.steps.map((s) => {
      const widthPct = Math.max((Math.abs(s.amount) / maxAbs) * 100, 3);
      return `
        <div class="row ${s.type}">
          <span>${s.label}</span>
          <span class="val">${s.amount < 0 ? '-' : (s.type === 'charge' ? '+' : '')}${formatCurrency(Math.abs(s.amount))}</span>
        </div>
        <div class="sim-bar-track"><div class="sim-bar-fill ${s.type}" style="width:${widthPct}%"></div></div>`;
    }).join('') + `<div class="row total"><span>Final total</span><span class="val">${formatCurrency(result.finalTotal)}</span></div>`;
  };

  [baseInput, daysInput, leadInput, demandInput, couponInput].forEach((el) => el.addEventListener('input', run));
  run();
})();
