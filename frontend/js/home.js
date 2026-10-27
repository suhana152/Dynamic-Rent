/**
 * home.js
 * Powers index.html: featured rentals, popular destinations, animated
 * stats, testimonials, dynamic pricing preview, FAQ, and the search bar.
 *
 * Each section below is wrapped in its own try/catch. Sections are
 * independent — a failure rendering, say, the testimonials strip must
 * never blank out the featured rentals grid that already rendered
 * successfully. Only a failure to fetch the underlying data shows the
 * shared error state.
 */

(async () => {
  const { qs, qsa, formatCurrency, toInputDate, escapeHTML } = window.DR.utils;
  const { core, pricing, fetchData, storage, ui } = window.DR;

  const featuredGrid = qs('#featured-grid');
  if (!featuredGrid) return; // not on the home page

  fetchData.renderSkeletons(featuredGrid, 6);

  let listings; let featured; let testimonials; let faq; let categories;
  try {
    [listings, featured, testimonials, faq, categories] = await fetchData.loadMany([
      'data/listings.json', 'data/featured.json', 'data/testimonials.json', 'data/faq.json', 'data/categories.json',
    ]);
  } catch (err) {
    const msg = window.location.protocol === 'file:'
      ? 'This page loads data with fetch(), which browsers block on file:// pages. Run a local server (see the banner above) and reload.'
      : 'We had trouble loading featured rentals. Check your connection and try again.';
    fetchData.renderErrorCard(featuredGrid, msg, () => window.location.reload());
    return;
  }

  // ---- Featured rentals ----
  try {
    const featuredListings = featured.featuredIds.map((id) => listings.find((l) => l.id === id)).filter(Boolean);
    core.renderListingGrid(featuredGrid, featuredListings);
  } catch (err) { console.error('[home] featured rentals failed to render:', err); }

  // ---- Category chips + hero category select ----
  try {
    const chipsRow = qs('#home-chips');
    if (chipsRow) {
      chipsRow.innerHTML = categories.slice(0, 10).map((c) => `<a class="chip" href="browse.html?category=${c.id}">${c.name}</a>`).join('');
    }
    const heroCategorySelect = qs('#hero-category');
    if (heroCategorySelect) {
      heroCategorySelect.innerHTML = '<option value="">Any category</option>'
        + categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
      window.DR.dropdown.enhance(heroCategorySelect);
    }
  } catch (err) { console.error('[home] category chips failed to render:', err); }

  // ---- Recently viewed (localStorage) ----
  try {
    const recentIds = storage.getRecentlyViewed();
    if (recentIds.length) {
      const recentSection = qs('#recently-viewed-section');
      const recentGrid = qs('#recently-viewed-grid');
      const recentListings = recentIds.map((id) => listings.find((l) => l.id === id)).filter(Boolean);
      if (recentListings.length && recentSection && recentGrid) {
        recentSection.style.display = '';
        core.renderListingGrid(recentGrid, recentListings);
      }
    }
  } catch (err) { console.error('[home] recently viewed failed to render:', err); }

  // ---- Live price ticker: real computed prices, scrolling marquee ----
  try {
    const tickerTrack = qs('#price-ticker-track');
    if (tickerTrack) {
      const sample = [...listings].sort((a, b) => b.rating - a.rating).slice(0, 14);
      const items = sample.map((l) => {
        const today = toInputDate(new Date());
        const in4 = toInputDate(new Date(Date.now() + 4 * 86400000));
        const result = pricing.calculate({ basePrice: l.basePrice, demandTier: l.demandTier, startDate: today, endDate: in4 });
        const trendUp = result.finalTotal >= l.basePrice * 4;
        return `
          <span class="ticker-item">
            <span class="ticker-dot tier-${l.demandTier}"></span>
            ${escapeHTML(l.title)}
            <strong>${formatCurrency(result.finalTotal / 4)}/day</strong>
            <span class="ticker-trend ${trendUp ? 'up' : 'down'}">${trendUp ? '▲' : '▼'}</span>
          </span>`;
      }).join('<span class="ticker-sep">·</span>');
      // Duplicated once for a seamless CSS loop.
      tickerTrack.innerHTML = items + '<span class="ticker-sep">·</span>' + items;
    }
  } catch (err) { console.error('[home] price ticker failed to render:', err); }

  // ---- Recommended For You: a real scoring engine built from favorites + view history ----
  try {
    const favIds = storage.getFavorites();
    const viewedIds = storage.getRecentlyViewed();
    const seedIds = [...new Set([...favIds, ...viewedIds])];
    const recSection = qs('#recommended-section');
    const recGrid = qs('#recommended-grid');

    if (seedIds.length && recSection && recGrid) {
      const seedListings = seedIds.map((id) => listings.find((l) => l.id === id)).filter(Boolean);

      // Category affinity: how many times each category shows up in what you've favorited/viewed.
      const categoryScores = seedListings.reduce((scores, l) => {
        scores[l.category] = (scores[l.category] || 0) + 1;
        return scores;
      }, {});

      // Price affinity: how close a listing's price sits to the average of what you've engaged with.
      const avgPrice = seedListings.reduce((sum, l) => sum + l.basePrice, 0) / seedListings.length;
      const maxPriceSpread = Math.max(...listings.map((l) => Math.abs(l.basePrice - avgPrice)), 1);

      const scored = listings
        .filter((l) => !seedIds.includes(l.id))
        .map((l) => {
          const categoryScore = categoryScores[l.category] || 0;
          const priceScore = 1 - Math.abs(l.basePrice - avgPrice) / maxPriceSpread;
          const ratingScore = l.rating / 5;
          return { listing: l, score: categoryScore * 3 + priceScore * 1.4 + ratingScore * 0.8 };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((s) => s.listing);

      if (scored.length) {
        const topCategory = Object.entries(categoryScores).sort((a, b) => b[1] - a[1])[0]?.[0];
        qs('#recommended-subhead').textContent = topCategory
          ? `Weighted toward ${core.categoryLabel(topCategory).toLowerCase()} and rentals near your usual price range — computed live from your favorites and recently viewed, nothing sent to a server.`
          : 'Computed live from your favorites and recently viewed, nothing sent to a server.';
        recSection.style.display = '';
        core.renderListingGrid(recGrid, scored);
      }
    }
  } catch (err) { console.error('[home] recommendation engine failed:', err); }

  // ---- Popular destinations ----
  try {
    const destGrid = qs('#destinations-grid');
    if (destGrid) {
      destGrid.innerHTML = featured.destinations.map((d) => `
        <a class="dest-card reveal-scale" href="browse.html?q=${encodeURIComponent(d.name)}">
          <img class="dest-img" src="${d.image}" alt="${escapeHTML(d.name)}" loading="lazy">
          <div class="overlay">
            <h4>${escapeHTML(d.name)}</h4>
            <span>${escapeHTML(d.country)} · ${d.listingCount} rentals</span>
          </div>
        </a>`).join('');
    }
  } catch (err) { console.error('[home] destinations failed to render:', err); }

  // ---- Stats ----
  try {
    const statsGrid = qs('#stats-grid');
    if (statsGrid) {
      statsGrid.innerHTML = featured.stats.map((s) => `
        <div class="stat-item">
          <div class="num"><span data-counter data-target="${s.value}" data-suffix="${s.suffix}">0</span></div>
          <div class="lbl">${escapeHTML(s.label)}</div>
        </div>`).join('');
    }
  } catch (err) { console.error('[home] stats failed to render:', err); }

  // ---- Testimonials ----
  try {
    const testimonialScroller = qs('#testimonial-scroller');
    if (testimonialScroller) {
      const avatarGrads = ['sage-sand', 'dustyblue-sand', 'coral-sand', 'olive-sand', 'ocean-sand', 'terracotta-sand'];
      testimonialScroller.innerHTML = testimonials.map((t, i) => `
        <div class="testimonial-card reveal">
          <div class="stars">${'★'.repeat(Math.round(t.rating))}${'☆'.repeat(5 - Math.round(t.rating))}</div>
          <p class="quote">"${escapeHTML(t.quote)}"</p>
          <div class="person">
            <div class="avatar grad-${avatarGrads[i % avatarGrads.length]}">${t.name.charAt(0)}</div>
            <div>
              <div class="name">${escapeHTML(t.name)}</div>
              <div class="loc">${escapeHTML(t.location)}</div>
            </div>
          </div>
        </div>`).join('');
    }
  } catch (err) { console.error('[home] testimonials failed to render:', err); }

  // ---- FAQ ----
  try {
    const faqList = qs('#home-faq');
    if (faqList) {
      faqList.innerHTML = faq.slice(0, 6).map((f, i) => `
        <details class="faq-item reveal" ${i === 0 ? 'open' : ''}>
          <summary><span>${escapeHTML(f.question)}</span><span class="plus"></span></summary>
          <div class="faq-answer">${escapeHTML(f.answer)}</div>
        </details>`).join('');
      ui.initFaqAccordion(document);
    }
  } catch (err) { console.error('[home] FAQ failed to render:', err); }

  // ---- Dynamic pricing preview card (live-updating demo ticker) ----
  try {
    const previewListing = listings.find((l) => l.id === 'l15') || listings[0];
    const previewAmount = qs('#pricing-preview-amount');
    const previewMeta = qs('#pricing-preview-meta');
    if (previewAmount && previewListing) {
      const scenarios = [
        { label: 'Booked 3 weeks ahead', leadDays: 21 },
        { label: 'Weekend getaway', leadDays: 9 },
        { label: 'Booked last minute', leadDays: 1 },
      ];
      let idx = 0;
      const renderScenario = () => {
        const s = scenarios[idx];
        const start = new Date();
        start.setDate(start.getDate() + s.leadDays);
        const end = new Date(start);
        end.setDate(end.getDate() + 4);
        const result = pricing.calculate({
          basePrice: previewListing.basePrice,
          demandTier: previewListing.demandTier,
          startDate: toInputDate(start),
          endDate: toInputDate(end),
        });
        previewAmount.textContent = formatCurrency(result.finalTotal);
        previewAmount.classList.remove('price-tick');
        void previewAmount.offsetWidth;
        previewAmount.classList.add('price-tick');
        previewMeta.textContent = `${previewListing.title} · ${s.label}`;
        idx = (idx + 1) % scenarios.length;
      };
      renderScenario();
      setInterval(renderScenario, 3200);
    }
  } catch (err) { console.error('[home] pricing preview failed to render:', err); }

  // ---- Hero search -> browse.html ----
  try {
    const heroSearchForm = qs('#hero-search-form');
    const heroCategorySelect = qs('#hero-category');
    const heroWhenInput = qs('#hero-when');
    const todayISO = toInputDate(new Date());
    if (heroWhenInput) heroWhenInput.min = todayISO;

    heroSearchForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const term = qs('#hero-search-input').value.trim();
      const category = heroCategorySelect ? heroCategorySelect.value : '';
      const pickup = heroWhenInput ? heroWhenInput.value : '';
      if (term) storage.addRecentSearch(term);
      if (pickup) {
        // Carries the chosen date forward so it's already set if this rental gets booked later.
        const existingDraft = storage.getDraftBooking() || {};
        storage.setDraftBooking({ ...existingDraft, pickup });
      }
      const params = new URLSearchParams();
      if (term) params.set('q', term);
      if (category) params.set('category', category);
      if (pickup) params.set('pickup', pickup);
      window.location.href = `browse.html?${params.toString()}`;
    });
  } catch (err) { console.error('[home] hero search wiring failed:', err); }

  // ---- Scroll reveals / counters (never let this blank out content above) ----
  try {
    window.DR.animations.initAll();
  } catch (err) { console.error('[home] animations init failed:', err); }

  // ---- Newsletter form ----
  const newsletterForm = qs('#newsletter-form');
  newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = qs('#newsletter-email');
    if (!window.DR.utils.isValidEmail(emailInput.value)) {
      ui.toast('Enter a valid email to subscribe.', 'error');
      return;
    }
    const prefs = storage.getPreferences();
    storage.setPreferences({ ...prefs, newsletter: true });
    ui.toast('Subscribed! Welcome to DynamicRent.', 'success');
    newsletterForm.reset();
  });
})();
