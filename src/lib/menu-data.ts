/**
 * The real menu: 21 items, their prices, and the rules that govern what can be
 * added to them.
 *
 * Taken from the owner's price list and `menu prices/rules.txt`. This module is
 * the single source of truth for the database seed, so the menu and the
 * database can never drift apart. Everything downstream — the menu page, the
 * cart, the checkout — reads the database, never this file.
 *
 * Money is integer cents everywhere. Option prices are the *difference* from
 * the item's base price, which is why a size is modelled as an option group
 * rather than as separate items: one card, one photo, one price that moves.
 */

export type MenuTag = { kind: "star" | "veg"; label: string };

export type SeedMenuItem = {
  slug: string;
  name: string;
  category: CategoryName;
  /** Path under /public. */
  imagePath: string;
  description: string;
  /**
   * Base price in cents — the cheapest configuration of the item. Null means
   * the owner has not priced it yet, which shows on the menu as "Ask in store"
   * and cannot be added to a cart.
   */
  basePriceCents: number | null;
  tags: MenuTag[];
  /** Option group slugs, in the order they should appear on the item. */
  optionGroups: string[];
  /**
   * Whether sales tax applies. Defaults to true — everything Shahzad's sells
   * is prepared food except the bottled water, which New Jersey exempts.
   * Confirm with the accountant (OPEN-QUESTIONS.md).
   */
  isTaxable?: boolean;
};

export const CATEGORIES = [
  "Platters",
  "Gyros",
  "Cheesesteaks",
  "Burgers & Sandwiches",
  "Wings",
  "Sides",
  "Dips",
  "Drinks",
] as const;

export type CategoryName = (typeof CATEGORIES)[number];

// ---------------------------------------------------------------- sauces

export type Sauce = {
  slug: string;
  name: string;
  /** Sauce colour, used by the homepage blob and the swatches. */
  color: string;
  /** Text colour that stays legible on top of `color`. */
  ink: string;
  /** Heat, 0–5. */
  heat: number;
  description: string;
};

/** The six house sauces. Free with platters and gyros, 75¢ on the side. */
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
    description: "Buttery, vinegary heat. Tangy enough to wake you up at 2 AM.",
  },
];

/** Wing sauces are their own list — one is picked, and it is tossed on. */
export const WING_SAUCES = [
  { slug: "hot", name: "Hot" },
  { slug: "buffalo", name: "Buffalo" },
  { slug: "bbq", name: "BBQ" },
  { slug: "lemon-pepper", name: "Lemon Pepper" },
  { slug: "sweet-thai-chilli", name: "Sweet Thai Chilli" },
  { slug: "mango-habanero", name: "Mango Habanero" },
  { slug: "hot-honey", name: "Hot Honey" },
] as const;

// --------------------------------------------------------- option groups

export type SeedOption = {
  slug: string;
  name: string;
  /** Added to the item's base price, in cents. */
  priceCents: number;
  description?: string;
};

export type SeedOptionGroup = {
  slug: string;
  name: string;
  /** Shown under the group name on the item page. */
  hint?: string;
  minSelect: number;
  maxSelect: number;
  options: SeedOption[];
};

const sauceOptions = (priceCents: number): SeedOption[] =>
  SAUCES.map((s) => ({ slug: s.slug, name: s.name, priceCents }));

