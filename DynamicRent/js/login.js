/**
 * login.js
 * Powers login.html: validates credentials against localStorage user
 * records via auth.js and redirects home on success.
 */

(() => {
  const { qs } = window.DR.utils;
  const { validation, auth, ui } = window.DR;

  const form = qs('#login-form');
  if (!form) return;

  const notice = qs('#login-loggedin-notice');
  if (notice && auth.isLoggedIn()) {
    notice.style.display = 'inline-flex';
  }

  const { rules } = validation;
  const fieldConfigs = {
    email: { el: qs('#l-field-email'), getValue: () => qs('#l-email').value, rules: [rules.required, rules.email] },
    password: { el: qs('#l-field-password'), getValue: () => qs('#l-password').value, rules: [rules.required] },
  };

  Object.values(fieldConfigs).forEach(({ el, getValue, rules: ruleList }) => {
    const input = el.querySelector('input');
    input?.addEventListener('blur', () => validation.validateField(el, getValue(), ruleList));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validation.validateForm(fieldConfigs)) {
      ui.toast('Please fix the highlighted fields.', 'error');
      return;
    }
    const remember = qs('#l-remember')?.checked ?? true;
    const result = auth.login({ email: qs('#l-email').value.trim(), password: qs('#l-password').value, remember });
    if (!result.ok) {
      ui.toast(result.message, 'error');
      return;
    }
    ui.toast(`Welcome back, ${result.user.name.split(' ')[0]}.`, 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 700);
  });
})();
