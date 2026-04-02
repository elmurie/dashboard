import { NextResponse } from "next/server"
import { CompanySettings, normalizeCompaniesResponse } from "@/lib/companies"
import { SappApiError, fetchSapp, setSessionCookies } from "@/lib/sapp-api"

export async function GET() {
  try {
    const { payload, refreshed } = await fetchSapp<CompanySettings[] | string[]>("/companies/list")
    const companies = normalizeCompaniesResponse(payload.data)
    const response = NextResponse.json(companies)

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
