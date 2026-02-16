import { RecordsTable } from "./RecordsTable"
import { RecordRow } from "./columns"

export default async function Page() {
    const res = await fetch("http://localhost:3000/api/records", { cache: "no-store" })
    const data = (await res.json()) as RecordRow[]
    return <RecordsTable data={data} />
}