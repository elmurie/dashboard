"use client"

import Link from "next/link"
import Image from "next/image"
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
import { COMPANIES, normalizeCompany } from "@/lib/companies"

export function AppSidebar() {
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
    <Sidebar>
      <SidebarHeader>
        <Image
          className="dark:invert"
          src="/cup_solidale.png"
          alt="Cupsolidale logo"
          width={250}
          height={38}
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
              {COMPANIES.map((companyName) => (
                <SelectItem key={companyName} value={companyName}>
                  {companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SidebarGroup>

        {sidebarLinks.map((group) => (
          <SidebarGroup key={group.label}>
            {/* <SidebarGroupLabel>{group.label}</SidebarGroupLabel> */}

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
        <Link href="/">
          <Button>
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  )
}
