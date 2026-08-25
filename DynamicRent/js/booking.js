/**
 * booking.js
 * Powers booking.html: populates the rental dropdown, keeps the booking
 * summary in sync with every field change, saves an in-progress draft to
 * sessionStorage so a refresh doesn't lose the form, validates every
 * field (including the demo card fields), runs the simulated payment
 * gateway with async/await, and persists the confirmed booking.
 */

(async () => {
  const { qs, qsa, formatCurrency, toInputDate, getQueryParam, uid } = window.DR.utils;
  const { core, pricing, validation, storage, ui, payment } = window.DR;

  const form = qs('#booking-form');
  if (!form) return; // not on the booking page

  const rentalSelect = qs('#f-rental');
  const pickupInput = qs('#f-pickup');
  const returnInput = qs('#f-return');
  const quantityInput = qs('#f-quantity');
  const demandSelect = qs('#f-demand');
  const couponInput = qs('#f-coupon');
  const couponMsg = qs('#coupon-msg');
  const summaryEl = qs('#booking-summary');
  const submitBtn = qs('#booking-submit');
  const nameInput = qs('#f-name');
  const emailInput = qs('#f-email');
  const phoneInput = qs('#f-phone');
  const notesInput = qs('#f-notes');
  const cardNameInput = qs('#f-card-name');
  const cardNumberInput = qs('#f-card-number');
  const cardExpiryInput = qs('#f-card-expiry');
  const cardCvcInput = qs('#f-card-cvc');

  const listings = await core.getListings().catch(() => {
    const msg = window.location.protocol === 'file:'
      ? 'This page loads data with fetch(), which browsers block on file:// pages. Run a local server (see the banner above) and reload.'
      : 'We had trouble loading rentals. Check your connection and try again.';
    form.innerHTML = `<div class="empty-state"><h3>Couldn't load rentals</h3><p>${msg}</p></div>`;
    return null;
  });
  if (!listings) return;
  rentalSelect.innerHTML = '<option value="">Select a rental...</option>'
    + listings.map((l) => `<option value="${l.id}">${l.title} — ${l.location}</option>`).join('');
  window.DR.dropdown.enhance(rentalSelect);

  // ---- Restore an in-progress draft (sessionStorage), or prefill from a preset / logged-in user ----
  const draft = storage.getDraftBooking();
  const presetId = getQueryParam('id');
  const currentUser = window.DR.auth?.currentUser();

  if (draft) {
    rentalSelect.value = draft.rentalId || '';
    pickupInput.value = draft.pickup || '';
    returnInput.value = draft.ret || '';
    quantityInput.value = draft.quantity || 1;
    demandSelect.value = draft.demand || '';
    couponInput.value = draft.coupon || '';
    nameInput.value = draft.name || '';
    emailInput.value = draft.email || '';
    phoneInput.value = draft.phone || '';
    notesInput.value = draft.notes || '';
  } else if (presetId && listings.some((l) => l.id === presetId)) {
    rentalSelect.value = presetId;
  }
  if (currentUser) {
    nameInput.value = nameInput.value || currentUser.name;
    emailInput.value = emailInput.value || currentUser.email;
    phoneInput.value = phoneInput.value || currentUser.phone || '';
  }
  // Re-sync both custom dropdowns now that their values may have been set
  // programmatically above (draft restore / URL preset), which doesn't
  // fire a 'change' event on its own.
  window.DR.dropdown.enhance(rentalSelect);
  window.DR.dropdown.enhance(demandSelect);

  const today = toInputDate(new Date());
  pickupInput.min = today;
  pickupInput.value = pickupInput.value || today;
  if (!returnInput.value) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    returnInput.value = toInputDate(tomorrow);
  }
  returnInput.min = pickupInput.value;

  // Preset pickup/return coming from the details page's "Book now" link
  const presetPickup = getQueryParam('pickup');
  const presetReturn = getQueryParam('return');
  if (!draft && presetPickup) pickupInput.value = presetPickup;
  if (!draft && presetReturn) returnInput.value = presetReturn;

  const getSelectedListing = () => listings.find((l) => l.id === rentalSelect.value);

  // ---- Persist a draft on every change so a refresh doesn't lose progress ----
  const saveDraft = () => {
    storage.setDraftBooking({
      rentalId: rentalSelect.value,
      pickup: pickupInput.value,
      ret: returnInput.value,
      quantity: quantityInput.value,
      demand: demandSelect.value,
      coupon: couponInput.value,
      name: nameInput.value,
      email: emailInput.value,
      phone: phoneInput.value,
      notes: notesInput.value,
    });
  };

  const updateSummary = () => {
    const listing = getSelectedListing();
    if (!listing || !pickupInput.value || !returnInput.value || returnInput.value <= pickupInput.value) {
      summaryEl.innerHTML = `<p class="muted">Choose a rental and valid dates to see your live price.</p>`;
      return;
    }

    const demandTier = demandSelect && demandSelect.value ? demandSelect.value : listing.demandTier;
    const quantity = Math.max(parseInt(quantityInput.value, 10) || 1, 1);
    const result = pricing.calculate({
      basePrice: listing.basePrice,
      demandTier,
      startDate: pickupInput.value,
      endDate: returnInput.value,
      couponCode: couponInput.value,
    });

    if (couponInput.value) {
      if (result.couponValid === false) {
        couponMsg.textContent = 'That code isn\u2019t valid or has expired.';
        couponMsg.style.color = 'var(--c-error)';
      } else {
        couponMsg.textContent = `Applied: ${result.couponApplied.label}`;
        couponMsg.style.color = 'var(--c-success)';
      }
    } else {
      couponMsg.textContent = '';
    }

    const finalTotal = result.finalTotal * quantity;

    summaryEl.innerHTML = `
      <h4>${listing.title}</h4>
      <p class="muted" style="margin-top:2px">${listing.location} · ${result.days} day${result.days > 1 ? 's' : ''}${quantity > 1 ? ` · x${quantity}` : ''}</p>
      <div class="breakdown-list">
        ${result.steps.map((s) => `
          <div class="row ${s.type}">
            <span>${s.label}</span>
            <span class="val">${s.amount < 0 ? '-' : (s.type === 'charge' ? '+' : '')}${formatCurrency(Math.abs(s.amount))}</span>
          </div>`).join('')}
        ${quantity > 1 ? `<div class="row"><span>Quantity x${quantity}</span><span class="val"></span></div>` : ''}
        <div class="row total price-tick"><span>Total due</span><span class="val">${formatCurrency(finalTotal)}</span></div>
      </div>
      <div class="split-toggle">
        <label for="split-people">Split evenly between</label>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" id="split-people" min="1" max="12" value="1" style="width:64px">
          <span class="muted" style="font-size:var(--fs-sm)">people</span>
        </div>
        <p class="muted" id="split-result" style="font-size:var(--fs-sm);margin-top:6px"></p>
      </div>`;

    const splitInput = qs('#split-people', summaryEl);
    const splitResult = qs('#split-result', summaryEl);
    const updateSplit = () => {
      const n = Math.max(parseInt(splitInput.value, 10) || 1, 1);
      splitResult.textContent = n > 1 ? `${formatCurrency(finalTotal / n)} per person` : '';
    };
    splitInput?.addEventListener('input', updateSplit);
    updateSplit();
  };

  [rentalSelect, pickupInput, returnInput, quantityInput, demandSelect, couponInput, nameInput, emailInput, phoneInput, notesInput].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', () => {
      if (el === pickupInput) returnInput.min = pickupInput.value;
      updateSummary();
      saveDraft();
    });
    el.addEventListener('change', () => { updateSummary(); saveDraft(); });
  });
  updateSummary();

  // ---- Card field formatting helpers ----
  cardNumberInput?.addEventListener('input', () => {
    cardNumberInput.value = payment.formatCardNumber(cardNumberInput.value);
  });
  cardExpiryInput?.addEventListener('input', () => {
    let v = cardExpiryInput.value.replace(/[^\d]/g, '').slice(0, 4);
    if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
    cardExpiryInput.value = v;
  });
  cardCvcInput?.addEventListener('input', () => {
    cardCvcInput.value = cardCvcInput.value.replace(/[^\d]/g, '').slice(0, 4);
  });

  // ---- Validation config ----
  const { rules } = validation;
  const fieldConfigs = {
    fullName: { el: qs('#field-name'), getValue: () => nameInput.value, rules: [rules.required, rules.minLength(2)] },
    email: { el: qs('#field-email'), getValue: () => emailInput.value, rules: [rules.required, rules.email] },
    phone: { el: qs('#field-phone'), getValue: () => phoneInput.value, rules: [rules.required, rules.phone] },
    rental: { el: qs('#field-rental'), getValue: () => rentalSelect.value, rules: [rules.required] },
    pickup: { el: qs('#field-pickup'), getValue: () => pickupInput.value, rules: [rules.required, rules.date] },
    ret: {
      el: qs('#field-return'),
      getValue: () => returnInput.value,
      rules: [rules.required, rules.date, rules.afterDate(() => pickupInput.value, 'Return date must be after pickup.')],
    },
    quantity: { el: qs('#field-quantity'), getValue: () => quantityInput.value, rules: [rules.required, rules.minNumber(1)] },
    cardName: { el: qs('#field-card-name'), getValue: () => cardNameInput.value, rules: [rules.required, rules.minLength(2)] },
    cardNumber: {
      el: qs('#field-card-number'),
      getValue: () => cardNumberInput.value,
      rules: [rules.required, (v) => payment.luhnValid(v) || 'Enter a valid card number.'],
    },
    cardExpiry: {
      el: qs('#field-card-expiry'),
      getValue: () => cardExpiryInput.value,
      rules: [rules.required, (v) => payment.expiryValid(v) || 'Enter a valid, unexpired MM/YY.'],
    },
    cardCvc: {
      el: qs('#field-card-cvc'),
      getValue: () => cardCvcInput.value,
      rules: [rules.required, (v) => payment.cvcValid(v, payment.detectBrand(cardNumberInput.value)) || 'Enter a valid security code.'],
    },
  };

  Object.values(fieldConfigs).forEach(({ el, getValue, rules: ruleList }) => {
    const input = el.querySelector('input, select, textarea');
    input?.addEventListener('blur', () => validation.validateField(el, getValue(), ruleList));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isValid = validation.validateForm(fieldConfigs);
    if (!isValid) {
      ui.toast('Please fix the highlighted fields.', 'error');
      form.querySelector('.has-error input, .has-error select')?.focus();
      return;
    }

    const listing = getSelectedListing();
    const demandTier = demandSelect && demandSelect.value ? demandSelect.value : listing.demandTier;
    const quantity = Math.max(parseInt(quantityInput.value, 10) || 1, 1);
    const result = pricing.calculate({
      basePrice: listing.basePrice,
      demandTier,
      startDate: pickupInput.value,
      endDate: returnInput.value,
      couponCode: couponInput.value,
    });
    const finalTotal = result.finalTotal * quantity;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="dot-pulse">Processing payment...</span>`;

    // ---- Real async/await flow against the simulated gateway ----
    const paymentResult = await payment.processPayment({
      cardNumber: cardNumberInput.value,
      expiry: cardExpiryInput.value,
      cvc: cardCvcInput.value,
      amount: finalTotal,
    });

    if (!paymentResult.ok) {
      ui.toast(paymentResult.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm and pay';
      return;
    }

    const booking = {
      id: uid('booking'),
      listingId: listing.id,
      listingTitle: listing.title,
      listingLocation: listing.location,
      listingGradient: listing.gradient,
      listingImage: listing.image,
      fullName: nameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      pickupDate: pickupInput.value,
      returnDate: returnInput.value,
      quantity,
      couponCode: couponInput.value.trim() || null,
      notes: notesInput.value.trim(),
      total: finalTotal,
      status: 'confirmed',
      payment: { brand: paymentResult.brand, last4: paymentResult.last4, transactionId: paymentResult.transactionId },
      createdAt: new Date().toISOString(),
    };

    storage.addBooking(booking);
    storage.clearDraftBooking();

    ui.openModal(`
      <div class="text-center">
        <div class="icon-wrap" style="margin:0 auto var(--sp-md); width:64px;height:64px;border-radius:50%;background:var(--c-sage);display:flex;align-items:center;justify-content:center;color:#fff;">
          ${core.iconSvg('<path d="M20 6 9 17l-5-5"/>', 28)}
        </div>
        <h3>Booking confirmed</h3>
        <p class="muted" style="margin-top:8px">${listing.title} is booked for ${result.days} day${result.days > 1 ? 's' : ''}, total ${formatCurrency(finalTotal)}. Charged to ${paymentResult.brand} ending ${paymentResult.last4}. Confirmation #${paymentResult.transactionId}.</p>
        <div class="hero-actions" style="justify-content:center;margin-top:var(--sp-lg)">
          <a href="my-bookings.html" class="btn btn-primary">View my bookings</a>
          <a href="index.html" class="btn btn-outline">Back to home</a>
        </div>
      </div>`, { title: 'You\u2019re all set' });

    form.reset();
    window.DR.dropdown.enhance(rentalSelect);
    window.DR.dropdown.enhance(demandSelect);
    Object.values(fieldConfigs).forEach(({ el }) => validation.clearField(el));
    updateSummary();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm and pay';
  });
})();
