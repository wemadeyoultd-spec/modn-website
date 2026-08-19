export const getBaseURL = () => {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"
  // Guarantee a valid absolute URL: add a scheme if missing and fall back if the
  // value is malformed, so `new URL(getBaseURL())` (used for metadataBase) can
  // never throw and crash the production build.
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    return new URL(candidate).origin
  } catch {
    return "https://localhost:8000"
  }
}
