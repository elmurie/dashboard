"use client"

import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

const LOGIN_REDIRECT_DELAY_MS = 5000

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const token = searchParams.get("token")

  useEffect(() => {
    if (!token) return

    fetch("/api/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json()) as { message?: string }
          throw new Error(payload.message ?? "Token non valido o scaduto")
        }

        router.replace("/dashboard")
      })
      .catch((reason: Error) => {
        setError(`${reason.message}. Verrai reindirizzato al login tra 5 secondi...`)
      })
  }, [router, token])

  useEffect(() => {
    if (token && !error) return

    const timeoutId = window.setTimeout(() => {
      router.replace("/auth/login")
    }, LOGIN_REDIRECT_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [error, router, token])

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <Image src="/spinner.png" alt="Loading" width={24} height={24} className="animate-spin" />
          <h1 className="text-xl font-semibold">Autenticazione in corso...</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {token ? error ?? "Verifica del token in corso, attendi qualche secondo." : "Token mancante o non valido. Reindirizzamento al login tra 5 secondi..."}
        </p>
      </div>
    </div>
  )
}
