import ko from "./json/ko.json" with { type: "json" }

// Supplemental Korean ("ko") translations for the admin dashboard.
//
// The dashboard already bundles a comprehensive Korean translation
// (@medusajs/dashboard i18n/translations/ko.json) covering the primary
// navigation and section labels. These custom resources are deep-merged on top
// of it (dashboard-app populateI18n -> deepMerge), so this file only needs to
// fill the few section labels that are missing from the bundled ko file
// (Options, Roles, Policies, Refund Reasons, Translations, etc.). Anything not
// covered here or in the bundled ko file falls back to English (fallbackLng).
export default {
  ko: {
    translation: ko,
  },
}
