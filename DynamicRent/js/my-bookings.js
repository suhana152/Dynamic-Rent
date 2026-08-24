/**
 * my-bookings.js
 * Powers my-bookings.html: lists bookings saved to localStorage (scoped
 * to the logged-in user's email when signed in), supports filtering by
 * status, and lets the user cancel a confirmed booking.
 */

(() => {
  const { qs, qsa, formatCurrency, escapeHTML } = window.DR.utils;
  const { storage, ui, core } = window.DR;

  const listEl = qs('#bookings-list');
  if (!listEl) return;

  const filterBar = qs('#bookings-filter');
  let activeFilter = 'all';

  const currentUser = window.DR.auth?.currentUser();

  const getScopedBookings = () => (currentUser ? storage.getBookingsForUser(currentUser.email) : storage.getBookings());

  const render = () => {
    let bookings = getScopedBookings();
    if (activeFilter !== 'all') bookings = bookings.filter((b) => b.status === activeFilter);

    if (!currentUser) {
      const banner = document.createElement('div');
      banner.className = 'tag';
      banner.style.marginBottom = 'var(--sp-md)';
      banner.style.display = 'inline-flex';
      banner.innerHTML = `${core.iconSvg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>', 15)} Not logged in — showing every booking saved in this browser. <a href="login.html" style="margin-left:6px;text-decoration:underline">Log in</a> to scope this to your account.`;
      listEl.innerHTML = '';
      listEl.appendChild(banner);
    } else {
      listEl.innerHTML = '';
    }

    if (!bookings.length) {
      listEl.innerHTML += `
        <div class="empty-state">
          <div class="icon-wrap">${core.iconSvg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>', 28)}</div>
          <h3>No bookings ${activeFilter === 'all' ? 'yet' : `marked ${activeFilter}`}</h3>
          <p>Once you complete a booking, it will show up here.</p>
          <a href="browse.html" class="btn btn-primary">Browse rentals</a>
        </div>`;
      return;
    }

    listEl.innerHTML += bookings.map((b) => `
      <div class="booking-item reveal" data-booking-id="${b.id}">
        <div class="thumb-fill with-icon grad-${b.listingGradient || 'sage-sand'}"></div>
        <div>
          <h4>${escapeHTML(b.listingTitle)}</h4>
          <span class="status-tag ${b.status}">${escapeHTML(b.status)}</span>
          <p class="meta">${escapeHTML(b.listingLocation || '')} · ${b.pickupDate} → ${b.returnDate} · Qty ${b.quantity}</p>
          <p class="meta">Booked by ${escapeHTML(b.fullName)} · ${escapeHTML(b.email)}</p>
          ${b.payment ? `<p class="meta">${escapeHTML(b.payment.brand)} ending ${escapeHTML(b.payment.last4)} · Confirmation #${escapeHTML(b.payment.transactionId)}</p>` : ''}
        </div>
        <div class="actions">
          <div class="total">${formatCurrency(b.total)}</div>
          ${b.status === 'confirmed' ? `<button class="btn btn-outline btn-sm" data-cancel="${b.id}">Cancel</button>` : `<button class="btn-ghost btn-sm" data-remove="${b.id}">Remove</button>`}
        </div>
      </div>`).join('');

    qsa('[data-cancel]', listEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        storage.updateBookingStatus(btn.dataset.cancel, 'cancelled');
        ui.toast('Booking cancelled.', 'info');
        render();
      });
    });
    qsa('[data-remove]', listEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        storage.removeBooking(btn.dataset.remove);
        ui.toast('Booking removed.', 'info');
        render();
      });
    });

    try { window.DR.animations.initAll(); } catch (err) { console.error('animations init failed:', err); }
  };

  filterBar?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    qsa('button', filterBar).forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    render();
  });

  render();
})();
