import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Run-once, idempotent fix that makes every catalog product purchasable end to end.
 *
 * Run with:  npx medusa exec ./src/scripts/fix-inventory.ts
 *
 * It repairs the linkage chain the storefront relies on to show a product as
 * in-stock and to let a shopper reach checkout:
 *
 *   1. Ensures a stock location exists and is linked to the Default Sales Channel
 *      (the sales channel the publishable API key is bound to). Without this link
 *      the Store API reports inventory_quantity = 0 and the storefront shows
 *      "Out of stock".
 *   2. Ensures every product variant with manage_inventory has an inventory level
 *      at that stock location, and tops each one up to at least TARGET_QTY so
 *      availability is positive.
 *   3. Ensures the fulfillment service zone covers the countries of every region
 *      (notably `us`). Without a matching geo zone the region has zero shipping
 *      options and checkout cannot complete, so items are not truly purchasable.
 *
 * Safe to run repeatedly: it only creates what is missing and only raises stock
 * that is below target.
 */

const TARGET_QTY = 100

export default async function fixInventory({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const inventoryModuleService = container.resolve(Modules.INVENTORY)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  logger.info("Running inventory / purchasability fix...")

  // 1. Resolve the sales channel bound to the publishable key + a stock location.
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "stock_locations.id"],
  })
  const defaultSalesChannel =
    salesChannels.find((sc) => sc.name === "Default Sales Channel") ??
    salesChannels[0]
  if (!defaultSalesChannel) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No sales channel found. Run the initial data seed first."
    )
  }

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const stockLocation = stockLocations[0]
  if (!stockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No stock location found. Run the initial data seed first."
    )
  }

  // Ensure the stock location is linked to the sales channel (idempotent).
  const alreadyLinked = (defaultSalesChannel.stock_locations ?? []).some(
    (l) => l?.id === stockLocation.id
  )
  if (!alreadyLinked) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocation.id, add: [defaultSalesChannel.id] },
    })
    logger.info(
      `Linked stock location "${stockLocation.name}" to sales channel "${defaultSalesChannel.name}".`
    )
  } else {
    logger.info(
      `Stock location "${stockLocation.name}" already linked to "${defaultSalesChannel.name}".`
    )
  }

  // 2. Ensure every inventory item has a level at this location, topped to target.
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku", "location_levels.location_id", "location_levels.stocked_quantity"],
  })

  const levelsToCreate: {
    location_id: string
    inventory_item_id: string
    stocked_quantity: number
  }[] = []
  const levelsToRaise: { inventory_item_id: string; stocked_quantity: number }[] =
    []

  for (const item of inventoryItems) {
    const existing = (item.location_levels ?? []).find(
      (lvl) => lvl?.location_id === stockLocation.id
    )
    if (!existing) {
      levelsToCreate.push({
        location_id: stockLocation.id,
        inventory_item_id: item.id,
        stocked_quantity: TARGET_QTY,
      })
    } else if ((existing.stocked_quantity ?? 0) < TARGET_QTY) {
      levelsToRaise.push({
        inventory_item_id: item.id,
        stocked_quantity: TARGET_QTY,
      })
    }
  }

  if (levelsToCreate.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: levelsToCreate },
    })
    logger.info(`Created ${levelsToCreate.length} inventory level(s).`)
  }
  if (levelsToRaise.length) {
    await inventoryModuleService.updateInventoryLevels(
      levelsToRaise.map((l) => ({
        inventory_item_id: l.inventory_item_id,
        location_id: stockLocation.id,
        stocked_quantity: l.stocked_quantity,
      }))
    )
    logger.info(
      `Raised ${levelsToRaise.length} inventory level(s) to ${TARGET_QTY}.`
    )
  }
  if (!levelsToCreate.length && !levelsToRaise.length) {
    logger.info(`All inventory levels already at >= ${TARGET_QTY}.`)
  }

  // 3. Ensure the fulfillment service zone covers every region's countries so
  //    each region has at least one shipping option (checkout requires this).
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "countries.iso_2"],
  })
  const requiredCountries = new Set<string>()
  for (const r of regions) {
    for (const c of r.countries ?? []) {
      if (c?.iso_2) requiredCountries.add(c.iso_2.toLowerCase())
    }
  }

  const serviceZones = await fulfillmentModuleService.listServiceZones(
    {},
    { relations: ["geo_zones"] }
  )
  const serviceZone = serviceZones[0]
  if (serviceZone) {
    const covered = new Set(
      (serviceZone.geo_zones ?? [])
        .map((gz: { country_code?: string }) => gz.country_code?.toLowerCase())
        .filter(Boolean) as string[]
    )
    const missing = [...requiredCountries].filter((c) => !covered.has(c))
    if (missing.length) {
      await fulfillmentModuleService.createGeoZones(
        missing.map((country_code) => ({
          type: "country" as const,
          country_code,
          service_zone_id: serviceZone.id,
        }))
      )
      logger.info(
        `Added ${missing.length} country geo zone(s) to service zone "${serviceZone.name}": ${missing.join(", ")}.`
      )
    } else {
      logger.info(
        `Service zone "${serviceZone.name}" already covers all region countries.`
      )
    }
  } else {
    logger.warn(
      "No fulfillment service zone found — skipping shipping-zone repair."
    )
  }

  logger.info("Inventory / purchasability fix complete.")
}
