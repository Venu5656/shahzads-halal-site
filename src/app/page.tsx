import Link from "next/link";
import { CartButton } from "@/components/cart/CartButton";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { DrawerAuth, NavAuth } from "@/components/home/AuthNav";
import HomeInteractions from "@/components/home/HomeInteractions";
import { getCurrentUser } from "@/lib/auth/dal";
import { FEATURED_SLUGS, SAUCES } from "@/lib/menu-data";
import { getMenu } from "@/lib/menu/queries";

/**
 * The marketing homepage, ported 1:1 from the original static index.html
 * (kept for reference at legacy/index.html).
 *
 * Rules for this file:
 *   - The markup must stay structurally identical to the original, because
 *     every selector in the legacy stylesheet depends on it.
 *   - Containers the legacy script fills (#tabs, #grid, #sauceBtns,
 *     #sauceInfo, #days, #dialSvg) stay empty here, exactly as they were in
 *     the static page, so React never fights the script over that DOM.
 *   - All behaviour lives in <HomeInteractions>, a client component.
 *   - The only additions since the port are the account links (<NavAuth>,
 *     <DrawerAuth>), added in phase 2.
 */

// Ordering still points at DoorDash until our own checkout ships in phase 4.
const ORDER_URL = "https://www.doordash.com/store/shahzads-halal-food-25676460/";
const PICKUP_URL =
  "https://custom.order.online/store/shahzad-s-halal-food-new-brunswick-25676460";

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default async function HomePage() {
  const [user, menu] = await Promise.all([getCurrentUser(), getMenu()]);

  // The homepage shows a handful, drawn with the original card markup; the
  // whole menu lives at /menu, so duplicating it here would just be a longer
  // page saying the same thing.
  const all = menu.flatMap((category) =>
    category.items.map((item) => ({
      slug: item.slug,
      name: item.name,
      category: category.name,
      imagePath: item.imagePath,
      description: item.description,
      badge: item.badge,
      veggie: item.tags.includes("VEGGIE"),
    })),
  );
  const bySlug = new Map(all.map((item) => [item.slug, item]));
  const items = FEATURED_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (item): item is (typeof all)[number] => Boolean(item),
  );

  return (
    <>
      <header className="nav" id="nav">
        <div className="wrap">
          <a href="#top" className="brand" aria-label="Shahzad's Halal Food home">
            <img src="/img/logo.png" alt="" />
            <span>
              <b>Shahzad&apos;s</b>
              <small>Halal Food</small>
            </span>
          </a>
          <nav className="links" aria-label="Primary">
            <a href="#signature">Signature</a>
            <a href="#sauces">Sauces</a>
            <Link href="/menu">Menu</Link>
            <a href="#hours">Hours</a>
            <a href="#visit">Visit</a>
          </nav>
          <div className="nav-cta">
            <span className="status js-status">
              <i></i>
              <span>Open now</span>
            </span>
            <NavAuth user={user} />
            <CartButton className="!px-3.5 !py-2 !text-[14px]" />
            <Link className="btn btn-red" href="/menu">
              Order now
            </Link>
            <button className="burger" id="burger" aria-label="Open menu">
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      <div className="drawer" id="drawer">
        <a href="#sauces">Sauces</a>
        <Link href="/menu">Menu</Link>
        <a href="#hours">Hours</a>
        <a href="#visit">Visit</a>
        <DrawerAuth user={user} />
      </div>

      <main id="top">
        <section className="hero">
          <canvas id="embers"></canvas>
          <div className="wrap">
            <div>
              <span className="eyebrow fade-up" style={{ animationDelay: ".1s" }}>
                Easton Ave · New Brunswick
              </span>
              <h1>
                <span className="ln">
                  <span>Stacked.</span>
                </span>
                <span className="ln">
                  <span>Sauced.</span>
                </span>
                <span className="ln">
                  <span>
                    <em>100% Halal.</em>
                  </span>
                </span>
              </h1>
              <p className="lede fade-up" style={{ animationDelay: ".5s" }}>
                Chicken &amp; lamb over brown basmati, loaded gyros and griddled cheesesteaks —
                cooked fresh on the flat-top from <b>lunch rush to 3&nbsp;AM</b>, every single day.
              </p>
              <div className="hero-ctas fade-up" style={{ animationDelay: ".65s" }}>
                <a className="btn btn-red" href={ORDER_URL} target="_blank" rel="noopener">
                  Order delivery
                  <ArrowIcon />
                </a>
                <Link className="btn btn-ghost" href="/menu">
                  Explore the menu
                </Link>
              </div>
              <div className="facts fade-up" style={{ animationDelay: ".8s" }}>
                <div>
                  <b data-count="17">0</b>
                  <span>hours open daily</span>
                </div>
                <div>
                  <b data-count="6">0</b>
                  <span>house sauces</span>
                </div>
                <div>
                  <b>$10–20</b>
                  <span>per person</span>
                </div>
              </div>
            </div>

            <div className="fade-up" style={{ animationDelay: ".3s" }}>
              <div className="stage" id="stage">
                <svg className="ring-text" viewBox="0 0 600 600" aria-hidden="true">
                  <defs>
                    <path
                      id="circ"
                      d="M300,300 m-282,0 a282,282 0 1,1 564,0 a282,282 0 1,1 -564,0"
                    />
                  </defs>
                  <text>
                    <textPath href="#circ">
                      100% Halal ✦ Open till 3 AM ✦ Easton Ave ✦ Fresh off the grill ✦ New
                      Brunswick ✦{" "}
                    </textPath>
                  </text>
                </svg>
                <div className="steam" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="plate">
                  <div className="inner">
                    <img
                      src="/img/menu/cutout/mix-platter.webp"
                      alt="Mix platter — chicken and lamb over rice with fries and salad"
                    />
                  </div>
                </div>
                <div className="orbit" aria-hidden="true">
                  <div className="sat">
                    <img src="/img/menu/cutout/falafel.webp" alt="" />
                  </div>
                  <div className="sat">
                    <img src="/img/menu/cutout/lamb-gyro.webp" alt="" />
                  </div>
                  <div className="sat">
                    <img src="/img/menu/cutout/philly-cheesesteak.webp" alt="" />
                  </div>
                </div>
                <div className="chip c1">
                  <span className="dot">✓</span>
                  <span>
                    100% Halal<small>Every protein, every day</small>
                  </span>
                </div>
                <div className="chip c2">
                  <span className="dot">☾</span>
                  <span>
                    Late-night kitchen<small>Open until 3:00 AM</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <a href="#signature" className="scroll-cue" aria-label="Scroll down"></a>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="track">
            <span>Combo over rice</span>
            <span>Lamb gyro</span>
            <span>Philly cheesesteak</span>
            <span>Chapli kabab</span>
            <span>Falafel</span>
            <span>Kofta kebab</span>
            <span>Combo over rice</span>
            <span>Lamb gyro</span>
            <span>Philly cheesesteak</span>
            <span>Chapli kabab</span>
            <span>Falafel</span>
            <span>Kofta kebab</span>
          </div>
        </div>
        <div className="marquee alt" aria-hidden="true">
          <div className="track">
            <span>White sauce</span>
            <span>Hot sauce</span>
            <span>Green sauce</span>
            <span>Tahini</span>
            <span>BBQ</span>
            <span>Buffalo</span>
            <span>White sauce</span>
            <span>Hot sauce</span>
            <span>Green sauce</span>
            <span>Tahini</span>
            <span>BBQ</span>
            <span>Buffalo</span>
          </div>
        </div>

        {/* SIGNATURE */}
        <section className="sec" id="signature">
          <div className="wrap sig">
            <div className="sig-img reveal" id="sigImg">
              <img
                src="/img/menu/cutout/mix-platter.webp"
                alt="Mix platter — chicken and lamb over rice with fries and salad"
              />
              {/* Measured off the cutout itself, which is square and contained,
                  so these are the picture's own coordinates: lamb right of
                  centre, chicken left of it, fries top-right, salad top-left. */}
              <button className="pin" style={{ left: "73%", top: "54%" }} data-l="0" aria-label="Lamb">
                1
              </button>
              <button className="pin" style={{ left: "37%", top: "59%" }} data-l="1" aria-label="Chicken">
                2
              </button>
              <button
                className="pin"
                style={{ left: "71%", top: "26%" }}
                data-l="2"
                aria-label="French fries"
              >
                3
              </button>
              <button className="pin" style={{ left: "28%", top: "33%" }} data-l="3" aria-label="Salad">
                4
              </button>
            </div>
            <div className="reveal">
              <span className="eyebrow">The house signature</span>
              <h2>
                The Mix Platter,
                <br />
                <em>layer by layer</em>
              </h2>
              <ul className="layers" id="layers">
                <li data-l="0">
                  <span>01</span>
                  <b>Seared lamb</b>
                  <small>Cut from the spit, crisped on the flat-top.</small>
                </li>
                <li data-l="1">
                  <span>02</span>
                  <b>Spiced chicken</b>
                  <small>Marinated, chopped and tossed hot off the grill.</small>
                </li>
                <li data-l="2">
                  <span>03</span>
                  <b>French fries</b>
                  <small>Crisp and seasoned, piled straight on top.</small>
                </li>
                <li data-l="3">
                  <span>04</span>
                  <b>Fresh salad + your sauce</b>
                  <small>
                    Crisp greens, cucumber, tomato — finished with any Shahzad&apos;s sauce.
                  </small>
                </li>
              </ul>
              <div style={{ marginTop: "30px" }}>
                <Link className="btn btn-red" href="/menu/mix-platter">
                  Get the Mix Platter
                  <ArrowIcon />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SAUCES */}
        <section className="sec" id="sauces">
          <div className="wrap sauce-wrap">
            <div className="reveal">
              <span className="eyebrow">Choose your drip</span>
              <h2>
                Six sauces.
                <br />
                <em>Zero rules.</em>
              </h2>
              <p style={{ color: "var(--muted)", marginTop: "18px", maxWidth: "440px" }}>
                Every platter and gyro comes with your pick of Shahzad&apos;s sauces. Go classic, go
                fire, or do the half-and-half — tap one to taste-test.
              </p>
              <div className="sauces" id="sauceBtns"></div>
            </div>
            <div className="bottle-stage reveal" id="sauceStage">
              <div className="blob"></div>
              <div className="sauce-info" id="sauceInfo"></div>
            </div>
          </div>
        </section>

        {/* MENU — a taste of it. The whole thing lives at /menu. */}
        <section className="sec menu-bg" id="menu">
          <div className="wrap">
            <div className="sec-head reveal">
              <div>
                <span className="eyebrow">Fan favorites</span>
                <h2>
                  The <em>menu</em>
                </h2>
              </div>
              <p>
                Platters over rice, gyros wrapped warm, cheesesteaks piled high and wings tossed to
                order. Everything halal, everything made when you ask for it.
              </p>
            </div>
            <div className="menu-grid" id="grid"></div>
            <div className="reveal mt-10 flex flex-col items-center gap-4 text-center">
              <Link className="btn btn-red" href="/menu">
                Explore full menu
                <ArrowIcon />
              </Link>
              <p className="menu-note">
                Pick your sauces, add a note for the kitchen, and collect it on Easton Ave.
              </p>
            </div>
          </div>
        </section>

        {/* HOURS */}
        <section className="sec hours-bg" id="hours">
          <div className="wrap hours">
            <div className="dial reveal">
              <svg viewBox="0 0 400 400" id="dialSvg" aria-hidden="true"></svg>
              <div className="center">
                <div className="now" id="clock">
                  --:--
                </div>
                <div className="where">Now in New Brunswick</div>
                <span className="status js-status state">
                  <i></i>
                  <span>Open now</span>
                </span>
              </div>
            </div>
            <div className="reveal">
              <span className="eyebrow">Late-night kitchen</span>
              <h2>
                Open when
                <br />
                <em>you&apos;re hungry</em>
              </h2>
              <p className="big-status" id="bigStatus">
                Checking the grill…
              </p>
              <ul className="days" id="days"></ul>
            </div>
          </div>
        </section>

        {/* VISIT */}
        <section className="sec" id="visit">
          <div className="wrap">
            <div className="sec-head reveal">
              <div>
                <span className="eyebrow">Pull up</span>
                <h2>
                  Come <em>find us</em>
                </h2>
              </div>
              <p>
                Right on Easton Ave, steps from the College Ave campus. Dine in, grab it to go, or
                have it delivered.
              </p>
            </div>
            <div className="visit">
              <div className="vcard reveal">
                <div className="vrow">
                  <span className="ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                      <circle cx="12" cy="9.5" r="2.5" />
                    </svg>
                  </span>
                  <div>
                    <small>Address</small>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=152+Easton+Ave+New+Brunswick+NJ+08901"
                      target="_blank"
                      rel="noopener"
                    >
                      152 Easton Ave
                      <br />
                      New Brunswick, NJ 08901
                    </a>
                  </div>
                </div>
                <div className="vrow">
                  <span className="ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
                    </svg>
                  </span>
                  <div>
                    <small>Call ahead</small>
                    <a href="tel:+18482021430">(848) 202-1430</a>
                  </div>
                </div>
                <div className="vrow">
                  <span className="ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </span>
                  <div>
                    <small>Hours</small>
                    <span>
                      Mon–Sat 10 AM – 3 AM
                      <br />
                      Sunday 12 PM – 3 AM
                    </span>
                  </div>
                </div>
                <div className="btns">
                  <a
                    className="btn btn-red"
                    href="https://www.google.com/maps/dir/?api=1&destination=152+Easton+Ave+New+Brunswick+NJ+08901"
                    target="_blank"
                    rel="noopener"
                  >
                    Get directions
                  </a>
                  <a className="btn btn-ghost" href="tel:+18482021430">
                    Call now
                  </a>
                </div>
              </div>
              <div className="map reveal">
                <MapEmbed />
              </div>
            </div>

            <div className="band reveal" style={{ marginTop: "clamp(80px,10vw,130px)" }}>
              <div>
                <h2>
                  Hungry at
                  <br />
                  <em>1:47 AM?</em>
                </h2>
                <p>
                  Same. Skip the line and get a hot platter brought to your door — or order ahead
                  and pick it up on Easton.
                </p>
              </div>
              <div className="col">
                <a className="btn btn-dark" href={ORDER_URL} target="_blank" rel="noopener">
                  Order on DoorDash
                  <ArrowIcon />
                </a>
                <a className="btn btn-light" href={PICKUP_URL} target="_blank" rel="noopener">
                  Order for pickup
                  <ArrowIcon />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <a href="#top" className="brand">
            <img src="/img/logo.png" alt="" />
            <span>
              <b>Shahzad&apos;s</b>
              <small>Halal Food</small>
            </span>
          </a>
          <p>
            152 Easton Ave, New Brunswick, NJ 08901 · <a href="tel:+18482021430">(848) 202-1430</a>
          </p>
          <p>© <span id="yr">{new Date().getFullYear()}</span> Shahzad&apos;s Halal Food</p>
        </div>
        <div className="mega" aria-hidden="true">
          Shahzad&apos;s
        </div>
      </footer>

      <div className="mbar" id="mbar">
        <a className="btn btn-ghost" href="tel:+18482021430">
          Call
        </a>
        <Link className="btn btn-red" href="/menu">
          Order now
        </Link>
      </div>

      <HomeInteractions items={items} sauces={SAUCES} />
    </>
  );
}