export const OPTION_GROUPS: SeedOptionGroup[] = [
  {
    slug: "sauce-choice",
    name: "Sauce",
    hint: "Free with platters and gyros. Pick up to three.",
    minSelect: 0,
    maxSelect: 3,
    options: sauceOptions(0),
  },
  {
    slug: "rice-style",
    name: "Rice",
    minSelect: 1,
    maxSelect: 1,
    options: [
      { slug: "regular-rice", name: "Regular rice", priceCents: 0 },
      { slug: "spicy-rice", name: "Spicy rice", priceCents: 0 },
    ],
  },
  {
    slug: "platter-extras",
    name: "Make it bigger",
    minSelect: 0,
    maxSelect: 4,
    options: [
      { slug: "extra-protein", name: "Extra protein", priceCents: 300 },
      { slug: "add-fries", name: "Add fries", priceCents: 200 },
      { slug: "add-pita", name: "Add pita", priceCents: 200 },
      { slug: "no-salad", name: "No salad", priceCents: 0 },
    ],
  },
  {
    slug: "meal-deal",
    name: "Make it a meal",
    minSelect: 0,
    maxSelect: 1,
    options: [{ slug: "fries-and-soda", name: "Add fries and a soda", priceCents: 500 }],
  },
  {
    slug: "wing-size",
    name: "How many",
    minSelect: 1,
    maxSelect: 1,
    options: [
      { slug: "6-pc", name: "6 pc", priceCents: 0 },
      { slug: "12-pc", name: "12 pc", priceCents: 800 },
      { slug: "18-pc", name: "18 pc", priceCents: 1700 },
      { slug: "21-pc", name: "21 pc", priceCents: 2200 },
    ],
  },
  {
    slug: "wing-sauce",
    name: "Wing sauce",
    hint: "Tossed on. Pick one.",
    minSelect: 1,
    maxSelect: 1,
    options: WING_SAUCES.map((s) => ({ slug: s.slug, name: s.name, priceCents: 0 })),
  },
  {
    slug: "falafel-size",
    name: "How many",
    minSelect: 1,
    maxSelect: 1,
    options: [
      { slug: "4-pc", name: "4 pc", priceCents: 0 },
      { slug: "8-pc", name: "8 pc", priceCents: 400 },
    ],
  },
  {
    slug: "side-size",
    name: "Size",
    minSelect: 1,
    maxSelect: 1,
    options: [
      { slug: "regular", name: "Regular", priceCents: 0 },
      { slug: "large", name: "Large", priceCents: 200 },
    ],
  },
  {
    slug: "soda-flavour",
    name: "Which one",
    minSelect: 1,
    maxSelect: 1,
    options: [
      { slug: "coke", name: "Coke", priceCents: 0 },
      { slug: "diet-coke", name: "Diet Coke", priceCents: 0 },
      { slug: "sprite", name: "Sprite", priceCents: 0 },
      { slug: "ginger-ale", name: "Ginger Ale", priceCents: 0 },
    ],
  },
  {
    slug: "extra-sauce",
    name: "Extra sauce on the side",
    hint: "75¢ each.",
    minSelect: 0,
    maxSelect: 6,
    options: sauceOptions(75),
  },
];

// ------------------------------------------------------------------ items

// Sauce on the side is an option only where a sauce is part of the dish —
// platters and gyros. Everywhere else a dip is its own item from the Dips
// section, so it can be ordered on its own or alongside anything.
const PLATTER_GROUPS = ["rice-style", "sauce-choice", "platter-extras", "extra-sauce"];
const GYRO_GROUPS = ["sauce-choice", "meal-deal", "extra-sauce"];
const SANDWICH_GROUPS = ["meal-deal"];
const SIDE_GROUPS: string[] = [];

