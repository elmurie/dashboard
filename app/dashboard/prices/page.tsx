"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { DEFAULT_COMPANY, normalizeCompany } from "@/lib/companies"
import { RecordRow } from "./columns"
import { RecordsTable } from "./RecordsTable"

export default function Page() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const company = normalizeCompany(searchParams.get("company"))
  const [data, setData] = useState<RecordRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!searchParams.get("company")) {
      router.replace(`/dashboard/prices?company=${DEFAULT_COMPANY}`)
      return
    }

    let mounted = true

    Promise.resolve().then(() => {
      if (mounted) setLoading(true)
    })

    fetch(`/api/records?company=${encodeURIComponent(company)}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/auth/login")
          return [] as RecordRow[]
        }

        if (!res.ok) {
          throw new Error("Errore durante il caricamento prezzi")
        }

        return (await res.json()) as RecordRow[]
      })
      .then((rows) => {
        if (!mounted) return
        setData(rows)
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [company, router, searchParams])

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Caricamento prezzi...</div>
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full flex-1 flex-col px-2 pb-2">
          <RecordsTable data={data} />
        </div>
      </main>
    </div>
  )
}
