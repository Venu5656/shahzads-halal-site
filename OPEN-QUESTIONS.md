# Open questions

Business facts I must not invent. Everything here is currently a placeholder in
code, marked with a comment pointing back at this file. Nothing can be sold to a
real customer until the items marked **BLOCKER** are answered.

## Blockers for launch

| # | Question | Where the placeholder lives | Needed by |
|---|----------|-----------------------------|-----------|
| 1 | ~~Menu prices~~ — **answered.** 21 items priced from the owner's photo list and `menu prices/rules.txt`. | `src/lib/menu-data.ts` | Done |
| 2 | ~~NJ sales tax rate~~ — **answered**: 6.625%, New Jersey's statutory rate. | `StoreSettings.taxRatePpm` = 66_250 | Done |
| 3 | ~~Who is legally taking the payments~~ — **answered**: the business owner is the Stripe account holder. The account must still be opened in the business entity's name with its EIN and bank details. | Phase 4 | Done |
| 4 | **Stripe account** — the owner creates it and adds the developer as a team member. Test keys unblock all of phase 4; the business entity, EIN and bank account are only needed before the first real charge. | `.env.example` → `STRIPE_*` | Phase 4 |
| 4b | ~~PayPal~~ — **decided: not offered.** Stripe's PayPal payment method is unavailable to US-based merchants ([Stripe's own list](https://support.stripe.com/questions/paypal-payment-method-availability) is the EU except Hungary, Liechtenstein, Norway, the UK and Switzerland). Doing it separately would mean a second merchant account, a second webhook, a second refund path and monthly reconciliation across two places. Card, Apple Pay and Google Pay cover it. | `PaymentMethod` enum keeps a `PAYPAL` value so the decision is reversible without a migration | Done |
| 5 | **Twilio account + A2P 10DLC registration**, if you want order-ready texts or a verified phone number later. Approval takes days to weeks. Not needed for accounts any more — email verification replaced it. | `.env.example` → `TWILIO_*` | Phase 4-6 |
| 6 | **Printer decision** (see phase 6 options) and whether there is a PC or spare tablet in the store. | No code yet. | Phase 6 |
| 7 | **Domain name** and who controls the DNS. Needed for Apple Pay domain verification and for the SMS/email sender identity. | `.env.example` → `NEXT_PUBLIC_SITE_URL` | Phase 4 |
| 8 | **A domain, and email authentication on it.** Verification and reset links need a real sending domain with SPF, DKIM and DMARC records, plus a Resend (or equivalent) account. Until then mail sends from the provider's shared domain in development only, and would land in spam in production. | `.env.example` → `RESEND_API_KEY`, `RECEIPT_FROM_EMAIL` | Before launch |
| 9 | **Privacy policy and terms pages — a lawyer's review.** Drafts are now live at `/legal/terms` and `/legal/privacy`, describing what the software actually does with personal data. They are marked as drafts on the page and are not binding text. Sign-up requires ticking a box that links to both. Twilio will also ask to see them if you ever register for SMS. | `src/app/legal/` | Before launch |
| 10 | **Owner's email and phone number** for the first `OWNER` account. | `prisma/seed.ts` reads `SEED_OWNER_EMAIL` and `SEED_OWNER_PHONE`; nothing is created without them. | Phase 2 |

## Decisions I made in phase 2

1. **Phone number + password**, at your instruction to drop SMS codes. Accounts
   are created instantly, with nothing texted.
2. **Nothing proves a phone number belongs to the person who typed it.** That is
   the trade for dropping codes. It matters most at pickup: someone could sign
   up with a number that is not theirs, so staff should keep checking the name
   on the order. It also means a customer who mistypes their number will not
   get a call about their food. If that turns out to bite, phone verification
   can be added later without changing anything else.
3. **Passwords are scrypt-hashed** with per-password salts, and never stored or
   logged in the clear.
4. **Sessions are stored in the database**, not signed tokens, so "log out of
   all devices" takes effect immediately — and changing the password does the
   same thing.
5. **US and Canadian numbers only** (+1), since the store is in New Brunswick.
6. **A number can hold exactly one account**, and sign-up says so plainly when
   the number is taken. That does reveal whether a number is registered; the
   alternative (staying vague) would leave people stuck with no way forward.
   Logging in reveals nothing.
7. **Managers are invited, never self-registered.** The invite screen is phase
   5; today an owner is set with one SQL update (see the README).

## Still needed to finish the menu

The menu is now transcribed from the printed board in the shop — names, prices
and section names exactly as they read. 53 dishes across the 8 sections.

| # | Question | Why it matters |
|---|----------|----------------|
| A | **"No Salad +$2" is printed on the board**, but you asked for it to be free. The site charges nothing. Which is right? | It is on all nine platters. |
| B | **The board prices the Chicken & Lamb gyro at $9.99**, while you earlier said the combo gyro was $13.99. The site uses the board's $9.99. | A $4 difference on a popular item. |
| C | **Cutouts for thirteen dishes.** Chapli Kabab Mix, 2 Pc Fish Pita, Mix Chapli, Masala Fries, Curly Fries, Salad, Pita Bread, 6 Pc Chicken Tenders, Cheese Cake, Chocolate Cake, Red Velvet Cake and Gulab Jamun show a branded tile rather than a photo. Everything else now uses the cutouts from `menu prices/cutout/`. | They look deliberate, not broken — but a photo sells food. |
| D | **Snapple flavours.** Sold as one $2.99 item; if the fridge has a fixed set, it can ask which one the way the soda does. | Small. |
| E | **Sales tax on the new lines.** Desserts, Snapple and the sodas are all taxed at 6.625%; only bottled water is exempt. Worth confirming with the accountant now that there are cakes on the menu. | Wrong tax is a real liability. |

Everything else is live as the board prints it: 6.625% tax with bottled water
exempt, "Add Fries & Soda" at $5 on a gyro and $4.99 on a sandwich, free sauce
on platters and gyros with Extra Sauces orderable on their own, the four wing
sizes, Sm/Lg on the fries and rings, and 20 minutes pickup lead time counted
from confirmation.

## Checkout decisions, as answered

| Decision | Answer, now live |
|----------|------------------|
| Sales tax | 6.625% on everything **except bottled water**, which is exempt. Taxability is per item (`MenuItem.isTaxable`), and the tax is rounded once over the taxable subtotal rather than line by line |
| Tips | **Not collected.** No tip UI at all. `Order.tipCents` stays 0 and the seam is kept open in the quote, so adding it later is a UI change rather than a data change |
| Order cut-off | **2:40 AM** — twenty minutes before the 3 AM close, so the last ticket can be cooked and collected |
| Pickup time | **ASAP only.** No scheduled slots. Quoted as "about 20 minutes after the kitchen confirms" |
| Who holds the Stripe account | The business owner, with the developer invited as a team member |
| PayPal | Not offered — unavailable through Stripe for US merchants |

Still to confirm with the accountant before going live: whether the sodas and
Snapple are taxable (currently taxed), and whether New Brunswick falls in an
Urban Enterprise Zone, which would halve the rate.

## Smaller decisions I have made provisionally

These have a working default. Tell me if any is wrong and I will change it.

0. **Email is the account identity; the phone number is contact detail.** Since
   SMS verification is deferred, the email address is the thing we can actually
   prove, so it is required, unique and verified before an account works. The
   mobile number is still required at signup — the kitchen calls about
   pickups — but unverified. Logging in accepts either one plus the password.
   Say the word if you would rather the number stayed the only login name.
1. ~~Which items come with a free sauce choice~~ — **answered by rules.txt**:
   platters and gyros only, no free sauce on fries, onion rings or sides.
2. ~~Sauce rules~~ — **answered**: free, up to **three**, on platters and gyros.
   Extra sauce on the side is 75¢.
3. ~~Paid add-ons~~ — **answered**: extra protein $3, add fries $2, add pita $2,
   no salad $2, spicy rice free, fries and soda $5, wing sizes and falafel/fries
   sizes as priced.
4. **Item badges.** "Signature", "Popular", "Must-try" and "Meal deal" are kept
   from the current homepage as `MenuItem.badge`. Confirm these are still right.
5. **Opening hours** are taken from the current site: Mon–Sat 10:00–03:00,
   Sun 12:00–03:00 (America/New_York). Holidays are not modelled yet; phase 7
   adds per-day overrides.
6. ~~Cheeseburger~~ — **answered**: $6.99 for the burger, with "add fries and a
   soda" as a $5.00 option, so the old "comes with fries & a soda" copy was
   wrong and has been rewritten.
7. ~~Pickup lead time~~ — **answered**: 20 minutes, counted from the moment a
   manager **confirms** the order, not from when the payment clears. Checkout
   will quote "about 20 minutes from confirmation" rather than a fixed clock
   time. `PICKUP_LEAD_MINUTES` in `src/lib/hours.ts`.
8. **Order cut-off.** Should online ordering stop before the 3 AM close (say, at
   2:45 AM) so the kitchen can finish?
9. **How long people stay logged in.** Currently 30 days, extending each time
   they visit. Shorter is safer, longer is friendlier at 2 AM.
10. **Marketing texts are opt-in and unticked by default.** That is the safe
    reading of the TCPA, but confirm with whoever handles your compliance.

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
