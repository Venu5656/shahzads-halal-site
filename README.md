# Shahzad's Halal Food — ordering platform

Online ordering for Shahzad's Halal Food, 152 Easton Ave, New Brunswick, NJ.
Pickup only, paid online. Next.js (App Router) + TypeScript + Tailwind +
PostgreSQL/Prisma, deployed to Vercel.

The marketing homepage from the old static site is preserved exactly as it was —
same markup, same stylesheet, same animations. See
[Homepage port](#the-homepage-port) before touching it.

**Status: phase 1 of 8 (scaffold).** Nothing is orderable yet. See
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) for what I need from you.

## Local setup

Requires Node 22+ and any Postgres 14+. Docker is optional — see below.

```bash
npm install
cp .env.example .env          # then fill in what you have
createdb shahzads             # needs Postgres running; see options below
npx prisma migrate deploy     # create the schema
npm run db:seed               # 4 categories, 14 items, 6 sauces
npm run dev                   # http://localhost:3000
```

Open **http://localhost:3000**, not `127.0.0.1:3000` — the Next dev server
blocks its own dev resources on a different host, which leaves the page
unhydrated and the menu grid empty.

### Getting a Postgres

**Homebrew (simplest on a Mac):**

```bash
brew install postgresql@16
brew services start postgresql@16
createdb shahzads
# DATABASE_URL="postgresql://$USER@localhost:5432/shahzads?schema=public"
```

Your macOS username is the database superuser and there is no password, which
is why the URL has no `:password` in it.

**Docker (matches production more closely, and is what CI uses):** install
Docker Desktop (`brew install --cask docker`, then launch it once), then:

```bash
npm run db:up                 # docker compose up -d db
# DATABASE_URL="postgresql://shahzad:shahzad@localhost:5432/shahzads?schema=public"
```

Note that `pip install docker` installs a Python client library, not Docker
itself — it will not give you the `docker` command.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end tests (builds first) |
| `npm run db:up` / `db:down` | Start / stop the Docker Postgres |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Seed the menu (idempotent) |
| `npm run db:studio` | Prisma Studio, a GUI over the database |

## Environment variables

Copy `.env.example` to `.env` and fill in. Never commit `.env`. Only
`DATABASE_URL` is needed today; the rest land in later phases.

| Variable | Needed by | Notes |
|----------|-----------|-------|
| `DATABASE_URL` | now | Postgres connection string |
| `NEXT_PUBLIC_SITE_URL` | now | Used for absolute links and callbacks |
| `AUTH_SECRET` | phase 2 | `openssl rand -base64 32` |
| `TWILIO_*` | phase 2 | OTP SMS via Twilio Verify; needs A2P 10DLC |
| `STRIPE_*` | phase 4 | Payments and webhook signature verification |
| `RESEND_API_KEY`, `RECEIPT_FROM_EMAIL` | phase 4 | Emailed receipts |
| `PRINT_AGENT_TOKEN` | phase 6 | Shared secret for the in-store printer |
| `SEED_OWNER_PHONE`, `SEED_OWNER_NAME` | optional | Creates the first OWNER account when seeding |

## Project layout

```
src/app/                 App Router pages
  layout.tsx             <html>/<body>, metadata, global stylesheet
  page.tsx               the homepage markup (ported 1:1)
  globals.css            Tailwind + the original homepage stylesheet
src/components/home/     homepage behaviour (client components)
src/lib/                 hours, menu data, money, Prisma client
prisma/schema.prisma     the data model
prisma/seed.ts           idempotent menu seed
tests/unit/              Vitest
tests/e2e/               Playwright
legacy/index.html        the original static site, kept for reference
public/img, public/fonts self-hosted assets (unchanged)
```

## The homepage port

The homepage has to keep looking and animating exactly as it did, so it was
ported rather than rewritten:

- **`src/app/globals.css`** contains the original `<style>` block verbatim, with
  only the font and image URLs rebased to `/fonts` and `/img`. It lives in a
  `legacy` cascade layer declared between Tailwind's `base` and `components`
  layers — Tailwind's reset cannot override the homepage, and Tailwind utility
  classes still win on every new page. **Do not rewrite this into utilities.**
  Two preflight rules that the original relied on browser defaults for (`svg`
  display and `sub`/`sup` alignment) are restored at the end of that file,
  scoped to the two elements that need them.
- **`src/app/page.tsx`** holds the markup. The containers the script fills
  (`#tabs`, `#grid`, `#sauceBtns`, `#sauceInfo`, `#days`, `#dialSvg`) are
  rendered empty, exactly as they were in the static page, so React never
  fights the script over that DOM.
- **`src/components/home/HomeInteractions.tsx`** is the original script, split
  into effects and given the cleanup React needs. Ember canvas, orbit, marquee,
  card tilt, sauce picker and the live hours dial all behave as before.
- The menu grid and sauce picker are fed from `src/lib/menu-data.ts`, which is
  also what the database seed reads — so the homepage and the database can
  never drift. Phase 3 swaps that prop for a database query.

Verified during phase 1: rendering the ported page and the original
side by side at 1280px and 390px produces identical document heights and
identical geometry for every section, with the only pixel differences being the
live clock and the phase of the auto-advancing animations.

The "Order now" buttons still point at DoorDash. They switch to our own
checkout in phase 4.

## Testing

```bash
npm test          # pricing, tax, opening hours, menu data
npm run test:e2e  # homepage renders, menu filters, drawer, no third-party assets
```

End-to-end runs against a production build on port 3100, in desktop Chromium and
an iPhone 13 (WebKit) profile.

## Deployment

Not wired up yet — phase 8. The plan: Vercel for the app, Neon or Supabase for
Postgres, with a staging environment that mirrors production and uses Stripe and
Twilio test credentials.

## Conventions

- **Money is always integer cents.** Never floats, never dollar strings in the
  database. Formatting happens at the edge (`src/lib/money.ts`).
- **Timestamps are stored in UTC** and rendered in America/New_York.
- **Order history is immutable**: names, prices and chosen options are
  snapshotted onto the order, so editing the menu never rewrites a past order.
- **Every input is validated server-side with Zod**, on both route handlers and
  server actions, and every one of them re-checks the session and role.
