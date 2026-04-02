"use client"

import Link from "next/link"
import Image from "next/image"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { sidebarLinks } from "./sidebar-links"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { LogOut } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CompanySettings, DEFAULT_COMPANY, normalizeCompaniesResponse, normalizeCompany } from "@/lib/companies"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const company = normalizeCompany(searchParams.get("company"))
  const [companies, setCompanies] = React.useState<CompanySettings[]>([{ company: DEFAULT_COMPANY, can_change_price: true }])

  React.useEffect(() => {
    fetch("/api/companies", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return [{ company: DEFAULT_COMPANY, can_change_price: true }]
        return normalizeCompaniesResponse(await res.json())
      })
      .then(setCompanies)
      .catch(() => setCompanies([{ company: DEFAULT_COMPANY, can_change_price: true }]))
  }, [])

  const withCompany = (href: string) => `${href}?company=${company}`

  const onCompanyChange = (nextCompany: string) => {
    if (nextCompany === company) return
    router.push(`${pathname}?company=${nextCompany}`)
  }

  return (
    <Sidebar>
      <SidebarHeader className="items-center">
        <Image
          className="dark:invert"
          src="/spinner.png"
          alt="Cupsolidale logo"
          width={64}
          height={64}
          priority
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Company</SidebarGroupLabel>
          <Select value={company} onValueChange={onCompanyChange}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Seleziona company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((companyEntry) => (
                <SelectItem key={companyEntry.company} value={companyEntry.company}>
                  {companyEntry.company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SidebarGroup>

        {sidebarLinks.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarMenu>
              {group.items.map((item) => {
                const href = withCompany(item.href)
                const isActive = pathname === item.href

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={href}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <Link href="/auth/login">
          <Button>
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  )
}
