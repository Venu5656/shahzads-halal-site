"use client";

import { useEffect } from "react";
import type { Sauce } from "@/lib/menu-data";
import {
  DAY_NAMES,
  HOURS,
  WEEK_ORDER,
  fmtDuration,
  fmtHour,
  nyNow,
  storeStatus,
} from "@/lib/hours";

/**
 * Every bit of behaviour from the original index.html <script>, ported as-is.
 *
 * It is deliberately imperative and DOM-driven rather than idiomatic React:
 * the legacy stylesheet and its animations are keyed to this exact DOM, and
 * phase 1 must not change how the homepage looks or moves. What the port adds
 * is cleanup — React runs effects twice in development, so every listener,
 * timer, animation frame and observer has to be torn down.
 */

/** What the homepage grid needs about an item. Comes from the database. */
export type HomeMenuItem = {
  slug: string;
  name: string;
  category: string;
  imagePath: string;
  description: string;
  badge: string | null;
  veggie: boolean;
};

type Props = {
  items: HomeMenuItem[];
  sauces: Sauce[];
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const finePointer = () => window.matchMedia("(pointer:fine)").matches;

export default function HomeInteractions({ items, sauces }: Props) {
  /* ---------------------------------------------------- nav, drawer, mobile bar */
  useEffect(() => {
    const nav = document.getElementById("nav");
    const mbar = document.getElementById("mbar");
    const burger = document.getElementById("burger");
    if (!nav || !mbar || !burger) return;

    const onScroll = () => {
      nav.classList.toggle("scrolled", window.scrollY > 30);
      mbar.classList.toggle("show", window.scrollY > window.innerHeight * 0.7);
    };
    const toggleMenu = () => document.body.classList.toggle("menu-open");
    const closeMenu = () => document.body.classList.remove("menu-open");
    const drawerLinks = Array.from(document.querySelectorAll("#drawer a"));

    window.addEventListener("scroll", onScroll, { passive: true });
    burger.addEventListener("click", toggleMenu);
    drawerLinks.forEach((a) => a.addEventListener("click", closeMenu));
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      burger.removeEventListener("click", toggleMenu);
      drawerLinks.forEach((a) => a.removeEventListener("click", closeMenu));
      closeMenu();
    };
  }, []);

  /* ------------------------------------------------------------------ embers */
  useEffect(() => {
    const canvas = document.getElementById("embers") as HTMLCanvasElement | null;
    const hero = document.querySelector(".hero");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !hero) return;

    const reduce = prefersReducedMotion();
    let width = 0;
    let height = 0;

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    type Ember = {
      x: number;
      y: number;
      r: number;
      vy: number;
      vx: number;
      life: number;
      max: number;
      h: string;
      ph: number;
    };

    const spawn = (y?: number): Ember => ({
      x: Math.random() * width,
      y: y ?? height + 10,
      r: Math.random() * 2 + 0.6,
      vy: -(Math.random() * 0.7 + 0.25),
      vx: (Math.random() - 0.5) * 0.3,
      life: 0,
      max: 300 + Math.random() * 300,
      h: Math.random() < 0.7 ? "226,58,47" : "245,181,61",
      ph: Math.random() * 6,
    });

    size();
    window.addEventListener("resize", size);

    const embers: Ember[] = [];
    for (let i = 0; i < 70; i++) embers.push(spawn(Math.random() * height));

    let heroVisible = true;
    const observer = new IntersectionObserver((entries) => {
      heroVisible = entries[0]?.isIntersecting ?? false;
    });
    observer.observe(hero);

    let frame = 0;
    const tick = () => {
      if (heroVisible && !reduce) {
        ctx.clearRect(0, 0, width, height);
        embers.forEach((p, i) => {
          p.life++;
          p.ph += 0.03;
          p.x += p.vx + Math.sin(p.ph) * 0.25;
          p.y += p.vy;
          const a = Math.sin((Math.PI * p.life) / p.max) * 0.85;
          ctx.beginPath();
          ctx.fillStyle = `rgba(${p.h},${a})`;
          ctx.shadowBlur = 12;
          ctx.shadowColor = `rgba(${p.h},1)`;
          ctx.arc(p.x, p.y, p.r, 0, 7);
          ctx.fill();
          if (p.life > p.max || p.y < -10) embers[i] = spawn();
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", size);
      observer.disconnect();
      ctx.clearRect(0, 0, width, height);
    };
  }, []);

  /* ---------------------------------------------------------- stage parallax */
  useEffect(() => {
    const stage = document.getElementById("stage");
    if (!stage || !finePointer() || prefersReducedMotion()) return;

    const onMove = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      stage.style.transform = `perspective(1000px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    };

    stage.style.transition = "transform .6s cubic-bezier(.2,.8,.2,1)";
    window.addEventListener("pointermove", onMove);

    return () => {
      window.removeEventListener("pointermove", onMove);
      stage.style.transform = "";
      stage.style.transition = "";
    };
  }, []);

  /* ----------------------------------------------------- counting hero facts */
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-count]"));
    const timers: number[] = [];
    const frames: number[] = [];

    els.forEach((el) => {
      const target = Number(el.dataset.count);
      let start: number | null = null;
      const run = (ts: number) => {
        start ??= ts;
        const k = Math.min((ts - start) / 1400, 1);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
        if (k < 1) frames.push(requestAnimationFrame(run));
      };
      timers.push(window.setTimeout(() => frames.push(requestAnimationFrame(run)), 900));
    });

    return () => {
      timers.forEach(clearTimeout);
      frames.forEach(cancelAnimationFrame);
    };
  }, []);

  /* ------------------------------------------------------- scroll-in reveals */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ------------------------------------------------- signature layer cycling */
  useEffect(() => {
    const pins = Array.from(document.querySelectorAll<HTMLElement>(".pin"));
    const rows = Array.from(document.querySelectorAll<HTMLElement>("#layers li"));
    if (!pins.length || !rows.length) return;

    const setLayer = (i: number) => {
      pins.forEach((p) => p.classList.toggle("on", Number(p.dataset.l) === i));
      rows.forEach((r) => r.classList.toggle("on", Number(r.dataset.l) === i));
    };

    let current = 0;
    setLayer(0);
    const cycle = window.setInterval(() => setLayer((current = (current + 1) % 4)), 2600);

    const stop = (el: HTMLElement) => () => {
      setLayer(Number(el.dataset.l));
      clearInterval(cycle);
    };
    const handlers = [...pins, ...rows].map((el) => {
      const handler = stop(el);
      el.addEventListener("mouseenter", handler);
      el.addEventListener("click", handler);
      return { el, handler };
    });

    return () => {
      clearInterval(cycle);
      handlers.forEach(({ el, handler }) => {
        el.removeEventListener("mouseenter", handler);
        el.removeEventListener("click", handler);
      });
    };
  }, []);

  /* ------------------------------------------------------------- menu grid */
  useEffect(() => {
    const grid = document.getElementById("grid");
    if (!grid) return;

    grid.innerHTML = items
      .map(
        (i) => `<article class="card" data-c="${escapeHtml(i.category)}">
  <div class="ph"><div class="tags">${[
    i.badge ? `<span class="tag star">${escapeHtml(i.badge)}</span>` : "",
    i.veggie ? `<span class="tag veg">Veggie</span>` : "",
  ].join("")}<span class="tag">Halal</span></div>
  <img src="${escapeHtml(i.imagePath)}" alt="${escapeHtml(i.name)}"></div>
  <div class="body"><h3>${escapeHtml(i.name)}</h3><p>${escapeHtml(i.description)}</p>
  <div class="foot"><span>${escapeHtml(i.category)}</span><a class="add" href="/menu/${escapeHtml(i.slug)}" aria-label="Order ${escapeHtml(i.name)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></a></div></div>
</article>`,
      )
      .join("");

    const cards = Array.from(grid.querySelectorAll<HTMLElement>(".card"));
    const observers: IntersectionObserver[] = [];
    const timers: number[] = [];

    cards.forEach((card, i) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(40px)";
      const io = new IntersectionObserver(
        (entries, obs) => {
          if (entries[0]?.isIntersecting) {
            timers.push(
              window.setTimeout(
                () => {
                  card.style.opacity = "";
                  card.style.transform = "";
                },
                (i % 4) * 90,
              ),
            );
            obs.disconnect();
          }
        },
        { threshold: 0.1 },
      );
      io.observe(card);
      observers.push(io);
    });

    const tiltHandlers: { el: HTMLElement; move: (e: PointerEvent) => void; leave: () => void }[] =
      [];
    if (finePointer() && !prefersReducedMotion()) {
      cards.forEach((card) => {
        const move = (e: PointerEvent) => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          const y = (e.clientY - r.top) / r.height;
          card.style.transition = "transform .15s, border-color .4s, box-shadow .5s";
          card.style.transform = `perspective(900px) rotateY(${(x - 0.5) * 8}deg) rotateX(${(0.5 - y) * 8}deg) translateY(-6px)`;
          card.style.setProperty("--mx", x * 100 + "%");
          card.style.setProperty("--my", y * 100 + "%");
        };
        const leave = () => {
          card.style.transition = "";
          card.style.transform = "";
        };
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerleave", leave);
        tiltHandlers.push({ el: card, move, leave });
      });
    }

    return () => {
      tiltHandlers.forEach(({ el, move, leave }) => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      });
      observers.forEach((io) => io.disconnect());
      timers.forEach(clearTimeout);
      grid.innerHTML = "";
    };
  }, [items]);

  /* ---------------------------------------------------------- sauce picker */
  useEffect(() => {
    const buttons = document.getElementById("sauceBtns");
    const info = document.getElementById("sauceInfo");
    const stage = document.getElementById("sauceStage");
    if (!buttons || !info || !stage || !sauces.length) return;

    buttons.innerHTML = sauces
      .map(
        (s, i) =>
          `<button class="sauce" style="--c:${escapeHtml(s.color)}" data-i="${i}"><i></i>${escapeHtml(s.name)}</button>`,
      )
      .join("");

    let index = 0;
    const setSauce = (i: number) => {
      const sauce = sauces[i];
      if (!sauce) return;
      index = i;
      buttons
        .querySelectorAll(".sauce")
        .forEach((b, j) => b.classList.toggle("on", j === i));
      stage.style.setProperty("--sc", sauce.color);
      info.style.setProperty("--ink", sauce.ink);
      info.innerHTML = `<div class="swap"><h3>${escapeHtml(sauce.name).replace(" Sauce", "<br>Sauce")}</h3><p>${escapeHtml(sauce.description)}</p><span class="heat">Heat ${[0, 1, 2, 3, 4]
        .map((k) => `<u class="${k < sauce.heat ? "lit" : ""}"></u>`)
        .join("")}</span></div>`;
    };

    const timer = window.setInterval(() => setSauce((index + 1) % sauces.length), 3800);
    const onClick = (e: Event) => {
      const button = (e.target as HTMLElement).closest<HTMLElement>(".sauce");
      if (!button) return;
      clearInterval(timer);
      setSauce(Number(button.dataset.i));
    };
    buttons.addEventListener("click", onClick);
    setSauce(0);

    return () => {
      clearInterval(timer);
      buttons.removeEventListener("click", onClick);
      buttons.innerHTML = "";
      info.innerHTML = "";
    };
  }, [sauces]);

  /* ------------------------------------------------- live hours dial + clock */
  useEffect(() => {
    const dial = document.getElementById("dialSvg");
    const daysList = document.getElementById("days");
    const clock = document.getElementById("clock");
    const bigStatus = document.getElementById("bigStatus");
    if (!dial || !daysList || !clock || !bigStatus) return;

    const R = 170;
    const C = 200;
    const pt = (hour: number, r = R): [number, number] => {
      const a = (hour / 24) * Math.PI * 2 - Math.PI / 2;
      return [C + r * Math.cos(a), C + r * Math.sin(a)];
    };
    const arc = (a: number, b: number, r = R) => {
      const [x1, y1] = pt(a, r);
      const [x2, y2] = pt(b, r);
      return `M${x1} ${y1} A${r} ${r} 0 ${b - a > 12 ? 1 : 0} 1 ${x2} ${y2}`;
    };

    const update = () => {
      const now = nyNow();
      const t = now.h + now.m / 60;
      const status = storeStatus(now);

      document.querySelectorAll(".js-status").forEach((s) => {
        s.classList.toggle("closed", !status.open);
        if (s.lastElementChild) {
          s.lastElementChild.textContent = status.open ? "Open now" : "Closed now";
        }
      });

      bigStatus.innerHTML = status.open
        ? `The grill is on — open until <b>3:00 AM</b> <span style="color:var(--muted)">(${fmtDuration(status.hoursUntilChange)} left)</span>`
        : `Back at <b>${fmtHour(status.openAt ?? 0)}</b> today — opening in ${fmtDuration(status.hoursUntilChange)}.`;

      const hh = now.h % 12 || 12;
      clock.innerHTML = `${hh}:${String(now.m).padStart(2, "0")}<span style="font-size:.38em;margin-left:4px">${now.h < 12 ? "AM" : "PM"}</span>`;

      daysList.innerHTML = WEEK_ORDER.map((d) => {
        const hours = HOURS[d]!;
        return `<li class="${d === status.serviceDay ? "today" : ""}"><b>${DAY_NAMES[d]}</b><span>${fmtHour(hours[0])} – ${fmtHour(hours[1])}</span></li>`;
      }).join("");

      const serviceHours = HOURS[status.serviceDay]!;
      const ticks = Array.from({ length: 24 }, (_, i) => {
        const [x1, y1] = pt(i, R + 22);
        const [x2, y2] = pt(i, R + (i % 6 ? 28 : 34));
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(246,236,220,${i % 6 ? 0.2 : 0.5})" stroke-width="2"/>`;
      }).join("");
      const labels = [0, 6, 12, 18]
        .map((i) => {
          const [x, y] = pt(i, R - 26);
          return `<text x="${x}" y="${y + 5}" text-anchor="middle" fill="rgba(246,236,220,.45)" font-size="13" font-weight="700" font-family="DM Sans">${["12a", "6a", "12p", "6p"][i / 6]}</text>`;
        })
        .join("");
      const [nx, ny] = pt(t, R);

      dial.innerHTML = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5b53d"/><stop offset="1" stop-color="#e23a2f"/></linearGradient></defs>
   <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="rgba(246,236,220,.08)" stroke-width="18"/>
   <path d="${arc(serviceHours[0], serviceHours[1])}" fill="none" stroke="url(#g)" stroke-width="18" stroke-linecap="round" class="arcp"/>
   ${ticks}${labels}
   <circle cx="${nx}" cy="${ny}" r="15" fill="${status.open ? "#8bbf5a" : "#ff5a3c"}" opacity=".25"><animate attributeName="r" values="12;22;12" dur="2s" repeatCount="indefinite"/></circle>
   <circle cx="${nx}" cy="${ny}" r="9" fill="#f6ecdc" stroke="#0d0907" stroke-width="3"/>`;
    };

    update();
    const timer = window.setInterval(update, 20000);
    return () => clearInterval(timer);
  }, []);

  /* --------------------------------------------------------- footer year */
  useEffect(() => {
    const yr = document.getElementById("yr");
    if (yr) yr.textContent = String(new Date().getFullYear());
  }, []);

  return null;
}
