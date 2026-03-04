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
    <div className="flex min-h-0 flex-1 w-full flex-col">
      {/* <PageHeader
        title="Prezzi"
        description="Cambia i prezzi direttamente dalla tabella"
      /> */}

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col w-full px-2 pb-2">
          <RecordsTable data={data} />
        </div>
      </main>
    </div>
  )
}
