/**
 * pricing.js
 * The DynamicRent pricing engine. Every rental's final price is derived
 * here, step by step, from a small set of transparent rules — nothing
 * is ever hardcoded. Used by the details page, the booking page, and
 * the interactive simulator on the pricing-engine page.
 *
 * Formula (applied in this order):
 *   Subtotal          = Base Price x Days
 *   -> Demand Adjust   = Subtotal x Demand Multiplier
 *   -> Lead Time       = + / - based on how far ahead the booking is made
 *   -> Weekend Adjust   = + a per-weekend-day premium
 *   -> Duration Discount = - a percentage for longer rentals
 *   -> Coupon Discount  = - a percentage from a valid coupon code
 *   = Final Total
 */

const DRPricing = (() => {
  const DEMAND_MULTIPLIERS = {
    low: { value: 0.85, label: 'Low demand', tone: 'success' },
    medium: { value: 1.0, label: 'Medium demand', tone: 'info' },
    high: { value: 1.2, label: 'High demand', tone: 'warning' },
    peak: { value: 1.45, label: 'Peak demand', tone: 'error' },
  };

  const WEEKEND_PREMIUM_RATE = 0.12; // 12% of the per-day rate, per weekend day
  const EARLY_BIRD_MIN_DAYS = 14;    // book 14+ days ahead
  const EARLY_BIRD_DISCOUNT = 0.10;
  const LAST_MINUTE_MAX_DAYS = 2;    // book inside 2 days
  const LAST_MINUTE_SURCHARGE = 0.15;

  const DURATION_DISCOUNTS = [
    { minDays: 14, rate: 0.12, label: '14+ day discount' },
    { minDays: 7, rate: 0.05, label: '7+ day discount' },
  ];

  const COUPONS = {
    WELCOME10: { rate: 0.10, label: 'WELCOME10 (10% off)' },
    SAVE20: { rate: 0.20, label: 'SAVE20 (20% off)' },
    FIRSTRENT: { rate: 0.15, label: 'FIRSTRENT (15% off)' },
  };

  const getDemandInfo = (tier) => DEMAND_MULTIPLIERS[tier] || DEMAND_MULTIPLIERS.medium;

  const getDurationDiscount = (days) => DURATION_DISCOUNTS.find((d) => days >= d.minDays) || null;

  const validateCoupon = (code) => {
    if (!code) return null;
    const found = COUPONS[code.trim().toUpperCase()];
    return found ? { code: code.trim().toUpperCase(), ...found } : false; // false = invalid, null = none entered
  };

  /**
   * Run the full pricing engine.
   * @param {Object} params
   * @param {number} params.basePrice - per-day base price
   * @param {string} params.demandTier - low | medium | high | peak
   * @param {string} params.startDate - ISO date string
   * @param {string} params.endDate - ISO date string
   * @param {string} [params.couponCode]
   * @param {number} [params.bookedOnOffsetDays] - days from today the booking is made (defaults to 0 / today)
   * @returns {Object} breakdown with ordered steps and final total
   */
  const calculate = ({ basePrice, demandTier, startDate, endDate, couponCode, bookedOnOffsetDays = 0 }) => {
    const { daysBetween, daysFromToday } = window.DR.utils;
    const days = daysBetween(startDate, endDate);
    const leadDays = Math.max(daysFromToday(startDate) - bookedOnOffsetDays, 0);
    const weekendDays = window.DR.utils.countWeekendDays(startDate, endDate);
    const demand = getDemandInfo(demandTier);

    const steps = [];

    // 1. Subtotal = base price x days
    const subtotal = basePrice * days;
    steps.push({ key: 'subtotal', label: `Base price x ${days} day${days > 1 ? 's' : ''}`, amount: subtotal, type: 'base' });

    // 2. Demand multiplier
    const afterDemand = subtotal * demand.value;
    const demandDelta = afterDemand - subtotal;
    steps.push({
      key: 'demand',
      label: `${demand.label} (x${demand.value.toFixed(2)})`,
      amount: demandDelta,
      type: demandDelta >= 0 ? 'charge' : 'discount',
    });

    // 3. Lead time discount / surcharge
    let leadAmount = 0;
    let leadLabel = null;
    if (leadDays >= EARLY_BIRD_MIN_DAYS) {
      leadAmount = -afterDemand * EARLY_BIRD_DISCOUNT;
      leadLabel = `Early-bird discount (booked ${leadDays} days ahead)`;
    } else if (leadDays <= LAST_MINUTE_MAX_DAYS) {
      leadAmount = afterDemand * LAST_MINUTE_SURCHARGE;
      leadLabel = 'Last-minute charge (booked within 48h)';
    }
    if (leadLabel) {
      steps.push({ key: 'lead', label: leadLabel, amount: leadAmount, type: leadAmount >= 0 ? 'charge' : 'discount' });
    }
    const afterLead = afterDemand + leadAmount;

    // 4. Weekend adjustment
    const weekendAmount = weekendDays > 0 ? basePrice * WEEKEND_PREMIUM_RATE * weekendDays : 0;
    if (weekendDays > 0) {
      steps.push({
        key: 'weekend',
        label: `Weekend pricing (${weekendDays} day${weekendDays > 1 ? 's' : ''})`,
        amount: weekendAmount,
        type: 'charge',
      });
    }
    const afterWeekend = afterLead + weekendAmount;

    // 5. Duration discount
    const durationDiscount = getDurationDiscount(days);
    const durationAmount = durationDiscount ? -afterWeekend * durationDiscount.rate : 0;
    if (durationDiscount) {
      steps.push({ key: 'duration', label: durationDiscount.label, amount: durationAmount, type: 'discount' });
    }
    const afterDuration = afterWeekend + durationAmount;

    // 6. Coupon discount
    const coupon = validateCoupon(couponCode);
    const couponAmount = coupon ? -afterDuration * coupon.rate : 0;
    if (coupon) {
      steps.push({ key: 'coupon', label: coupon.label, amount: couponAmount, type: 'discount' });
    }
    const finalTotal = Math.max(afterDuration + couponAmount, 0);

    return {
      days,
      leadDays,
      weekendDays,
      demand,
      subtotal,
      steps,
      finalTotal,
      couponValid: coupon === false ? false : !!coupon,
      couponApplied: coupon || null,
      perDayEffective: finalTotal / days,
    };
  };

  return { DEMAND_MULTIPLIERS, COUPONS, getDemandInfo, getDurationDiscount, validateCoupon, calculate };
})();

window.DR = window.DR || {};
window.DR.pricing = DRPricing;
