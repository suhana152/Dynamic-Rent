/**
 * browse.js
 * Powers browse.html: search, category/demand filters, sorting, and
 * keeping the URL / recent-searches in sync.
 */

(async () => {
  const { qs, qsa, debounce, getQueryParam, escapeHTML } = window.DR.utils;
  const { core, storage, ui } = window.DR;

  const grid = qs('#browse-grid');
  if (!grid) return;

  const searchInput = qs('#browse-search');
  const categorySelect = qs('#browse-category');
  const demandSelect = qs('#browse-demand');
  const sortSelect = qs('#browse-sort');
  const resultsMeta = qs('#browse-results-meta');
  const chipsRow = qs('#browse-chips');

  window.DR.fetchData.renderSkeletons(grid, 8);
  let listings; let categories;
  try {
    [listings, categories] = await window.DR.fetchData.loadMany(['data/listings.json', 'data/categories.json']);
  } catch (err) {
    const msg = window.location.protocol === 'file:'
      ? 'This page loads data with fetch(), which browsers block on file:// pages. Run a local server (see the banner above) and reload.'
      : 'We had trouble loading rentals. Check your connection and try again.';
    window.DR.fetchData.renderErrorCard(grid, msg, () => window.location.reload());
    return;
  }

  categorySelect.innerHTML = '<option value="">All categories</option>'
    + categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
  window.DR.dropdown.enhance(categorySelect);

  if (chipsRow) {
    chipsRow.innerHTML = categories.slice(0, 9).map((c) => `<button class="chip" data-chip="${c.id}">${c.name}</button>`).join('');
  }

  const presetCategory = getQueryParam('category');
  if (presetCategory) {
    categorySelect.value = presetCategory;
    window.DR.dropdown.enhance(categorySelect);
  }
  const presetSearch = getQueryParam('q');
  if (presetSearch) searchInput.value = presetSearch;
  const presetPickup = getQueryParam('pickup');
  if (presetPickup) {
    const banner = document.createElement('p');
    banner.className = 'tag';
    banner.style.marginBottom = 'var(--sp-md)';
    const niceDate = new Date(presetPickup).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    banner.textContent = `Showing rentals for pickup on ${niceDate} — dates carry through when you book.`;
    grid.insertAdjacentElement('beforebegin', banner);
  }

  const applyFilters = () => {
    const term = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    const demand = demandSelect.value;
    const sort = sortSelect.value;

    let filtered = listings.filter((l) => {
      const matchesTerm = !term
        || l.title.toLowerCase().includes(term)
        || l.location.toLowerCase().includes(term)
        || l.category.toLowerCase().includes(term);
      const matchesCategory = !category || l.category === category;
      const matchesDemand = !demand || l.demandTier === demand;
      return matchesTerm && matchesCategory && matchesDemand;
    });

    switch (sort) {
      case 'price-asc': filtered.sort((a, b) => a.basePrice - b.basePrice); break;
      case 'price-desc': filtered.sort((a, b) => b.basePrice - a.basePrice); break;
      case 'rating-desc': filtered.sort((a, b) => b.rating - a.rating); break;
      default: break; // 'relevance' — keep dataset order
    }

    if (resultsMeta) {
      resultsMeta.textContent = `${filtered.length} rental${filtered.length === 1 ? '' : 's'} found`;
    }
    core.renderListingGrid(grid, filtered, { compareEnabled: true });
    wireCompareCheckboxes();

    qsa('.chip', chipsRow).forEach((chip) => chip.classList.toggle('active', chip.dataset.chip === category));
  };

  // ---- Compare tool: pick up to 3 rentals, see them side by side ----
  const compareBar = qs('#compare-bar');
  const compareBarItems = qs('#compare-bar-items');
  const compareNowBtn = qs('#compare-now');
  const compareClearBtn = qs('#compare-clear');
  const compareSet = new Set();
  const MAX_COMPARE = 3;

  const syncCompareCheckboxes = () => {
    qsa('[data-compare-toggle]', grid).forEach((box) => {
      box.checked = compareSet.has(box.dataset.compareToggle);
      box.disabled = !box.checked && compareSet.size >= MAX_COMPARE;
    });
  };

  const updateCompareBar = () => {
    const selected = [...compareSet].map((id) => listings.find((l) => l.id === id)).filter(Boolean);
    compareBar.classList.toggle('is-open', selected.length > 0);
    compareNowBtn.disabled = selected.length < 2;
    compareBarItems.innerHTML = selected.map((l) => `
      <span class="compare-chip">
        ${escapeCompareTitle(l.title)}
        <button type="button" data-compare-remove="${l.id}" aria-label="Remove">&times;</button>
      </span>`).join('') || '<span class="muted" style="font-size:var(--fs-sm)">Pick 2–3 rentals to compare</span>';
    qsa('[data-compare-remove]', compareBarItems).forEach((btn) => {
      btn.addEventListener('click', () => {
        compareSet.delete(btn.dataset.compareRemove);
        syncCompareCheckboxes();
        updateCompareBar();
      });
    });
    syncCompareCheckboxes();
  };

  function escapeCompareTitle(t) { return t.length > 22 ? `${t.slice(0, 20)}…` : t; }

  const wireCompareCheckboxes = () => {
    qsa('[data-compare-toggle]', grid).forEach((box) => {
      box.addEventListener('change', () => {
        const id = box.dataset.compareToggle;
        if (box.checked) {
          if (compareSet.size >= MAX_COMPARE) { box.checked = false; ui.toast(`You can compare up to ${MAX_COMPARE} at a time.`, 'info'); return; }
          compareSet.add(id);
        } else {
          compareSet.delete(id);
        }
        updateCompareBar();
      });
    });
    syncCompareCheckboxes();
  };

  compareClearBtn?.addEventListener('click', () => { compareSet.clear(); updateCompareBar(); });

  compareNowBtn?.addEventListener('click', () => {
    const selected = [...compareSet].map((id) => listings.find((l) => l.id === id)).filter(Boolean);
    if (selected.length < 2) return;

    const rows = [
      { label: 'Price / day', get: (l) => window.DR.utils.formatCurrency(l.basePrice) },
      { label: 'Rating', get: (l) => `${l.rating.toFixed(1)} ★ (${l.reviews})` },
      { label: 'Location', get: (l) => l.location },
      { label: 'Demand', get: (l) => window.DR.pricing.getDemandInfo(l.demandTier).label },
      { label: 'Top features', get: (l) => l.features.slice(0, 3).join(', ') },
    ];

    const tableHTML = `
      <div class="compare-table">
        <div class="compare-table-row compare-table-head">
          <div></div>
          ${selected.map((l) => `<div><strong>${escapeHTML(l.title)}</strong><div class="muted" style="font-size:var(--fs-xs)">${escapeHTML(l.category.replace(/-/g, ' '))}</div></div>`).join('')}
        </div>
        ${rows.map((row) => `
          <div class="compare-table-row">
            <div class="compare-table-label">${row.label}</div>
            ${selected.map((l) => `<div>${escapeHTML(String(row.get(l)))}</div>`).join('')}
          </div>`).join('')}
        <div class="compare-table-row">
          <div></div>
          ${selected.map((l) => `<div><a href="details.html?id=${l.id}" class="btn btn-outline btn-sm">View</a></div>`).join('')}
        </div>
      </div>`;

    ui.openModal(tableHTML, { title: `Comparing ${selected.length} rentals` });
  });

  const debouncedApply = debounce(() => {
    if (searchInput.value.trim()) storage.addRecentSearch(searchInput.value.trim());
    applyFilters();
  }, 320);

  searchInput.addEventListener('input', debouncedApply);
  categorySelect.addEventListener('change', applyFilters);
  demandSelect.addEventListener('change', applyFilters);
  sortSelect.addEventListener('change', applyFilters);

  chipsRow?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip]');
    if (!chip) return;
    categorySelect.value = categorySelect.value === chip.dataset.chip ? '' : chip.dataset.chip;
    window.DR.dropdown.enhance(categorySelect);
    applyFilters();
  });

  applyFilters();
})();
