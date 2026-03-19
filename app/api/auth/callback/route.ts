import { NextRequest, NextResponse } from "next/server"
import { exchangeAuthorizationCode, setSessionCookies } from "@/lib/sapp-api"

export async function POST(req: NextRequest) {
  try {
    const { token } = (await req.json()) as { token?: string }

    if (!token) {
      return NextResponse.json({ success: false, message: "Token mancante" }, { status: 400 })
    }

    const tokenResponse = await exchangeAuthorizationCode(token)
    const response = NextResponse.json({ success: true })
    await setSessionCookies(response, tokenResponse)

    return response
  } catch {
    return NextResponse.json({ success: false, message: "Token non valido o scaduto" }, { status: 401 })
  }
}
