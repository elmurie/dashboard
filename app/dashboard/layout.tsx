import * as React from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { TopHeader } from "@/components/dashboard/top-header"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("sapp_access_token")?.value
  const refreshToken = cookieStore.get("sapp_refresh_token")?.value

  if (!accessToken && !refreshToken) {
    redirect("/auth/login")
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <TopHeader />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-14">{children}</div>
    </div>
  )
}
