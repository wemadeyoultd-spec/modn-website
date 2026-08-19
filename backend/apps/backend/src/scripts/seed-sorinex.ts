import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Sorinex-style catalog seed.
 *
 * Replaces the default Medusa demo catalog (T-shirt / Sweatshirt / Sweatpants /
 * Shorts and the Shirts/Sweatshirts/Pants/Merch categories) with a Sorinex
 * strength-equipment catalog: 11 categories, one representative product each.
 *
 * Run with:  npx medusa exec ./src/scripts/seed-sorinex.ts
 *
 * Category and product names/handles are the REAL Sorinex ones captured in
 * scratchpad/sorinex-data.json. Prices are mostly UNKNOWN placeholders (only the
 * XL Half Rack ~$1,999 base is a confirmed data point) — every placeholder price
 * is flagged inline. Images are LOCAL placeholder SVGs served by the storefront
 * from /public/placeholder/<handle>.svg; swap them for the real Sorinex Shopify
 * CDN images (shop id 1/2559/4942) once cdn.shopify.com is allowlisted. See
 * scratchpad/image-swap-TODO.md.
 *
 * This script is idempotent: it deletes any previously-seeded Sorinex products /
 * categories (and the demo ones) by handle/name before re-creating them.
 */

// Demo data created by initial-data-seed.ts that we replace.
const DEMO_PRODUCT_HANDLES = ["t-shirt", "sweatshirt", "sweatpants", "shorts"]
const DEMO_CATEGORY_NAMES = ["Shirts", "Sweatshirts", "Pants", "Merch"]

type SeedCategory = {
  name: string
  handle: string
  description: string
}

type SeedProduct = {
  categoryHandle: string
  title: string
  handle: string
  description: string
  // USD price in the store's minor-unit convention used by the demo seed (whole USD).
  priceUsd: number
  // true => confirmed data point, false => placeholder to be replaced.
  priceConfirmed: boolean
  optionTitle: string
  optionValue: string
  sku: string
}

const CATEGORIES: SeedCategory[] = [
  {
    name: "Racks & Rigs",
    handle: "racks",
    description:
      "Custom made-to-order power racks, half racks, squat stands, yokes and rigs. Built in the USA to expand and adapt as your programs evolve.",
  },
  {
    name: "Barbells & Specialty Bars",
    handle: "barbells",
    description:
      "Olympic, power and performance barbells plus specialty bars — squat bars, camber bars and thick-grip axles for every lift.",
  },
  {
    name: "Benches",
    handle: "benches",
    description:
      "Adjustable, flat and decline benches engineered with stainless components and durable padding for high-volume training environments.",
  },
  {
    name: "Bumpers & Plates",
    handle: "bumpers-plates",
    description:
      "Premium rubber bumper plates and steel change plates for collegiate, professional and private strength facilities.",
  },
  {
    name: "Dumbbells & Kettlebells",
    handle: "dumbbells",
    description:
      "Cast dumbbells and kettlebells for pressing, carrying and conditioning work across every level of athlete.",
  },
  {
    name: "Conditioning",
    handle: "conditioning",
    description:
      "Sleds, prowlers, medicine balls, plyo boxes and weight vests built for athletic and tactical strength and conditioning.",
  },
  {
    name: "Machines",
    handle: "machines",
    description:
      "Selectorized and plate-loaded strength machines, including rotational power trainers, for facility and team weight rooms.",
  },
  {
    name: "Accessories",
    handle: "accessories",
    description:
      "Bands, chains, cable attachments, belts, blocks, grip-strength tools, landmines and barbell accessories.",
  },
  {
    name: "Flooring & Storage",
    handle: "flooring-storage",
    description:
      "Platform flooring, bar and plate storage units and organization solutions to keep a weight room efficient and safe.",
  },
  {
    name: "Apparel & Goods",
    handle: "t-shirts",
    description:
      "Sorinex strength-and-conditioning apparel, hats, drinkware and goods for training and everyday wear.",
  },
  {
    name: "Sorinex Outdoors",
    handle: "od-equipment",
    description:
      "The Sorinex Outdoors sub-brand — equipment and apparel for training beyond the four walls of the gym.",
  },
]

