import * as React from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-dvh w-full flex overflow-hidden bg-background">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          <SidebarTrigger />
          {children}
        </div>
      </div>
    </SidebarProvider>
  )
}
