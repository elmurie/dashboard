import { NextResponse } from "next/server"
import { fetchSapp, setSessionCookies } from "@/lib/sapp-api"

export async function GET() {
  try {
    const { payload, refreshed } = await fetchSapp<string[]>("/companies/list")
    const response = NextResponse.json(payload.data)

    if (refreshed) {
      await setSessionCookies(response, refreshed)
    }

    return response
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
