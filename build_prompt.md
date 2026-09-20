# Build prompt for Claude Code — Shahzad's Halal Food ordering platform

Paste everything below the line into Claude Code in VS Code, with the existing
site folder open. Read the "Before you paste" notes at the very bottom first.

---

## Project

I have a finished marketing homepage for a halal restaurant in `index.html`
(plain HTML/CSS/JS, with `img/` and `fonts/` beside it). I want you to turn this
folder into a full online-ordering platform without changing how the homepage
looks or animates.

Business: Shahzad's Halal Food, 152 Easton Ave, New Brunswick, NJ 08901.
Phone (848) 202-1430. Open Mon–Sat 10:00–03:00, Sun 12:00–03:00 (America/New_York).
Pickup only. Payment is always taken online — there is no pay-at-pickup.

Work in phases (listed at the end). Stop after each phase, tell me what you
built, how to test it, and what I need to give you before the next phase.

## Stack (use exactly this unless you tell me why it's wrong first)

- **Next.js (App Router) + TypeScript + Tailwind CSS**, deployed to Vercel.
- **PostgreSQL + Prisma** (local Docker Postgres for dev, Neon or Supabase in prod).
- **Auth.js (NextAuth)** with a phone + OTP credentials provider, JWT sessions
  in httpOnly cookies, plus a separate role-gated admin area.
- **Twilio Verify** for OTP SMS.
- **Stripe** for payments: Stripe Elements for cards, Apple Pay and Google Pay
  through the Payment Request Button, and PayPal through Stripe's PayPal payment
  method (fall back to the PayPal JS SDK only if Stripe PayPal isn't available in
  the US for this account — check and tell me before choosing).
- **Zod** for validating every input, server-side, on both API routes and forms.
- **Vitest + Playwright** for tests.

Keep the existing homepage as a static-feeling page: port its markup and CSS into
the Next app (a global stylesheet is fine — do not rewrite it into Tailwind
utility classes), keep the ember canvas, orbit, marquee, sauce picker and live
hours dial working, and keep the `img/` and `fonts/` assets self-hosted.

## 1. Accounts, sign-up and login (phone OTP)

- Header gets **Sign in** and **Sign up** next to the existing Order button, plus
  an account menu when signed in (Orders, Profile, Sign out).
- **Sign up fields:** full name, mobile number (US, E.164), email (optional but
  used for receipts), password is NOT used — OTP only. Checkbox to accept terms,
  optional checkbox for SMS marketing (must be separate and unticked by default).
- **Login:** enter mobile number → 6-digit OTP → session.
- OTP rules: 6 digits, 5-minute expiry, max 5 attempts per code, max 5 codes per
  number per hour, resend allowed after 30 seconds, codes stored only as hashes,
  rate-limit per IP and per number. Never reveal whether a number is registered.
- Sessions last 30 days, refresh on use, "sign out of all devices" in Profile.
- Guest checkout is NOT allowed — an order requires a verified phone number.

## 2. Database

Design a Prisma schema and generate migrations. At minimum:

- `User` — id, name, phone (unique, verified flag), email, role (CUSTOMER |
  MANAGER | OWNER), marketingOptIn, createdAt, lastLoginAt.
- `OtpCode` — phone, codeHash, expiresAt, attempts, consumedAt.
- `Category`, `MenuItem` — name, slug, description, imagePath, basePriceCents,
  categoryId, isAvailable, outOfStockUntil, sortOrder, isActive, tags
  (halal/veggie/spicy), createdAt/updatedAt.
- `OptionGroup` / `Option` — e.g. "Sauce choice" (min 0, max 2, free), "Extra
  meat" (+priceCents). Groups attach to items, with min/max selection rules.
- `Order` — orderNumber (short human code like SH-4821), userId, status
  (PENDING_PAYMENT | PAID | CONFIRMED | PREPARING | READY | PICKED_UP |
  CANCELLED | REFUNDED), subtotalCents, taxCents, tipCents, totalCents,
  paymentIntentId, paymentMethod, pickupAt, customerNote, printedAt,
  timestamps for each status change.
