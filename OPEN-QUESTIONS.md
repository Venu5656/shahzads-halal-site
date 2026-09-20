# Open questions

Business facts I must not invent. Everything here is currently a placeholder in
code, marked with a comment pointing back at this file. Nothing can be sold to a
real customer until the items marked **BLOCKER** are answered.

## Blockers for launch

| # | Question | Where the placeholder lives | Needed by |
|---|----------|-----------------------------|-----------|
| 1 | **Menu prices** for all 14 items. | `MenuItem.basePriceCents` is `NULL` for every item; the seed never invents one. | Phase 3 |
| 2 | **NJ sales tax treatment.** Is prepared food taxed at 6.625%? Are menu prices tax-inclusive or is tax added at checkout? Is New Brunswick in an Urban Enterprise Zone (which would halve the rate)? | `StoreSettings.taxRatePpm` defaults to `66_250` (6.625%); `NJ_SALES_TAX_PPM` in `src/lib/money.ts`. Confirm with the restaurant's accountant — I am not qualified to decide this. | Phase 4 |
| 3 | **Who is legally taking the payments.** The Stripe account holder must be the restaurant's business entity, with its own EIN and bank account — not me and not you personally. | No code yet. | Phase 4 |
| 4 | **Stripe account** — created, business details verified, bank account attached. Also: is PayPal enabled on it? (I will verify whether Stripe's PayPal payment method is available for US accounts before writing any PayPal code.) | `.env.example` → `STRIPE_*` | Phase 4 |
| 5 | **Twilio account + A2P 10DLC registration.** US carriers reject unregistered application-to-person SMS. Approval takes days to weeks — start this now, it is the longest lead time in the project. | `.env.example` → `TWILIO_*` | Phase 2 |
| 6 | **Printer decision** (see phase 6 options) and whether there is a PC or spare tablet in the store. | No code yet. | Phase 6 |
| 7 | **Domain name** and who controls the DNS. Needed for Apple Pay domain verification and for the SMS/email sender identity. | `.env.example` → `NEXT_PUBLIC_SITE_URL` | Phase 4 |
| 8 | **Privacy policy and terms pages.** We will store phone numbers and order history, and send SMS — both require a published privacy policy, and the SMS consent language has to appear at sign-up. | No code yet; sign-up already has the consent checkboxes wired for it. | Phase 2 |
| 9 | **Owner's phone number** for the first `OWNER` account. | `prisma/seed.ts` reads `SEED_OWNER_PHONE`; nothing is created without it. | Phase 2 |

## Smaller decisions I have made provisionally

These have a working default. Tell me if any is wrong and I will change it.

1. **Which items come with a free sauce choice.** Seeded as: all Platters and all
   Gyros (8 items). Cheesesteaks, burgers and sides do not. The homepage copy
   says "every platter and gyro", but Onion Rings also mentions sauces.
2. **Sauce rules.** "Sauce choice" is min 0, max 2, free — the half-and-half the
   homepage advertises. Confirm whether two is really allowed, and whether extra
   sauce costs anything.
3. **Paid option groups.** The brief mentions "Extra meat (+price)" as an
   example. None are seeded, because I do not know the surcharges. Send me the
   list of paid add-ons and their prices with the menu prices.
4. **Item badges.** "Signature", "Popular", "Must-try" and "Meal deal" are kept
   from the current homepage as `MenuItem.badge`. Confirm these are still right.
5. **Opening hours** are taken from the current site: Mon–Sat 10:00–03:00,
   Sun 12:00–03:00 (America/New_York). Holidays are not modelled yet; phase 7
   adds per-day overrides.
6. **Cheeseburger description** says it "comes with fries & a soda" — so it is a
   combo. Is it a separate item from a plain cheeseburger?
7. **Pickup lead time.** How many minutes after ordering is the earliest ASAP
   pickup — 15? 20? Needed for the checkout time picker in phase 3/4.
8. **Order cut-off.** Should online ordering stop before the 3 AM close (say, at
   2:45 AM) so the kitchen can finish?

## Things I flagged as risks

- **Homepage "Order now" buttons still point at DoorDash.** They stay that way
  until our own checkout is live in phase 4, at which point we switch them over.
  Note that DoorDash's merchant agreement may have terms about steering
  customers to your own ordering — worth a look before we flip the switch.
- **`prisma` CLI currently pulls a package with a published advisory**
  (`deepmerge-ts` stack exhaustion, via `@prisma/config`). It is a build-time
  dependency only, never runs in production, and the fix requires an older
  Prisma. Tracked for the hardening phase.
- **A strict Content-Security-Policy is not in place yet.** The ported homepage
  uses inline styles and embeds Google Maps, so the policy needs a nonce-based
  design; that is phase 8 work, and the other security headers are already set.
