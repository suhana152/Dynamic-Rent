/**
 * ui.js
 * Shared chrome behaviour that appears on every page: sticky nav state,
 * mobile menu, theme toggle, toast notifications, a generic modal,
 * back-to-top button, and scroll progress bar. Page-specific scripts
 * (script.js, browse.js, details.js, booking.js...) call into
 * DR.ui.toast()/DR.ui.openModal() etc rather than re-implementing them.
 */

const DRUi = (() => {
  const { qs, qsa } = window.DR.utils;

  // ---- Toasts ----
  let toastContainer;
  const ensureToastContainer = () => {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      toastContainer.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  };

  const ICONS = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  };

  const toast = (message, type = 'info', duration = 3800) => {
    const container = ensureToastContainer();
    const el = document.createElement('div');
    el.className = `toast ${type} toast-enter`;
    el.innerHTML = `${ICONS[type] || ICONS.info}<span>${window.DR.utils.escapeHTML(message)}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 300ms ease, transform 300ms ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(12px)';
      setTimeout(() => el.remove(), 320);
    }, duration);
  };

  // ---- Modal ----
  let modalOverlay;
  const openModal = (contentHTML, { title = '' } = {}) => {
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.className = 'modal-overlay';
      document.body.appendChild(modalOverlay);
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }
    modalOverlay.innerHTML = `
      <div class="modal modal-scale-in">
        <div class="modal-head">
          <h3>${title}</h3>
          <button id="modal-close-btn" class="btn-icon" data-close-modal aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="modal-body">${contentHTML}</div>
      </div>`;
    // This button is re-created fresh every time openModal() runs, but since
    // there is only ever ONE modal on the page at a time, giving it a fixed
    // id and looking it up with getElementById() is safe here.
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    requestAnimationFrame(() => modalOverlay.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
  };
  const closeModal = () => {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  // ---- Theme toggle ----
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    qsa('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', theme === 'dark');
    });
  };
  const initTheme = () => {
    const saved = window.DR.storage.getTheme();
    applyTheme(saved);
    qsa('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        window.DR.storage.setTheme(next);
      });
    });
  };

  // ---- Sticky nav + scroll progress + back to top ----
  const initScrollChrome = () => {
    const nav = qs('.site-nav');
    const progress = qs('.scroll-progress');
    const backToTop = qs('.back-to-top');
    const indicator = qs('.nav-scroll-indicator');

    const onScroll = window.DR.utils.throttle(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      if (nav) nav.classList.toggle('is-scrolled', scrollTop > 8);
      if (progress) progress.style.width = `${pct}%`;
      if (indicator) indicator.style.width = `${pct}%`;
      if (backToTop) backToTop.classList.toggle('is-visible', scrollTop > 600);
    }, 60);

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (backToTop) {
      backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  };

  // ---- Mobile menu ----
  const initMobileMenu = () => {
    const hamburger = qs('.hamburger');
    const menu = qs('.mobile-menu');
    if (!hamburger || !menu) return;
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('is-open');
      menu.classList.toggle('is-open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    qsa('a', menu).forEach((a) => a.addEventListener('click', () => {
      hamburger.classList.remove('is-open');
      menu.classList.remove('is-open');
      document.body.style.overflow = '';
    }));
  };

  // ---- Active nav link ----
  const markActiveNav = () => {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    qsa('.nav-link, .mobile-menu a').forEach((a) => {
      const href = a.getAttribute('href');
      if (href === page || (page === '' && href === 'index.html')) a.classList.add('active');
    });
  };

  // ---- Reflect logged-in state in nav: proper account dropdown when signed in ----
  const reflectAuthState = () => {
    const user = window.DR.auth?.currentUser();
    qsa('[data-auth-slot]').forEach((slot) => {
      if (user) {
        const initial = user.name.trim().charAt(0).toUpperCase();
        const first = window.DR.utils.escapeHTML(user.name.split(' ')[0]);
        slot.innerHTML = `
          <div class="account-menu">
            <button class="account-trigger ripple-host" data-account-trigger aria-haspopup="true" aria-expanded="false">
              <span class="account-trigger-avatar">${initial}</span>
              <span class="account-trigger-name">${first}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div class="account-dropdown" data-account-dropdown role="menu">
              <a href="profile.html" role="menuitem">
                ${window.DR.core ? window.DR.core.iconSvg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5"/>', 17) : ''}
                Profile
              </a>
              <a href="my-bookings.html" role="menuitem">
                ${window.DR.core ? window.DR.core.iconSvg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>', 17) : ''}
                My bookings
              </a>
              <a href="profile.html#favorites" role="menuitem">
                ${window.DR.core ? window.DR.core.iconSvg('<path d="M12 21s-7.5-4.6-10-9.2C.4 8.2 2.3 4.5 6 4.5c2 0 3.6 1 6 3 2.4-2 4-3 6-3 3.7 0 5.6 3.7 4 7.3-2.5 4.6-10 9.2-10 9.2Z"/>', 17) : ''}
                Favorites
              </a>
              <hr class="divider" style="margin:6px 0">
              <button data-logout role="menuitem" title="Signed in as ${window.DR.utils.escapeHTML(user.email)}">
                ${window.DR.core ? window.DR.core.iconSvg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', 17) : ''}
                Log out
              </button>
            </div>
          </div>`;

        // [data-auth-slot] appears more than once per page (desktop nav +
        // mobile menu both show the account widget), so this whole block runs
        // once per slot. getElementById() would only ever find the first
        // match on the page, so scoped querySelector() is required here.
        const trigger = slot.querySelector('[data-account-trigger]');
        const dropdown = slot.querySelector('[data-account-dropdown]');
        const closeDropdown = () => { dropdown.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); };
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const willOpen = !dropdown.classList.contains('is-open');
          dropdown.classList.toggle('is-open', willOpen);
          trigger.setAttribute('aria-expanded', String(willOpen));
        });
        document.addEventListener('click', (e) => {
          if (!slot.contains(e.target)) closeDropdown();
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDropdown(); });

        // Same reasoning: scoped to this specific slot, not the whole page.
        slot.querySelector('[data-logout]')?.addEventListener('click', () => {
          window.DR.auth.logout();
          toast('Signed out. See you next time.', 'info');
          setTimeout(() => { window.location.href = 'index.html'; }, 500);
        });
      } else {
        slot.innerHTML = `
          <a href="login.html" class="btn-ghost">Log in</a>
          <a href="signup.html" class="btn btn-primary btn-sm">Sign up</a>`;
      }
    });
  };

  // ---- Ripple effect on .ripple-host elements ----
  const initRipples = () => {
    qsa('.ripple-host').forEach((host) => {
      host.addEventListener('click', (e) => {
        const rect = host.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        host.appendChild(ripple);
        setTimeout(() => ripple.remove(), 650);
      });
    });
  };

  // ---- FAQ accordion (native <details>, but only allow one open at a time per list) ----
  const initFaqAccordion = (scope = document) => {
    qsa('.faq-list', scope).forEach((list) => {
      qsa('details', list).forEach((item) => {
        item.addEventListener('toggle', () => {
          if (item.open) {
            qsa('details', list).forEach((other) => {
              if (other !== item) other.open = false;
            });
          }
        });
      });
    });
  };

  const initYear = () => {
    qsa('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  };

  // ---- Warn clearly if opened via file:// (fetch() of local JSON is blocked by CORS there) ----
  // ---- Currency selector (site-wide — every formatCurrency() call reads this) ----
  const initCurrency = () => {
    qsa('[data-currency-select]').forEach((select) => {
      const { CURRENCY_RATES } = window.DR.utils;
      const current = window.DR.utils.getActiveCurrency();
      select.innerHTML = Object.keys(CURRENCY_RATES)
        .map((code) => `<option value="${code}" ${code === current ? 'selected' : ''}>${code}</option>`).join('');
      select.addEventListener('change', () => {
        const prefs = window.DR.storage.getPreferences();
        window.DR.storage.setPreferences({ ...prefs, currency: select.value });
        toast(`Prices switched to ${select.value}.`, 'info', 1800);
        setTimeout(() => window.location.reload(), 350);
      });
    });
  };

  const initFileProtocolWarning = () => {
    if (window.location.protocol !== 'file:') return;
    const banner = document.createElement('div');
    banner.className = 'file-protocol-banner';
    banner.innerHTML = `
      <div class="container file-protocol-inner">
        <span>
          <strong>Heads up:</strong> you're opening this file directly, so the browser blocks it from loading
          <code>data/*.json</code> — rentals, pricing, and every data-driven section will look empty.
          Run <code>python3 -m http.server 8000</code> (or double-click <code>start-server.command</code> /
          <code>start-server.bat</code>) in this folder, then open
          <code>http://localhost:8000</code> instead.
        </span>
        <button id="file-protocol-dismiss-btn" type="button" aria-label="Dismiss">&times;</button>
      </div>`;
    document.body.prepend(banner);
    // initFileProtocolWarning() only ever runs once per page load, so this
    // banner and its button are always unique on the page — safe to use
    // getElementById() here instead of a scoped querySelector().
    document.getElementById('file-protocol-dismiss-btn').addEventListener('click', () => banner.remove());
  };

  const initAll = () => {
    initTheme();
    initScrollChrome();
    initMobileMenu();
    markActiveNav();
    reflectAuthState();
    initRipples();
    initFaqAccordion();
    initYear();
    initCurrency();
    initFileProtocolWarning();
  };

  return { toast, openModal, closeModal, initAll, initFaqAccordion, reflectAuthState };
})();

window.DR = window.DR || {};
window.DR.ui = DRUi;

document.addEventListener('DOMContentLoaded', () => DRUi.initAll());