- `OrderItem` — orderId, menuItemId, nameSnapshot, unitPriceCents, quantity,
  selected options snapshot (JSON), lineTotalCents.
- `PriceChange` / `AuditLog` — who changed what, old value, new value, when.
  Every manager action gets an audit row.

Money is always **integer cents**, never floats. Store all timestamps in UTC and
render in America/New_York. Snapshot names and prices onto the order so past
orders never change when the menu changes. Seed the database from the 14 items
currently hard-coded in `index.html` (keep the same images), with prices as
`null`/hidden until I supply the real ones.

## 3. Menu, cart and checkout

- `/menu` — all items, category filters, search, out-of-stock items visibly
  greyed out with a "Sold out" badge and not addable.
- Item detail (modal on desktop, full page on mobile): photo, description,
  option groups (sauce choice comes from the six sauces already on the homepage),
  quantity stepper, special-instructions text field, live price total.
- Cart: slide-over panel, persists in localStorage for guests and in the database
  once signed in, editable quantities and options, item count badge in the header.
- `/checkout` — signed-in only, shows pickup-only notice, name and phone
  pre-filled, requested pickup time (ASAP or a slot, only within open hours),
  optional tip (0/10/15/20/custom), NJ sales tax calculated server-side, order
  summary, then payment.
- **Re-price and re-validate the entire cart on the server at checkout.** Never
  trust prices, availability or totals from the client. Reject the order if any
  item went out of stock or changed price, and show the customer what changed.
- Block checkout when the store is closed, with the next opening time.

## 4. Payments

- Stripe PaymentIntent created server-side from the server-computed total.
- Card via Stripe Elements; Apple Pay and Google Pay via Payment Request Button
  (include the domain-verification file and setup steps in the README); PayPal
  as a Stripe payment method.
- The order is only created as `PAID` by the **Stripe webhook**
  (`payment_intent.succeeded`), never by the browser redirect. Verify the webhook
  signature. Make webhook handling idempotent by event id.
- Handle failures, 3-D Secure, and abandoned payments (expire `PENDING_PAYMENT`
  orders after 30 minutes).
- Refunds triggered from the manager dashboard, recorded in the audit log.
- Customer gets an SMS and an email confirmation with the order number and
  pickup time.
- PCI: card data must only ever touch Stripe's iframes. No card numbers in our
  database, logs or analytics.

## 5. Manager area (`/manager`)

Separate, role-gated area at its own route (not a separate domain for now, but
keep the code in one `(manager)` route group so it can move to
`manager.<domain>` later). Only MANAGER and OWNER roles, protected by middleware.

- **Live orders board:** new paid orders appear in real time (Server-Sent Events
  or polling every 5s), with a loud repeating sound and browser notification
  until acknowledged. Columns: New → Confirmed → Preparing → Ready → Picked up.
- **Confirm** on an order sets status CONFIRMED and **automatically prints the
  ticket**.
- Order detail: items, options, special instructions, customer name and phone,
  payment method, totals, timestamps. Buttons: confirm, reprint, mark ready,
  cancel + refund.

### Printing — ask me before building

Automatic printing needs hardware I have to choose. Present these options with
pros, cons and cost, then wait for my answer:

1. **Star CloudPRNT or Epson ePOS** thermal printer that polls our server for
   jobs (no PC required, most reliable for a restaurant).
2. A small **print agent** (Node script on a PC/Raspberry Pi in the store) that
   subscribes to new confirmed orders and prints to any connected printer via
   ESC/POS.
3. **PrintNode** or similar hosted service (easiest, monthly fee).

Whatever we pick: generate a 80mm ESC/POS ticket with store name, order number,
pickup time, customer name and last 4 of phone, each item with options and
instructions, totals, and a PAID marker. Queue jobs in the database with retry,
mark `printedAt`, and show a clear "printer offline" warning in the dashboard.
Always keep a manual Reprint button.

## 6. Manager dashboard and controls

