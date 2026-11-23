/**
 * The menu, transcribed from the printed menu in the shop
 * (`menu prices/Screenshot 2026-09-27 at 6.52.48 PM.png`).
 *
 * Names, prices and category names are the board's, exactly. Where a printed
 * row carries its sizes in the name — "Fries (Sm / Lg)", "Falafel 4Pc / 8Pc" —
 * the sizes become an option group and the name is the dish, so one card holds
 * one dish and the price moves with the choice.
 *
 * This module is the source of truth for the database seed. Everything the
 * customer sees is read from the database, never from here.
 *
 * Money is integer cents. Option prices are the *difference* from the item's
 * base price.
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
   * Base price in cents — the cheapest configuration. Null means unpriced,
   * which shows as "Ask in store" and cannot be added to a cart.
   */
  basePriceCents: number | null;
  tags: MenuTag[];
  /** Option group slugs, in the order they appear on the item. */
  optionGroups: string[];
  /** Defaults to true. New Jersey exempts unflavoured bottled water. */
  isTaxable?: boolean;
};

/** Exactly the section names on the printed menu, in its order. */
export const CATEGORIES = [
  "Platters",
  "Gyros",
  "Sandwiches",
  "Wings",
  "Sides",
  "Desserts & Sweets",
  "Beverages",
  "Extra Sauces",
] as const;

export type CategoryName = (typeof CATEGORIES)[number];

// ---------------------------------------------------------------- sauces

export type Sauce = {
  slug: string;
  name: string;
  color: string;
  ink: string;
  /** Heat, 0–5. */
  heat: number;
  description: string;
};

