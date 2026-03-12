"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

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
          throw new Error(payload.message ?? "Autenticazione fallita")
        }

        router.replace("/dashboard")
      })
      .catch((reason: Error) => {
        setError(reason.message)
      })
  }, [router, token])

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Autenticazione in corso...</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {token ? error ?? "Verifica del token in corso, attendi qualche secondo." : "Token mancante"}
        </p>
      </div>
    </div>
  )
}
