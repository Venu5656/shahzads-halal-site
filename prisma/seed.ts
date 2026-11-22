/**
 * Seeds the real menu: categories, option groups, and 21 priced items.
 *
 * Idempotent: every write is an upsert keyed on a stable slug, so running it
 * again never duplicates rows. Prices and availability ARE overwritten from
 * src/lib/menu-data.ts, which is the source of truth for them — once the
 * manager area can edit prices (phase 7), that changes.
 */

import { PrismaClient, type ItemTag } from "@prisma/client";
import { CATEGORIES, MENU_ITEMS, OPTION_GROUPS, RETIRED_SLUGS } from "../src/lib/menu-data";
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

  // --- option groups -------------------------------------------------------
  const groupIds = new Map<string, string>();
  for (const [index, group] of OPTION_GROUPS.entries()) {
    const row = await prisma.optionGroup.upsert({
      where: { slug: group.slug },
      update: {
        name: group.name,
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        sortOrder: index,
        isActive: true,
      },
      create: {
        slug: group.slug,
        name: group.name,
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        sortOrder: index,
      },
    });
    groupIds.set(group.slug, row.id);

    for (const [optionIndex, option] of group.options.entries()) {
      await prisma.option.upsert({
        where: { optionGroupId_slug: { optionGroupId: row.id, slug: option.slug } },
        update: {
          name: option.name,
          priceCents: option.priceCents,
          sortOrder: optionIndex,
          isAvailable: true,
        },
        create: {
          optionGroupId: row.id,
          slug: option.slug,
          name: option.name,
          priceCents: option.priceCents,
          sortOrder: optionIndex,
        },
      });
    }

    // An option pulled from the list stops being orderable rather than
    // disappearing, so any past order that referenced it still reads correctly.
    await prisma.option.updateMany({
      where: { optionGroupId: row.id, slug: { notIn: group.options.map((o) => o.slug) } },
      data: { isAvailable: false },
    });
  }

  // --- menu items ----------------------------------------------------------
  for (const [index, item] of MENU_ITEMS.entries()) {
    const categoryId = categoryIds.get(item.category);
    if (!categoryId) throw new Error(`Unknown category: ${item.category}`);

    // Everything Shahzad's sells is halal; "Veggie" is the only other tag the
    // menu carries. Star labels are merchandising, not dietary tags.
    const tags: ItemTag[] = ["HALAL"];
    if (item.tags.some((t) => t.kind === "veg")) tags.push("VEGGIE");
    const badge = item.tags.find((t) => t.kind === "star")?.label ?? null;

    const fields = {
      name: item.name,
      description: item.description,
      imagePath: item.imagePath,
      basePriceCents: item.basePriceCents,
      categoryId,
      sortOrder: index,
      tags,
      badge,
      isTaxable: item.isTaxable ?? true,
      isActive: true,
    };

    const menuItem = await prisma.menuItem.upsert({
      where: { slug: item.slug },
      update: fields,
      create: { slug: item.slug, ...fields },
      select: { id: true },
    });

    for (const [groupIndex, groupSlug] of item.optionGroups.entries()) {
      const optionGroupId = groupIds.get(groupSlug);
      if (!optionGroupId) throw new Error(`Unknown option group: ${groupSlug}`);
      await prisma.menuItemOptionGroup.upsert({
        where: { menuItemId_optionGroupId: { menuItemId: menuItem.id, optionGroupId } },
        update: { sortOrder: groupIndex },
        create: { menuItemId: menuItem.id, optionGroupId, sortOrder: groupIndex },
      });
    }

    // Detach any group this item no longer carries.
    const keep = item.optionGroups
      .map((slug) => groupIds.get(slug))
      .filter((id): id is string => Boolean(id));
    await prisma.menuItemOptionGroup.deleteMany({
      where: { menuItemId: menuItem.id, optionGroupId: { notIn: keep } },
    });
  }

  // --- items no longer on the price list -----------------------------------
  // Hidden, not deleted: order history that points at them has to keep reading
  // correctly, and the kitchen may still sell some of them.
  const retired = await prisma.menuItem.updateMany({
    where: { slug: { in: [...RETIRED_SLUGS] }, isActive: true },
    data: { isActive: false },
  });
  if (retired.count) console.log(`Retired ${retired.count} item(s) not on the price list.`);

  // A category with nothing live in it is hidden too, so the menu never shows
  // an empty tab.
  const liveCategoryIds = [...categoryIds.values()];
  await prisma.category.updateMany({
    where: { id: { notIn: liveCategoryIds } },
    data: { isActive: false },
  });
  await prisma.category.updateMany({
    where: { id: { in: liveCategoryIds } },
    data: { isActive: true },
  });

  // --- owner account (optional) -------------------------------------------
  //
  // This is now the ONLY way a first account comes into being. There is no
  // public sign-up form: the site takes no orders, so a customer has nothing
  // to have an account for, and anyone who wants offers joins the promotions
  // list, which has no password at all.
  //
  // SEED_OWNER_EMAIL=... SEED_OWNER_PHONE=+1XXXXXXXXXX SEED_OWNER_PASSWORD='...' npm run db:seed
  const rawOwnerPhone = process.env.SEED_OWNER_PHONE;
  if (rawOwnerPhone) {
    const ownerPhone = normalizePhone(rawOwnerPhone);
    if (!ownerPhone) throw new Error(`SEED_OWNER_PHONE is not a valid US number: ${rawOwnerPhone}`);

    const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
    if (!ownerEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail)) {
      throw new Error("SEED_OWNER_EMAIL must be a valid address — it is how the owner logs in.");
    }

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
        email: ownerEmail,
        emailVerifiedAt: existing?.emailVerifiedAt ?? new Date(),
        ...(ownerPassword && !existing?.passwordHash
          ? { passwordHash: await hashPassword(ownerPassword) }
          : {}),
      },
      create: {
        phone: ownerPhone,
        email: ownerEmail,
        // Seeded by hand at the console, so the address is taken as proved —
        // there is nobody to click a link in a fresh install.
        emailVerifiedAt: new Date(),
        name: process.env.SEED_OWNER_NAME ?? "Owner",
        role: "OWNER",
        ...(ownerPassword ? { passwordHash: await hashPassword(ownerPassword) } : {}),
      },
    });

    const hasPassword = Boolean(ownerPassword || existing?.passwordHash);
    console.log(
      `Owner account ready for ${ownerEmail.slice(0, 1)}••••${ownerEmail.slice(ownerEmail.indexOf("@"))}` +
        (hasPassword
          ? ""
          : " — no password set, so it cannot log in yet. Re-run with SEED_OWNER_PASSWORD."),
    );
  } else {
    console.log("SEED_OWNER_PHONE not set — no owner account created.");
  }

  const counts = {
    categories: await prisma.category.count({ where: { isActive: true } }),
    items: await prisma.menuItem.count({ where: { isActive: true } }),
    optionGroups: await prisma.optionGroup.count(),
    options: await prisma.option.count(),
    unpriced: await prisma.menuItem.count({
      where: { isActive: true, basePriceCents: null },
    }),
  };
  console.log("Seed complete:", counts);
  if (counts.unpriced > 0) {
    console.log(`NOTE: ${counts.unpriced} live item(s) still have no price and cannot be ordered.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