/** The six house sauces: free on platters and gyros, 75¢ on the side. */
export const SAUCES: Sauce[] = [
  {
    slug: "white-sauce",
    name: "White",
    color: "#f3eee2",
    ink: "#1b140f",
    heat: 0,
    description:
      "The legend. Cool, creamy and tangy — the one you drown the whole platter in.",
  },
  {
    slug: "hot-sauce",
    name: "Hot",
    color: "#d8321f",
    ink: "#fff",
    heat: 5,
    description:
      "Bright red, seriously spicy. A little goes a long way — respect the squeeze.",
  },
  {
    slug: "green-sauce",
    name: "Green",
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
    description: "Smoky and sweet. Unexpectedly great on a chicken and lamb gyro.",
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

/** The seven wing sauces printed under the WINGS heading. */
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
};

export type SeedOptionGroup = {
  slug: string;
  name: string;
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
      // "Spicy Rice FREE" on the board.
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
      // The board prints "No Salad +$2"; the owner asked for it to be free.
      // See OPEN-QUESTIONS.md — his instruction wins until he says otherwise.
      { slug: "no-salad", name: "No salad", priceCents: 0 },
    ],
  },
  {
    // "Add Fries & Soda +$5" under GYROS.
    slug: "meal-deal-gyro",
    name: "Make it a meal",
    minSelect: 0,
    maxSelect: 1,
    options: [{ slug: "fries-and-soda", name: "Add fries and a soda", priceCents: 500 }],
  },
  {
    // "Add Fries & Soda +$4.99" under SANDWICHES — a penny less than the gyro.
    slug: "meal-deal-sandwich",
    name: "Make it a meal",
    minSelect: 0,
    maxSelect: 1,
    options: [{ slug: "fries-and-soda", name: "Add fries and a soda", priceCents: 499 }],
  },
  {
    slug: "wing-size",
    name: "How many",
    minSelect: 1,
    maxSelect: 1,
    options: [
      { slug: "6-pc", name: "6 Pc", priceCents: 0 },
      { slug: "12-pc", name: "12 Pc", priceCents: 800 },
      { slug: "18-pc", name: "18 Pc", priceCents: 1700 },
      { slug: "21-pc", name: "21 Pc", priceCents: 2200 },
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
      { slug: "4-pc", name: "4 Pc", priceCents: 0 },
      { slug: "8-pc", name: "8 Pc", priceCents: 400 },
    ],
  },
  {
    slug: "side-size",
    name: "Size",
    minSelect: 1,
    maxSelect: 1,
    options: [
      { slug: "sm", name: "Sm", priceCents: 0 },
      { slug: "lg", name: "Lg", priceCents: 200 },
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

const PLATTER_GROUPS = ["rice-style", "sauce-choice", "platter-extras", "extra-sauce"];
const GYRO_GROUPS = ["sauce-choice", "meal-deal-gyro", "extra-sauce"];
const SANDWICH_GROUPS = ["meal-deal-sandwich"];

const pending = (slug: string) => `/img/menu/extras/pending-${slug}.svg`;

export const MENU_ITEMS: SeedMenuItem[] = [
  // --------------------------------------------------------- PLATTERS
  // "Over brown basmati rice · salad · Shahzad's sauces"
  {
    slug: "fish-over-rice",
    name: "2 Pc Fish over Rice",
    category: "Platters",
    imagePath: "/img/menu/plate/fish-over-rice.webp",
    description: "Two fried fish fillets over brown basmati with salad and your sauce.",
    basePriceCents: 1199,
    tags: [],
    optionGroups: PLATTER_GROUPS,
  },
  {
    slug: "falafel-over-rice",
    name: "Falafel over Rice",
    category: "Platters",
    imagePath: "/img/menu/plate/falafel-over-rice.webp",
    description:
      "Crispy falafel over brown basmati with a side salad and your choice of sauce.",
    basePriceCents: 1199,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: PLATTER_GROUPS,
  },
  {
    slug: "chicken-over-rice",
    name: "Chicken over Rice",
    category: "Platters",
    imagePath: "/img/menu/plate/chicken-over-rice.webp",
    description:
      "Marinated chicken chopped hot off the flat-top, over brown basmati with salad.",
    basePriceCents: 1299,
    tags: [{ kind: "star", label: "Popular" }],
    optionGroups: PLATTER_GROUPS,
  },
  {
    slug: "lamb-over-rice",
    name: "Lamb over Rice",
    category: "Platters",
    imagePath: "/img/menu/plate/lamb-over-rice.webp",
    description: "Lamb cut from the spit and crisped on the griddle, over brown basmati.",
    basePriceCents: 1299,
    tags: [],
    optionGroups: PLATTER_GROUPS,
  },
  {
    slug: "chicken-kofta-kabab-over-rice",
    name: "Chicken Kofta Kabab",
    category: "Platters",
    imagePath: "/img/menu/plate/chicken-kofta-kabab-over-rice.webp",
    description:
      "Freshly ground chicken with herbs and spices, chopped and served over rice.",
    basePriceCents: 1299,
    tags: [],
    optionGroups: PLATTER_GROUPS,
  },
  {
    slug: "chicken-chapli-kabab",
    name: "Chicken Chapli Kabab",
    category: "Platters",
    imagePath: "/img/menu/plate/chicken-chapli-kabab.webp",
    description: "Spiced chicken chapli patties over rice with a crisp side salad.",
    basePriceCents: 1299,
    tags: [],
    optionGroups: PLATTER_GROUPS,
  },
  {
    slug: "shrimp-platter",
    name: "Shrimp Platter",
    category: "Platters",
    imagePath: "/img/menu/plate/shrimp-platter.webp",
    description: "Fried shrimp over brown basmati with salad and your sauce.",
    basePriceCents: 1299,
    tags: [{ kind: "star", label: "New" }],
    optionGroups: PLATTER_GROUPS,
  },
  {
    slug: "beef-chapli-kabab-rice",
    name: "Beef Chapli Kabab",
    category: "Platters",
    imagePath: "/img/menu/plate/beef-chapli-kabab-rice.webp",
    description: "Savory beef chapli kebabs over seasoned rice with a crisp side salad.",
    basePriceCents: 1399,
    tags: [],
    optionGroups: PLATTER_GROUPS,
  },
  {
    slug: "mix-platter",
    name: "Lamb & Chicken Mix",
    category: "Platters",
    imagePath: "/img/menu/plate/mix-platter.webp",
    description:
      "Chicken and lamb together over brown basmati, with salad and any of Shahzad's sauces.",
    basePriceCents: 1399,
    tags: [{ kind: "star", label: "Signature" }],
    optionGroups: PLATTER_GROUPS,
  },
  {
    slug: "chapli-kabab-mix",
    name: "Chapli Kabab Mix",
    category: "Platters",
    imagePath: "/img/menu/plate/chapli-kabab-mix.webp",
    description: "Chicken and beef chapli kebabs together over rice, with salad.",
    basePriceCents: 1499,
    tags: [],
    optionGroups: PLATTER_GROUPS,
  },

  // ------------------------------------------------------------ GYROS
  // "Pita · salad · sauces | Add Fries & Soda +$5"
  {
    slug: "chicken-gyro",
    name: "Chicken",
    category: "Gyros",
    imagePath: "/img/menu/plate/chicken-gyro.webp",
    description: "Chopped chicken, lettuce, tomato and sauce wrapped in warm pita.",
    basePriceCents: 999,
    tags: [{ kind: "star", label: "Popular" }],
    optionGroups: GYRO_GROUPS,
  },
  {
    slug: "lamb-gyro",
    name: "Lamb",
    category: "Gyros",
    imagePath: "/img/menu/cutout/lamb-gyro.webp",
    description: "Lamb with salad in pita — white, hot, tahini, BBQ, buffalo or green.",
    basePriceCents: 999,
    tags: [],
    optionGroups: GYRO_GROUPS,
  },
  {
    slug: "combo-gyro",
    name: "Chicken & Lamb",
    category: "Gyros",
    imagePath: "/img/menu/plate/combo-gyro.webp",
    description: "Chicken and lamb together in warm pita with salad and your sauce.",
    basePriceCents: 999,
    tags: [],
    optionGroups: GYRO_GROUPS,
  },
  {
    slug: "falafel-gyro",
    name: "Falafel on Pita",
    category: "Gyros",
    imagePath: "/img/menu/plate/falafel-gyro.webp",
    description: "Crispy falafel, lettuce, tomato, onion and pickles on grilled pita.",
    basePriceCents: 1099,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: GYRO_GROUPS,
  },
  {
    slug: "fish-pita",
    name: "2 Pc Fish Pita",
    category: "Gyros",
    imagePath: "/img/menu/plate/fish-pita.webp",
    description: "Two fried fish fillets in pita with salad and sauce.",
    basePriceCents: 1099,
    tags: [],
    optionGroups: GYRO_GROUPS,
  },
  {
    slug: "kofta-kabab-gyro",
    name: "Kofta Kabab",
    category: "Gyros",
    imagePath: "/img/menu/plate/kofta-kabab-gyro.webp",
    description: "Ground chicken kofta with salad, wrapped in warm pita.",
    basePriceCents: 1099,
    tags: [],
    optionGroups: GYRO_GROUPS,
  },
  {
    slug: "chicken-chapli-gyro",
    name: "Chicken Chapli",
    category: "Gyros",
    imagePath: "/img/menu/plate/chicken-chapli-gyro.webp",
    description: "Spiced chicken chapli patty in pita with salad and sauce.",
    basePriceCents: 1099,
    tags: [],
    optionGroups: GYRO_GROUPS,
  },
  {
    slug: "mix-chapli-gyro",
    name: "Mix Chapli",
    category: "Gyros",
    imagePath: "/img/menu/plate/mix-chapli-gyro.webp",
    description: "Chicken and beef chapli together in pita with salad.",
    basePriceCents: 1099,
    tags: [],
    optionGroups: GYRO_GROUPS,
  },
  {
    slug: "beef-chapli-gyro",
    name: "Beef Chapli",
    category: "Gyros",
    imagePath: "/img/menu/plate/beef-chapli-gyro.webp",
    description: "Beef chapli patty in warm pita with salad and your sauce.",
    basePriceCents: 1199,
    tags: [],
    optionGroups: GYRO_GROUPS,
  },

  // ------------------------------------------------------- SANDWICHES
  // "Add Fries & Soda +$4.99"
  {
    slug: "cheeseburger",
    name: "Cheese Burger",
    category: "Sandwiches",
    imagePath: "/img/menu/plate/cheeseburger.webp",
    description: "Griddled patty with melted cheese, grilled onions, lettuce and tomato.",
    basePriceCents: 699,
    tags: [],
    optionGroups: SANDWICH_GROUPS,
  },
  {
    slug: "chicken-sandwich",
    name: "Chicken Sandwich",
    category: "Sandwiches",
    imagePath: "/img/menu/plate/chicken-sandwich.webp",
    description: "Fried chicken with lettuce, tomato and red onion on a soft roll.",
    basePriceCents: 699,
    tags: [],
    optionGroups: SANDWICH_GROUPS,
  },
  {
    slug: "fish-sandwich",
    name: "Fish Sandwich",
    category: "Sandwiches",
    imagePath: "/img/menu/plate/fish-sandwich.webp",
    description: "Fried fish fillet with lettuce, tomato and sauce in a toasted bun.",
    basePriceCents: 699,
    tags: [],
    optionGroups: SANDWICH_GROUPS,
  },
  {
    slug: "veggie-burger",
    name: "Veggie Burger",
    category: "Sandwiches",
    imagePath: "/img/menu/plate/veggie-burger.webp",
    description: "Veggie patty with lettuce, tomato and sauce in a toasted bun.",
    basePriceCents: 699,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: SANDWICH_GROUPS,
  },
  {
    slug: "crispy-chicken-burger",
    name: "Crispy Chicken Burger",
    category: "Sandwiches",
    imagePath: "/img/menu/plate/crispy-chicken-burger.webp",
    description: "Fried chicken fillet, lettuce and mayo in a toasted bun.",
    basePriceCents: 799,
    tags: [],
    optionGroups: SANDWICH_GROUPS,
  },
  {
    slug: "grilled-chicken-sandwich",
    name: "Grilled Chicken Sandwich",
    category: "Sandwiches",
    imagePath: "/img/menu/plate/grilled-chicken-sandwich.webp",
    description: "Chicken breast off the grill with lettuce, tomato and red onion in a toasted bun.",
    basePriceCents: 799,
    tags: [{ kind: "star", label: "New" }],
    optionGroups: SANDWICH_GROUPS,
  },
  {
    slug: "double-cheese-burger",
    name: "Double Cheese Burger",
    category: "Sandwiches",
    imagePath: "/img/menu/plate/double-cheese-burger.webp",
    description: "Two patties, double cheese, grilled onions, lettuce and tomato.",
    basePriceCents: 999,
    tags: [],
    optionGroups: SANDWICH_GROUPS,
  },
  {
    slug: "philly-cheesesteak",
    name: "Philly Cheese Steak",
    category: "Sandwiches",
    imagePath: "/img/menu/plate/philly-cheesesteak.webp",
    description: "Cheese, onion, green pepper, ketchup and mayonnaise on a toasted roll.",
    basePriceCents: 1099,
    tags: [{ kind: "star", label: "Must-try" }],
    optionGroups: SANDWICH_GROUPS,
  },
  {
    slug: "chicken-cheesesteak",
    name: "Chicken Cheese Steak",
    category: "Sandwiches",
    imagePath: "/img/menu/plate/chicken-cheesesteak.webp",
    description: "Chopped chicken, cheese, onion and green pepper with ketchup and mayo.",
    basePriceCents: 1099,
    tags: [],
    optionGroups: SANDWICH_GROUPS,
  },

  // ------------------------------------------------------------ WINGS
  {
    slug: "chicken-wings",
    name: "Wings",
    category: "Wings",
    imagePath: "/img/menu/plate/chicken-wings.webp",
    description:
      "Fried to order and tossed in the sauce you pick. Six, twelve, eighteen or twenty-one.",
    basePriceCents: 999,
    tags: [],
    optionGroups: ["wing-size", "wing-sauce"],
  },

  // ------------------------------------------------------------ SIDES
  {
    slug: "pita-bread",
    name: "Pita Bread",
    category: "Sides",
    imagePath: pending("pita-bread"),
    description: "Warm pita, straight off the griddle.",
    basePriceCents: 199,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: [],
  },
  {
    slug: "french-fries",
    name: "Fries",
    category: "Sides",
    imagePath: "/img/menu/plate/french-fries.webp",
    description: "Golden fries, straight out of the fryer.",
    basePriceCents: 399,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: ["side-size"],
  },
  {
    slug: "salad",
    name: "Salad",
    category: "Sides",
    imagePath: pending("salad"),
    description: "Crisp greens, cucumber, tomato and onion.",
    basePriceCents: 399,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: [],
  },
  {
    slug: "onion-rings",
    name: "Onion Rings",
    category: "Sides",
    imagePath: "/img/menu/plate/onion-rings.webp",
    description: "Crispy battered rings, fried golden.",
    basePriceCents: 499,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: ["side-size"],
  },
  {
    slug: "waffle-fries",
    name: "Waffle Fries",
    category: "Sides",
    imagePath: "/img/menu/plate/waffle-fries.webp",
    description: "Thick-cut waffle fries, crisp at the edges.",
    basePriceCents: 499,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: ["side-size"],
  },
  {
    slug: "masala-fries",
    name: "Masala Fries",
    category: "Sides",
    imagePath: pending("masala-fries"),
    description: "Golden fries tossed in house masala seasoning.",
    basePriceCents: 499,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: ["side-size"],
  },
  {
    slug: "curly-fries",
    name: "Curly Fries",
    category: "Sides",
    imagePath: pending("curly-fries"),
    description: "Seasoned curly fries, fried crisp.",
    basePriceCents: 499,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: ["side-size"],
  },
  {
    slug: "chicken-nuggets",
    name: "6 Pc Nuggets",
    category: "Sides",
    imagePath: "/img/menu/plate/chicken-nuggets.webp",
    description: "Six chicken nuggets with a dipping sauce.",
    basePriceCents: 499,
    tags: [],
    optionGroups: [],
  },
  {
    slug: "mozzarella-sticks",
    name: "6 Pc Mozz Sticks",
    category: "Sides",
    imagePath: "/img/menu/plate/mozzarella-sticks.webp",
    description: "Six sticks, fried golden, with marinara on the side.",
    basePriceCents: 499,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: [],
  },
  {
    slug: "chicken-tenders",
    name: "3 Pc Tenders",
    category: "Sides",
    imagePath: "/img/menu/plate/chicken-tenders.webp",
    description: "Three breaded tenders, fried crisp, with a dipping sauce.",
    basePriceCents: 599,
    tags: [],
    optionGroups: [],
  },
  {
    slug: "falafel",
    name: "Falafel",
    category: "Sides",
    imagePath: "/img/menu/plate/falafel.webp",
    description: "Crispy chickpea patties seasoned with herbs and spices.",
    basePriceCents: 599,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: ["falafel-size"],
  },
  {
    slug: "chicken-tenders-6pc",
    name: "6 Pc Chicken Tenders",
    category: "Sides",
    imagePath: pending("chicken-tenders-6pc"),
    description: "Six breaded tenders with a dipping sauce.",
    basePriceCents: 999,
    tags: [],
    optionGroups: [],
  },

  // ------------------------------------------------ DESSERTS & SWEETS
  {
    slug: "cheese-cake",
    name: "Cheese Cake",
    category: "Desserts & Sweets",
    imagePath: pending("cheese-cake"),
    description: "A thick slice, cold from the fridge.",
    basePriceCents: 349,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: [],
  },
  {
    slug: "chocolate-cake",
    name: "Chocolate Cake",
    category: "Desserts & Sweets",
    imagePath: pending("chocolate-cake"),
    description: "Dark, rich and generous.",
    basePriceCents: 399,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: [],
  },
  {
    slug: "red-velvet-cake",
    name: "Red Velvet Cake",
    category: "Desserts & Sweets",
    imagePath: pending("red-velvet-cake"),
    description: "Red velvet with cream cheese frosting.",
    basePriceCents: 399,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: [],
  },
  {
    slug: "gulab-jamun",
    name: "Gulab Jamun",
    category: "Desserts & Sweets",
    imagePath: pending("gulab-jamun"),
    description: "Warm, syrup-soaked and worth the mess.",
    basePriceCents: 599,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: [],
  },
  {
    slug: "baklava",
    name: "Baklava",
    category: "Desserts & Sweets",
    imagePath: "/img/menu/plate/baklava.webp",
    description: "Layered filo, nuts and honey.",
    basePriceCents: 599,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: [],
  },

  // -------------------------------------------------------- BEVERAGES
  {
    slug: "water",
    name: "Water",
    category: "Beverages",
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
    category: "Beverages",
    imagePath: "/img/menu/extras/drink-soda.svg",
    description: "Coke, Diet Coke, Sprite or Ginger Ale.",
    basePriceCents: 199,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: ["soda-flavour"],
  },
  {
    slug: "snapple",
    name: "Snapple",
    category: "Beverages",
    imagePath: "/img/menu/extras/drink-snapple.svg",
    description: "Whatever flavour the fridge is holding.",
    basePriceCents: 299,
    tags: [{ kind: "veg", label: "Veggie" }],
    optionGroups: [],
  },
];

// ----------------------------------------------------- EXTRA SAUCES

/**
 * The six sauces at 75¢ a pot. They are an add-on on a platter or a gyro, and
 * a line of their own with anything else.
 */
const EXTRA_SAUCES: SeedMenuItem[] = SAUCES.map((sauce) => ({
  slug: `dip-${sauce.slug}`,
  name: sauce.name,
  category: "Extra Sauces" as const,
  imagePath: `/img/menu/extras/dip-${sauce.slug}.svg`,
  description: sauce.description,
  basePriceCents: 75,
  tags:
    sauce.slug === "tahini" || sauce.slug === "green-sauce"
      ? [{ kind: "veg" as const, label: "Veggie" }]
      : [],
  optionGroups: [],
}));

MENU_ITEMS.push(...EXTRA_SAUCES);

/**
 * Slugs that are not on the printed menu under any name. Deactivated rather
 * than deleted, so order history that points at them still reads correctly.
 */
export const RETIRED_SLUGS = [
  "combo-over-rice",
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
