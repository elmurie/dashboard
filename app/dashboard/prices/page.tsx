"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CompanySettings, DEFAULT_COMPANY, normalizeCompaniesResponse, normalizeCompany } from "@/lib/companies"
import { RecordRow } from "./columns"
import { RecordsTable } from "./RecordsTable"

const LOGIN_REDIRECT_DELAY_MS = 5000

function getCanChangePriceForCompany(companies: CompanySettings[], company: string): boolean {
  const match = companies.find((entry) => entry.company === company)
  if (!match) return true
  return match.can_change_price
}

export default function Page() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const company = normalizeCompany(searchParams.get("company"))
  const [data, setData] = useState<RecordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [canChangePrice, setCanChangePrice] = useState(true)

  useEffect(() => {
    if (!searchParams.get("company")) {
      router.replace(`/dashboard/prices?company=${DEFAULT_COMPANY}`)
      return
    }

    let mounted = true

    Promise.resolve().then(() => {
      if (mounted) {
        setLoading(true)
        setAuthError(null)
      }
    })

    let unauthorized = false

    const recordsPromise = fetch(`/api/records?company=${encodeURIComponent(company)}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          unauthorized = true
          if (mounted) {
            setAuthError("Sessione scaduta o token non valido. Reindirizzamento al login tra 5 secondi...")
          }
          return [] as RecordRow[]
        }

        if (!res.ok) {
          throw new Error("Errore durante il caricamento prezzi")
        }

        return (await res.json()) as RecordRow[]
      })

    const companiesPromise = fetch("/api/companies", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return normalizeCompaniesResponse([])
        return normalizeCompaniesResponse(await res.json())
      })
      .catch(() => normalizeCompaniesResponse([]))

    Promise.all([recordsPromise, companiesPromise])
      .then(([rows, companies]) => {
        if (!mounted || unauthorized) return
        setData(rows)
        setCanChangePrice(getCanChangePriceForCompany(companies, company))
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [company, router, searchParams])

  useEffect(() => {
    if (!authError) return

    const timeoutId = window.setTimeout(() => {
      router.replace("/auth/login")
    }, LOGIN_REDIRECT_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [authError, router])

  if (loading || authError) {
    return (
      <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
        <Image src="/spinner.png" alt="Loading" width={18} height={18} className="animate-spin" />
        <span>{authError ?? "Caricamento prezzi..."}</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full flex-1 flex-col px-2 pb-2">
          <RecordsTable data={data} canChangePrice={canChangePrice} />
        </div>
      </main>
    </div>
  )
}
