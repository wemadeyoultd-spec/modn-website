import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createRegionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Creates a US / USD region so the storefront can display the seeded USD prices.
 *
 * The starter defaults to a Europe (EUR) region containing `dk`. The Sorinex
 * seed added both USD and EUR prices and USD is already an enabled store
 * currency, so this adds a first-class United States (USD) region with the `us`
 * country code. Point NEXT_PUBLIC_DEFAULT_REGION=us at it.
 *
 * Run with:  npx medusa exec ./src/scripts/seed-us-region.ts
 *
 * Idempotent: if a region already contains the `us` country, it does nothing.
 */
export default async function seedUsRegion({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  })

  const hasUs = existing.some((r: { countries?: { iso_2?: string }[] }) =>
    r.countries?.some((c) => c?.iso_2 === "us")
  )

  if (hasUs) {
    logger.info("US region already exists — skipping.")
    return
  }

  await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "United States",
          currency_code: "usd",
          countries: ["us"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  })

  logger.info("Created United States (USD) region with country 'us'.")
}