const PRODUCTS: SeedProduct[] = [
  {
    categoryHandle: "racks",
    title: "XL™ Series – Half Rack",
    handle: "xl-half-rack",
    description:
      "A custom modular half rack designed to expand or adjust as your programs evolve, offering custom branding without the cost of the Base Camp series. Made to order in the USA.",
    // Confirmed data point: ~$1,999 base (garagegymreviews.com); custom/made-to-order.
    priceUsd: 1999,
    priceConfirmed: true,
    optionTitle: "Configuration",
    optionValue: "Base",
    sku: "SRX-XL-HALFRACK",
  },
  {
    categoryHandle: "barbells",
    title: "Sorinex Standard Series Performance Bar",
    handle: "performance-bar",
    description:
      "Sorinex's favorite all-around barbell, featuring upgraded bronze bushings and a refined knurl pattern. Made in the USA.",
    // PLACEHOLDER PRICE (retail price unknown; do-not-fabricate flagged in source data).
    priceUsd: 350,
    priceConfirmed: false,
    optionTitle: "Finish",
    optionValue: "Black Zinc",
    sku: "SRX-PERF-BAR",
  },
  {
    categoryHandle: "benches",
    title: "0-90 NP4™ Adjustable Bench",
    handle: "0-90-np4-adjustable-bench",
    description:
      "The latest evolution of the NP adjustable bench with stainless steel components, knurled handles and integrated HDPE plastic protection.",
    // PLACEHOLDER PRICE (retail price unknown).
    priceUsd: 795,
    priceConfirmed: false,
    optionTitle: "Upholstery",
    optionValue: "Black",
    sku: "SRX-NP4-BENCH",
  },
  {
    categoryHandle: "bumpers-plates",
    title: "Training Bumpers",
    handle: "training-bumpers",
    description:
      "Premium rubber bumper plates (available in 45 LB and 25 LB) with a large steel disc collar secured by six screws, built for collegiate, professional and private facilities.",
    // PLACEHOLDER PRICE (retail price unknown); priced per single plate.
    priceUsd: 95,
    priceConfirmed: false,
    optionTitle: "Weight",
    optionValue: "45 LB",
    sku: "SRX-BUMPER-45",
  },
  {
    categoryHandle: "dumbbells",
    title: "Sorinex Kettlebell",
    handle: "sorinex-kettlebell",
    description:
      "A cast kettlebell with a smooth, comfortable handle for swings, cleans, presses and carries. Representative product for the Dumbbells & Kettlebells collection.",
    // PLACEHOLDER PRICE (retail price unknown; specific SKU not captured in source data).
    priceUsd: 65,
    priceConfirmed: false,
    optionTitle: "Weight",
    optionValue: "24 KG",
    sku: "SRX-KB-24",
  },
  {
    categoryHandle: "conditioning",
    title: "Delta™ Sled",
    handle: "delta-sled",
    description:
      "A traditional field sled optimized for any style of strength training, from athletics to tactical strength and conditioning.",
    // PLACEHOLDER PRICE (retail price unknown).
    priceUsd: 495,
    priceConfirmed: false,
    optionTitle: "Configuration",
    optionValue: "Standard",
    sku: "SRX-DELTA-SLED",
  },
  {
    categoryHandle: "machines",
    title: "X-Factor™ Rotational Power Machine",
    handle: "x-factor-rotational-power-machine",
    description:
      "A plate-loaded rotational power machine for developing explosive rotational strength — a featured Sorinex facility machine.",
    // PLACEHOLDER PRICE (retail price unknown).
    priceUsd: 2495,
    priceConfirmed: false,
    optionTitle: "Configuration",
    optionValue: "Standard",
    sku: "SRX-XFACTOR",
  },
  {
    categoryHandle: "accessories",
    title: "Fat Bar",
    handle: "fat-bar",
    description:
      "A non-revolving axle-type bar with a 2\" thick diameter for thick-grip training.",
    // PLACEHOLDER PRICE (retail price unknown).
    priceUsd: 225,
    priceConfirmed: false,
    optionTitle: "Diameter",
    optionValue: '2"',
    sku: "SRX-FAT-BAR",
  },
  {
    categoryHandle: "flooring-storage",
    title: "10-Bar Storage Unit",
    handle: "10-bar-storage-unit",
    description:
      "A vertical storage unit that keeps up to ten barbells organized, protected and ready for the next session.",
    // PLACEHOLDER PRICE (retail price unknown).
    priceUsd: 545,
    priceConfirmed: false,
    optionTitle: "Capacity",
    optionValue: "10 Bar",
    sku: "SRX-BARSTORE-10",
  },
  {
    categoryHandle: "t-shirts",
    title: "Sorinex Strength and Conditioning Tee",
    handle: "sorinex-strength-and-conditioning-tee",
    description:
      "An athletic-fit tee in 60% combed ring-spun cotton / 40% polyester, offered in multiple colorways.",
    // PLACEHOLDER PRICE (retail price unknown; apparel estimate).
    priceUsd: 28,
    priceConfirmed: false,
    optionTitle: "Size",
    optionValue: "L",
    sku: "SRX-SC-TEE-L",
  },
  {
    categoryHandle: "od-equipment",
    title: "Sorinex Outdoors Strength and Conditioning T-Shirt - Black",
    handle: "od-strength-and-conditioning-tee",
    description:
      "The Sorinex Outdoors sub-brand strength & conditioning tee in black.",
    // PLACEHOLDER PRICE (retail price unknown; apparel estimate).
    priceUsd: 30,
    priceConfirmed: false,
    optionTitle: "Size",
    optionValue: "L",
    sku: "SRX-OD-TEE-L",
  },
]

