import { NextRequest, NextResponse } from "next/server"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { Company, normalizeCompany } from "@/lib/companies"

type Row = {
  _id: string
  id_sede: string
  in_vendita: "SI" | "NO"
  prezzo: number
  sede: string
  id_medico: string
  medico: string
  id_prestazione: string
  nome_prestazione_azienda: string
  what_id: string
  nome_prestazione_cup: string
  prezzo_min: number
  prezzo_avg: number
  prezzo_max: number
}

type RecordsByCompany = Record<Company, Row[]>

const SAPP_BASE_URL = process.env.SAPP_BASE_URL ?? "https://api.cupsolidale.it/api/v1/sapp"
const ACCESS_TOKEN_ENV_KEYS = [
  "SAPP_ACCESS_TOKEN",
  "CUPSOLIDALE_ACCESS_TOKEN",
  "SAPP_BEARER_TOKEN",
] as const

function getAuthorizationHeader(req: NextRequest): string | null {
  const requestAuthorization = req.headers.get("authorization")?.trim()
  if (requestAuthorization) return requestAuthorization

  for (const key of ACCESS_TOKEN_ENV_KEYS) {
    const token = process.env[key]?.trim()
    if (!token) continue
    return token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`
  }

  return null
}

async function updateRemotePrice({
  _id,
  company,
  prezzo,
  authorization,
}: {
  _id: string
  company: Company
  prezzo: number
  authorization: string
}) {
  const response = await fetch(`${SAPP_BASE_URL}/prices/change`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ _id, price: prezzo, company }),
    cache: "no-store",
  })

  if (response.ok) return

  const contentType = response.headers.get("content-type") ?? ""
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null)

  return NextResponse.json(
    {
      error: "Remote price update failed",
      status: response.status,
      payload,
    },
    { status: response.status }
  )
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ _id: string }> }
) {
  const { _id } = await ctx.params
  const company = normalizeCompany(req.nextUrl.searchParams.get("company"))

  const patch = (await req.json()) as Partial<Pick<Row, "prezzo" | "in_vendita">>

  if ("in_vendita" in patch && patch.in_vendita !== "SI" && patch.in_vendita !== "NO") {
    return NextResponse.json({ error: "Invalid in_vendita" }, { status: 400 })
  }
  if ("prezzo" in patch) {
    const n = Number(patch.prezzo)
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "Invalid prezzo" }, { status: 400 })
    }
    patch.prezzo = Math.round(n * 100) / 100
  }

  if (typeof patch.prezzo === "number") {
    const authorization = getAuthorizationHeader(req)
    if (!authorization) {
      return NextResponse.json(
        { error: "Missing Authorization header for remote price update" },
        { status: 401 }
      )
    }

    const remoteErrorResponse = await updateRemotePrice({
      _id,
      company,
      prezzo: patch.prezzo,
      authorization,
    })

    if (remoteErrorResponse) {
      return remoteErrorResponse
    }
  }

  const filePath = path.join(process.cwd(), "records.json")
  const raw = await readFile(filePath, "utf8")
  const recordsByCompany = JSON.parse(raw) as RecordsByCompany

  const rows = recordsByCompany[company] ?? []
  const idx = rows.findIndex((r) => r._id === _id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })

  rows[idx] = { ...rows[idx], ...patch }
  recordsByCompany[company] = rows

  await writeFile(filePath, JSON.stringify(recordsByCompany, null, 2) + "\n", "utf8")

  return NextResponse.json(rows[idx])
}
