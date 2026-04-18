# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Howard's Farm is a full-stack e-commerce application for an agricultural business. It is a monorepo with a React/TypeScript frontend and a Node.js/Express backend.

- **Frontend:** Deployed to Azure Static Web Apps at `howardsfarm.org`
- **Backend:** Deployed to Azure App Service (`howards-farm-app`)

## Commands

### Frontend (project root)
```bash
npm start         # Dev server on http://localhost:3000
npm run build     # Production build
npm test          # Run tests in interactive watch mode
```

### Backend (`/backend-api`)
```bash
node server.js    # Start backend on port 3001 (or PORT env var)
```

## Architecture

### Frontend (`/src`)
- **Entry:** `src/index.js` → `src/App.tsx`
- **Routing:** `App.tsx` uses component state (`currentPage`) for most page navigation, plus React Router for the `/reset-password` route.
- **API config:** `src/config.ts` exports `API_BASE_URL` — used throughout to reach the backend. Points to `localhost:3001` in dev, production URL otherwise.
- **Styling:** Tailwind CSS 4.1 via PostCSS. Configuration in `tailwind.config.js`.
- **Payment:** Stripe Elements wrapped at the checkout component level.
- **Maps:** Google Maps loaded lazily via `src/utils/loadGoogleMaps.ts` using the key from `REACT_APP_GOOGLE_MAPS_API_KEY`.

### Backend (`/backend-api/server.js`)
A single-file Express server (~960 lines) with these main responsibilities:
- **Auth:** Session-based authentication (`express-session`) with bcrypt password hashing. Additional routes in `Auth.js`.
- **Database:** Azure SQL (MSSQL) via `db.js`. All product, order, and user data lives here.
- **Payments:** Stripe — `/create-payment-intent` creates the intent; `/checkout` finalizes the order after payment.
- **Shipping:** EasyPost API for address validation (`/api/shipping/validate-address`) and rate calculation (`/api/shipping/rates`).
- **Email:** Nodemailer (`mailer.js`) sends order confirmations and contact form submissions.
- **Admin:** `/api/admin/orders` endpoints for order management (requires admin session).

### Key Interaction Flow
1. User adds products to cart (fetched from `/products`)
2. At checkout, address is validated via EasyPost, then shipping rates are fetched
3. Frontend creates a Stripe PaymentIntent (`/create-payment-intent`)
4. On successful payment, frontend calls `/checkout` to record the order in SQL and send confirmation email

## Environment Variables

**Frontend (`.env`):**
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`
- `REACT_APP_GOOGLE_MAPS_API_KEY` (also injected via GitHub Actions secret `GOOGLE_MAPS_API_KEY`)

**Backend (`/backend-api/.env`):**
- `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD` — Azure SQL credentials
- `STRIPE_SECRET_KEY`
- `EASYPOST_API_KEY`
- `EMAIL_USER`, `EMAIL_PASSWORD` — Nodemailer credentials
- `SESSION_SECRET`

## CI/CD

Two GitHub Actions workflows deploy on push to `main`:
- **Backend:** `.github/workflows/main_howards-farm-app.yml` — zips `/backend-api` and deploys to Azure App Service
- **Frontend:** `.github/workflows/azure-static-web-apps-proud-ocean-05648161e.yml` — runs `npm run build` and deploys to Azure Static Web Apps

See `DEPLOYMENT.md` for rollback and manual deployment instructions.
