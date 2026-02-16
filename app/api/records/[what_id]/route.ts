import { NextRequest, NextResponse } from "next/server"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

type Row = {
  what_id: string
  in_vendita: "SI" | "NO"
  prezzo: number
  sede: string
  medico: string
  nome_prestazione: string
  codice_azienda: string
  nome_prestazione_azienda: string
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ what_id: string }> } // 👈 qui
) {
  const { what_id } = await ctx.params // 👈 e qui

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

  const idx = rows.findIndex((r) => r.what_id === what_id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })

  rows[idx] = { ...rows[idx], ...patch }

  await writeFile(filePath, JSON.stringify(rows, null, 2) + "\n", "utf8")

  return NextResponse.json(rows[idx])
}