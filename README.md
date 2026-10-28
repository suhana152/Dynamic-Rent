# DynamicRent

A rental marketplace (cars, villas, gear and more) built around one idea: **you should be able to see exactly how your price was calculated before you book.**

- **Phase 1:** frontend with HTML5, CSS3 and vanilla JavaScript
- **Phase 2:** Node.js + Express backend with MongoDB, deployed and connected to the same frontend

## Live links

| What | Link |
|---|---|
| Website (frontend, Vercel) | https://dynamic-rent-wvj6.vercel.app/ |
| API (backend, Render) | https://dynamicrent-api.onrender.com |
| Health check | https://dynamicrent-api.onrender.com/api/health |

> The API runs on a free Render instance, so the first request after a period of inactivity can take 30-60 seconds while the server wakes up.

## Features

- Browse and filter 37 listings across 16 categories (data served from MongoDB)
- **Transparent dynamic pricing engine**, calculated on the server: base price x days, demand multiplier, lead-time adjustment, weekend premium, duration discount and coupon codes
- Sign up and log in with **bcrypt** password hashing and **JWT** authentication
- Bookings saved in MongoDB, with a double-booking (date overlap) check
- My Bookings page with cancel
- Profile page with editable details and **profile photo upload (Multer)**
- Coupons stored in the database and verified on the server

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript (ES6+) |
| Backend | Node.js, Express |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT, bcryptjs |
| File upload | Multer |
| Deployment | Vercel (frontend), Render (backend) |
| API testing | Thunder Client / Postman |

## Architecture (MVC)

```
Dynamic-Rent/
├── backend/
│   ├── config/        database connection
│   ├── models/        M: Mongoose schemas (User, Listing, Booking, Coupon)
│   ├── controllers/   C: business logic for each route
│   ├── routes/        URL to controller mapping
│   ├── middleware/    JWT auth (protect, adminOnly) and Multer upload
│   ├── utils/         pricing engine
│   ├── seed.js        loads the 37 listings into MongoDB
│   ├── seedCoupons.js loads the coupon codes
│   └── server.js      Express app entry point
└── frontend/          V: the views (HTML, CSS, JS)
    ├── js/config.js   the API address lives here
    └── js/api.js      every call to the backend goes through this file
```

## API endpoints

Base URL: `https://dynamicrent-api.onrender.com/api`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | none | Server status |
| POST | `/auth/register` | none | Create an account |
| POST | `/auth/login` | none | Log in and receive a JWT |
| GET | `/auth/me` | token | Current user |
| GET | `/listings` | none | List with `category`, `city`, `search`, `minPrice`, `maxPrice`, `sort`, `page`, `limit` |
| GET | `/listings/:id` | none | One listing |
| POST | `/listings` | admin | Create a listing |
| PUT | `/listings/:id` | admin | Update a listing |
| DELETE | `/listings/:id` | admin | Delete a listing |
| POST | `/pricing/quote` | none | Full price breakdown for a listing and dates |
| POST | `/bookings` | token | Create a booking (price recalculated on the server) |
| GET | `/bookings/my` | token | The logged-in user's bookings |
| PATCH | `/bookings/:id/cancel` | token | Cancel a booking |
| PUT | `/users/me` | token | Update name and phone |
| POST | `/users/avatar` | token | Upload a profile photo (multipart, JPG/PNG/WEBP, max 2 MB) |

## Run it locally

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```
PORT=5001
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=a_long_random_secret
```

Load the data and start the server:

```bash
node seed.js
node seedCoupons.js
npm run dev
```

### Frontend

Open `frontend/index.html` with a local server (for example the VS Code **Live Server** extension).
To use your local backend, change `API_URL` in `frontend/js/config.js` to `http://localhost:5001/api`.

## Security notes

- Passwords are hashed with bcrypt and never returned by the API
- Protected routes check a JWT sent as `Authorization: Bearer <token>`
- The final price is always recalculated on the server; the browser's price is never trusted
- Card payment is a **simulated** gateway (no real charge is made)
- `.env` is never committed

## Authors

Built for the Back End Engineering course (CE2).

---

# Phase 1 notes (original README)

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

Clone the repo and serve the `frontend` folder over HTTP — **don't just double-click `index.html`.**

```bash
git clone https://github.com/suhana152/Dynamic-Rent.git
cd Dynamic-Rent/frontend
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