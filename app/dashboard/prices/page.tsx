import { PageHeader } from "@/components/dashboard/page-header"
import { normalizeCompany } from "@/lib/companies"
import { RecordRow } from "./columns"
import { RecordsTable } from "./RecordsTable"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>
}) {
  const params = await searchParams
  const company = normalizeCompany(params.company)

  const res = await fetch(`http://localhost:3000/api/records?company=${company}`, { cache: "no-store" })
  const data = (await res.json()) as RecordRow[]

  return (
    <div className="w-full">
      <PageHeader
        title="Prezzi"
        description="Cambia i prezzi direttamente dalla tabella"
      />

      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-screen-2xl py-6 px-2">
          <RecordsTable data={data} />
        </div>
      </main>
    </div>
  )
}
