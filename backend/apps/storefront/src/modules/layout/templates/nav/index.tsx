import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import AnnouncementBar from "@modules/layout/components/announcement-bar"

export default async function Nav() {
  const [regions, categories] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listCategories({ limit: 20 }).catch(() => []),
  ])

  const topCategories = (categories || []).filter((c) => !c.parent_category)

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <AnnouncementBar />
      <header className="relative border-b border-neutral-800 bg-neutral-950 text-neutral-100">
        <nav className="content-container flex items-center justify-between w-full h-16">
          <div className="flex-1 basis-0 h-full flex items-center gap-x-4">
            <div className="small:hidden h-full flex items-center text-neutral-100">
              <SideMenu regions={regions} categories={topCategories} />
            </div>
            <LocalizedClientLink
              href="/"
              className="hidden small:block text-2xl font-black tracking-[0.2em] uppercase hover:text-red-500 transition-colors"
              data-testid="nav-store-link"
            >
              MODN
            </LocalizedClientLink>
          </div>

          <div className="flex items-center h-full small:hidden">
            <LocalizedClientLink
              href="/"
              className="text-2xl font-black tracking-[0.2em] uppercase"
            >
              MODN
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end text-sm">
            <LocalizedClientLink
              className="hidden small:block hover:text-red-500 uppercase tracking-wider text-xs font-semibold"
              href="/account"
              data-testid="nav-account-link"
            >
              Account
            </LocalizedClientLink>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-red-500 flex gap-2 uppercase tracking-wider text-xs font-semibold"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>

        {topCategories.length > 0 && (
          <div className="hidden small:block border-t border-neutral-800 bg-neutral-900">
            <div className="content-container flex items-center flex-wrap gap-x-6 gap-y-1 py-2 text-xs font-semibold uppercase tracking-wider">
              {topCategories.map((c) => (
                <LocalizedClientLink
                  key={c.id}
                  href={`/categories/${c.handle}`}
                  className="text-neutral-300 hover:text-red-500 transition-colors whitespace-nowrap"
                  data-testid="nav-category-link"
                >
                  {c.name}
                </LocalizedClientLink>
              ))}
            </div>
          </div>
        )}
      </header>
    </div>
  )
}
