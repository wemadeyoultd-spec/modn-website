import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Print the store's publishable API key token (pk_...) to stdout.
 *
 * Run with:  npx medusa exec ./src/scripts/print-pubkey.ts
 *
 * Guarantees a usable key exists: if no publishable key is present it CREATES
 * one, and it always (re)links the key to a sales channel that carries the
 * seeded products (preferring "Default Sales Channel"). This makes CI key
 * extraction reliable even if the seed has not finished, and ensures the
 * storefront using this key can actually list the products.
 *
 * All diagnostics go to stderr; the ONLY thing written to stdout is the token
 * itself as the last line, so CI can capture it with `... | tail -n 1`.
 */
export default async function printPubkey({
  container,
}: {
  container: MedusaContainer
}) {
  const apiKeyModuleService = container.resolve(Modules.API_KEY)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)

  let keys = await apiKeyModuleService.listApiKeys({ type: "publishable" })

  if (!keys || keys.length === 0) {
    console.error(
      "[print-pubkey] No publishable API key found; creating one..."
    )
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Default Publishable API Key",
            type: "publishable",
            created_by: "system",
          },
        ],
      },
    })
    keys = result
    console.error("[print-pubkey] Created a new publishable API key.")
  } else {
    console.error(
      `[print-pubkey] Found ${keys.length} publishable key(s); using the first.`
    )
  }

  const publishableKey = keys[0]

  // Link the key to a sales channel that carries the products. Prefer the
  // "Default Sales Channel" the seed creates; fall back to the first channel.
  // Linking is best-effort: an already-linked channel or a not-yet-seeded
  // store must not stop us from printing the token.
  try {
    const channels = await salesChannelModuleService.listSalesChannels({})
    if (channels && channels.length > 0) {
      const target =
        channels.find((c) => c.name === "Default Sales Channel") ?? channels[0]
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: {
          id: publishableKey.id,
          add: [target.id],
        },
      })
      console.error(
        `[print-pubkey] Ensured key is linked to sales channel "${target.name}".`
      )
    } else {
      console.error(
        "[print-pubkey] No sales channel found yet to link (seed may still be running)."
      )
    }
  } catch (e) {
    console.error(
      `[print-pubkey] Sales-channel link step skipped: ${(e as Error).message}`
    )
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info("[print-pubkey] Publishable key resolved.")

  // The ONLY thing on stdout: the token itself (last line).
  process.stdout.write(`${publishableKey.token}\n`)
}
