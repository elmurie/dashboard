import { NextResponse } from "next/server"
import { SappApiError, fetchSapp, setSessionCookies } from "@/lib/sapp-api"

type Clinic = {
  _id: string
  name: string
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const company = searchParams.get("company")

  if (!company) {
    return NextResponse.json({ error: "Missing company" }, { status: 400 })
  }

  try {
    const { payload, refreshed } = await fetchSapp<Clinic[]>(`/clinics/list?company=${encodeURIComponent(company)}`)
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
