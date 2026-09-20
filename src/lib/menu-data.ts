/**
 * The 14 menu items and 6 sauces that were hard-coded in the original
 * index.html. This module is the single source of truth for both the homepage
 * grid and the database seed, so the two can never drift apart.
 *
 * PRICES ARE DELIBERATELY ABSENT. The owner has not supplied them yet, so
 * items seed with basePriceCents = null and cannot be ordered until a price is
 * set in the manager area. See OPEN-QUESTIONS.md.
 */

export type MenuTag = { kind: "star" | "veg"; label: string };

export type SeedMenuItem = {
  slug: string;
  name: string;
  category: string;
  /** Path under /public. */
  imagePath: string;
  description: string;
  tags: MenuTag[];
};

export const CATEGORIES = [
  "Platters",
  "Gyros",
  "Cheesesteaks",
  "Burgers & Sides",
] as const;

export type CategoryName = (typeof CATEGORIES)[number];

export const MENU_ITEMS: SeedMenuItem[] = [
  {
    slug: "combo-over-rice",
    name: "Combo Over Rice",
    category: "Platters",
    imagePath: "/img/combo-rice.webp",
    description:
      "Chicken and lamb over brown basmati with salad and any of Shahzad's sauces.",
    tags: [{ kind: "star", label: "Signature" }],
  },
  {
    slug: "kofta-kebab-over-rice",
    name: "Kofta Kebab Over Rice",
    category: "Platters",
    imagePath: "/img/kofta.webp",
    description:
      "Freshly ground chicken with herbs and spices, chopped and served over rice.",
    tags: [],
  },
  {
    slug: "beef-chapli-kabab-rice",
    name: "Beef Chapli Kabab Rice",
    category: "Platters",
    imagePath: "/img/chapli.webp",
    description:
      "Savory beef chapli kebabs over seasoned rice with a crisp side salad.",
    tags: [],
  },
  {
    slug: "falafel-over-rice",
    name: "Falafel Over Rice",
    category: "Platters",
    imagePath: "/img/falafel-rice.webp",
    description:
      "Falafel on brown basmati with a side salad and your choice of sauce.",
    tags: [{ kind: "veg", label: "Veggie" }],
  },
  {
    slug: "combo-gyro",
    name: "Combo Gyro",
    category: "Gyros",
    imagePath: "/img/combo-gyro.webp",
    description:
      "Chicken and lamb in warm pita with salad and any of Shahzad's sauces.",
    tags: [{ kind: "star", label: "Popular" }],
  },
  {
    slug: "lamb-gyro",
    name: "Lamb Gyro",
    category: "Gyros",
    imagePath: "/img/lamb-gyro.webp",
    description:
      "Lamb pieces with salad in pita — white, hot, tahini, BBQ, buffalo or green.",
    tags: [],
  },
  {
    slug: "chicken-gyro",
    name: "Chicken Gyro",
    category: "Gyros",
    imagePath: "/img/chicken-gyro.webp",
    description:
      "Tender chicken, lettuce, tomato and creamy tzatziki wrapped in soft pita.",
    tags: [],
  },
  {
    slug: "falafel-gyro",
    name: "Falafel Gyro",
    category: "Gyros",
    imagePath: "/img/falafel-wrap.webp",
    description:
      "Crispy falafel, lettuce, tomato, onion and pickles on grilled pita with white sauce.",
    tags: [{ kind: "veg", label: "Veggie" }],
  },
  {
    slug: "philly-cheese-steak",
    name: "Philly Cheese Steak",
    category: "Cheesesteaks",
    imagePath: "/img/philly.webp",
    description:
      "Cheese, onion, green pepper, ketchup and mayonnaise on a toasted roll.",
    tags: [{ kind: "star", label: "Must-try" }],
  },
  {
    slug: "chicken-cheese-steak",
    name: "Chicken Cheese Steak",
    category: "Cheesesteaks",
    imagePath: "/img/chicken-steak.webp",
    description:
      "Chopped chicken, cheese, onion and green pepper with ketchup and mayo.",
    tags: [],
  },
  {
    slug: "cheeseburger",
    name: "Cheeseburger",
    category: "Burgers & Sides",
    imagePath: "/img/burger.webp",
    description:
      "Loaded with grilled onions and melted cheese. Comes with fries & a soda.",
    tags: [{ kind: "star", label: "Meal deal" }],
  },
  {
    slug: "4-pc-falafel",
    name: "4 PC Falafel",
    category: "Burgers & Sides",
    imagePath: "/img/falafel4.webp",
    description:
      "Crispy chickpea patties seasoned with herbs and spices — four to a side.",
    tags: [{ kind: "veg", label: "Veggie" }],
  },
  {
    slug: "french-fries",
    name: "French Fries",
    category: "Burgers & Sides",
    imagePath: "/img/fries.webp",
    description: "Golden Greek-style fries, served with ketchup.",
    tags: [{ kind: "veg", label: "Veggie" }],
  },
  {
    slug: "onion-rings",
    name: "Onion Rings",
    category: "Burgers & Sides",
    imagePath: "/img/onion-rings.webp",
    description: "Crispy rings with your choice of white, hot, green or BBQ sauce.",
    tags: [{ kind: "veg", label: "Veggie" }],
  },
];

export type Sauce = {
  slug: string;
  name: string;
  /** Sauce colour, used by the homepage blob and the swatch. */
  color: string;
  /** Text colour that stays legible on top of `color`. */
  ink: string;
  /** Heat, 0–5. */
  heat: number;
  description: string;
};

export const SAUCES: Sauce[] = [
  {
    slug: "white-sauce",
    name: "White Sauce",
    color: "#f3eee2",
    ink: "#1b140f",
    heat: 0,
    description:
      "The legend. Cool, creamy and tangy — the one you drown the whole platter in.",
  },
  {
    slug: "hot-sauce",
    name: "Hot Sauce",
    color: "#d8321f",
    ink: "#fff",
    heat: 5,
    description:
      "Bright red, seriously spicy. A little goes a long way — respect the squeeze.",
  },
  {
    slug: "green-sauce",
    name: "Green Sauce",
    color: "#7eae47",
    ink: "#12200a",
    heat: 2,
    description:
      "Herby and zesty with a fresh chili kick. Made for chicken and falafel.",
  },
  {
    slug: "tahini",
    name: "Tahini",
    color: "#d8b07a",
    ink: "#1b140f",
    heat: 0,
    description: "Rich, nutty sesame. Silky on falafel, perfect on lamb.",
  },
  {
    slug: "bbq",
    name: "BBQ",
    color: "#6e2716",
    ink: "#fff",
    heat: 1,
    description: "Smoky and sweet. Unexpectedly great on a combo gyro.",
  },
  {
    slug: "buffalo",
    name: "Buffalo",
    color: "#e8762a",
    ink: "#1b140f",
    heat: 3,
    description:
      "Buttery, vinegary heat. Tangy enough to wake you up at 2 AM.",
  },
];
