import { NextRequest, NextResponse } from "next/server"
import { requestMagicLink } from "@/lib/sapp-api"

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "Email non valida" }, { status: 400 })
    }

    await requestMagicLink(email)

    return NextResponse.json({ success: true, message: "Se l'email esiste, riceverai un link di accesso." })
  } catch {
    return NextResponse.json({ success: true, message: "Se l'email esiste, riceverai un link di accesso." })
  }
}
