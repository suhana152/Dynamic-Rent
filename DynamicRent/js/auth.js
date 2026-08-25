/**
 * auth.js
 * A frontend-only authentication simulation for Phase 1. Accounts live in
 * localStorage; there is no server, so this is for demo/UX purposes only.
 * NOTE: passwords are obfuscated with a simple non-cryptographic hash so
 * they are at least not stored in plain text — this is NOT secure and
 * must be replaced by real server-side auth in Phase 2.
 */

const DRAuth = (() => {
  const { storage } = window.DR;

  /**
   * Small non-cryptographic "obfuscation" — good enough to avoid storing
   * plain text, nothing more. Just a loop, string concatenation, and
   * template literals: it reverses the password and tags on its length,
   * so the same password always produces the same result to compare
   * against on login.
   */
  const hash = (str) => {
    let reversed = '';
    for (let i = str.length - 1; i >= 0; i -= 1) {
      reversed += str[i];
    }
    return `h_${reversed}_${str.length}`;
  };

  const signup = ({ name, email, phone, password }) => {
    if (storage.findUserByEmail(email)) {
      return { ok: false, message: 'An account with this email already exists.' };
    }
    const user = {
      id: window.DR.utils.uid('user'),
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      passwordHash: hash(password),
      createdAt: new Date().toISOString(),
    };
    const users = storage.getUsers();
    users.push(user);
    storage.saveUsers(users);
    const { passwordHash, ...publicUser } = user;
    storage.setCurrentUser(publicUser, true);
    return { ok: true, user: publicUser };
  };

  const login = ({ email, password, remember = true }) => {
    const user = storage.findUserByEmail(email);
    if (!user) return { ok: false, message: 'No account found with that email.' };
    if (user.passwordHash !== hash(password)) {
      return { ok: false, message: 'Incorrect password. Please try again.' };
    }
    const { passwordHash, ...publicUser } = user;
    storage.setCurrentUser(publicUser, remember);
    return { ok: true, user: publicUser };
  };

  const logout = () => storage.clearCurrentUser();

  const isLoggedIn = () => !!storage.getCurrentUser();

  const currentUser = () => storage.getCurrentUser();

  /**
   * Guards a page that should only be visible to signed-in users.
   * Call this at the top of any protected page — if nobody is logged
   * in, it sends the visitor to the login page straight away.
   */
  const requireLogin = () => {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
    }
  };

  return { signup, login, logout, isLoggedIn, currentUser, requireLogin };
})();

window.DR = window.DR || {};
window.DR.auth = DRAuth;
