import { NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import path from "node:path"

export async function GET() {
  const filePath = path.join(process.cwd(), "records.json")
  const raw = await readFile(filePath, "utf8")
  const data = JSON.parse(raw)
  return NextResponse.json(data)
}