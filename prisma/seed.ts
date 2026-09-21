/**
 * Seeds the menu that was hard-coded in the original index.html.
 *
 * Idempotent: every write is an upsert keyed on a stable slug, so running it
 * again after `prisma migrate dev` never duplicates rows and never clobbers a
 * price the owner has since set in the manager area.
 *
 * Prices are intentionally NOT seeded — basePriceCents stays NULL until the
 * owner supplies the real menu prices (see OPEN-QUESTIONS.md).
 */

import { PrismaClient, type ItemTag } from "@prisma/client";
import { CATEGORIES, MENU_ITEMS, SAUCES } from "../src/lib/menu-data";
import { hashPassword } from "../src/lib/auth/password";
import { normalizePhone } from "../src/lib/auth/phone";
import { passwordProblem } from "../src/lib/auth/login-policy";

const prisma = new PrismaClient();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function main() {
  // --- store settings ------------------------------------------------------
  await prisma.storeSettings.upsert({
    where: { id: "store" },
    update: {},
    create: { id: "store" },
  });

  // --- categories ----------------------------------------------------------
  const categoryIds = new Map<string, string>();
  for (const [index, name] of CATEGORIES.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: { name, sortOrder: index },
      create: { name, slug: slugify(name), sortOrder: index },
    });
    categoryIds.set(name, category.id);
  }

  // --- the sauce choice group ---------------------------------------------
  // Free, pick up to two — the homepage already advertises the half-and-half.
  const sauceGroup = await prisma.optionGroup.upsert({
    where: { slug: "sauce-choice" },
    update: { name: "Sauce choice", minSelect: 0, maxSelect: 2 },
    create: {
      name: "Sauce choice",
      slug: "sauce-choice",
      minSelect: 0,
      maxSelect: 2,
      sortOrder: 0,
    },
  });

  for (const [index, sauce] of SAUCES.entries()) {
    await prisma.option.upsert({
      where: {
        optionGroupId_slug: { optionGroupId: sauceGroup.id, slug: sauce.slug },
      },
      update: { name: sauce.name, sortOrder: index },
      create: {
        optionGroupId: sauceGroup.id,
        name: sauce.name,
        slug: sauce.slug,
        priceCents: 0,
        sortOrder: index,
      },
    });
  }

  // --- menu items ----------------------------------------------------------
  for (const [index, item] of MENU_ITEMS.entries()) {
    const categoryId = categoryIds.get(item.category);
    if (!categoryId) throw new Error(`Unknown category: ${item.category}`);

    // Everything Shahzad's sells is halal; "Veggie" is the only other tag the
    // original menu carried. Star labels are merchandising, not dietary tags.
    const tags: ItemTag[] = ["HALAL"];
    if (item.tags.some((t) => t.kind === "veg")) tags.push("VEGGIE");
    const badge = item.tags.find((t) => t.kind === "star")?.label ?? null;

    const menuItem = await prisma.menuItem.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        imagePath: item.imagePath,
        categoryId,
        sortOrder: index,
        tags,
        badge,
        // basePriceCents deliberately left alone on re-seed.
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        imagePath: item.imagePath,
        categoryId,
        sortOrder: index,
        tags,
        badge,
        basePriceCents: null,
      },
    });

    // Platters and gyros come with a sauce choice; sides and burgers do not.
    // ASSUMPTION — confirm with the owner (OPEN-QUESTIONS.md).
    const takesSauce = item.category === "Platters" || item.category === "Gyros";
    if (takesSauce) {
      await prisma.menuItemOptionGroup.upsert({
        where: {
          menuItemId_optionGroupId: {
            menuItemId: menuItem.id,
            optionGroupId: sauceGroup.id,
          },
        },
        update: {},
        create: {
          menuItemId: menuItem.id,
          optionGroupId: sauceGroup.id,
          sortOrder: 0,
        },
      });
    }
  }

  // --- owner account (optional) -------------------------------------------
  // SEED_OWNER_PHONE=+1XXXXXXXXXX SEED_OWNER_PASSWORD='...' npm run db:seed
  const rawOwnerPhone = process.env.SEED_OWNER_PHONE;
  if (rawOwnerPhone) {
    const ownerPhone = normalizePhone(rawOwnerPhone);
    if (!ownerPhone) throw new Error(`SEED_OWNER_PHONE is not a valid US number: ${rawOwnerPhone}`);

    const ownerPassword = process.env.SEED_OWNER_PASSWORD;
    if (ownerPassword) {
      const problem = passwordProblem(ownerPassword, ownerPhone);
      if (problem) throw new Error(`SEED_OWNER_PASSWORD: ${problem}`);
    }

    const existing = await prisma.user.findUnique({ where: { phone: ownerPhone } });
    await prisma.user.upsert({
      where: { phone: ownerPhone },
      // Never overwrite a password that is already set.
      update: {
        role: "OWNER",
        ...(ownerPassword && !existing?.passwordHash
          ? { passwordHash: await hashPassword(ownerPassword) }
          : {}),
      },
      create: {
        phone: ownerPhone,
        name: process.env.SEED_OWNER_NAME ?? "Owner",
        role: "OWNER",
        ...(ownerPassword ? { passwordHash: await hashPassword(ownerPassword) } : {}),
      },
    });

    const hasPassword = Boolean(ownerPassword || existing?.passwordHash);
    console.log(
      `Owner account ready for ${ownerPhone.slice(0, 2)}••••${ownerPhone.slice(-2)}` +
        (hasPassword
          ? ""
          : " — no password set, so it cannot log in yet. Re-run with SEED_OWNER_PASSWORD, or sign up with that number and then set the role."),
    );
  } else {
    console.log("SEED_OWNER_PHONE not set — no owner account created.");
  }

  const counts = {
    categories: await prisma.category.count(),
    items: await prisma.menuItem.count(),
    sauces: await prisma.option.count({ where: { optionGroupId: sauceGroup.id } }),
    pricedItems: await prisma.menuItem.count({ where: { basePriceCents: { not: null } } }),
  };
  console.log("Seed complete:", counts);
  if (counts.pricedItems === 0) {
    console.log("NOTE: no item has a price yet, so nothing is orderable. See OPEN-QUESTIONS.md.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
