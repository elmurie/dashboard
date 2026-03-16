import { NextRequest, NextResponse } from "next/server"
import { fetchSapp, setSessionCookies } from "@/lib/sapp-api"

export async function GET(req: NextRequest) {
  try {
    const company = req.nextUrl.searchParams.get("company")

    if (!company) {
      return NextResponse.json({ error: "Missing company" }, { status: 400 })
    }

    const { payload, refreshed } = await fetchSapp<unknown[]>(`/prices/list?company=${encodeURIComponent(company)}`)
    const response = NextResponse.json(payload.data)

    if (refreshed) {
      await setSessionCookies(response, refreshed)
    }

    return response
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
