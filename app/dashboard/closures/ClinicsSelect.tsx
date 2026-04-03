"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_COMPANY, normalizeCompany } from "@/lib/companies"

type Clinic = {
  _id: string
  name: string
}

const MONTHS = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const

const MAX_DAYS_IN_MONTH = 31
const ITALIAN_WEEKDAYS = ["D", "L", "M", "M", "G", "V", "S"] as const
const LOGIN_REDIRECT_DELAY_MS = 5000

function parseClosureDate(dateValue: string): Date | null {
  const normalizedDate = dateValue.trim()

  if (!normalizedDate) {
    return null
  }

  const isoLikeMatch = normalizedDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoLikeMatch) {
    const year = Number.parseInt(isoLikeMatch[1], 10)
    const month = Number.parseInt(isoLikeMatch[2], 10)
    const day = Number.parseInt(isoLikeMatch[3], 10)
    const parsedDate = new Date(year, month - 1, day)

    if (parsedDate.getFullYear() === year && parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day) {
      return parsedDate
    }
  }

  const isoDate = new Date(normalizedDate)
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate
  }

  const slashMatch = normalizedDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/)
  if (slashMatch) {
    const day = Number.parseInt(slashMatch[1], 10)
    const month = Number.parseInt(slashMatch[2], 10)
    const yearValue = Number.parseInt(slashMatch[3], 10)
    const year = yearValue < 100 ? yearValue + 2000 : yearValue
    const parsedDate = new Date(year, month - 1, day)

    if (parsedDate.getFullYear() === year && parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day) {
      return parsedDate
    }
  }

  return null
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function compressDateKeysToRanges(dateKeys: string[]) {
  if (dateKeys.length === 0) return []

  const sorted = [...new Set(dateKeys)].sort()
  const ranges: Array<{ from: string; to: string }> = []

  let rangeStart = sorted[0]
  let rangeEnd = sorted[0]

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index]
    const previousDate = new Date(`${rangeEnd}T00:00:00`)
    previousDate.setDate(previousDate.getDate() + 1)
    const nextKey = formatDateKey(previousDate)

    if (current === nextKey) {
      rangeEnd = current
      continue
    }

    ranges.push({ from: rangeStart, to: rangeEnd })
    rangeStart = current
    rangeEnd = current
  }

  ranges.push({ from: rangeStart, to: rangeEnd })
  return ranges
}

