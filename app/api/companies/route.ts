import { NextResponse } from "next/server"
import { SappApiError, fetchSapp, setSessionCookies } from "@/lib/sapp-api"

export async function GET() {
  try {
    const { payload, refreshed } = await fetchSapp<string[]>("/companies/list")
    const response = NextResponse.json(payload.data)

    if (refreshed) {
      await setSessionCookies(response, refreshed)
    }

    return response
  } catch (error) {
    if (error instanceof SappApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
