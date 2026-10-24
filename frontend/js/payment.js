/**
 * payment.js
 * A Phase 1 demo payment gateway. No real network call is made — this
 * module validates card details client-side (Luhn check, expiry, CVC),
 * then simulates network latency with a real Promise/async-await flow
 * so the booking page's UX matches what a live gateway integration
 * (Phase 2) will feel like.
 */

const DRPayment = (() => {
  /** Detect card brand from its leading digits, purely cosmetic here. */
  const detectBrand = (number) => {
    const digits = number.replace(/\s+/g, '');
    if (/^4/.test(digits)) return 'Visa';
    if (/^5[1-5]/.test(digits)) return 'Mastercard';
    if (/^3[47]/.test(digits)) return 'Amex';
    if (/^6(?:011|5)/.test(digits)) return 'Discover';
    return digits.length ? 'Card' : '';
  };

  /** Standard Luhn checksum — catches obvious typos, not a fraud check. */
  const luhnValid = (number) => {
    const digits = number.replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(digits)) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      let d = parseInt(digits[i], 10);
      if (shouldDouble) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  };

  const expiryValid = (value) => {
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(value)) return false;
    const [mm, yy] = value.split('/').map((s) => parseInt(s.trim(), 10));
    if (mm < 1 || mm > 12) return false;
    const now = new Date();
    const currentYY = now.getFullYear() % 100;
    const currentMM = now.getMonth() + 1;
    if (yy < currentYY) return false;
    if (yy === currentYY && mm < currentMM) return false;
    return true;
  };

  const cvcValid = (value, brand) => {
    const len = brand === 'Amex' ? 4 : 3;
    return new RegExp(`^\\d{${len}}$`).test(value);
  };

  const formatCardNumber = (value) => value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();

  /** A real setTimeout-based delay, wrapped as a Promise for async/await use. */
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Simulate submitting a charge to a payment processor.
   * Always "succeeds" for well-formed demo data; this is Phase 1 only.
   * @returns {Promise<{ok: boolean, transactionId?: string, message?: string}>}
   */
  const processPayment = async ({ cardNumber, expiry, cvc, amount }) => {
    const brand = detectBrand(cardNumber);
    if (!luhnValid(cardNumber)) return { ok: false, message: 'That card number doesn\u2019t look valid.' };
    if (!expiryValid(expiry)) return { ok: false, message: 'Enter a valid, unexpired expiry date.' };
    if (!cvcValid(cvc, brand)) return { ok: false, message: 'Enter a valid security code.' };

    // Simulate network latency, as a real gateway call would have.
    await wait(1100);

    return {
      ok: true,
      transactionId: window.DR.utils.uid('txn').toUpperCase(),
      brand,
      amount,
      last4: cardNumber.replace(/\s+/g, '').slice(-4),
    };
  };

  return { detectBrand, luhnValid, expiryValid, cvcValid, formatCardNumber, processPayment, wait };
})();

window.DR = window.DR || {};
window.DR.payment = DRPayment;
