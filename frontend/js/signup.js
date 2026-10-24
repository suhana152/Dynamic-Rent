/**
 * signup.js
 * Powers signup.html: validates the new-account form, checks password
 * strength, and creates a localStorage user record via auth.js.
 */

(() => {
  const { qs } = window.DR.utils;
  const { validation, auth, ui } = window.DR;

  const form = qs('#signup-form');
  if (!form) return;

  const { rules } = validation;
  const passwordInput = qs('#s-password');
  const strengthBar = qs('#s-strength-bar');

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      const score = validation.passwordStrength(passwordInput.value);
      const pct = (score / 4) * 100;
      const colors = ['var(--c-error)', 'var(--c-error)', 'var(--c-warning)', 'var(--c-sage)', 'var(--c-success)'];
      if (strengthBar) {
        strengthBar.style.width = `${pct}%`;
        strengthBar.style.background = colors[score];
      }
    });
  }

  const fieldConfigs = {
    name: { el: qs('#s-field-name'), getValue: () => qs('#s-name').value, rules: [rules.required, rules.minLength(2)] },
    email: { el: qs('#s-field-email'), getValue: () => qs('#s-email').value, rules: [rules.required, rules.email] },
    phone: { el: qs('#s-field-phone'), getValue: () => qs('#s-phone').value, rules: [rules.required, rules.phone] },
    password: { el: qs('#s-field-password'), getValue: () => qs('#s-password').value, rules: [rules.required, rules.password] },
    confirm: {
      el: qs('#s-field-confirm'),
      getValue: () => qs('#s-confirm').value,
      rules: [rules.required, rules.matches(() => qs('#s-password').value, 'Passwords do not match.')],
    },
    terms: { el: qs('#s-field-terms'), getValue: () => qs('#s-terms').checked, rules: [rules.checked] },
  };

  // signup.html only has one signup form, and every input already has its
  // own fixed id (s-name, s-email, s-phone, s-password, s-confirm, s-terms),
  // so getElementById() can look each one up directly.
  const fieldInputIds = {
    name: 's-name', email: 's-email', phone: 's-phone',
    password: 's-password', confirm: 's-confirm', terms: 's-terms',
  };
  for (const key in fieldConfigs) {
    const { el, getValue, rules: ruleList } = fieldConfigs[key];
    const input = document.getElementById(fieldInputIds[key]);
    if (input) {
      input.addEventListener('blur', () => validation.validateField(el, getValue(), ruleList));
      input.addEventListener('change', () => validation.validateField(el, getValue(), ruleList));
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validation.validateForm(fieldConfigs)) {
      ui.toast('Please fix the highlighted fields.', 'error');
      return;
    }
    const result = auth.signup({
      name: qs('#s-name').value.trim(),
      email: qs('#s-email').value.trim(),
      phone: qs('#s-phone').value.trim(),
      password: qs('#s-password').value,
    });
    if (!result.ok) {
      ui.toast(result.message, 'error');
      return;
    }
    ui.toast(`Welcome to DynamicRent, ${result.user.name.split(' ')[0]}.`, 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 700);
  });
})();
