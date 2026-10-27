/**
 * utils.js
 * Small, dependency-free helper functions shared across every page.
 * Exposed on window.DR.utils so plain <script> tags can share them
 * without a bundler.
 */

const DRUtils = (() => {
  // qs/qsa stay on querySelector(All) on purpose: they're called everywhere
  // in this project with CLASS selectors (e.g. '.dropdown-listbox.is-open')
  // and ATTRIBUTE selectors (e.g. '[data-theme-toggle]'), and often scoped to
  // a specific element (scope) rather than the whole document. getElementById()
  // only ever finds a single element by a unique id on the whole document, so
  // it cannot do either of those things — swapping this helper would break
  // every dropdown, modal, and form on the site.

  /** Shorthand querySelector */
  const qs = (sel, scope = document) => scope.querySelector(sel);

  /** Shorthand querySelectorAll -> real array */
  const qsa = (sel, scope = document) => [...scope.querySelectorAll(sel)];

  /**
   * Static conversion table against USD (the baseline every price in this
   * app is stored in). Illustrative fixed rates — Phase 2 would pull these
   * live from a rates API.
   */
  const CURRENCY_RATES = {
    USD: { rate: 1, name: 'US Dollar' },
    EUR: { rate: 0.92, name: 'Euro' },
    GBP: { rate: 0.79, name: 'British Pound' },
    INR: { rate: 83.1, name: 'Indian Rupee' },
    JPY: { rate: 149.5, name: 'Japanese Yen' },
  };

  /** Reads the active currency from storage preferences; falls back to USD. */
  const getActiveCurrency = () => {
    try {
      const prefs = window.DR?.storage?.getPreferences?.();
      return (prefs && CURRENCY_RATES[prefs.currency]) ? prefs.currency : 'USD';
    } catch (err) {
      return 'USD';
    }
  };

  /**
   * Format a USD-baseline amount as currency. Every price stored in this
   * app (listing.basePrice, booking.total, etc.) is USD — this function
   * converts to whatever currency the user picked in the nav and formats
   * it, so changing currency once updates every price on the site.
   */
  const formatCurrency = (amountUSD, currencyOverride) => {
    const code = currencyOverride || getActiveCurrency();
    const info = CURRENCY_RATES[code] || CURRENCY_RATES.USD;
    const value = (Number.isFinite(amountUSD) ? amountUSD : 0) * info.rate;
    const isWhole = code === 'JPY';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: isWhole ? 0 : 2,
    }).format(value);
  };

  /** Format a plain number with thousands separators. */
  const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

  /** Debounce: delay invoking fn until `wait` ms after the last call. */
  const debounce = (fn, wait = 250) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  };

  /** Throttle: invoke fn at most once every `limit` ms. */
  const throttle = (fn, limit = 150) => {
    let inFlight = false;
    return (...args) => {
      if (inFlight) return;
      inFlight = true;
      fn(...args);
      setTimeout(() => { inFlight = false; }, limit);
    };
  };

  /** Turn a JS Date (or date string) into YYYY-MM-DD for <input type="date">. */
  const toInputDate = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  };

  /** Whole number of days between two date strings (minimum 1). */
  const daysBetween = (start, end) => {
    const a = new Date(start);
    const b = new Date(end);
    const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 1);
  };

  /** Days from today until a given date (can be negative if in the past). */
  const daysFromToday = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
  };

  /** Does the date range include a Saturday or Sunday? Returns count of weekend days. */
  const countWeekendDays = (start, end) => {
    let count = 0;
    const cur = new Date(start);
    const last = new Date(end);
    while (cur < last) {
      const day = cur.getDay();
      if (day === 0 || day === 6) count += 1;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  /** Simple slugify for building ids/classes from strings. */
  const slugify = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  /** Capitalize first letter of a string. */
  const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : str);

  /** Generate a short pseudo-unique id, good enough for local demo data. */
  const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  /** Clamp a number between min and max. */
  const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

  /** Read a query-string parameter from the current URL. */
  const getQueryParam = (name) => new URLSearchParams(window.location.search).get(name);

  /**
   * Basic email check — no regex, just loops and comparisons (as taught
   * in Operators/Loops): exactly one "@", nothing before/after it is
   * blank, no spaces anywhere, and there's a "." inside the domain part
   * that isn't the very first or very last character.
   */
  const isValidEmail = (value) => {
    const email = String(value).trim();
    if (email.length === 0) return false;

    let atCount = 0;
    let atPosition = -1;
    for (let i = 0; i < email.length; i += 1) {
      if (email[i] === ' ') return false;
      if (email[i] === '@') {
        atCount += 1;
        atPosition = i;
      }
    }
    if (atCount !== 1) return false;
    if (atPosition === 0 || atPosition === email.length - 1) return false;

    let domain = '';
    for (let i = atPosition + 1; i < email.length; i += 1) domain += email[i];

    let hasDot = false;
    for (let i = 0; i < domain.length; i += 1) {
      if (domain[i] === '.' && i !== 0 && i !== domain.length - 1) hasDot = true;
    }
    return hasDot;
  };

  /**
   * Basic phone check — no regex. Allows an optional leading "+", then
   * digits, spaces, and dashes only, with the digit count between 7-15.
   */
  const isValidPhone = (value) => {
    const phone = String(value).trim();
    if (phone.length === 0) return false;

    let start = 0;
    if (phone[0] === '+') start = 1;

    let digitCount = 0;
    for (let i = start; i < phone.length; i += 1) {
      const ch = phone[i];
      const isDigit = ch >= '0' && ch <= '9';
      if (!isDigit && ch !== ' ' && ch !== '-') return false;
      if (isDigit) digitCount += 1;
    }
    return digitCount >= 7 && digitCount <= 15;
  };

  /** Escape a string for safe insertion into innerHTML. */
  const escapeHTML = (str = '') => str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  return {
    qs, qsa, formatCurrency, formatNumber, debounce, throttle,
    toInputDate, daysBetween, daysFromToday, countWeekendDays,
    slugify, capitalize, uid, clamp, getQueryParam, isValidEmail,
    isValidPhone, escapeHTML, CURRENCY_RATES, getActiveCurrency,
  };
})();

window.DR = window.DR || {};
window.DR.utils = DRUtils;
