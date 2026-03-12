import { NextResponse } from "next/server"
import { clearSessionCookies } from "@/lib/sapp-api"

export async function POST() {
  const response = NextResponse.json({ success: true })
  await clearSessionCookies(response)
  return response
}
