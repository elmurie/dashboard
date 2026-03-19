import { NextRequest, NextResponse } from "next/server"
import { SappApiError, fetchSapp, setSessionCookies } from "@/lib/sapp-api"

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ _id: string }> }
) {
  try {
    const { _id } = await ctx.params
    const patch = (await req.json()) as { prezzo?: number; company?: string }

    if (!patch.company) {
      return NextResponse.json({ error: "Missing company" }, { status: 400 })
    }

    if (typeof patch.prezzo !== "number" || !Number.isFinite(patch.prezzo) || patch.prezzo < 0) {
      return NextResponse.json({ error: "Invalid prezzo" }, { status: 400 })
    }

    const { payload, refreshed } = await fetchSapp(`/prices/change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id, price: patch.prezzo, company: patch.company }),
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
