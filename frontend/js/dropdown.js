/**
 * dropdown.js
 * A native <select>'s open option list is drawn by the operating system,
 * not the browser's rendering engine — no amount of CSS can style or
 * animate it. This module progressively enhances every <select> inside
 * a `.select-wrap` into a fully custom, CSS-animated dropdown built from
 * plain <button> and <div> elements.
 *
 * The original <select> stays in the DOM as the source of truth — its
 * `.value` and `change` event keep working exactly as before, so every
 * existing piece of business logic (browse filters, booking form, the
 * currency switcher) needs zero changes. If JavaScript fails to load,
 * the native select — already styled from style.css — is what the
 * visitor sees and uses instead, so nothing is ever left broken.
 */

const DRDropdown = (() => {
  const { qs, qsa } = window.DR.utils;

  const chevronSvg = '<svg class="dropdown-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  const checkSvg = '<svg class="dropdown-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  /** Close every open custom dropdown on the page, optionally leaving one open. */
  const closeAll = (exceptListbox) => {
    qsa('.dropdown-listbox.is-open').forEach((box) => {
      if (box === exceptListbox) return;
      box.classList.remove('is-open');
      box.previousElementSibling?.setAttribute('aria-expanded', 'false');
    });
  };

  /** Re-render the trigger label and the selected-option highlight from the live <select>. */
  const syncTrigger = (selectEl, trigger, listbox) => {
    const selected = selectEl.options[selectEl.selectedIndex];
    // Every <select> on a page (currency, sort order, filters...) gets its
    // own custom dropdown, so this same code runs once per dropdown. Since
    // there can be several of these on one page, getElementById() (which
    // needs a single, page-wide unique id) can't be used here — trigger
    // .querySelector() correctly looks only inside THIS dropdown's trigger.
    const label = trigger.querySelector('.dropdown-trigger-label');
    if (label) label.textContent = selected ? selected.textContent : '';
    qsa('.dropdown-option', listbox).forEach((el, i) => {
      const isSelected = i === selectEl.selectedIndex;
      el.classList.toggle('is-selected', isSelected);
      el.setAttribute('aria-selected', String(isSelected));
    });
  };

  /**
   * Enhance (or, if already enhanced, just re-sync) one <select> into a
   * custom dropdown. Safe to call repeatedly — for example, right after
   * a select's options are repopulated from fetched data.
   */
  const enhance = (selectEl) => {
    if (!selectEl || selectEl.tagName !== 'SELECT') return;
    const wrap = selectEl.closest('.select-wrap');
    if (!wrap) return;

    // Scoped to `wrap` because a page can have multiple <select>s being
    // enhanced (e.g. sort + currency dropdowns together) — getElementById()
    // would only ever find the FIRST one, since ids must be unique per page.
    let trigger = wrap.querySelector('.dropdown-trigger');
    let listbox = wrap.querySelector('.dropdown-listbox');

    if (!trigger) {
      wrap.classList.add('dropdown-enhanced');

      trigger = document.createElement('button');
      trigger.type = 'button';
      // Carries the select's own classes (.select-field, .currency-select, etc.)
      // so it inherits that context's existing visual styling automatically.
      trigger.className = `dropdown-trigger ${selectEl.className}`.trim();
      trigger.innerHTML = `<span class="dropdown-trigger-label"></span>${chevronSvg}`;
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.disabled = selectEl.disabled;

      listbox = document.createElement('div');
      listbox.className = 'dropdown-listbox';
      listbox.setAttribute('role', 'listbox');

      wrap.appendChild(trigger);
      wrap.appendChild(listbox);

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (trigger.disabled) return;
        const willOpen = !listbox.classList.contains('is-open');
        closeAll(willOpen ? listbox : null);
        listbox.classList.toggle('is-open', willOpen);
        trigger.setAttribute('aria-expanded', String(willOpen));
      });

      // Basic keyboard support: arrow keys move a highlighted option, Enter selects it.
      trigger.addEventListener('keydown', (e) => {
        if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) return;
        e.preventDefault();
        if (!listbox.classList.contains('is-open')) {
          closeAll(listbox);
          listbox.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          // Same reasoning as above: scoped to THIS dropdown's listbox, since
          // multiple dropdowns can be open across the page.
          const active = listbox.querySelector('.dropdown-option.is-active') || listbox.querySelector('.dropdown-option.is-selected');
          active?.click();
          return;
        }
        const opts = qsa('.dropdown-option', listbox);
        const activeIdx = opts.findIndex((o) => o.classList.contains('is-active'));
        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(activeIdx + 1, opts.length - 1)
          : Math.max(activeIdx - 1, 0);
        opts.forEach((o) => o.classList.remove('is-active'));
        opts[nextIdx === -1 ? 0 : nextIdx]?.classList.add('is-active');
        opts[nextIdx === -1 ? 0 : nextIdx]?.scrollIntoView({ block: 'nearest' });
      });
    }

    // (Re)build the option list from the live <select> every call, so a
    // dynamically repopulated select (fetched category list, etc.) always
    // stays in sync with what the user sees.
    listbox.innerHTML = '';
    [...selectEl.options].forEach((opt, i) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `dropdown-option${opt.selected ? ' is-selected' : ''}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(opt.selected));
      item.innerHTML = `<span>${opt.textContent}</span>${checkSvg}`;
      item.addEventListener('click', () => {
        selectEl.selectedIndex = i;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        syncTrigger(selectEl, trigger, listbox);
        listbox.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      });
      listbox.appendChild(item);
    });

    syncTrigger(selectEl, trigger, listbox);
  };

  /** Enhance every select inside a .select-wrap within the given scope. */
  const enhanceAll = (scope = document) => {
    qsa('.select-wrap select', scope).forEach(enhance);
  };

  document.addEventListener('click', () => closeAll());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  return { enhance, enhanceAll };
})();

window.DR = window.DR || {};
window.DR.dropdown = DRDropdown;

document.addEventListener('DOMContentLoaded', () => DRDropdown.enhanceAll());
