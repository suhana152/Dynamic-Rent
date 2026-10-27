// DynamicRent pricing engine (server-side version of Phase 1 pricing.js)
// Order: subtotal -> demand -> lead time -> weekend -> duration -> coupon

const DEMAND_MULTIPLIERS = {
  low: { value: 0.85, label: "Low demand", tone: "success" },
  medium: { value: 1.0, label: "Medium demand", tone: "info" },
  high: { value: 1.2, label: "High demand", tone: "warning" },
  peak: { value: 1.45, label: "Peak demand", tone: "error" },
};

const WEEKEND_PREMIUM_RATE = 0.12;
const EARLY_BIRD_MIN_DAYS = 14;
const EARLY_BIRD_DISCOUNT = 0.1;
const LAST_MINUTE_MAX_DAYS = 2;
const LAST_MINUTE_SURCHARGE = 0.15;

const DURATION_DISCOUNTS = [
  { minDays: 14, rate: 0.12, label: "14+ day discount" },
  { minDays: 7, rate: 0.05, label: "7+ day discount" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (n) => Math.round(n * 100) / 100;

// ---- date helpers (all in UTC so server timezone never matters) ----
const toUTCDay = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) throw new Error("Invalid date");
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const daysBetween = (start, end) =>
  Math.max(Math.round((toUTCDay(end) - toUTCDay(start)) / DAY_MS), 1);

const daysFromToday = (date) => {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((toUTCDay(date) - today) / DAY_MS);
};

// counts Saturdays and Sundays in the rental (start included, end excluded)
const countWeekendDays = (start, end) => {
  const days = daysBetween(start, end);
  const first = toUTCDay(start);
  let count = 0;
  for (let i = 0; i < days; i++) {
    const day = new Date(first + i * DAY_MS).getUTCDay();
    if (day === 0 || day === 6) count++;
  }
  return count;
};

const getDemandInfo = (tier) =>
  DEMAND_MULTIPLIERS[tier] || DEMAND_MULTIPLIERS.medium;

const getDurationDiscount = (days) =>
  DURATION_DISCOUNTS.find((d) => days >= d.minDays) || null;

/**
 * coupon: { code, rate (0.10 = 10%), label } or null
 */
const calculate = ({
  basePrice,
  demandTier,
  startDate,
  endDate,
  coupon = null,
  bookedOnOffsetDays = 0,
}) => {
  if (toUTCDay(endDate) <= toUTCDay(startDate)) {
    throw new Error("End date must be after start date");
  }
  if (daysFromToday(startDate) < 0) {
    throw new Error("Start date cannot be in the past");
  }

  const days = daysBetween(startDate, endDate);
  const leadDays = Math.max(daysFromToday(startDate) - bookedOnOffsetDays, 0);
  const weekendDays = countWeekendDays(startDate, endDate);
  const demand = getDemandInfo(demandTier);

  const steps = [];

  // 1. Subtotal
  const subtotal = basePrice * days;
  steps.push({
    key: "subtotal",
    label: `Base price x ${days} day${days > 1 ? "s" : ""}`,
    amount: subtotal,
    type: "base",
  });

  // 2. Demand
  const afterDemand = subtotal * demand.value;
  const demandDelta = afterDemand - subtotal;
  steps.push({
    key: "demand",
    label: `${demand.label} (x${demand.value.toFixed(2)})`,
    amount: demandDelta,
    type: demandDelta >= 0 ? "charge" : "discount",
  });

  // 3. Lead time
  let leadAmount = 0;
  let leadLabel = null;
  if (leadDays >= EARLY_BIRD_MIN_DAYS) {
    leadAmount = -afterDemand * EARLY_BIRD_DISCOUNT;
    leadLabel = `Early-bird discount (booked ${leadDays} days ahead)`;
  } else if (leadDays <= LAST_MINUTE_MAX_DAYS) {
    leadAmount = afterDemand * LAST_MINUTE_SURCHARGE;
    leadLabel = "Last-minute charge (booked within 48h)";
  }
  if (leadLabel) {
    steps.push({
      key: "lead",
      label: leadLabel,
      amount: leadAmount,
      type: leadAmount >= 0 ? "charge" : "discount",
    });
  }
  const afterLead = afterDemand + leadAmount;

  // 4. Weekend
  const weekendAmount =
    weekendDays > 0 ? basePrice * WEEKEND_PREMIUM_RATE * weekendDays : 0;
  if (weekendDays > 0) {
    steps.push({
      key: "weekend",
      label: `Weekend pricing (${weekendDays} day${weekendDays > 1 ? "s" : ""})`,
      amount: weekendAmount,
      type: "charge",
    });
  }
  const afterWeekend = afterLead + weekendAmount;

  // 5. Duration discount
  const durationDiscount = getDurationDiscount(days);
  const durationAmount = durationDiscount
    ? -afterWeekend * durationDiscount.rate
    : 0;
  if (durationDiscount) {
    steps.push({
      key: "duration",
      label: durationDiscount.label,
      amount: durationAmount,
      type: "discount",
    });
  }
  const afterDuration = afterWeekend + durationAmount;

  // 6. Coupon
  const couponAmount = coupon ? -afterDuration * coupon.rate : 0;
  if (coupon) {
    steps.push({
      key: "coupon",
      label: coupon.label,
      amount: couponAmount,
      type: "discount",
    });
  }

  const finalTotal = Math.max(afterDuration + couponAmount, 0);

  return {
    days,
    leadDays,
    weekendDays,
    demand,
    subtotal: round2(subtotal),
    steps: steps.map((s) => ({ ...s, amount: round2(s.amount) })),
    finalTotal: round2(finalTotal),
    perDayEffective: round2(finalTotal / days),
  };
};

module.exports = {
  DEMAND_MULTIPLIERS,
  getDemandInfo,
  getDurationDiscount,
  daysBetween,
  daysFromToday,
  countWeekendDays,
  calculate,
};