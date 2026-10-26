/**
 * profile.js
 * Powers profile.html. Phase 2: bookings, name/phone and the profile photo
 * come from the backend (MongoDB). Favorites, recently viewed and price
 * watches are per-browser preferences, so they stay in localStorage.
 */

(async () => {
  const { qs, qsa, escapeHTML, formatCurrency } = window.DR.utils;
  const { storage, ui, core, validation, auth, api, config } = window.DR;

  const root = qs('#profile-root');
  if (!root) return;

  const user = auth.currentUser();

  if (!user) {
    root.innerHTML = `
      <div class="empty-state">
        <div class="icon-wrap">${core.iconSvg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5"/>', 28)}</div>
        <h3>You're not signed in</h3>
        <p>Log in to see your profile, favorites, and price watches — or create an account in under a minute.</p>
        <div class="hero-actions" style="justify-content:center">
          <a href="login.html" class="btn btn-primary">Log in</a>
          <a href="signup.html" class="btn btn-outline">Sign up</a>
        </div>
      </div>`;
    return;
  }

  root.innerHTML = '<p class="muted">Loading your profile...</p>';

  // ---- Data from the backend ----
  let bookings = [];
  let memberSinceDate = null;
  try {
    const [bookingData, me] = await Promise.all([
      api.get('/bookings/my'),
      api.get('/auth/me'),
    ]);
    bookings = bookingData;
    memberSinceDate = me.createdAt;
  } catch (err) {
    // a 401 already sends the visitor to login.html inside api.js
    root.innerHTML = `<div class="empty-state"><h3>Couldn't load your profile</h3><p>${escapeHTML(err.message)}</p><button class="btn btn-primary" onclick="window.location.reload()">Try again</button></div>`;
    return;
  }

  const favorites = storage.getFavorites();
  const recentlyViewed = storage.getRecentlyViewed();
  const priceWatches = storage.getPriceWatches();
  const memberSince = memberSinceDate
    ? new Date(memberSinceDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';

  // ---- Loyalty & rewards: points earned from confirmed bookings, tiered ----
  const TIERS = [
    { name: 'Bronze', min: 0, color: '#9c7a54' },
    { name: 'Silver', min: 1000, color: '#8a95a3' },
    { name: 'Gold', min: 3000, color: '#b99653' },
    { name: 'Platinum', min: 7000, color: '#5f6f50' },
  ];
  const points = Math.round(bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.totalPrice, 0) * 10);
  const currentTierIdx = TIERS.reduce((idx, tier, i) => (points >= tier.min ? i : idx), 0);
  const currentTier = TIERS[currentTierIdx];
  const nextTier = TIERS[currentTierIdx + 1];
  const progressPct = nextTier ? Math.min(((points - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100) : 100;

  const avatarHTML = (u) => (u.avatar
    ? `<img src="${escapeHTML(config.assetUrl(u.avatar))}" alt="${escapeHTML(u.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : escapeHTML(u.name.charAt(0).toUpperCase()));

  root.innerHTML = `
    <div class="account-header reveal">
      <div class="account-avatar" id="p-avatar" style="overflow:hidden">${avatarHTML(user)}</div>
      <div>
        <h2 style="margin:0" id="p-title-name">${escapeHTML(user.name)}</h2>
        <p class="muted">${escapeHTML(user.email)} · Member since ${memberSince}</p>
        <div style="margin-top:8px">
          <input type="file" id="p-avatar-file" accept="image/jpeg,image/png,image/webp" style="display:none">
          <button type="button" class="btn btn-outline btn-sm" id="p-avatar-btn">Change photo</button>
          <span class="muted" style="font-size:var(--fs-xs);margin-left:8px">JPG, PNG or WEBP, up to 2 MB</span>
        </div>
      </div>
    </div>

    <div class="loyalty-card reveal">
      <div class="loyalty-badge" style="background:${currentTier.color}">${currentTier.name.charAt(0)}</div>
      <div class="loyalty-body">
        <div class="loyalty-top">
          <div>
            <span class="eyebrow">Rewards</span>
            <h3>${currentTier.name} member · ${window.DR.utils.formatNumber(points)} pts</h3>
          </div>
          <span class="muted" style="font-size:var(--fs-sm)">${nextTier ? `${window.DR.utils.formatNumber(nextTier.min - points)} pts to ${nextTier.name}` : 'Top tier reached'}</span>
        </div>
        <div class="loyalty-track"><div class="loyalty-fill" style="width:${progressPct}%;background:${currentTier.color}"></div></div>
        <p class="muted" style="font-size:var(--fs-xs);margin-top:6px">Earned 10 points per dollar on confirmed bookings.</p>
      </div>
    </div>

    <div class="profile-stat-row reveal-stagger">
      <div class="profile-stat"><div class="num">${bookings.length}</div><div class="lbl">Bookings</div></div>
      <div class="profile-stat"><div class="num">${favorites.length}</div><div class="lbl">Favorites</div></div>
      <div class="profile-stat"><div class="num">${priceWatches.length}</div><div class="lbl">Price watches</div></div>
    </div>

    <div class="profile-tabs reveal">
      <button class="profile-tab active" data-tab="info">Profile info</button>
      <button class="profile-tab" data-tab="favorites">Favorites</button>
      <button class="profile-tab" data-tab="recent">Recently viewed</button>
      <button class="profile-tab" data-tab="watches">Price watches</button>
    </div>

    <div class="profile-panel active" id="panel-info">
      <div class="form-card">
        <h3 style="margin-bottom:var(--sp-md)">Edit profile</h3>
        <form id="profile-form" novalidate>
          <div class="form-grid">
            <div class="field" id="p-field-name">
              <label for="p-name">Full name</label>
              <input type="text" id="p-name" value="${escapeHTML(user.name)}" required>
              <span class="error-msg"></span>
            </div>
            <div class="field">
              <label for="p-email">Email</label>
              <input type="email" id="p-email" value="${escapeHTML(user.email)}" disabled style="opacity:0.6">
            </div>
            <div class="field" id="p-field-phone">
              <label for="p-phone">Phone</label>
              <input type="tel" id="p-phone" value="${escapeHTML(user.phone || '')}" required>
              <span class="error-msg"></span>
            </div>
          </div>
          <button type="submit" class="btn btn-primary mt-lg" id="p-save-btn">Save changes</button>
        </form>
      </div>
    </div>

    <div class="profile-panel" id="panel-favorites">
      <div class="card-grid" id="profile-favorites-grid"></div>
    </div>

    <div class="profile-panel" id="panel-recent">
      <div class="card-grid" id="profile-recent-grid"></div>
    </div>

    <div class="profile-panel" id="panel-watches">
      <div id="profile-watches-list"></div>
    </div>`;

  // ---- Tab switching ----
  qsa('.profile-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      qsa('.profile-tab').forEach((t) => t.classList.remove('active'));
      qsa('.profile-panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      qs(`#panel-${tab.dataset.tab}`).classList.add('active');
    });
  });
  const hashTab = window.location.hash.replace('#', '');
  if (hashTab && qs(`[data-tab="${hashTab}"]`)) qs(`[data-tab="${hashTab}"]`).click();

  // ---- Profile photo upload (Multer on the server) ----
  const avatarFile = qs('#p-avatar-file');
  const avatarBtn = qs('#p-avatar-btn');
  avatarBtn.addEventListener('click', () => avatarFile.click());
  avatarFile.addEventListener('change', async () => {
    const file = avatarFile.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      ui.toast('Please choose a JPG, PNG or WEBP image.', 'error');
      avatarFile.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      ui.toast('That photo is larger than 2 MB.', 'error');
      avatarFile.value = '';
      return;
    }

    const originalText = avatarBtn.textContent;
    avatarBtn.disabled = true;
    avatarBtn.textContent = 'Uploading...';
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const data = await api.post('/users/avatar', formData);
      const updated = storage.updateCurrentUser({ avatar: data.avatar });
      qs('#p-avatar').innerHTML = avatarHTML(updated);
      ui.toast('Profile photo updated.', 'success');
      window.DR.ui.reflectAuthState();
    } catch (err) {
      ui.toast(err.message, 'error');
    }
    avatarBtn.disabled = false;
    avatarBtn.textContent = originalText;
    avatarFile.value = '';
  });

  // ---- Edit profile form (saved in MongoDB) ----
  const { rules } = validation;
  const fieldConfigs = {
    name: { el: qs('#p-field-name'), getValue: () => qs('#p-name').value, rules: [rules.required, rules.minLength(2)] },
    phone: { el: qs('#p-field-phone'), getValue: () => qs('#p-phone').value, rules: [rules.required, rules.phone] },
  };
  const fieldInputIds = { name: 'p-name', phone: 'p-phone' };
  Object.entries(fieldConfigs).forEach(([key, { el, getValue, rules: ruleList }]) => {
    document.getElementById(fieldInputIds[key])?.addEventListener('blur', () => validation.validateField(el, getValue(), ruleList));
  });
  qs('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validation.validateForm(fieldConfigs)) {
      ui.toast('Please fix the highlighted fields.', 'error');
      return;
    }

    const saveBtn = qs('#p-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
      const saved = await api.put('/users/me', {
        name: qs('#p-name').value.trim(),
        phone: qs('#p-phone').value.trim(),
      });
      const updated = storage.updateCurrentUser({ name: saved.name, phone: saved.phone });
      qs('#p-title-name').textContent = saved.name;
      if (!updated.avatar) qs('#p-avatar').innerHTML = avatarHTML(updated);
      ui.toast('Profile updated.', 'success');
      window.DR.ui.reflectAuthState();
    } catch (err) {
      ui.toast(err.message, 'error');
    }
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save changes';
  });

  // ---- Favorites & recently viewed grids ----
  const listings = await core.getListings();
  const favListings = favorites.map((id) => listings.find((l) => l.id === id)).filter(Boolean);
  const recentListings = recentlyViewed.map((id) => listings.find((l) => l.id === id)).filter(Boolean);
  core.renderListingGrid(qs('#profile-favorites-grid'), favListings);
  core.renderListingGrid(qs('#profile-recent-grid'), recentListings);

  // ---- Price watches list ----
  const watchesEl = qs('#profile-watches-list');
  const renderWatches = () => {
    const watches = storage.getPriceWatches();
    if (!watches.length) {
      watchesEl.innerHTML = `<div class="empty-state"><div class="icon-wrap">${core.iconSvg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>', 26)}</div><h3>No price watches yet</h3><p>Set one from any rental's details page.</p><a href="browse.html" class="btn btn-primary">Browse rentals</a></div>`;
      return;
    }
    watchesEl.innerHTML = watches.map((w) => `
      <div class="watch-item">
        <div>
          <strong>${escapeHTML(w.listingTitle)}</strong>
          <p class="muted" style="font-size:var(--fs-sm)">Alert below ${formatCurrency(w.targetPrice)}</p>
        </div>
        <div style="display:flex;gap:8px">
          <a href="details.html?id=${w.listingId}" class="btn btn-outline btn-sm">View</a>
          <button class="btn-ghost btn-sm" data-remove-watch="${w.listingId}">Remove</button>
        </div>
      </div>`).join('');
    qsa('[data-remove-watch]', watchesEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        storage.removePriceWatch(btn.dataset.removeWatch);
        ui.toast('Price watch removed.', 'info');
        renderWatches();
      });
    });
  };
  renderWatches();

  try { window.DR.animations.initAll(); } catch (err) { console.error('animations init failed:', err); }
})();