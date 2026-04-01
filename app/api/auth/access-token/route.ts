import { NextResponse } from "next/server"
import { getValidAccessToken, setSessionCookies } from "@/lib/sapp-api"

export async function GET() {
  const tokenState = await getValidAccessToken()

  if (!tokenState?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const response = NextResponse.json({ accessToken: tokenState.accessToken })

  if (tokenState.refreshed) {
    await setSessionCookies(response, tokenState.refreshed)
  }

  return response
}
