import LocalizedClientLink from "@modules/common/components/localized-client-link"

const banners = [
  {
    eyebrow: "For the Team",
    title: "Athletics",
    copy: "Outfit collegiate and pro weight rooms with rigs and platforms that take a beating and keep performing.",
    href: "/categories/racks",
    cta: "Build a Facility",
    accent: "from-red-900/60 via-neutral-950 to-black",
  },
  {
    eyebrow: "For the Mission",
    title: "Facility & Tactical",
    copy: "Durable, American-made strength equipment trusted by military, first responders, and hard-training garages.",
    href: "/categories/conditioning",
    cta: "Shop Conditioning",
    accent: "from-neutral-800/70 via-neutral-950 to-black",
  },
]

const FeatureBanners = () => {
  return (
    <section className="bg-black">
      <div className="content-container grid grid-cols-1 medium:grid-cols-2 gap-3 sm:gap-4 pb-16 sm:pb-24">
        {banners.map((b) => (
          <div
            key={b.title}
            className={`relative overflow-hidden min-h-[320px] flex flex-col justify-end p-8 sm:p-10 border border-neutral-800 bg-gradient-to-br ${b.accent}`}
          >
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-45deg, #ffffff 0, #ffffff 1px, transparent 1px, transparent 20px)",
              }}
            />
            <div className="relative">
              <span className="text-red-500 text-xs font-bold uppercase tracking-[0.3em]">
                {b.eyebrow}
              </span>
              <h3 className="text-white font-black uppercase text-3xl sm:text-4xl tracking-tight mt-2">
                {b.title}
              </h3>
              <p className="text-neutral-300 mt-3 max-w-md text-sm sm:text-base">
                {b.copy}
              </p>
              <LocalizedClientLink
                href={b.href}
                className="inline-flex items-center mt-6 border border-neutral-500 hover:border-red-600 hover:text-red-500 text-white font-bold uppercase tracking-wider text-xs px-6 py-3 transition-colors"
              >
                {b.cta} →
              </LocalizedClientLink>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default FeatureBanners
