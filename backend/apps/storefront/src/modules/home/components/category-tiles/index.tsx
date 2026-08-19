import Image from "next/image"

import { listCategories } from "@lib/data/categories"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function CategoryTiles() {
  const categories = await listCategories({
    fields: "id,name,handle,*parent_category,*products",
    limit: 20,
  }).catch(() => [] as HttpTypes.StoreProductCategory[])

  const topCategories = (categories || []).filter((c) => !c.parent_category)

  if (!topCategories.length) {
    return null
  }

  return (
    <section className="bg-black py-16 sm:py-24">
      <div className="content-container">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-red-500 text-xs font-bold uppercase tracking-[0.3em]">
              Shop by Category
            </span>
            <h2 className="text-white font-black uppercase text-3xl sm:text-4xl tracking-tight mt-2">
              Find Your Gear
            </h2>
          </div>
          <LocalizedClientLink
            href="/store"
            className="hidden sm:inline text-neutral-400 hover:text-red-500 text-xs font-semibold uppercase tracking-wider"
          >
            View all →
          </LocalizedClientLink>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 medium:grid-cols-4 gap-3 sm:gap-4">
          {topCategories.map((category) => {
            const product = category.products?.[0]
            const image = product?.thumbnail || product?.images?.[0]?.url

            return (
              <LocalizedClientLink
                key={category.id}
                href={`/categories/${category.handle}`}
                className="group relative aspect-[4/5] overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-red-600 transition-colors"
                data-testid="category-tile"
              >
                {image && (
                  <Image
                    src={image}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    className="object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="text-white font-bold uppercase text-sm sm:text-base tracking-wide leading-tight">
                    {category.name}
                  </h3>
                  <span className="text-red-500 text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                    Shop now →
                  </span>
                </div>
              </LocalizedClientLink>
            )
          })}
        </div>
      </div>
    </section>
  )
}
