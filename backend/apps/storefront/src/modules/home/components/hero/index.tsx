import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <div className="relative w-full overflow-hidden bg-neutral-950 border-b border-neutral-800">
      {/* Industrial gradient / texture backdrop (placeholder for hero imagery) */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #ffffff 0, #ffffff 1px, transparent 1px, transparent 22px)",
        }}
      />
      <div className="absolute -right-24 top-1/2 -translate-y-1/2 h-[120%] w-[55%] bg-red-600/20 blur-3xl rounded-full" />

      <div className="relative content-container min-h-[70vh] flex flex-col justify-center py-24">
        <span className="text-red-500 text-xs sm:text-sm font-bold uppercase tracking-[0.35em] mb-4">
          Strength & Conditioning Equipment
        </span>
        <h1 className="text-white font-black uppercase leading-[0.95] tracking-tight text-5xl sm:text-7xl medium:text-8xl max-w-4xl">
          Built for the
          <br />
          <span className="text-red-600">relentless</span>
        </h1>
        <p className="text-neutral-300 mt-6 max-w-xl text-base sm:text-lg">
          American-made racks, bars, and gear engineered for athletes, facilities,
          and garage gyms that refuse to quit.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center justify-center bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider text-sm px-8 py-4 transition-colors"
          >
            Shop All Gear
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/categories/racks"
            className="inline-flex items-center justify-center border border-neutral-600 hover:border-white text-white font-bold uppercase tracking-wider text-sm px-8 py-4 transition-colors"
          >
            Build Your Rack
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default Hero
