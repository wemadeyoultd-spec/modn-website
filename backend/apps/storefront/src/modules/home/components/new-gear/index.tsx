import Image from "next/image"

import { listProducts } from "@lib/data/products"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function NewGear({
  region,
}: {
  region: HttpTypes.StoreRegion
}) {
  const {
    response: { products },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      limit: 8,
      fields: "*variants.calculated_price,+thumbnail,+images.url",
    },
  })

  if (!products?.length) {
    return null
  }

  return (
    <section className="bg-neutral-950 py-16 sm:py-24 border-t border-neutral-800">
      <div className="content-container">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-red-500 text-xs font-bold uppercase tracking-[0.3em]">
              Just Dropped
            </span>
            <h2 className="text-white font-black uppercase text-3xl sm:text-4xl tracking-tight mt-2">
              New Gear
            </h2>
          </div>
          <LocalizedClientLink
            href="/store"
            className="hidden sm:inline text-neutral-400 hover:text-red-500 text-xs font-semibold uppercase tracking-wider"
          >
            Shop all →
          </LocalizedClientLink>
        </div>

        <div className="grid grid-cols-2 medium:grid-cols-4 gap-3 sm:gap-6">
          {products.map((product) => {
            const { cheapestPrice } = getProductPrice({ product })
            const image = product.thumbnail || product.images?.[0]?.url

            return (
              <LocalizedClientLink
                key={product.id}
                href={`/products/${product.handle}`}
                className="group"
                data-testid="new-gear-product"
              >
                <div className="relative aspect-square overflow-hidden bg-neutral-900 border border-neutral-800 group-hover:border-red-600 transition-colors">
                  {image && (
                    <Image
                      src={image}
                      alt={product.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="mt-3">
                  <h3 className="text-white font-bold uppercase text-sm tracking-wide leading-tight group-hover:text-red-500 transition-colors">
                    {product.title}
                  </h3>
                  {cheapestPrice && (
                    <p
                      className="text-neutral-400 text-sm mt-1"
                      data-testid="new-gear-price"
                    >
                      {cheapestPrice.calculated_price}
                    </p>
                  )}
                </div>
              </LocalizedClientLink>
            )
          })}
        </div>
      </div>
    </section>
  )
}
