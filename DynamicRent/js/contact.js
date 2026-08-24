/**
 * contact.js
 * Powers contact.html: loads FAQ data and validates/submits the
 * contact form (simulated — stored nowhere but shown as a success toast).
 */

(async () => {
  const { qs, escapeHTML } = window.DR.utils;
  const { fetchData, validation, ui } = window.DR;

  const faqList = qs('#contact-faq');
  if (faqList) {
    try {
      const faq = await fetchData.loadJSON('data/faq.json');
      faqList.innerHTML = faq.map((f) => `
        <details class="faq-item reveal">
          <summary><span>${escapeHTML(f.question)}</span><span class="plus"></span></summary>
          <div class="faq-answer">${escapeHTML(f.answer)}</div>
        </details>`).join('');
      ui.initFaqAccordion(document);
      try { window.DR.animations.initAll(); } catch (err) { console.error('animations init failed:', err); }
    } catch (err) {
      fetchData.renderErrorCard(faqList, 'FAQ could not be loaded right now.', () => window.location.reload());
    }
  }

  const form = qs('#contact-form');
  if (!form) return;

  const { rules } = validation;
  const fieldConfigs = {
    name: { el: qs('#c-field-name'), getValue: () => qs('#c-name').value, rules: [rules.required, rules.minLength(2)] },
    email: { el: qs('#c-field-email'), getValue: () => qs('#c-email').value, rules: [rules.required, rules.email] },
    subject: { el: qs('#c-field-subject'), getValue: () => qs('#c-subject').value, rules: [rules.required] },
    message: { el: qs('#c-field-message'), getValue: () => qs('#c-message').value, rules: [rules.required, rules.minLength(10)] },
  };

  Object.values(fieldConfigs).forEach(({ el, getValue, rules: ruleList }) => {
    const input = el.querySelector('input, select, textarea');
    input?.addEventListener('blur', () => validation.validateField(el, getValue(), ruleList));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validation.validateForm(fieldConfigs)) {
      ui.toast('Please fix the highlighted fields.', 'error');
      return;
    }
    const btn = qs('#contact-submit');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    setTimeout(() => {
      ui.toast('Message sent — we\u2019ll reply within a day.', 'success');
      form.reset();
      Object.values(fieldConfigs).forEach(({ el }) => validation.clearField(el));
      btn.disabled = false;
      btn.textContent = 'Send message';
    }, 700);
  });
})();
