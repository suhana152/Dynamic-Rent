/**
 * storage.js
 * Thin, safe wrappers around localStorage / sessionStorage, plus
 * named helpers for every piece of state DynamicRent persists.
 *
 * Per-user data isolation: favorites, recently-viewed, price watches,
 * and bookings are namespaced by whoever is currently logged in (or
 * "guest" when signed out). Switching accounts — or simply logging in
 * as someone else — always starts from that account's own clean data,
 * never another account's or the guest session's.
 */

const DRStorage = (() => {
  const KEYS = {
    THEME: 'dr_theme',
    FAVORITES: 'dr_favorites',
    RECENTLY_VIEWED: 'dr_recently_viewed',
    RECENT_SEARCHES: 'dr_recent_searches',
    BOOKINGS: 'dr_bookings',
    USERS: 'dr_users',
    CURRENT_USER: 'dr_current_user',
    PREFERENCES: 'dr_preferences',
    DRAFT_BOOKING: 'dr_draft_booking',
    PRICE_WATCHES: 'dr_price_watches',
  };

  const safeGet = (storage, key, fallback) => {
    try {
      const raw = storage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[storage] Failed to read "${key}"`, err);
      return fallback;
    }
  };

  const safeSet = (storage, key, value) => {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`[storage] Failed to write "${key}"`, err);
      return false;
    }
  };

  // ---- Generic local/session helpers ----
  const local = {
    get: (key, fallback = null) => safeGet(window.localStorage, key, fallback),
    set: (key, value) => safeSet(window.localStorage, key, value),
    remove: (key) => window.localStorage.removeItem(key),
  };

  const session = {
    get: (key, fallback = null) => safeGet(window.sessionStorage, key, fallback),
    set: (key, value) => safeSet(window.sessionStorage, key, value),
    remove: (key) => window.sessionStorage.removeItem(key),
  };

  // ---- Theme ----
  const getTheme = () => local.get(KEYS.THEME, 'light');
  const setTheme = (theme) => local.set(KEYS.THEME, theme);

  // ---- Per-user namespacing ----
  // getCurrentUser is defined further down, but this is only ever CALLED
  // (not evaluated) after the whole module has finished loading, so the
  // forward reference is safe.
  const getNamespace = () => {
    const user = getCurrentUser();
    return user ? user.id : 'guest';
  };
  const nsKey = (base) => `${base}::${getNamespace()}`;

  // ---- Favorites (array of listing ids, scoped to the current account) ----
  const getFavorites = () => local.get(nsKey(KEYS.FAVORITES), []);
  const isFavorite = (id) => getFavorites().includes(id);
  const toggleFavorite = (id) => {
    const key = nsKey(KEYS.FAVORITES);
    const favs = local.get(key, []);
    const idx = favs.indexOf(id);
    if (idx === -1) favs.push(id); else favs.splice(idx, 1);
    local.set(key, favs);
    return favs.includes(id);
  };

  // ---- Recently viewed (array of ids, most recent first, capped, scoped) ----
  const getRecentlyViewed = () => local.get(nsKey(KEYS.RECENTLY_VIEWED), []);
  const addRecentlyViewed = (id) => {
    const key = nsKey(KEYS.RECENTLY_VIEWED);
    let list = local.get(key, []).filter((x) => x !== id);
    list.unshift(id);
    list = list.slice(0, 8);
    local.set(key, list);
    return list;
  };

  // ---- Recent searches (array of strings, capped — shared across the browser, not account-sensitive) ----
  const getRecentSearches = () => local.get(KEYS.RECENT_SEARCHES, []);
  const addRecentSearch = (term) => {
    if (!term || !term.trim()) return getRecentSearches();
    let list = getRecentSearches().filter((x) => x.toLowerCase() !== term.toLowerCase());
    list.unshift(term.trim());
    list = list.slice(0, 6);
    local.set(KEYS.RECENT_SEARCHES, list);
    return list;
  };

  // ---- Bookings (scoped to the current account) ----
  const getBookings = () => local.get(nsKey(KEYS.BOOKINGS), []);
  const addBooking = (booking) => {
    const key = nsKey(KEYS.BOOKINGS);
    const bookings = local.get(key, []);
    bookings.unshift(booking);
    local.set(key, bookings);
    return bookings;
  };
  const getBookingsForUser = (email) => getBookings().filter((b) => b.email?.toLowerCase() === email?.toLowerCase());
  const updateBookingStatus = (id, status) => {
    const key = nsKey(KEYS.BOOKINGS);
    const bookings = local.get(key, []);
    const idx = bookings.findIndex((b) => b.id === id);
    if (idx === -1) return bookings;
    bookings[idx] = { ...bookings[idx], status };
    local.set(key, bookings);
    return bookings;
  };
  const removeBooking = (id) => {
    const key = nsKey(KEYS.BOOKINGS);
    const bookings = local.get(key, []).filter((b) => b.id !== id);
    local.set(key, bookings);
    return bookings;
  };

  // ---- Price watches (scoped to the current account) ----
  const getPriceWatches = () => local.get(nsKey(KEYS.PRICE_WATCHES), []);
  const addPriceWatch = (watch) => {
    const key = nsKey(KEYS.PRICE_WATCHES);
    const watches = local.get(key, []).filter((w) => w.listingId !== watch.listingId);
    watches.push(watch);
    local.set(key, watches);
    return watches;
  };
  const removePriceWatch = (listingId) => {
    const key = nsKey(KEYS.PRICE_WATCHES);
    const watches = local.get(key, []).filter((w) => w.listingId !== listingId);
    local.set(key, watches);
    return watches;
  };
  const getPriceWatch = (listingId) => getPriceWatches().find((w) => w.listingId === listingId) || null;

  // ---- Draft booking (survives a refresh mid-form; session-scoped already) ----
  const getDraftBooking = () => session.get(KEYS.DRAFT_BOOKING, null);
  const setDraftBooking = (draft) => session.set(KEYS.DRAFT_BOOKING, draft);
  const clearDraftBooking = () => session.remove(KEYS.DRAFT_BOOKING);

  // ---- Users / auth (demo-only, plaintext — never do this in production) ----
  const getUsers = () => local.get(KEYS.USERS, []);
  const saveUsers = (users) => local.set(KEYS.USERS, users);
  const findUserByEmail = (email) => getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  const getCurrentUser = () => session.get(KEYS.CURRENT_USER, null) || local.get(KEYS.CURRENT_USER, null);
  const setCurrentUser = (user, remember = true) => {
    const storage = remember ? local : session;
    storage.set(KEYS.CURRENT_USER, user);
  };
  const clearCurrentUser = () => {
    local.remove(KEYS.CURRENT_USER);
    session.remove(KEYS.CURRENT_USER);
  };
  /** Update the logged-in user's public profile fields, in both the session/local
   *  "current user" pointer and the underlying users table. */
  const updateCurrentUser = (patch) => {
    const current = getCurrentUser();
    if (!current) return null;
    const updated = { ...current, ...patch };
    const remembered = !!local.get(KEYS.CURRENT_USER, null);
    setCurrentUser(updated, remembered);
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === current.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...patch };
      saveUsers(users);
    }
    return updated;
  };

  // ---- Preferences (device-level, not account-sensitive — currency/theme stay put across logins) ----
  const getPreferences = () => local.get(KEYS.PREFERENCES, { currency: 'USD', newsletter: false });
  const setPreferences = (prefs) => local.set(KEYS.PREFERENCES, prefs);

  return {
    KEYS, local, session,
    getTheme, setTheme,
    getFavorites, isFavorite, toggleFavorite,
    getRecentlyViewed, addRecentlyViewed,
    getRecentSearches, addRecentSearch,
    getBookings, addBooking, getBookingsForUser, updateBookingStatus, removeBooking,
    getDraftBooking, setDraftBooking, clearDraftBooking,
    getUsers, saveUsers, findUserByEmail,
    getCurrentUser, setCurrentUser, clearCurrentUser, updateCurrentUser,
    getPreferences, setPreferences,
    getPriceWatches, addPriceWatch, removePriceWatch, getPriceWatch,
  };
})();

window.DR = window.DR || {};
window.DR.storage = DRStorage;
