import { NextRequest, NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { Company, normalizeCompany } from "@/lib/companies"

type RecordsByCompany<T> = Record<Company, T[]>

export async function GET(req: NextRequest) {
  const company = normalizeCompany(req.nextUrl.searchParams.get("company"))

  const filePath = path.join(process.cwd(), "records.json")
  const raw = await readFile(filePath, "utf8")
  const data = JSON.parse(raw) as RecordsByCompany<unknown>

  return NextResponse.json(data[company] ?? [])
}
