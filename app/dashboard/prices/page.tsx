
import { RecordsTable } from "./RecordsTable"
import { RecordRow } from "./columns"
import { PageHeader } from "@/components/dashboard/page-header"

export default async function Page() {
    const res = await fetch("http://localhost:3000/api/records", { cache: "no-store" })
    const data = (await res.json()) as RecordRow[]
    return (
        <div className="w-full">
            <PageHeader
                title="Prezzi"
                description="Cambia i prezzi direttamente dalla tabella"
            />

            {/* Scroll container */}
            <main className="flex-1 overflow-y-auto">
                <div className="w-full max-w-screen-2xl py-6 px-2">
                    <RecordsTable data={data} />
                </div>
            </main>
        </div>
    )
}