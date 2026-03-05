import * as React from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <SidebarTrigger />
          {children}
        </div>
      </div>
    </SidebarProvider>
  )
}