- **Analytics:** revenue and order count by day, week and month, with date-range
  picker and comparison to the previous period; average order value; orders by
  hour of day (so they can see the late-night rush); top-selling items;
  most-chosen sauces; new vs returning customers; refunds and cancellations.
  Charts server-rendered from SQL aggregates, CSV export for any view.
- **Menu control:** edit name, description, photo and price of any item; changes
  appear on the customer site immediately (revalidate the cached menu on save).
  Price edits ask for confirmation, show the old price, and write an audit row.
- **Stock control:** an out-of-stock toggle per item, and "sold out until
  tomorrow" / "sold out for 2 hours" options. Out-of-stock items show a blocked
  badge on the customer site, can't be added to a cart, and are auto-removed from
  carts at checkout.
- **Store control:** pause all ordering ("kitchen is slammed") with a message
  shown to customers, and adjust today's hours.
- **Staff:** owner can invite managers by phone number and revoke them.

## Non-negotiables

- **Security:** every server action and route handler re-checks the session and
  role. Validate all input with Zod. Parameterized queries only (Prisma). CSRF
  protection on mutations. Rate-limit OTP, login and checkout. Security headers
  and a strict CSP. Secrets only in env vars — never commit `.env`; ship
  `.env.example`. Never log OTPs, tokens, or full phone numbers.
- **Correctness:** all money in cents; all totals computed server-side; all
  order state changes go through one state machine function with allowed
  transitions; webhooks idempotent.
- **Accessibility:** keyboard-navigable, focus states, labelled form fields,
  respects `prefers-reduced-motion` (the homepage already does), colour contrast
  at least 4.5:1.
- **Mobile first** — most orders will be placed on a phone at 1 AM.
- **Tests:** unit tests for pricing, tax, option rules and the order state
  machine; Playwright end-to-end for sign-up → add to cart → pay (Stripe test
  mode) → manager confirms → ticket generated.
- **Docs:** a README covering local setup, env vars, how to run migrations and
  seeds, Stripe and Twilio test instructions, printer setup, and deployment.

## Phases — stop and check in after each

1. **Scaffold:** Next.js + TypeScript + Tailwind + Prisma, homepage ported over
   and pixel-identical, Docker Postgres, seed script, CI running lint + tests.
2. **Auth:** phone OTP sign-up and login, sessions, profile page, rate limits.
3. **Menu + cart:** menu from the database, item options, cart, persistence.
4. **Checkout + payments:** server-side pricing, Stripe card/Apple Pay/PayPal,
   webhook-driven order creation, confirmation SMS and email.
5. **Manager orders:** role-gated area, live order board, status flow, refunds.
6. **Printing:** whichever option I choose, plus the queue and reprint.
7. **Dashboard + controls:** analytics, price editing, out-of-stock, store pause.
8. **Hardening:** security review, load check, monitoring and error tracking,
   deployment to Vercel with a staging environment.

## How I want you to work

- Before each phase, list the files you will create or change and any decisions
  you need from me. Don't invent business facts (prices, tax rate, certification)
  — use a clearly marked placeholder and add it to an OPEN-QUESTIONS.md.
- Small, reviewable commits with clear messages.
- After each phase, run the tests and a build, and paste a short test plan I can
  follow by hand.
- If something I asked for is a bad idea (cost, legal, PCI, deliverability),
  say so and propose the alternative before writing code.

---

## Before you paste this — things only you can decide

These will block Claude Code partway through, so have answers ready:

- **Menu prices** and the tax treatment (NJ prepared-food sales tax rate, and
  whether listed prices include it).
- **Stripe account** for the restaurant (business details, bank account) and
  whether PayPal is enabled on it.
- **Twilio account** with an A2P 10DLC registration — US SMS to customers needs
  this and it takes days to approve. Start it early.
- **Printer decision** (see section 5) and whether there's a PC in the store.
- **Domain name** and who owns it.
- **Who is legally responsible** for taking payments — this platform charges real
  customers, so the restaurant owner's business entity must be the Stripe
  account holder, not you.
- A privacy policy and terms page, since you'll be storing phone numbers.