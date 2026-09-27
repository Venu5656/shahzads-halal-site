# Taking payments on the website — what we need from you

The ordering website is built. People can browse the menu, pick their sauces and
fill a basket. The last piece is taking the money, and that part can only be set
up by you, because it is your business's bank account the money lands in.

This is everything, in order. Nothing here costs money. **Steps 1 and 2 take
about fifteen minutes and unblock all the work** — the rest can follow later.

---

## Step 1 — Create the Stripe account (about 10 minutes)

Stripe is the company that processes the card payments. It is what almost every
online shop uses, and it is who the money goes through before it reaches your
bank.

**You create this account, not your developer.** It holds your money and your
business details, so it has to be in your name. You will add the developer to it
in the next step.

1. Go to **stripe.com** and click **Sign up**.
2. Use an email address you will keep and can always get into. A business
   address is better than a personal one.
3. Set a strong password and turn on two-factor authentication when it offers —
   this account can move money, so treat it like online banking.
4. When it asks you to "activate payments" or fill in business details, **you can
   skip that for now**. Everything can be built and tested without it. We come
   back to it in step 4, just before the first real customer pays.

**Do not send the password to anybody**, including your developer. They do not
need it.

---

## Step 2 — Add your developer to the account (2 minutes)

This lets them do the technical setup without ever having your password.

1. In Stripe, click the **settings cog** (top right) → **Team and security** →
   **Team**.
2. Click **New member** and enter your developer's email address.
3. Give them the **Developer** role.
4. Send the invite.

That role lets them set up the technical side and see test payments. It does
**not** let them move your money or change your bank details.

---

## Step 3 — Buy the website address (about 10 minutes, ~$15 a year)

Right now the site has no address of its own. We need one — something like
**shahzadshalal.com**. One purchase unlocks four things:

- the website having a real address people can type
- emails to customers (order receipts, password resets) actually arriving instead
  of going to spam
- **Apple Pay** working, which needs a verified address
- switching Stripe from test mode to real payments

**Buy it in your own name**, the same reasoning as the Stripe account. Any of
these are fine: Cloudflare, Namecheap, Porkbun, or Vercel (where the site will
be hosted — buying there means less setup).

Have a couple of spellings in mind in case the first is taken. Shorter is better:
someone will read it out over the phone at one in the morning.

---

## Step 4 — Activate real payments in Stripe (about 20 minutes)

Only needed before the first real customer pays. Until then everything runs in
Stripe's "test mode" with pretend cards.

In Stripe, click **Activate payments** and have ready:

- **The business's legal name and address** — exactly as it appears on your tax
  paperwork, not the trading name if they differ.
- **EIN** (the business's federal tax number). If the restaurant trades as a sole
  proprietorship you may use a Social Security Number instead — your accountant
  will know which applies.
- **Business type** — LLC, corporation, sole proprietorship.
- **Industry** — "Restaurants and food" or similar from their list.
- **Your own details as the owner**: legal name, date of birth, home address, and
  the last four of your SSN. Stripe is legally required to verify who owns the
  business; this is normal and applies to every payment processor.
- **Business bank account** — routing number and account number. This is where
  your money arrives, usually two days after each payment.
- **A statement descriptor** — the short name that appears on your customers'
  card statements. Something like `SHAHZADS HALAL` so nobody rings their bank
  about a charge they do not recognise.

Stripe may ask for a photo of your ID or a document proving the business address.
That is routine.

---

## Step 5 — Two questions for your accountant

These change what customers are charged, so we would rather ask than guess.

1. **Sales tax.** We are charging **6.625%** on everything except bottled water,
   which we are treating as exempt. Is that right for prepared food sold for
   pickup in New Brunswick? Specifically: are the sodas and the Snapple taxed,
   and is New Brunswick inside an Urban Enterprise Zone (which would halve the
   rate)?
2. **Tips.** The site does **not** ask for a tip at the moment. If you want it to
   later, tips collected through the website have payroll consequences — how they
   are recorded, distributed and taxed. Worth a conversation before we add it,
   not after.

---

## Step 6 — What your developer needs from you

Once steps 1 and 2 are done, they will collect these from the Stripe dashboard
themselves using their own login. **You do not need to send them anything.**

If for any reason you do send something, send the **publishable** key — it is
designed to be public. Never send the **secret** key by message or email.

Later, for Apple Pay, Stripe produces a small verification file. That one is
harmless and meant to be public; just forward it.

---

## What happens after that

Once the payments are live, here is how an order will work:

1. A customer picks their food and pays on the website. Money is taken then —
   there is no paying at the counter.
2. The order appears on a screen in the shop with a loud alert.
3. Somebody presses **Confirm**, and the ticket prints.
4. The customer is told their food will be ready about **20 minutes from that
   confirmation** — so the clock starts when the kitchen sees it, not when the
   card goes through.
5. Online ordering stops at **2:40 AM** so the kitchen can finish by three.

If something is sold out, a manager can switch it off on the website in one tap,
and nobody can order it until it is switched back on.

---

## Summary of what's needed

| # | What | Who | How long | Blocking? |
|---|------|-----|----------|-----------|
| 1 | Create Stripe account | Owner | 10 min | **Yes — blocks all payment work** |
| 2 | Invite developer as Developer | Owner | 2 min | **Yes** |
| 3 | Buy the domain | Owner | 10 min | Blocks Apple Pay, real emails, going live |
| 4 | Activate payments (EIN, bank, ID) | Owner | 20 min | Blocks the first real payment only |
| 5 | Tax and tip questions | Accountant | — | Blocks going live |
| 6 | Apple Pay verification file | Owner → developer | 5 min | Blocks Apple Pay only |

Questions about any of this: ask the developer before guessing. Getting a tax
rate or a bank detail wrong is much more annoying to fix after money has moved.
