/**
 * fetchData.js
 * Every JSON read in DynamicRent goes through here so loading state,
 * caching, and error handling stay consistent across pages.
 */

const DRFetch = (() => {
  const cache = new Map();

  /**
   * Load a local JSON file with fetch + async/await.
   * Caches the parsed result in-memory for the lifetime of the page.
   * @param {string} path - relative path to the JSON file
   * @returns {Promise<any>}
   */
  const loadJSON = async (path) => {
    if (cache.has(path)) return cache.get(path);

    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();
      cache.set(path, data);
      return data;
    } catch (err) {
      console.error(`[fetchData] Could not load ${path}:`, err);
      throw err;
    }
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
