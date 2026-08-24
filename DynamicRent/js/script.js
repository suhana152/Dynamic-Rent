/**
 * script.js
 * The shared "data + render" layer: loads listings/categories once,
 * builds rental card markup, and wires up favorite buttons. Every page
 * includes this before its own page-specific script (browse.js,
 * details.js, booking.js, etc).
 */

const DRCore = (() => {
  const { qs, qsa, formatCurrency, escapeHTML } = window.DR.utils;
  const { loadJSON } = window.DR.fetchData;

  const CATEGORY_ICONS = {
    cars: '<path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13M5 13h14M5 13v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4M7 16.5h.01M17 16.5h.01"/>',
    'luxury-cars': '<path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13M5 13h14M5 13v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4"/><path d="M12 3v2"/>',
    motorcycles: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17 9 9h4l3 4h3M9 9 7.5 6H5"/>',
    bicycles: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l4-9h3l4 9M10 8h4M14 8l4 9"/>',
    apartments: '<path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6M4 21h16"/>',
    villas: '<path d="M3 12 12 4l9 8M5 10v11h14V10M9 21v-5h6v5"/>',
    rooms: '<path d="M4 21V9l8-6 8 6v12M4 21h16M10 13h4"/>',
    'camping-gear': '<path d="M12 3 3 21h18L12 3ZM8.5 21 12 12l3.5 9"/>',
    drones: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 6.5 10.5 10M17 6.5 13.5 10M7 17.5 10.5 14M17 17.5 13.5 14"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/>',
    cameras: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7 9.5 4h5L16 7"/>',
    'gaming-consoles': '<rect x="3" y="8" width="18" height="9" rx="4"/><path d="M8 10.5v4M6 12.5h4M16 11h.01M18 13h.01"/>',
    laptops: '<rect x="4" y="4" width="16" height="10" rx="1.5"/><path d="M2 18h20l-1.5-4h-17L2 18Z"/>',
    'photography-equipment': '<path d="M4 8h3l1.5-2h7L17 8h3v10H4V8Z"/><circle cx="12" cy="13" r="3.2"/>',
    'construction-equipment': '<path d="M3 21 12 6l9 15H3Z"/><path d="M8.5 21 12 12l3.5 9"/>',
    'sports-equipment': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/>',
    'party-equipment': '<path d="m4 20 6-14 10 10-14 4Z"/><path d="M14 4 15.5 6M18 3l1.5 2M10 3l1 2.2"/>',
  };

  const iconSvg = (path, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

  /**
   * starIcon / heartIcon are functions, not plain strings — every call
   * site must invoke them (e.g. starIcon(14)) so the size is always
   * explicit. A bare SVG string with no width/height falls back to the
   * browser's large intrinsic default wherever no CSS happens to scope
   * it, which is exactly the bug this guards against.
   */
  const starIcon = (size = 15) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="var(--c-gold)" style="flex-shrink:0"><path d="M12 2.5l2.9 6.4 6.9.7-5.2 4.8 1.5 6.9L12 17.9l-6.1 3.4 1.5-6.9L2.2 9.6l6.9-.7L12 2.5z"/></svg>`;

  const heartIcon = (size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="flex-shrink:0"><path d="M12 21s-7.5-4.6-10-9.2C.4 8.2 2.3 4.5 6 4.5c2 0 3.6 1 6 3 2.4-2 4-3 6-3 3.7 0 5.6 3.7 4 7.3-2.5 4.6-10 9.2-10 9.2Z"/></svg>`;

  let listingsPromise = null;
  const getListings = () => {
    if (!listingsPromise) listingsPromise = loadJSON('data/listings.json');
    return listingsPromise;
  };

  let categoriesPromise = null;
  const getCategories = () => {
    if (!categoriesPromise) categoriesPromise = loadJSON('data/categories.json');
    return categoriesPromise;
  };

  const getListingById = async (id) => {
    const listings = await getListings();
    return listings.find((l) => l.id === id);
  };

  const categoryLabel = (id) => id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const demandBadgeLabel = { low: 'Low demand', medium: '', high: 'High demand', peak: 'Peak demand' };

  /** Build the markup for one rental card. `opts.compareEnabled` adds a compare checkbox. */
  const listingCardHTML = (listing, opts = {}) => {
    const { storage } = window.DR;
    const isFav = storage.isFavorite(listing.id);
    const demand = demandBadgeLabel[listing.demandTier];
    return `
      <article class="rental-card reveal" data-listing-id="${listing.id}">
        <div class="thumb">
          <div class="thumb-fill with-icon grad-${listing.gradient}"><span class="cat-icon-badge">${iconSvg(CATEGORY_ICONS[listing.category] || CATEGORY_ICONS.cars, 34)}</span></div>
          ${listing.badge ? `<span class="badge">${escapeHTML(listing.badge)}</span>` : (demand ? `<span class="badge tier-${listing.demandTier}">${demand}</span>` : '')}
          <button class="fav-btn ripple-host ${isFav ? 'is-active' : ''}" data-fav-toggle="${listing.id}" aria-label="Save to favorites" aria-pressed="${isFav}">
            ${heartIcon(18)}
          </button>
          ${opts.compareEnabled ? `
            <label class="compare-check" title="Add to comparison">
              <input type="checkbox" data-compare-toggle="${listing.id}">
              <span>Compare</span>
            </label>` : ''}
        </div>
        <div class="body">
          <span class="cat">${categoryLabel(listing.category)}</span>
          <a href="details.html?id=${listing.id}"><h4>${escapeHTML(listing.title)}</h4></a>
          <span class="loc">${escapeHTML(listing.location)}</span>
          <p class="card-blurb">${escapeHTML(listing.shortDescription)}</p>
          <div class="meta-row">
            <span class="rating">${starIcon(14)} ${listing.rating.toFixed(1)} <span class="muted">(${listing.reviews})</span></span>
            <div class="price">
              <div class="amount">${formatCurrency(listing.basePrice)}</div>
              <div class="unit">per day</div>
            </div>
          </div>
        </div>
      </article>`;
  };

  const renderListingGrid = (container, listings, opts = {}) => {
    if (!container) return;
    if (!listings.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="icon-wrap">${iconSvg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 28)}</div>
          <h3>No rentals match yet</h3>
          <p>Try widening your filters or searching a different term.</p>
        </div>`;
      return;
    }
    container.innerHTML = listings.map((l) => listingCardHTML(l, opts)).join('');
    wireFavButtons(container);
    wireCardSpotlight(container);
    window.DR.ui.initFaqAccordion(container);
    try { window.DR.animations.initAll(); } catch (err) { console.error('[script] animations init failed:', err); }
  };

  const wireFavButtons = (scope = document) => {
    qsa('[data-fav-toggle]', scope).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.favToggle;
        const nowFav = window.DR.storage.toggleFavorite(id);
        btn.classList.toggle('is-active', nowFav);
        btn.setAttribute('aria-pressed', nowFav);
        window.DR.ui.toast(nowFav ? 'Added to favorites' : 'Removed from favorites', 'success', 2200);
      });
    });
  };

  /** Cursor-tracking spotlight glow on cards — pure DOM event handling, no libraries. */
  const wireCardSpotlight = (scope = document) => {
    qsa('.rental-card', scope).forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        card.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
      });
    });
  };

  return {
    CATEGORY_ICONS, iconSvg, starIcon, heartIcon,
    getListings, getCategories, getListingById,
    categoryLabel, listingCardHTML, renderListingGrid, wireFavButtons,
  };
})();

window.DR = window.DR || {};
window.DR.core = DRCore;
