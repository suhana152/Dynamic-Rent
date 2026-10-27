# DynamicRent

A rental marketplace concept — cars, villas, gear, and more — built around one idea: **you should be able to see exactly how your price was calculated before you book.**

This is **Phase 1**: a frontend-only demo built with HTML5, CSS3, and vanilla JavaScript (ES6+). No frameworks, no build step, no backend — just a local JSON "database" and `localStorage` standing in for a real API, so the whole experience can be explored end to end in a browser.

> 🔗 **Live Website:** https://dynamic-rent-wvj6.vercel.app/
## ✨ What's in it

- **Browse & filter** a catalog of 37 listings across 16 categories (cars, luxury cars, motorcycles, villas, apartments, camping gear, drones, cameras, and more)
- **A transparent dynamic pricing engine** — the core feature. Every price is built up from a fixed set of visible rules: base price × days, a demand multiplier, a lead-time adjustment, a weekend premium, duration discounts, and coupon codes. There's also an interactive simulator on the Pricing Engine page so you can play with the inputs yourself.
- **Booking flow** with a details page, date selection, and a simulated payment step (client-side validation only — no real charge is ever made)
- **Accounts** — sign up / log in, stored in `localStorage` for the demo (see security note below)
- **My Bookings & Profile** pages for managing your (locally stored) reservations
- **Dark mode, currency switcher, and responsive layout** throughout
- Supporting pages: About, Contact, Pricing, 404

## 🧮 The pricing engine

This is the heart of the project (`js/pricing.js`). Every rental's final price is derived step by step, in this order:

```
Subtotal            = Base Price × Days
→ Demand Adjustment  = Subtotal × Demand Multiplier      (low / medium / high / peak)
→ Lead Time          = ± based on how far ahead you book (early-bird discount / last-minute surcharge)
→ Weekend Adjustment = + a per-weekend-day premium
→ Duration Discount  = − a percentage for longer rentals (7+ / 14+ days)
→ Coupon Discount    = − a percentage from a valid coupon code
= Final Total
```

Nothing is hardcoded — the same function powers the listing details page, the booking page, and the standalone simulator on the Pricing Engine page, so the price you're quoted is always reproducible from the same inputs.

## 🗂️ Project structure

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

## 🚀 Getting started

Clone the repo and serve the `DynamicRent` folder over HTTP — **don't just double-click `index.html`.**

```bash
git clone https://github.com/suhana152/Dynamic-Rent.git
cd Dynamic-Rent/DynamicRent
```

### ⚠️ Why a local server?

Every page loads its data with `fetch()` (listings, categories, FAQ, testimonials — see `/data/*.json`). Browsers block `fetch()` from reading local files when a page is opened directly as `file:///...` — that's a CORS restriction, not a bug in this code. Opened that way, the page will load but every data-driven section (listings, pricing, the price forecast calendar, etc.) will silently stay empty. You'll also see a banner across the top of the site warning you if this happens.

**Option 1 — double-click a launcher**
- macOS/Linux: `start-server.command`
- Windows: `start-server.bat`

Then open **http://localhost:8000**.

**Option 2 — from a terminal, in the `DynamicRent` folder**
```bash
python3 -m http.server 8000
# or
npx serve .
```
Then open **http://localhost:8000**.

**Option 3 — an editor extension**
VS Code's "Live Server" extension (right-click `index.html` → *Open with Live Server*) works too.

## 🔒 What's demo-only (Phase 1)

This is intentionally a frontend-only prototype, so a few things are simulated rather than real:

- **Payment** (`js/payment.js`) validates card details client-side and simulates gateway latency — no real charge is ever made and no payment provider is integrated.
- **Accounts** (`js/auth.js`) live in `localStorage` only, scoped to your browser. Passwords are lightly obfuscated for the demo, **not securely hashed** — please don't reuse a real password here.
- All bookings, favorites, and price watches persist in `localStorage` until you clear your browser data.

## 🛣️ Roadmap — Phase 2

The plan is to swap the local JSON + `localStorage` layer for a real stack:
- **React** frontend
- **Express** APIs
- **MongoDB** for persistence, real accounts, and real bookings

See the About page in the app for more on the roadmap.

## 🛠️ Tech stack

| Layer     | Tech                                  |
|-----------|----------------------------------------|
| Markup    | HTML5                                  |
| Styling   | CSS3 (custom properties, no framework) |
| Behavior  | Vanilla JavaScript (ES6+)              |
| Data      | Static JSON (`/data`)                  |
| Persistence | `localStorage`                       |
| Build tools | None — it's a static site           |

## 🤝 Contributing

This is currently a personal/learning project, but issues and pull requests are welcome if you spot a bug or have an idea for the pricing engine.

## 📄 License

No license has been specified yet — all rights reserved by default until one is added.