export const MENU_ITEMS: SeedMenuItem[] = [
  // ---------------------------------------------------------- platters
  {
    slug: "chicken-over-rice",
    name: "Chicken Over Rice",
    category: "Platters",
    imagePath: "/img/menu/chicken-over-rice.jpg",
    description:
      "Marinated chicken chopped hot off the flat-top, over rice with salad and your pick of sauce.",
    basePriceCents: 1299,
    tags: [{ kind: "star", label: "Popular" }],
    optionGroups: PLATTER_GROUPS,
  },
  {
    slug: "lamb-over-rice",
    name: "Lamb Over Rice",
    category: "Platters",
    imagePath: "/img/menu/lamb-over-rice.jpg",
    description: "Lamb cut from the spit and crisped on the griddle, over rice with salad.",
    basePriceCents: 1299,
    tags: [],
    optionGroups: PLATTER_GROUPS,
  },
  {
    slug: "mix-platter",
    name: "Mix Platter",
    category: "Platters",
    imagePath: "/img/menu/mix-platter.jpg",
    description:
      "Chicken and lamb together over rice, with fries, salad and any of Shahzad's sauces.",
    basePriceCents: 1399,
    tags: [{ kind: "star", label: "Signature" }],
    optionGroups: PLATTER_GROUPS,
  },
  {
    slug: "chicken-kofta-kabab-over-rice",
    name: "Chicken Kofta Kabab Over Rice",
    category: "Platters",
    imagePath: "/img/menu/chicken-kofta-kabab-over-rice.jpg",
    description:
      "Freshly ground chicken with herbs and spices, chopped and served over rice with salad.",
    basePriceCents: 1299,
    tags: [],
    optionGroups: PLATTER_GROUPS,
  },
  {
    slug: "falafel-over-rice",
    name: "Falafel Over Rice",
    category: "Platters",
    imagePath: "/img/menu/falafel-over-rice.jpg",
    description: "Crispy falafel over rice with a side salad and your choice of sauce.",
    basePriceCents: 1199,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: PLATTER_GROUPS,
  },

  {
    slug: "beef-chapli-kabab-rice",
    name: "Beef Chapli Kabab Rice",
    category: "Platters",
    // No official photo yet — the old site's picture of the same platter.
    imagePath: "/img/chapli.webp",
    description:
      "Savory beef chapli kebabs over seasoned rice with a crisp side salad.",
    basePriceCents: 1399,
    tags: [],
    optionGroups: PLATTER_GROUPS,
  },

  // ------------------------------------------------------------- gyros
  {
    slug: "chicken-gyro",
    name: "Chicken Gyro",
    category: "Gyros",
    imagePath: "/img/menu/chicken-gyro.jpg",
    description: "Chopped chicken, lettuce, tomato and sauce wrapped in warm pita.",
    basePriceCents: 999,
    tags: [{ kind: "star", label: "Popular" }],
    optionGroups: GYRO_GROUPS,
  },
  {
    slug: "lamb-gyro",
    name: "Lamb Gyro",
    category: "Gyros",
    imagePath: "/img/menu/lamb-gyro.jpg",
    description:
      "Lamb pieces with salad in pita — white, hot, tahini, BBQ, buffalo or green.",
    basePriceCents: 999,
    tags: [],
    optionGroups: GYRO_GROUPS,
  },

  {
    slug: "falafel-gyro",
    name: "Falafel Gyro",
    category: "Gyros",
    // No official photo in the owner's shoot yet — this is the old site's
    // picture of the same wrap. Swap it the moment a proper one arrives.
    imagePath: "/img/falafel-wrap.webp",
    description:
      "Crispy falafel, lettuce, tomato, onion and pickles on grilled pita with white sauce.",
    basePriceCents: 1099,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: GYRO_GROUPS,
  },

  {
    slug: "combo-gyro",
    name: "Combo Gyro",
    category: "Gyros",
    // The old site's photo, until the studio set covers it.
    imagePath: "/img/combo-gyro.webp",
    description:
      "Chicken and lamb in warm pita with salad and any of Shahzad's sauces.",
    basePriceCents: 1399,
    tags: [{ kind: "star", label: "Popular" }],
    optionGroups: GYRO_GROUPS,
  },

  // ------------------------------------------------------ cheesesteaks
  {
    slug: "philly-cheesesteak",
    name: "Philly Cheesesteak",
    category: "Cheesesteaks",
    imagePath: "/img/menu/philly-cheesesteak.jpg",
    description:
      "Cheese, onion, green pepper, ketchup and mayonnaise on a toasted roll.",
    basePriceCents: 1099,
    tags: [{ kind: "star", label: "Must-try" }],
    optionGroups: SANDWICH_GROUPS,
  },
  {
    slug: "chicken-cheesesteak",
    name: "Chicken Cheesesteak",
    category: "Cheesesteaks",
    imagePath: "/img/menu/chicken-cheesesteak.jpg",
    description:
      "Chopped chicken, cheese, onion and green pepper with ketchup and mayo.",
    basePriceCents: 1099,
    tags: [],
    optionGroups: SANDWICH_GROUPS,
  },

  // --------------------------------------------- burgers and sandwiches
  {
    slug: "cheeseburger",
    name: "Cheeseburger",
    category: "Burgers & Sandwiches",
    imagePath: "/img/menu/cheeseburger.jpg",
    description: "Griddled patty with melted cheese, grilled onions, lettuce and tomato.",
    basePriceCents: 699,
    tags: [],
    optionGroups: SANDWICH_GROUPS,
  },
  {
    slug: "crispy-chicken-burger",
    name: "Crispy Chicken Burger",
    category: "Burgers & Sandwiches",
    imagePath: "/img/menu/crispy-chicken-burger.jpg",
    description: "Fried chicken fillet, lettuce and mayo in a toasted bun.",
    basePriceCents: 799,
    tags: [],
    optionGroups: SANDWICH_GROUPS,
  },
  {
    slug: "veggie-burger",
    name: "Veggie Burger",
    category: "Burgers & Sandwiches",
    imagePath: "/img/menu/veggie-burger.jpg",
    description: "Veggie patty with lettuce, tomato and sauce in a toasted bun.",
    basePriceCents: 699,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: SANDWICH_GROUPS,
  },
  {
    slug: "chicken-sandwich",
    name: "Chicken Sandwich",
    category: "Burgers & Sandwiches",
    imagePath: "/img/menu/chicken-sandwich.jpg",
    description: "Grilled chicken with lettuce, tomato and sauce on a soft roll.",
    basePriceCents: 699,
    tags: [],
    optionGroups: SANDWICH_GROUPS,
  },

  // ------------------------------------------------------------- wings
  {
    slug: "chicken-wings",
    name: "Chicken Wings",
    category: "Wings",
    imagePath: "/img/menu/chicken-wings.jpg",
    description:
      "Fried to order and tossed in the sauce you pick. Six, twelve, eighteen or twenty-one.",
    basePriceCents: 999,
    tags: [],
    optionGroups: ["wing-size", "wing-sauce"],
  },

  // ------------------------------------------------------------- sides
  {
    slug: "chicken-tenders",
    name: "3 pc Chicken Tenders",
    category: "Sides",
    imagePath: "/img/menu/chicken-tenders.jpg",
    description: "Three breaded tenders, fried crisp, with a dipping sauce.",
    basePriceCents: 599,
    tags: [],
    optionGroups: SIDE_GROUPS,
  },
  {
    slug: "chicken-nuggets",
    name: "6 pc Nuggets",
    category: "Sides",
    imagePath: "/img/menu/chicken-nuggets.jpg",
    description: "Six chicken nuggets with a dipping sauce.",
    basePriceCents: 499,
    tags: [],
    optionGroups: SIDE_GROUPS,
  },
  {
    slug: "mozzarella-sticks",
    name: "6 pc Mozzarella Sticks",
    category: "Sides",
    imagePath: "/img/menu/mozzarella-sticks.jpg",
    description: "Six sticks, fried golden, with marinara on the side.",
    basePriceCents: 499,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: SIDE_GROUPS,
  },
  {
    slug: "falafel",
    name: "Falafel",
    category: "Sides",
    imagePath: "/img/menu/falafel.jpg",
    description: "Crispy chickpea patties seasoned with herbs and spices.",
    basePriceCents: 599,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: ["falafel-size"],
  },
  {
    slug: "masala-fries",
    name: "Masala Fries",
    category: "Sides",
    imagePath: "/img/menu/masala-fries.jpg",
    description: "Golden fries tossed in house masala seasoning.",
    basePriceCents: 399,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: ["side-size"],
  },
  {
    slug: "waffle-fries",
    name: "Waffle Fries",
    category: "Sides",
    imagePath: "/img/menu/waffle-fries.jpg",
    description: "Thick-cut waffle fries, crisp at the edges.",
    basePriceCents: 499,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: ["side-size"],
  },
  {
    slug: "onion-rings",
    name: "Onion Rings",
    category: "Sides",
    imagePath: "/img/menu/onion-rings.jpg",
    description: "Crispy battered rings with your choice of dipping sauce.",
    basePriceCents: 499,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: ["side-size"],
  },
];

