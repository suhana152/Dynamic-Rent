/**
 * auth.js
 * Phase 2: authentication now talks to the DynamicRent backend (Express +
 * MongoDB). Passwords are hashed with bcrypt on the server, and the server
 * returns a JWT token which is saved with the logged-in user.
 */

const DRAuth = (() => {
  const { storage, api } = window.DR;

  // Shape stored in the browser. "id" keeps the per-user storage keys working.
  const toPublicUser = (data) => ({
    id: data._id,
    name: data.name,
    email: data.email,
    phone: data.phone || '',
    role: data.role || 'user',
    avatar: data.avatar || '',
    token: data.token,
  });

  const signup = async ({ name, email, phone, password }) => {
    try {
      const data = await api.post('/auth/register', { name, email, phone, password });
      const user = toPublicUser(data);
      storage.clearCurrentUser();
      storage.setCurrentUser(user, true);
      return { ok: true, user };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  };

  const login = async ({ email, password, remember = true }) => {
    try {
      const data = await api.post('/auth/login', { email, password });
      const user = toPublicUser(data);
      storage.clearCurrentUser();
      storage.setCurrentUser(user, remember);
      return { ok: true, user };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  };

  const logout = () => storage.clearCurrentUser();

  const isLoggedIn = () => !!storage.getCurrentUser();

  const currentUser = () => storage.getCurrentUser();

  /**
   * Guards a page that should only be visible to signed-in users.
   * If nobody is logged in, it sends the visitor to the login page.
   */
  const requireLogin = () => {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
    }
  };

  // Old Phase 1 accounts (saved in localStorage, no server token) are
  // signed out automatically, because they cannot talk to the backend.
  const saved = storage.getCurrentUser();
  if (saved && !saved.token) {
    storage.clearCurrentUser();
  }

  return { signup, login, logout, isLoggedIn, currentUser, requireLogin };
})();

window.DR = window.DR || {};
window.DR.auth = DRAuth;