export default async function seedSorinex({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("Seeding Sorinex catalog...")

  // Resolve the default sales channel that is linked to the publishable API key,
  // plus the shipping profile and stock location created by the initial seed.
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const defaultSalesChannel =
    salesChannels.find((sc) => sc.name === "Default Sales Channel") ??
    salesChannels[0]
  if (!defaultSalesChannel) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No sales channel found. Run the initial data seed (medusa db:migrate) first."
    )
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfiles[0]
  if (!shippingProfile) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No shipping profile found. Run the initial data seed first."
    )
  }

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  })
  const stockLocation = stockLocations[0]
  if (!stockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No stock location found. Run the initial data seed first."
    )
  }

  // 1. Remove the demo catalog and any previous Sorinex seed run (idempotent).
  const sorinexHandles = PRODUCTS.map((p) => p.handle)
  const { data: productsToDelete } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: [...DEMO_PRODUCT_HANDLES, ...sorinexHandles] },
  })
  if (productsToDelete.length) {
    await deleteProductsWorkflow(container).run({
      input: { ids: productsToDelete.map((p) => p.id) },
    })
    logger.info(`Removed ${productsToDelete.length} existing product(s).`)
  }

  const sorinexCategoryNames = CATEGORIES.map((c) => c.name)
  const { data: categoriesToDelete } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
    filters: { name: [...DEMO_CATEGORY_NAMES, ...sorinexCategoryNames] },
  })
  if (categoriesToDelete.length) {
    await deleteProductCategoriesWorkflow(container).run({
      input: categoriesToDelete.map((c) => c.id),
    })
    logger.info(`Removed ${categoriesToDelete.length} existing categor(ies).`)
  }

  // 2. Create the Sorinex categories.
  const { result: createdCategories } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: CATEGORIES.map((c) => ({
        name: c.name,
        handle: c.handle,
        description: c.description,
        is_active: true,
      })),
    },
  })
  logger.info(`Created ${createdCategories.length} categories.`)

  const categoryIdByHandle = new Map(
    createdCategories.map((c) => [c.handle, c.id])
  )

  // 3. Create one product per category.
  await createProductsWorkflow(container).run({
    input: {
      products: PRODUCTS.map((p) => ({
        title: p.title,
        handle: p.handle,
        description: p.description,
        status: ProductStatus.PUBLISHED,
        category_ids: [categoryIdByHandle.get(p.categoryHandle)!],
        shipping_profile_id: shippingProfile.id,
        // LOCAL PLACEHOLDER image served by the storefront from /public/placeholder/.
        // Replace with the real Sorinex Shopify CDN image (shop 1/2559/4942) once
        // cdn.shopify.com is allowlisted. See scratchpad/image-swap-TODO.md.
        images: [{ url: `/placeholder/${p.handle}.svg` }],
        options: [{ title: p.optionTitle, values: [p.optionValue] }],
        variants: [
          {
            title: p.optionValue,
            sku: p.sku,
            manage_inventory: true,
            options: { [p.optionTitle]: p.optionValue },
            prices: [
              // Price in USD. Only the XL Half Rack (~$1,999 base) is a confirmed
              // data point; all others are PLACEHOLDER prices (see priceConfirmed).
              { amount: p.priceUsd, currency_code: "usd" },
              // Rough EUR mirror so the default (EUR) region shows a price too.
              { amount: p.priceUsd, currency_code: "eur" },
            ],
          },
        ],
        sales_channels: [{ id: defaultSalesChannel.id }],
      })),
    },
  })
  logger.info(`Created ${PRODUCTS.length} products.`)

  // 4. Create inventory levels for the new inventory items (skip any that already
  //    have a level at this location so re-runs don't conflict).
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "location_levels.location_id"],
  })
  const inventoryLevels = inventoryItems
    .filter(
      (item) =>
        !(item.location_levels ?? []).some(
          (lvl) => lvl?.location_id === stockLocation.id
        )
    )
    .map((item) => ({
      location_id: stockLocation.id,
      inventory_item_id: item.id,
      stocked_quantity: 25,
    }))

  if (inventoryLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: inventoryLevels },
    })
    logger.info(`Created ${inventoryLevels.length} inventory level(s).`)
  }

  logger.info("Finished seeding Sorinex catalog.")
}
