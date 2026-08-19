const Newsletter = () => {
  return (
    <section className="bg-red-600">
      <div className="content-container py-14 sm:py-16 flex flex-col medium:flex-row items-center justify-between gap-8">
        <div className="max-w-xl">
          <h2 className="text-white font-black uppercase text-3xl sm:text-4xl tracking-tight">
            Join the ranks
          </h2>
          <p className="text-white/90 mt-2 text-sm sm:text-base">
            Drops, restocks, and training intel. No fluff — just the strong stuff.
          </p>
        </div>
        <form
          className="flex w-full max-w-md gap-2"
          action="#"
          aria-label="Newsletter signup"
        >
          <input
            type="email"
            required
            placeholder="Enter your email"
            className="flex-1 bg-white text-neutral-900 placeholder:text-neutral-500 px-4 py-3 text-sm focus:outline-none"
          />
          <button
            type="submit"
            className="bg-neutral-950 hover:bg-black text-white font-bold uppercase tracking-wider text-xs px-6 py-3 transition-colors"
          >
            Sign up
          </button>
        </form>
      </div>
    </section>
  )
}

export default Newsletter
