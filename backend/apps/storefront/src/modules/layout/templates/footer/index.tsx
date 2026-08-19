import { listCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const companyLinks = [
  { label: "About MODN", href: "/store" },
  { label: "Made in USA", href: "/store" },
  { label: "Careers", href: "/store" },
  { label: "Newsroom", href: "/store" },
]

const supportLinks = [
  { label: "Shipping", href: "/store" },
  { label: "Returns", href: "/store" },
  { label: "Warranty", href: "/store" },
  { label: "Contact", href: "/store" },
  { label: "My Account", href: "/account" },
]

const socialLinks = [
  { label: "Instagram", href: "#" },
  { label: "YouTube", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "Facebook", href: "#" },
]

export default async function Footer() {
  const categories = await listCategories({ limit: 20 }).catch(() => [])
  const topCategories = (categories || []).filter((c) => !c.parent_category)

  return (
    <footer className="bg-neutral-950 border-t border-neutral-800 text-neutral-300">
      <div className="content-container py-16">
        <div className="grid grid-cols-2 medium:grid-cols-5 gap-10">
          <div className="col-span-2 medium:col-span-1">
            <LocalizedClientLink
              href="/"
              className="text-2xl font-black tracking-[0.2em] uppercase text-white hover:text-red-500 transition-colors"
            >
              MODN
            </LocalizedClientLink>
            <p className="text-neutral-500 text-sm mt-4 max-w-xs">
              American-made strength &amp; conditioning equipment built to outlast you.
            </p>
          </div>

          <div>
            <span className="text-white text-xs font-bold uppercase tracking-widest">
              Shop
            </span>
            <ul className="mt-4 flex flex-col gap-2" data-testid="footer-categories">
              {topCategories.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <LocalizedClientLink
                    href={`/categories/${c.handle}`}
                    className="text-sm text-neutral-400 hover:text-red-500 transition-colors"
                    data-testid="category-link"
                  >
                    {c.name}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-white text-xs font-bold uppercase tracking-widest">
              Company
            </span>
            <ul className="mt-4 flex flex-col gap-2">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  <LocalizedClientLink
                    href={l.href}
                    className="text-sm text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    {l.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-white text-xs font-bold uppercase tracking-widest">
              Support
            </span>
            <ul className="mt-4 flex flex-col gap-2">
              {supportLinks.map((l) => (
                <li key={l.label}>
                  <LocalizedClientLink
                    href={l.href}
                    className="text-sm text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    {l.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-white text-xs font-bold uppercase tracking-widest">
              Follow
            </span>
            <ul className="mt-4 flex flex-col gap-2">
              {socialLinks.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-neutral-500 text-xs">
            © {new Date().getFullYear()} MODN. All rights reserved.
          </p>
          <p className="text-neutral-600 text-xs uppercase tracking-widest">
            Made in the USA · Built for the strong
          </p>
        </div>
      </div>
    </footer>
  )
}
