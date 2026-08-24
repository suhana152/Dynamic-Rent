/**
 * validation.js
 * Reusable field-level validators plus DOM helpers for showing/clearing
 * elegant inline error messages. Every form on the site (booking, contact,
 * login, signup) shares this module rather than rolling its own checks.
 */

const DRValidation = (() => {
  const { isValidEmail, isValidPhone } = window.DR.utils;

  const rules = {
    required: (value) => (value !== undefined && String(value).trim() !== '') || 'This field is required.',
    email: (value) => isValidEmail(value) || 'Enter a valid email address.',
    phone: (value) => isValidPhone(value) || 'Enter a valid phone number.',
    minLength: (len) => (value) => (String(value).length >= len) || `Must be at least ${len} characters.`,
    maxLength: (len) => (value) => (String(value).length <= len) || `Must be under ${len} characters.`,
    matches: (otherValueFn, message) => (value) => (value === otherValueFn()) || message,
    date: (value) => (!Number.isNaN(new Date(value).getTime())) || 'Enter a valid date.',
    afterDate: (getMinDate, message) => (value) => (new Date(value) >= new Date(getMinDate())) || message,
    minNumber: (min) => (value) => (Number(value) >= min) || `Must be at least ${min}.`,
    password: (value) => (String(value).length >= 8) || 'Password must be at least 8 characters.',
    checked: (checked) => checked === true || 'Please check this box to continue.',
  };

  /**
   * Validate a single field element against an array of rule functions.
   * Applies/removes the `.has-error` / `.is-valid` classes and writes the
   * message into a sibling `.error-msg` element.
   */
  const validateField = (fieldEl, value, ruleList) => {
    const errorEl = fieldEl.querySelector('.error-msg');
    for (const rule of ruleList) {
      const result = rule(value);
      if (result !== true) {
        fieldEl.classList.add('has-error');
        fieldEl.classList.remove('is-valid');
        if (errorEl) errorEl.textContent = result;
        return false;
      }
    }
    fieldEl.classList.remove('has-error');
    fieldEl.classList.add('is-valid');
    if (errorEl) errorEl.textContent = '';
    return true;
  };

  const clearField = (fieldEl) => {
    fieldEl.classList.remove('has-error', 'is-valid');
    const errorEl = fieldEl.querySelector('.error-msg');
    if (errorEl) errorEl.textContent = '';
  };

  /**
   * Validate an entire form given a config map of { fieldName: { el, rules, getValue } }.
   * Returns true only if every field passes.
   */
  const validateForm = (fieldConfigs) => {
    let allValid = true;
    Object.values(fieldConfigs).forEach(({ el, rules: ruleList, getValue }) => {
      const value = getValue();
      const isValid = validateField(el, value, ruleList);
      if (!isValid) allValid = false;
    });
    return allValid;
  };

  /** Simple password strength score 0-4 used to drive the strength bar. */
  const passwordStrength = (value) => {
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  };

  return { rules, validateField, clearField, validateForm, passwordStrength };
})();

window.DR = window.DR || {};
window.DR.validation = DRValidation;
