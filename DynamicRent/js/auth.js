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

  /** Small non-cryptographic string hash — good enough to avoid plaintext, nothing more. */
  const hash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return `h${Math.abs(h)}_${str.length}`;
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

  return { signup, login, logout, isLoggedIn, currentUser };
})();

window.DR = window.DR || {};
window.DR.auth = DRAuth;
