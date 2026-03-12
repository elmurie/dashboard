"use client"

import { FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const payload = (await response.json()) as { message?: string }
      setMessage(payload.message ?? "Se l'email è valida, riceverai un link a breve.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <form onSubmit={onSubmit} className="w-full space-y-4 rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Login</h1>
        <p className="text-sm text-muted-foreground">Inserisci la tua email per ricevere un magic link.</p>

        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nome@azienda.it"
          required
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Invio in corso..." : "Invia link"}
        </Button>

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </form>
    </div>
  )
}
