import { Metadata } from "next"

import Hero from "@modules/home/components/hero"
import CategoryTiles from "@modules/home/components/category-tiles"
import NewGear from "@modules/home/components/new-gear"
import FeatureBanners from "@modules/home/components/feature-banners"
import Newsletter from "@modules/home/components/newsletter"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "MODN | Strength & Conditioning Equipment",
  description:
    "American-made racks, barbells, benches, and conditioning gear built for athletes, facilities, and garage gyms.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  return (
    <>
      <Hero />
      <CategoryTiles />
      <NewGear region={region} />
      <FeatureBanners />
      <Newsletter />
    </>
  )
}
