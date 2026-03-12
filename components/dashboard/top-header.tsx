"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { sidebarLinks } from "@/components/sidebar/sidebar-links"
import { COMPANIES, normalizeCompany } from "@/lib/companies"
import { cn } from "@/lib/utils"

const navigationItems = sidebarLinks.flatMap((group) => group.items)

export function TopHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const company = normalizeCompany(searchParams.get("company"))

  const withCompany = (href: string) => `${href}?company=${company}`

  const onCompanyChange = (nextCompany: string) => {
    if (nextCompany === company) return
    router.push(`${pathname}?company=${nextCompany}`)
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link href={withCompany("/dashboard")} className="shrink-0">
          <Image src="/spinner.png" alt="Cupsolidale logo" width={34} height={34} priority />
        </Link>

        <Select value={company} onValueChange={onCompanyChange}>
          <SelectTrigger className="h-8 w-[210px] bg-white">
            <SelectValue placeholder="Seleziona company" />
          </SelectTrigger>
          <SelectContent>
            {COMPANIES.map((companyName) => (
              <SelectItem key={companyName} value={companyName}>
                {companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {navigationItems.map((item) => {
            const href = withCompany(item.href)
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "inline-flex items-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-muted text-foreground",
                )}
              >
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
