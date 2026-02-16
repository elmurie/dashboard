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
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"


export function AppSidebar() {
  const pathname = usePathname()
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
        {sidebarLinks.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>
              {group.label}
            </SidebarGroupLabel>

            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild
                    isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <Link href='/'>
          <Button>
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  )
}