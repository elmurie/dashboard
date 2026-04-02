import { NextResponse } from "next/server"
import { SappApiError, fetchSapp, setSessionCookies } from "@/lib/sapp-api"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const company = searchParams.get("company")
  const clinicId = searchParams.get("clinic_id")

  if (!company) {
    return NextResponse.json({ error: "Missing company" }, { status: 400 })
  }

  if (!clinicId) {
    return NextResponse.json({ error: "Missing clinic_id" }, { status: 400 })
  }

  try {
    const path = `/chiusure/list?company=${encodeURIComponent(company)}&clinic_id=${encodeURIComponent(clinicId)}`
    const { payload, refreshed } = await fetchSapp<string[]>(path)
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
