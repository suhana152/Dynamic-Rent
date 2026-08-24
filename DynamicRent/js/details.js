/**
 * details.js
 * Powers details.html: loads the rental from ?id=, renders the gallery,
 * specs and policies, keeps the sticky booking widget's live price in
 * sync with date/demand changes, and shows related rentals.
 */

(async () => {
  const { qs, qsa, formatCurrency, toInputDate, getQueryParam, escapeHTML } = window.DR.utils;
  const { core, pricing, storage, ui } = window.DR;

  const root = qs('#details-root');
  if (!root) return;

  const id = getQueryParam('id');
  let listings;
  try {
    listings = await core.getListings();
  } catch (err) {
    const msg = window.location.protocol === 'file:'
      ? 'This page loads data with fetch(), which browsers block on file:// pages. Run a local server (see the banner above) and reload.'
      : 'We had trouble loading this rental. Check your connection and try again.';
    root.innerHTML = `<div class="empty-state"><h3>Couldn't load this page</h3><p>${msg}</p><a href="index.html" class="btn btn-primary">Back to home</a></div>`;
    return;
  }
  const listing = listings.find((l) => l.id === id) || listings[0];

  if (!listing) {
    root.innerHTML = '<div class="empty-state"><h3>Rental not found</h3><p>It may have been removed.</p><a href="browse.html" class="btn btn-primary">Browse rentals</a></div>';
    return;
  }

  storage.addRecentlyViewed(listing.id);
  document.title = `${listing.title} — DynamicRent`;

  // ---- Hero gallery (illustrated per-category, as a stand-in for real photography) ----
  const catIconPath = core.CATEGORY_ICONS[listing.category] || core.CATEGORY_ICONS.cars;
  const iconBadge = `<span class="cat-icon-badge">${core.iconSvg(catIconPath, 40)}</span>`;
  qs('#details-gallery').innerHTML = `
    <div class="cell g1"><div class="thumb-fill with-icon grad-${listing.gradient}">${iconBadge}</div></div>
    <div class="cell"><div class="thumb-fill with-icon grad-${listing.gradient}" style="filter:hue-rotate(12deg)">${iconBadge}</div></div>
    <div class="cell"><div class="thumb-fill with-icon grad-${listing.gradient}" style="filter:hue-rotate(-12deg)">${iconBadge}</div></div>
    <div class="cell"><div class="thumb-fill with-icon grad-${listing.gradient}" style="filter:brightness(1.08)">${iconBadge}</div></div>
    <div class="cell more" data-more="+4 photos"><div class="thumb-fill with-icon grad-${listing.gradient}" style="filter:brightness(0.85)">${iconBadge}</div></div>`;

  qs('#details-breadcrumb').innerHTML = `
    <a href="index.html">Home</a> <span>/</span>
    <a href="browse.html?category=${listing.category}">${core.categoryLabel(listing.category)}</a> <span>/</span>
    <span>${escapeHTML(listing.title)}</span>`;

  qs('#details-title').textContent = listing.title;
  qs('#details-location').textContent = listing.location;
  qs('#details-rating').innerHTML = `
    <span class="rating-star">${core.starIcon(16)}</span>
    <span class="rating-score">${listing.rating.toFixed(1)}</span>
    <span class="rating-divider"></span>
    <span class="rating-count">${listing.reviews} review${listing.reviews === 1 ? '' : 's'}</span>`;
  const featureList = listing.features.slice(0, 3).join(', ').toLowerCase();
  const longDescription = `${listing.shortDescription} Based in ${listing.location}, this ${core.categoryLabel(listing.category).toLowerCase()} rental comes with ${featureList}, and carries a ${listing.rating.toFixed(1)}-star average across ${listing.reviews} reviews. Pricing here follows the same transparent engine as every listing on DynamicRent — the live breakdown to the right reflects current demand, your exact dates, and any coupon you apply, recalculated the moment you change them.`;
  qs('#details-description').textContent = longDescription;

  qs('#details-badges').innerHTML = `
    <span class="tag">${core.categoryLabel(listing.category)}</span>
    ${listing.badge ? `<span class="tag">${escapeHTML(listing.badge)}</span>` : ''}
    <span class="tag">${pricing.getDemandInfo(listing.demandTier).label}</span>`;

  qs('#details-features').innerHTML = listing.features
    .map((f) => `<span class="feature-pill tag">${escapeHTML(f)}</span>`).join('');

  qs('#details-specs').innerHTML = Object.entries(listing.specifications)
    .map(([k, v]) => `<div class="spec-item"><div class="k">${escapeHTML(k)}</div><div class="v">${escapeHTML(String(v))}</div></div>`).join('');

  qs('#details-policies').innerHTML = listing.policies
    .map((p) => `<li>${core.iconSvg('<path d="M20 6 9 17l-5-5"/>', 16)} ${escapeHTML(p)}</li>`).join('');

  // ---- Reviews (illustrative, generated from the listing's own rating profile) ----
  const reviewAuthors = ['Elena R.', 'Marcus T.', 'Yuki S.', 'Noah B.'];
  const reviewLines = [
    'Exactly as described, and the price breakdown at checkout matched what I saw here.',
    'Smooth pickup, no surprises on the final charge.',
    'Would rent again — the demand pricing felt fair for the dates I chose.',
    'Great condition and the host was easy to reach.',
  ];
  qs('#details-reviews').innerHTML = reviewAuthors.map((name, i) => `
    <div class="review-item">
      <div class="person">
        <div class="avatar grad-${listing.gradient}">${name.charAt(0)}</div>
        <div><div class="name" style="font-weight:700">${name}</div><div class="loc muted" style="font-size:var(--fs-xs)">${'★'.repeat(5)}</div></div>
      </div>
      <p class="muted">${reviewLines[i]}</p>
    </div>`).join('');

  // ---- Related rentals: same category, excluding self ----
  const related = listings.filter((l) => l.category === listing.category && l.id !== listing.id).slice(0, 3);
  core.renderListingGrid(qs('#details-related'), related.length ? related : listings.filter((l) => l.id !== listing.id).slice(0, 3));

  // ---- Booking widget / live pricing ----
  const pickupInput = qs('#dw-pickup');
  const returnInput = qs('#dw-return');
  const demandDisplay = qs('#dw-demand');
  const priceAmount = qs('#dw-price-amount');
  const breakdownEl = qs('#dw-breakdown');
  const bookBtn = qs('#dw-book-btn');
  const favBtn = qs('#dw-fav-btn');

  const today = toInputDate(new Date());
  pickupInput.min = today;
  pickupInput.value = today;
  const plus3 = new Date();
  plus3.setDate(plus3.getDate() + 3);
  returnInput.min = today;
  returnInput.value = toInputDate(plus3);

  const demandInfo = pricing.getDemandInfo(listing.demandTier);
  demandDisplay.textContent = demandInfo.label;
  demandDisplay.className = `tag demand-badge tier-${listing.demandTier}`;

  const updateWidgetPrice = () => {
    if (returnInput.value <= pickupInput.value) {
      returnInput.value = toInputDate(new Date(new Date(pickupInput.value).getTime() + 86400000));
    }
    returnInput.min = pickupInput.value;

    const result = pricing.calculate({
      basePrice: listing.basePrice,
      demandTier: listing.demandTier,
      startDate: pickupInput.value,
      endDate: returnInput.value,
    });

    priceAmount.innerHTML = `${formatCurrency(result.finalTotal)} <span class="unit">for ${result.days} day${result.days > 1 ? 's' : ''}</span>`;
    priceAmount.classList.remove('price-tick');
    void priceAmount.offsetWidth;
    priceAmount.classList.add('price-tick');

    breakdownEl.innerHTML = result.steps.map((s) => `
      <div class="row ${s.type}">
        <span>${s.label}</span>
        <span class="val">${s.amount < 0 ? '-' : (s.type === 'charge' ? '+' : '')}${formatCurrency(Math.abs(s.amount))}</span>
      </div>`).join('') + `<div class="row total"><span>Total</span><span class="val">${formatCurrency(result.finalTotal)}</span></div>`;
  };

  [pickupInput, returnInput].forEach((el) => el.addEventListener('change', () => {
    updateWidgetPrice();
    if (typeof checkPriceWatch === 'function') checkPriceWatch();
  }));
  updateWidgetPrice();

  bookBtn.addEventListener('click', () => {
    window.location.href = `booking.html?id=${listing.id}&pickup=${pickupInput.value}&return=${returnInput.value}`;
  });

  const isFav = storage.isFavorite(listing.id);
  favBtn.classList.toggle('is-active', isFav);
  favBtn.setAttribute('aria-pressed', isFav);
  favBtn.innerHTML = core.heartIcon(18);
  favBtn.addEventListener('click', () => {
    const nowFav = storage.toggleFavorite(listing.id);
    favBtn.classList.toggle('is-active', nowFav);
    favBtn.setAttribute('aria-pressed', nowFav);
    ui.toast(nowFav ? 'Added to favorites' : 'Removed from favorites', 'success', 2200);
  });

  // ---- USP: Price Forecast Calendar — 30 days, computed live by the same engine ----
  const calendarEl = qs('#price-calendar');
  const renderPriceCalendar = () => {
    const cells = [];
    for (let i = 0; i < 30; i += 1) {
      const start = new Date();
      start.setDate(start.getDate() + i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const dayResult = pricing.calculate({
        basePrice: listing.basePrice,
        demandTier: listing.demandTier,
        startDate: toInputDate(start),
        endDate: toInputDate(end),
      });
      const ratio = dayResult.finalTotal / listing.basePrice;
      const tier = ratio < 0.98 ? 'low' : ratio <= 1.15 ? 'medium' : 'high';
      const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const iso = toInputDate(start);
      cells.push(`
        <button type="button" class="pc-day tier-${tier}" data-date="${iso}" title="${formatCurrency(dayResult.finalTotal)} on ${label}">
          <span class="pc-date">${label}</span>
          <span class="pc-price">${formatCurrency(dayResult.finalTotal).replace(/\.00$/, '')}</span>
        </button>`);
    }
    calendarEl.innerHTML = cells.join('');

    qsa('.pc-day', calendarEl).forEach((cell) => {
      cell.addEventListener('click', () => {
        qsa('.pc-day', calendarEl).forEach((c) => c.classList.remove('is-selected'));
        cell.classList.add('is-selected');
        pickupInput.value = cell.dataset.date;
        const next = new Date(cell.dataset.date);
        next.setDate(next.getDate() + 1);
        returnInput.value = toInputDate(next);
        updateWidgetPrice();
        qs('#price-calendar-hint').textContent = `Pickup set to ${new Date(cell.dataset.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`;
        checkPriceWatch();
      });
    });
  };
  renderPriceCalendar();

  // ---- USP: Price Watch — set a target nightly price, checked live in-browser ----
  const watchForm = qs('#price-watch-form');
  const watchTargetInput = qs('#pw-target');
  const watchStatusEl = qs('#price-watch-status');

  const checkPriceWatch = () => {
    const watch = storage.getPriceWatch(listing.id);
    if (!watch) { watchStatusEl.innerHTML = ''; return; }
    watchTargetInput.value = watch.targetPrice;
    const currentNightly = pricing.calculate({
      basePrice: listing.basePrice,
      demandTier: listing.demandTier,
      startDate: pickupInput.value,
      endDate: toInputDate(new Date(new Date(pickupInput.value).getTime() + 86400000)),
    }).finalTotal;

    if (currentNightly <= watch.targetPrice) {
      watchStatusEl.innerHTML = `
        <div class="watch-banner">
          ${core.iconSvg('<path d="M20 6 9 17l-5-5"/>', 16)}
          Met! Tonight's rate is ${formatCurrency(currentNightly)} — at or under your ${formatCurrency(watch.targetPrice)} target.
        </div>`;
    } else {
      watchStatusEl.innerHTML = `
        <div class="watch-banner pending">
          ${core.iconSvg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>', 16)}
          Watching — current rate is ${formatCurrency(currentNightly)}, above your ${formatCurrency(watch.targetPrice)} target. Check back anytime.
        </div>`;
    }
  };
  checkPriceWatch();

  watchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const target = Number(watchTargetInput.value);
    if (!target || target <= 0) {
      ui.toast('Enter a target price greater than 0.', 'error');
      return;
    }
    storage.addPriceWatch({ listingId: listing.id, listingTitle: listing.title, targetPrice: target, createdAt: new Date().toISOString() });
    ui.toast('Price watch set — we\u2019ll flag it here whenever it\u2019s true.', 'success');
    checkPriceWatch();
  });

  try { window.DR.animations.initAll(); } catch (err) { console.error('animations init failed:', err); }
})();
