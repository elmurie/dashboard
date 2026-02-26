import { NextRequest, NextResponse } from "next/server"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

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

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ _id: string }> }
) {
  const { _id } = await ctx.params

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

  const filePath = path.join(process.cwd(), "records.json")
  const raw = await readFile(filePath, "utf8")
  const rows = JSON.parse(raw) as Row[]

  const idx = rows.findIndex((r) => r._id === _id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })

  rows[idx] = { ...rows[idx], ...patch }

  await writeFile(filePath, JSON.stringify(rows, null, 2) + "\n", "utf8")

  return NextResponse.json(rows[idx])
}