// ------------------------------------------------------------ dips & drinks

/** 75¢ a pot, orderable on their own or alongside anything. */
const DIPS: SeedMenuItem[] = SAUCES.map((sauce) => ({
  slug: `dip-${sauce.slug}`,
  name: `${sauce.name} Dip`,
  category: "Dips" as const,
  imagePath: `/img/menu/extras/dip-${sauce.slug}.svg`,
  description: sauce.description,
  basePriceCents: 75,
  tags: sauce.slug === "tahini" || sauce.slug === "green-sauce"
    ? [{ kind: "veg" as const, label: "Veggie" }]
    : [],
  optionGroups: [],
}));

const DRINKS: SeedMenuItem[] = [
  {
    slug: "water",
    name: "Water",
    category: "Drinks",
    imagePath: "/img/menu/extras/drink-water.svg",
    description: "Bottled water, cold.",
    basePriceCents: 199,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: [],
    // New Jersey exempts unflavoured bottled water; everything else here is
    // prepared food or a soft drink and is taxed.
    isTaxable: false,
  },
  {
    slug: "soda",
    name: "Soda",
    category: "Drinks",
    imagePath: "/img/menu/extras/drink-soda.svg",
    description: "Coke, Diet Coke, Sprite or Ginger Ale.",
    basePriceCents: 199,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: ["soda-flavour"],
  },
  {
    slug: "snapple",
    name: "Snapple",
    category: "Drinks",
    imagePath: "/img/menu/extras/drink-snapple.svg",
    description: "Whatever flavour the fridge is holding.",
    basePriceCents: 199,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: [],
  },
];

MENU_ITEMS.push(...DIPS, ...DRINKS);

/**
 * Items the old homepage advertised that are still not on the owner's price
 * list: Combo Gyro and plain French Fries. (Falafel Gyro and Beef Chapli Kabab
 * Rice came back once their prices arrived.)
 *
 * Deactivated rather than deleted — `isActive: false` hides them from the menu
 * and the cart while keeping any order history that points at them intact. If
 * the kitchen still sells them, send prices and they come straight back.
 *
 * The rest are old slugs for dishes that now live under their real names.
 */
export const RETIRED_SLUGS = [
  "combo-over-rice",
  // Plain fries are the same thing as the masala fries on the price list.
  "french-fries",
  "kofta-kebab-over-rice",
  "4-pc-falafel",
  "philly-cheese-steak",
  "chicken-cheese-steak",
] as const;

/**
 * The handful shown on the homepage. Everything else lives on /menu — the
 * homepage is a taste, not a duplicate of the menu page.
 */
export const FEATURED_SLUGS = [
  "mix-platter",
  "chicken-over-rice",
  "chicken-gyro",
  "philly-cheesesteak",
] as const;
