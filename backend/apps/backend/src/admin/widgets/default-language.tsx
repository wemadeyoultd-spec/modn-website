import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"

/**
 * Sets Korean ("ko") as the default admin language.
 *
 * Medusa's admin dashboard picks its language via i18next-browser-languagedetector
 * (order: cookie "lng" -> localStorage "lng" -> Accept-Language header), falling
 * back to English. There is no server-side "default admin language" config in
 * Medusa v2.19, so the supported way to change the active language is per browser
 * through the detector's localStorage/cookie cache (the same store the Profile ->
 * Language setting writes to).
 *
 * This widget renders on the login screen (login.before), the guaranteed first
 * screen for any admin session. On first load it seeds the detector cache with
 * "ko" and switches the live language, making Korean the default. A one-time
 * marker (DEFAULT_APPLIED_KEY) ensures we only force it once, so a user who later
 * picks a different language in their Profile is respected on subsequent loads.
 *
 * The Korean translation itself ships with @medusajs/dashboard (i18n/translations/
 * ko.json) and already covers the primary navigation and section labels. Any keys
 * missing from ko.json fall back to English via i18next's fallbackLng: "en".
 */

const LANG_KEY = "lng"
const DEFAULT_LANG = "ko"
const DEFAULT_APPLIED_KEY = "sorinex_default_lang_applied"

const DefaultLanguageWidget = () => {
  const { i18n } = useTranslation()

  useEffect(() => {
    try {
      const alreadyApplied =
        window.localStorage.getItem(DEFAULT_APPLIED_KEY) === "true"
      const current = window.localStorage.getItem(LANG_KEY)

      // Only force Korean the first time, and only if the user has not already
      // chosen a non-Korean language themselves.
      if (!alreadyApplied && (!current || current === DEFAULT_LANG)) {
        window.localStorage.setItem(LANG_KEY, DEFAULT_LANG)
        document.cookie = `${LANG_KEY}=${DEFAULT_LANG}; path=/; max-age=31536000`
        if (i18n.language !== DEFAULT_LANG) {
          void i18n.changeLanguage(DEFAULT_LANG)
        }
        window.localStorage.setItem(DEFAULT_APPLIED_KEY, "true")
      }
    } catch {
      // localStorage may be unavailable (private mode / SSR) - ignore.
    }
  }, [i18n])

  return null
}

export const config = defineWidgetConfig({
  zone: "login.before",
})

export default DefaultLanguageWidget
