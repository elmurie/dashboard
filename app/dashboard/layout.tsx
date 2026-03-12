import * as React from "react"
import { TopHeader } from "@/components/dashboard/top-header"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <TopHeader />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-14">{children}</div>
    </div>
  )
}
