import { PageHeader } from "@/components/dashboard/page-header"
import { ClinicsSelect } from "./ClinicsSelect"

export default function Page() {
  return (
    <div className="w-full">
      <PageHeader title="Chiusure" />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-screen-2xl py-6">
          <ClinicsSelect />
        </div>
      </main>
    </div>
  )
}
