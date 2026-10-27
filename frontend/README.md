# DynamicRent — Phase 1

A frontend-only rental pricing demo: HTML5, CSS3, and vanilla JavaScript
(ES6+) only — no frameworks, no build step, no backend.

## ⚠️ Run this with a local server — don't just double-click index.html

Every page loads its data with `fetch()` (rentals, categories, FAQ,
testimonials — see `/data/*.json`). Browsers block `fetch()` from reading
local files when a page is opened directly as `file:///...` — it's a CORS
restriction, not a bug in this code. Opened that way, the page will load
but every data-driven section (listings, pricing, the price forecast
calendar, etc.) will silently stay empty. **You'll also see a banner
across the top of the site telling you this, if it happens.**

Fix: serve the folder over `http://` instead. Any of these work:

**Option 1 — double-click a launcher**
- macOS/Linux: `start-server.command`
- Windows: `start-server.bat`

Then open **http://localhost:8000** in your browser.

**Option 2 — from a terminal, in this folder**
```bash
python3 -m http.server 8000
# or
npx serve .
```
Then open **http://localhost:8000**.

**Option 3 — an editor extension**
VS Code's "Live Server" extension (right-click `index.html` → *Open with
Live Server*) works too.

## Project structure

```
index.html, browse.html, details.html, booking.html, pricing.html,
about.html, contact.html, login.html, signup.html, my-bookings.html,
profile.html, 404.html

/css      variables.css, style.css, animations.css, responsive.css
/js       utils, storage, fetchData, validation, pricing, payment,
          auth, script (render layer), ui, animations, plus one
          script per page (home, browse, details, booking, ...)
/data     listings.json, categories.json, testimonials.json, faq.json,
          featured.json
```

## What's demo-only (Phase 1)

- **Payment** (`js/payment.js`) validates card details client-side and
  simulates gateway latency — no real charge is ever made.
- **Accounts** (`js/auth.js`) live in `localStorage` only, scoped to
  this browser. Passwords are lightly obfuscated, not securely hashed —
  do not reuse a real password here.
- All bookings, favorites, and price watches persist in this browser's
  `localStorage` until cleared.

Phase 2 (planned) swaps the local JSON + localStorage layer for a React
frontend, Express APIs, and MongoDB — see the About page for the roadmap.
