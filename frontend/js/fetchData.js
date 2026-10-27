/**
 * fetchData.js
 * Every data read in DynamicRent goes through here so loading state,
 * caching, and error handling stay consistent across pages.
 *
 * Phase 2: the listings now come from the backend (MongoDB) instead of
 * data/listings.json. Other content (categories, featured picks,
 * testimonials, FAQ) is still static JSON.
 */

const DRFetch = (() => {
  const cache = new Map();
  const inflight = new Map();

  const LISTINGS_PATH = 'data/listings.json';

  /**
   * Load every listing from the API and give it the same shape the pages
   * already expect: "id" keeps the Phase 1 id (l01, l02...) so favorites,
   * recently viewed and details.html?id=l01 keep working. The real MongoDB
   * id is kept as "mongoId" for pricing and booking calls.
   */
  const loadListingsFromApi = async () => {
    const data = await window.DR.api.get('/listings', { limit: 100 });
    return data.listings.map((l) => ({ ...l, id: l.legacyId || l._id, mongoId: l._id }));
  };

  const loadStaticJSON = async (path) => {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json();
  };

  /**
   * Load data by "path". data/listings.json is served by the API,
   * everything else is read from the local JSON files.
   * Results are cached in memory for the lifetime of the page, and two
   * calls for the same path at the same time share one request.
   */
  const loadJSON = async (path) => {
    if (cache.has(path)) return cache.get(path);
    if (inflight.has(path)) return inflight.get(path);

    const job = (path === LISTINGS_PATH ? loadListingsFromApi() : loadStaticJSON(path))
      .then((data) => {
        cache.set(path, data);
        return data;
      })
      .catch((err) => {
        console.error(`[fetchData] Could not load ${path}:`, err);
        throw err;
      })
      .finally(() => inflight.delete(path));

    inflight.set(path, job);
    return job;
  };

  /** Load several JSON files in parallel; resolves to an array in the same order. */
  const loadMany = (paths) => Promise.all(paths.map((p) => loadJSON(p)));

  /**
   * Render an elegant inline error card into a container when a fetch fails.
   * @param {HTMLElement} container
   * @param {string} message
   * @param {Function} [onRetry]
   */
  const renderErrorCard = (container, message = 'We could not load this content.', onRetry) => {
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon-wrap">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
          </svg>
        </div>
        <h3>Something didn't load</h3>
        <p>${message}</p>
        ${onRetry ? '<button class="btn btn-outline" data-retry>Try again</button>' : ''}
      </div>`;
    if (onRetry) {
      // renderErrorCard() is a shared helper called for many different
      // containers on a page, so this must stay scoped to THIS container.
      container.querySelector('[data-retry]')?.addEventListener('click', onRetry);
    }
  };

  /** Render a grid of skeleton placeholder cards while data is in-flight. */
  const renderSkeletons = (container, count = 6) => {
    if (!container) return;
    container.innerHTML = Array.from({ length: count })
      .map(() => '<div class="skeleton skeleton-card"></div>')
      .join('');
  };

  return { loadJSON, loadMany, renderErrorCard, renderSkeletons, cache };
})();

window.DR = window.DR || {};
window.DR.fetchData = DRFetch;