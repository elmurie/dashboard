import { NextRequest, NextResponse } from "next/server"
import { SappApiError, fetchSapp, setSessionCookies } from "@/lib/sapp-api"

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
  } catch (error) {
    if (error instanceof SappApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const patch = (await req.json()) as { _id?: string; prezzo?: number; company?: string }

    if (!patch.company) {
      return NextResponse.json({ error: "Missing company" }, { status: 400 })
    }

    if (!patch._id) {
      return NextResponse.json({ error: "Missing _id" }, { status: 400 })
    }

    if (typeof patch.prezzo !== "number" || !Number.isFinite(patch.prezzo) || patch.prezzo < 0) {
      return NextResponse.json({ error: "Invalid prezzo" }, { status: 400 })
    }

    const { payload, refreshed } = await fetchSapp(`/prices/change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: patch._id, price: patch.prezzo, company: patch.company }),
    })

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
