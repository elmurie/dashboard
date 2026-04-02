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

  const [clinicsError, setClinicsError] = React.useState<string | null>(null)
  const [closures, setClosures] = React.useState<string[]>([])
  const [closuresError, setClosuresError] = React.useState<string | null>(null)
  const [isClosuresLoading, setIsClosuresLoading] = React.useState(false)

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
        setClinicsError(null)
      })
      .catch((fetchError: unknown) => {
        if (!mounted) return
        setClinics([])
        setSelectedClinicId("")
        setClosures([])
        setClinicsError(fetchError instanceof Error ? fetchError.message : "Impossibile caricare le sedi")
      })

    return () => {
      mounted = false
    }
  }, [company])

  React.useEffect(() => {
    if (!selectedClinicId) {
      setClosures([])
      setClosuresError(null)
      setIsClosuresLoading(false)
      return
    }

    let mounted = true
    setIsClosuresLoading(true)

    fetch(`/api/chiusure?company=${encodeURIComponent(company)}&clinic_id=${encodeURIComponent(selectedClinicId)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? "Impossibile caricare le chiusure")
        }

        return (await res.json()) as string[]
      })
      .then((data) => {
        if (!mounted) return

        setClosures(Array.isArray(data) ? data : [])
        setClosuresError(null)
      })
      .catch((fetchError: unknown) => {
        if (!mounted) return
        setClosures([])
        setClosuresError(fetchError instanceof Error ? fetchError.message : "Impossibile caricare le chiusure")
      })
      .finally(() => {
        if (!mounted) return
        setIsClosuresLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [company, selectedClinicId])

  return (
    <section className="space-y-4">
      <div className="space-y-2">
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
        {clinicsError ? <p className="text-sm text-red-600">{clinicsError}</p> : null}
        {!clinicsError && clinics.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna sede disponibile.</p> : null}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Chiusure</div>
        {isClosuresLoading ? <p className="text-sm text-muted-foreground">Caricamento chiusure...</p> : null}
        {closuresError ? <p className="text-sm text-red-600">{closuresError}</p> : null}

        {!isClosuresLoading && !closuresError && closures.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-sm">
            {closures.map((closureDate) => (
              <li key={closureDate}>{closureDate}</li>
            ))}
          </ul>
        ) : null}

        {!isClosuresLoading && !closuresError && selectedClinicId && closures.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna chiusura disponibile per la sede selezionata.</p>
        ) : null}
      </div>

      {!searchParams.get("company") ? (
        <p className="text-xs text-muted-foreground">Company non specificata, uso default: {DEFAULT_COMPANY}</p>
      ) : null}
    </section>
  )
}
