import { getLocaleHeader } from "@lib/util/get-locale-header"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

// Guarantee a valid absolute URL: the Medusa JS SDK does `new URL(baseUrl)` on
// every request, so a value missing a scheme (or otherwise malformed) throws
// "Invalid URL" and crashes the production build while collecting page data.
const rawBackendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
if (rawBackendUrl) {
  const candidate = /^https?:\/\//i.test(rawBackendUrl)
    ? rawBackendUrl
    : `https://${rawBackendUrl}`
  try {
    MEDUSA_BACKEND_URL = new URL(candidate).origin
  } catch {
    MEDUSA_BACKEND_URL = "http://localhost:9000"
  }
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = init?.headers ?? {}
  let localeHeader: Record<string, string | null> | undefined
  try {
    localeHeader = await getLocaleHeader()
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
  } catch {}

  const newHeaders = {
    ...localeHeader,
    ...headers,
  }
  init = {
    ...init,
    headers: newHeaders,
  }
  return originalFetch(input, init)
}