export function ClinicsSelect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const company = normalizeCompany(searchParams.get("company"))

  const [clinics, setClinics] = React.useState<Clinic[]>([])
  const [selectedClinicId, setSelectedClinicId] = React.useState<string>("")

  const [clinicsError, setClinicsError] = React.useState<string | null>(null)
  const [closures, setClosures] = React.useState<string[]>([])
  const [closuresError, setClosuresError] = React.useState<string | null>(null)
  const [isClosuresLoading, setIsClosuresLoading] = React.useState(false)
  const [closuresRefreshKey, setClosuresRefreshKey] = React.useState(0)
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear())
  const [selectedDateKeysToClose, setSelectedDateKeysToClose] = React.useState<Set<string>>(new Set())
  const [selectedDateKeysToOpen, setSelectedDateKeysToOpen] = React.useState<Set<string>>(new Set())
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [authError, setAuthError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const todayDateKey = formatDateKey(new Date())

  const closureDateKeys = React.useMemo(() => {
    const keys = new Set<string>()

    closures.forEach((closureDate) => {
      const parsedDate = parseClosureDate(closureDate)
      if (!parsedDate) return
      keys.add(formatDateKey(parsedDate))
    })

    return keys
  }, [closures])

  const availableYears = React.useMemo(() => {
    const years = Array.from(closureDateKeys)
      .map((dateKey) => Number.parseInt(dateKey.slice(0, 4), 10))
      .filter((year) => Number.isFinite(year))

    if (years.length === 0) {
      return [new Date().getFullYear()]
    }

    return Array.from(new Set(years)).sort((first, second) => first - second)
  }, [closureDateKeys])

  const selectedYearIndex = React.useMemo(() => {
    return Math.max(0, availableYears.findIndex((year) => year === selectedYear))
  }, [availableYears, selectedYear])

  React.useEffect(() => {
    if (availableYears.includes(selectedYear)) return
    setSelectedYear(availableYears[0])
  }, [availableYears, selectedYear])

  React.useEffect(() => {
    let mounted = true

    fetch(`/api/clinics?company=${encodeURIComponent(company)}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          throw new Error("Sessione scaduta o token non valido. Reindirizzamento al login tra 5 secondi...")
        }

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
        const errorMessage = fetchError instanceof Error ? fetchError.message : "Impossibile caricare le sedi"
        if (errorMessage.includes("Sessione scaduta") || errorMessage.includes("token non valido")) {
          setAuthError("Sessione scaduta o token non valido. Reindirizzamento al login tra 5 secondi...")
        }
        setClinics([])
        setSelectedClinicId("")
        setClosures([])
        setClinicsError(errorMessage)
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
      setSelectedDateKeysToClose(new Set())
      setSelectedDateKeysToOpen(new Set())
      setSaveError(null)
      return
    }

    let mounted = true
    setIsClosuresLoading(true)

    fetch(`/api/chiusure?company=${encodeURIComponent(company)}&clinic_id=${encodeURIComponent(selectedClinicId)}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          throw new Error("Sessione scaduta o token non valido. Reindirizzamento al login tra 5 secondi...")
        }

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
        setSaveError(null)
      })
      .catch((fetchError: unknown) => {
        if (!mounted) return
        const errorMessage = fetchError instanceof Error ? fetchError.message : "Impossibile caricare le chiusure"
        if (errorMessage.includes("Sessione scaduta") || errorMessage.includes("token non valido")) {
          setAuthError("Sessione scaduta o token non valido. Reindirizzamento al login tra 5 secondi...")
        }
        setClosures([])
        setClosuresError(errorMessage)
      })
      .finally(() => {
        if (!mounted) return
        setIsClosuresLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [company, selectedClinicId, closuresRefreshKey])

  const toggleDateSelection = (dateKey: string, isCurrentlyClosed: boolean) => {
    if (isCurrentlyClosed) {
      setSelectedDateKeysToOpen((previous) => {
        const next = new Set(previous)
        if (next.has(dateKey)) {
          next.delete(dateKey)
        } else {
          next.add(dateKey)
        }
        return next
      })
      setSelectedDateKeysToClose((previous) => {
        if (!previous.has(dateKey)) return previous
        const next = new Set(previous)
        next.delete(dateKey)
        return next
      })
      return
    }

    setSelectedDateKeysToClose((previous) => {
      const next = new Set(previous)
      if (next.has(dateKey)) {
        next.delete(dateKey)
      } else {
        next.add(dateKey)
      }
      return next
    })
    setSelectedDateKeysToOpen((previous) => {
      if (!previous.has(dateKey)) return previous
      const next = new Set(previous)
      next.delete(dateKey)
      return next
    })
  }

  const saveSelectedDays = async () => {
    if (!selectedClinicId || (selectedDateKeysToClose.size === 0 && selectedDateKeysToOpen.size === 0)) return

    setIsSaving(true)
    setSaveError(null)

    try {
      if (selectedDateKeysToOpen.size > 0) {
        const openDaysResponse = await fetch("/api/chiusure/open-days", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company,
            clinic_id: selectedClinicId,
            days: compressDateKeysToRanges(Array.from(selectedDateKeysToOpen)),
          }),
        })

        if (!openDaysResponse.ok) {
          if (openDaysResponse.status === 401) {
            setAuthError("Sessione scaduta o token non valido. Reindirizzamento al login tra 5 secondi...")
            return
          }

          const payload = (await openDaysResponse.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? "Impossibile aprire i giorni selezionati")
        }
      }

      if (selectedDateKeysToClose.size > 0) {
        const closeDaysResponse = await fetch("/api/chiusure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company,
            clinic_id: selectedClinicId,
            days: compressDateKeysToRanges(Array.from(selectedDateKeysToClose)),
          }),
        })

        if (!closeDaysResponse.ok) {
          if (closeDaysResponse.status === 401) {
            setAuthError("Sessione scaduta o token non valido. Reindirizzamento al login tra 5 secondi...")
            return
          }

          const payload = (await closeDaysResponse.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? "Impossibile salvare le chiusure")
        }
      }

      setSelectedDateKeysToClose(new Set())
      setSelectedDateKeysToOpen(new Set())
      setClosuresRefreshKey((value) => value + 1)
    } catch (saveSelectedDaysError: unknown) {
      setSaveError(saveSelectedDaysError instanceof Error ? saveSelectedDaysError.message : "Impossibile salvare le chiusure")
    } finally {
      setIsSaving(false)
    }
  }

  React.useEffect(() => {
    if (!authError) return

    const timeoutId = window.setTimeout(() => {
      router.replace("/auth/login")
    }, LOGIN_REDIRECT_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [authError, router])

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <div className="w-full overflow-x-auto">
          <div className="flex min-w-max items-center gap-3">
            <div className="w-72">
              <p className="sr-only">Sede</p>
              <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
                <SelectTrigger className="bg-white">
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
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedYear(availableYears[Math.max(0, selectedYearIndex - 1)])}
                disabled={selectedYearIndex === 0 || !selectedClinicId}
              >
                « Indietro
              </Button>
              <div className="min-w-16 text-center text-3xl font-semibold">{selectedYear}</div>
              <Button
                variant="outline"
                onClick={() => setSelectedYear(availableYears[Math.min(availableYears.length - 1, selectedYearIndex + 1)])}
                disabled={selectedYearIndex === availableYears.length - 1 || !selectedClinicId}
              >
                Avanti »
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Da chiudere: {selectedDateKeysToClose.size} • Da aprire: {selectedDateKeysToOpen.size}
              </p>
              <Button
                onClick={saveSelectedDays}
                disabled={(selectedDateKeysToClose.size === 0 && selectedDateKeysToOpen.size === 0) || isSaving}
              >
                {isSaving ? "Salvataggio..." : "Salva giorni selezionati"}
              </Button>
            </div>
          </div>
        </div>

        {clinicsError ? <p className="text-sm text-red-600">{clinicsError}</p> : null}
        {authError ? <p className="text-sm text-red-600">{authError}</p> : null}
        {!clinicsError && clinics.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna sede disponibile.</p> : null}
        {isClosuresLoading ? <p className="text-sm text-muted-foreground">Caricamento chiusure...</p> : null}
        {closuresError ? <p className="text-sm text-red-600">{closuresError}</p> : null}
        {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}

        {!isClosuresLoading && !closuresError && selectedClinicId ? (
          <div className="space-y-4">
            <div className="w-full overflow-x-auto rounded-md border bg-white">
              <table className="w-full min-w-[1200px] border-collapse text-center">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="sticky left-0 z-10 w-20 border-r bg-muted/50 px-2 py-2 text-left text-xs font-semibold sm:w-32 sm:px-3 sm:text-sm">
                      Mese
                    </th>
                    {Array.from({ length: MAX_DAYS_IN_MONTH }, (_, index) => (
                      <th key={index + 1} className="w-9 px-1 py-2 text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b bg-muted/30">
                    <th className="sticky left-0 z-10 w-20 border-r bg-muted/30 px-2 py-2 text-left text-[11px] text-muted-foreground sm:w-32 sm:px-3 sm:text-xs">
                      Giorno
                    </th>
                    {Array.from({ length: MAX_DAYS_IN_MONTH }, (_, index) => (
                      <th key={`weekday-${index + 1}`} className="px-1 py-1 text-[11px] font-medium text-muted-foreground">
                        {ITALIAN_WEEKDAYS[new Date(selectedYear, 0, index + 1).getDay()]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map((monthName, monthIndex) => (
                    <tr key={monthName} className="border-b last:border-b-0">
                      <th className="sticky left-0 z-10 w-20 border-r bg-white px-2 py-2 text-left text-xs font-semibold sm:w-32 sm:px-3 sm:text-base">
                        <span className="sm:hidden">{monthName.slice(0, 3)}</span>
                        <span className="hidden sm:inline">{monthName}</span>
                      </th>
                      {Array.from({ length: MAX_DAYS_IN_MONTH }, (_, dayIndex) => {
                        const day = dayIndex + 1
                        const date = new Date(selectedYear, monthIndex, day)
                        const isValidDate = date.getMonth() === monthIndex
                        const dateKey = formatDateKey(date)
                        const isPastDate = isValidDate && dateKey < todayDateKey
                        const isClosed = closureDateKeys.has(dateKey)
                        const isSelectedToClose = selectedDateKeysToClose.has(dateKey)
                        const isSelectedToOpen = selectedDateKeysToOpen.has(dateKey)

                        return (
                          <td key={`${monthName}-${day}`} className="border-l border-slate-100 p-0">
                            <button
                              type="button"
                              className={[
                                "h-10 w-full text-sm transition-colors",
                                isValidDate ? "cursor-pointer hover:bg-slate-100" : "cursor-not-allowed bg-slate-100 text-slate-300",
                                isPastDate ? "cursor-not-allowed bg-slate-300 text-slate-600 hover:bg-slate-300" : "",
                                !isPastDate && isClosed ? "bg-red-500 text-white hover:bg-red-600" : "",
                                isSelectedToClose ? "ring-2 ring-inset ring-black" : "",
                                isSelectedToOpen ? "ring-2 ring-inset ring-emerald-700" : "",
                              ].join(" ")}
                              onClick={() => {
                                if (!isValidDate || isPastDate) return
                                toggleDateSelection(dateKey, isClosed)
                              }}
                              disabled={!isValidDate || isPastDate}
                            >
                              {isValidDate ? day : ""}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      {!searchParams.get("company") ? (
        <p className="text-xs text-muted-foreground">Company non specificata, uso default: {DEFAULT_COMPANY}</p>
      ) : null}
    </section>
  )
}
