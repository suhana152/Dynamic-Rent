/**
 * my-bookings.js
 * Powers my-bookings.html. Phase 2: bookings are read from the backend
 * (GET /api/bookings/my) and cancelled with PATCH /api/bookings/:id/cancel.
 */

(() => {
  const { qs, qsa, formatCurrency, escapeHTML } = window.DR.utils;
  const { ui, core, auth, api, fetchData } = window.DR;

  const listEl = qs('#bookings-list');
  if (!listEl) return;

  const filterBar = qs('#bookings-filter');
  let activeFilter = 'all';
  let allBookings = [];

  const showMessage = (title, text, href, label) => {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="icon-wrap">${core.iconSvg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>', 28)}</div>
        <h3>${title}</h3>
        <p>${text}</p>
        <a href="${href}" class="btn btn-primary">${label}</a>
      </div>`;
  };

  const render = () => {
    const bookings = activeFilter === 'all'
      ? allBookings
      : allBookings.filter((b) => b.status === activeFilter);

    if (!bookings.length) {
      showMessage(
        `No bookings ${activeFilter === 'all' ? 'yet' : `marked ${activeFilter}`}`,
        'Once you complete a booking, it will show up here.',
        'browse.html',
        'Browse rentals'
      );
      return;
    }

    listEl.innerHTML = bookings.map((b) => {
      // the rental may have been removed from the catalogue since this booking
      const l = b.listing || {};
      const title = l.title || 'Rental no longer available';
      const pickup = String(b.startDate).slice(0, 10);
      const ret = String(b.endDate).slice(0, 10);
      const pay = b.payment && b.payment.last4 ? b.payment : null;

      return `
      <div class="booking-item reveal" data-booking-id="${b._id}">
        ${l.image
          ? `<img class="thumb-fill" src="${l.image}" alt="${escapeHTML(title)}">`
          : `<div class="thumb-fill with-icon grad-${l.gradient || 'sage-sand'}"></div>`}
        <div>
          <h4>${escapeHTML(title)}</h4>
          <span class="status-tag ${b.status}">${escapeHTML(b.status)}</span>
          <p class="meta">${escapeHTML(l.location || '')} · ${pickup} → ${ret} · Qty ${b.quantity || 1}</p>
          <p class="meta">Booked by ${escapeHTML(b.fullName || '')} · ${escapeHTML(b.email || '')}</p>
          ${pay ? `<p class="meta">${escapeHTML(pay.brand)} ending ${escapeHTML(pay.last4)} · Confirmation #${escapeHTML(pay.transactionId)}</p>` : ''}
        </div>
        <div class="actions">
          <div class="total">${formatCurrency(b.totalPrice)}</div>
          ${b.status === 'confirmed' ? `<button class="btn btn-outline btn-sm" data-cancel="${b._id}">Cancel</button>` : ''}
        </div>
      </div>`;
    }).join('');

    qsa('[data-cancel]', listEl).forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await api.patch(`/bookings/${btn.dataset.cancel}/cancel`);
          ui.toast('Booking cancelled.', 'info');
          await load();
        } catch (err) {
          ui.toast(err.message, 'error');
          btn.disabled = false;
        }
      });
    });

    try { window.DR.animations.initAll(); } catch (err) { console.error('animations init failed:', err); }
  };

  const load = async () => {
    if (!auth.isLoggedIn()) {
      showMessage('Log in to see your bookings', 'Your bookings are saved in your account.', 'login.html', 'Log in');
      return;
    }
    fetchData.renderSkeletons(listEl, 3);
    try {
      allBookings = await api.get('/bookings/my');
    } catch (err) {
      fetchData.renderErrorCard(listEl, err.message, load);
      return;
    }
    render();
  };

  filterBar?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    qsa('button', filterBar).forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    render();
  });

  load();
})();