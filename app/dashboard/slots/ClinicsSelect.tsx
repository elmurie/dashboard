"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_COMPANY, normalizeCompany } from "@/lib/companies"

type Clinic = {
  _id: string
  name: string
}

export function ClinicsSelect() {
  const searchParams = useSearchParams()
  const company = normalizeCompany(searchParams.get("company"))

  const [clinics, setClinics] = React.useState<Clinic[]>([])
  const [selectedClinicId, setSelectedClinicId] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true

    fetch(`/api/clinics?company=${encodeURIComponent(company)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? "Impossibile caricare le sedi")
        }

        return (await res.json()) as Clinic[]
      })
      .then((data) => {
        if (!mounted) return

        const safeData = Array.isArray(data) ? data : []
        setClinics(safeData)
        setSelectedClinicId(safeData[0]?._id ?? "")
        setError(null)
      })
      .catch((fetchError: unknown) => {
        if (!mounted) return
        setClinics([])
        setSelectedClinicId("")
        setError(fetchError instanceof Error ? fetchError.message : "Impossibile caricare le sedi")
      })

    return () => {
      mounted = false
    }
  }, [company])

  return (
    <section className="space-y-2">
      <div className="text-sm font-medium">Sede</div>
      <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
        <SelectTrigger className="w-full max-w-md bg-white">
          <SelectValue placeholder="Seleziona una sede" />
        </SelectTrigger>
        <SelectContent>
          {clinics.map((clinic) => (
            <SelectItem key={clinic._id} value={clinic._id}>
              {clinic.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!error && clinics.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna sede disponibile.</p> : null}
      {!searchParams.get("company") ? (
        <p className="text-xs text-muted-foreground">Company non specificata, uso default: {DEFAULT_COMPANY}</p>
      ) : null}
    </section>
  )
}
