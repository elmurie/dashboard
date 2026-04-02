import { NextResponse } from "next/server"
import { SappApiError, fetchSapp, setSessionCookies } from "@/lib/sapp-api"

type CloseDaysPayload = {
  company?: string
  clinic_id?: string
  days?: Array<{ from?: string; to?: string }>
}

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

export async function POST(req: Request) {
  let payload: CloseDaysPayload

  try {
    payload = (await req.json()) as CloseDaysPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!payload.company) {
    return NextResponse.json({ error: "Missing company" }, { status: 400 })
  }

  if (!payload.clinic_id) {
    return NextResponse.json({ error: "Missing clinic_id" }, { status: 400 })
  }

  if (!Array.isArray(payload.days) || payload.days.length === 0) {
    return NextResponse.json({ error: "Missing days" }, { status: 400 })
  }

  const hasInvalidRange = payload.days.some((range) => !range?.from || !range?.to)
  if (hasInvalidRange) {
    return NextResponse.json({ error: "Invalid days range" }, { status: 400 })
  }

  try {
    const { payload: apiPayload, refreshed } = await fetchSapp<unknown>("/chiusure/close-days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: payload.company,
        clinic_id: payload.clinic_id,
        days: payload.days,
      }),
    })
    const response = NextResponse.json({
      success: apiPayload.success,
      message: apiPayload.message ?? "Close days inserted successfully",
      data: apiPayload.data ?? null,
    })

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
