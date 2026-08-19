import { MedusaContainer } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * Print the store's publishable API key token (pk_...) to stdout.
 *
 * Run with:  npx medusa exec ./src/scripts/print-pubkey.ts
 *
 * Resolves the API Key module, finds the first *publishable* key, and writes its
 * token as the LAST line of stdout with no surrounding noise, so CI can capture
 * it with e.g. `... | tail -n 1`. All diagnostic messages go to stderr so they
 * never pollute the captured value.
 */
export default async function printPubkey({
  container,
}: {
  container: MedusaContainer
}) {
  const apiKeyModuleService = container.resolve(Modules.API_KEY)

  const keys = await apiKeyModuleService.listApiKeys({ type: "publishable" })

  if (!keys || keys.length === 0) {
    // Diagnostics to stderr; keep stdout clean for CI capture.
    console.error("[print-pubkey] No publishable API key found in the database.")
    // Non-zero exit so CI can detect the failure.
    process.exit(1)
  }

  const token = keys[0].token

  console.error(
    `[print-pubkey] Found ${keys.length} publishable key(s); printing the first.`
  )

  // The ONLY thing on stdout: the token itself (last line).
  process.stdout.write(`${token}\n`)
}
