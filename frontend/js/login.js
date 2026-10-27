/**
 * login.js
 * Powers login.html: validates the form, then logs in through the
 * backend API (auth.js) and redirects home on success.
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

  // login.html only has one login form, and every input already has its own
  // fixed id (l-email, l-password), so getElementById() can look each one up
  // directly instead of searching inside `el`.
  const fieldInputIds = { email: 'l-email', password: 'l-password' };
  for (const key in fieldConfigs) {
    const { el, getValue, rules: ruleList } = fieldConfigs[key];
    const input = document.getElementById(fieldInputIds[key]);
    if (input) {
      input.addEventListener('blur', () => validation.validateField(el, getValue(), ruleList));
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validation.validateForm(fieldConfigs)) {
      ui.toast('Please fix the highlighted fields.', 'error');
      return;
    }

    const submitBtn = qs('button[type="submit"]', form);
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    const rememberBox = qs('#l-remember');
    let remember = true;
    if (rememberBox) remember = rememberBox.checked;

    // the first request can take ~30s if the free server was asleep
    const result = await auth.login({
      email: qs('#l-email').value.trim(),
      password: qs('#l-password').value,
      remember,
    });

    if (!result.ok) {
      ui.toast(result.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }
    ui.toast(`Welcome back, ${result.user.name.split(' ')[0]}.`, 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 700);
  });
})();