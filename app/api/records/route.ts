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
    const patch = (await req.json()) as { _id?: string; prezzo?: number; price?: number; company?: string }

    if (!patch.company) {
      return NextResponse.json({ error: "Missing company" }, { status: 400 })
    }

    if (!patch._id) {
      return NextResponse.json({ error: "Missing _id" }, { status: 400 })
    }

    const nextPrice = patch.price ?? patch.prezzo

    if (typeof nextPrice !== "number" || !Number.isFinite(nextPrice) || nextPrice < 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 })
    }

    const { payload, refreshed } = await fetchSapp(`/prices/change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: patch._id, price: nextPrice, company: patch.company }),
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
