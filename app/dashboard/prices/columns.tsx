"use client"

import * as React from "react"
import { ColumnDef, FilterFn } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export type RecordRow = {
    what_id: string
    in_vendita: "SI" | "NO"
    sede: string
    medico: string
    nome_prestazione: string
    codice_azienda: string
    nome_prestazione_azienda: string
    prezzo: number
}

type UpdateFn = (what_id: string, patch: Partial<Pick<RecordRow, "prezzo" | "in_vendita">>) => Promise<void>

const multiSelectFilter: FilterFn<RecordRow> = (row, id, value) => {
    if (!Array.isArray(value) || value.length === 0) return true
    const cellValue = row.getValue(id)
    return value.some((selected) => selected === cellValue)
}

function normalizePriceInput(value: string): number | null {
    // accetta "70", "70.5", "70,5"
    const cleaned = value.trim().replace(",", ".")
    if (cleaned === "") return null
    const n = Number(cleaned)
    if (!Number.isFinite(n)) return null
    return n
}

function validatePrice(n: number): { ok: true } | { ok: false; reason: string } {
    if (n < 0) return { ok: false, reason: "Il prezzo non può essere negativo." }
    if (n > 100000) return { ok: false, reason: "Il prezzo sembra troppo alto." }
    // opzionale: max 2 decimali
    const twoDecimals = Math.round(n * 100) / 100
    if (Math.abs(twoDecimals - n) > 1e-9) return { ok: false, reason: "Max 2 decimali." }
    return { ok: true }
}

export function getColumns(updateRecord: UpdateFn): ColumnDef<RecordRow>[] {
    return [
        { accessorKey: "sede", header: "Sede", filterFn: multiSelectFilter },
        { accessorKey: "medico", header: "Medico", filterFn: multiSelectFilter },
        { accessorKey: "nome_prestazione", header: "Prestazione", filterFn: multiSelectFilter },
        { accessorKey: "codice_azienda", header: "Codice", filterFn: multiSelectFilter },
        { accessorKey: "nome_prestazione_azienda", header: "Prestazione (Azienda)", filterFn: multiSelectFilter },

        {
            accessorKey: "in_vendita",
            header: "In vendita",
            cell: ({ row }) => {
                const r = row.original

                return <EditableInVenditaCell
                    initialValue={r.in_vendita}
                    onCommit={async (next) => {
                        if (next === r.in_vendita) return
                        await updateRecord(r.what_id, { in_vendita: next })
                    }}
                />
            },
            filterFn: multiSelectFilter,
        },

        {
            accessorKey: "prezzo",
            header: "Prezzo",
            cell: ({ row }) => {
                const r = row.original

                return (
                    <EditablePriceCell
                        initialValue={r.prezzo}
                        onCommit={async (next) => {
                            await updateRecord(r.what_id, { prezzo: next })
                        }}
                    />
                )
            },
            filterFn: multiSelectFilter,
        },
    ]
}

function EditableInVenditaCell({
    initialValue,
    onCommit,
}: {
    initialValue: "SI" | "NO"
    onCommit: (next: "SI" | "NO") => Promise<void>
}) {
    const [value, setValue] = React.useState<"SI" | "NO">(initialValue)
    const [saving, setSaving] = React.useState(false)

    React.useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    async function commit(next: "SI" | "NO") {
        if (next === initialValue) return
        try {
            setSaving(true)
            setValue(next) // UI immediata
            await onCommit(next)
        } catch {
            // rollback
            setValue(initialValue)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Select
            value={value}
            onValueChange={(v) => commit(v as "SI" | "NO")}
            disabled={saving}
        >
            <SelectTrigger className="h-8 w-[110px]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="SI">SI</SelectItem>
                <SelectItem value="NO">NO</SelectItem>
            </SelectContent>
        </Select>
    )
}

function EditablePriceCell({
    initialValue,
    onCommit,
}: {
    initialValue: number
    onCommit: (next: number) => Promise<void>
}) {
    const [value, setValue] = React.useState(String(initialValue))
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        // se la riga viene aggiornata dall'esterno, sincronizza
        setValue(String(initialValue))
    }, [initialValue])

    async function commit() {
        setError(null)

        const parsed = normalizePriceInput(value)
        if (parsed === null) {
            setError("Inserisci un numero.")
            setValue(String(initialValue))
            return
        }

        const rounded = Math.round(parsed * 100) / 100
        const v = validatePrice(rounded)
        if (!v.ok) {
            setError(v.reason)
            setValue(String(initialValue))
            return
        }

        if (rounded === initialValue) return

        try {
            setSaving(true)
            await onCommit(rounded)
        } catch {
            setError("Errore nel salvataggio.")
            setValue(String(initialValue))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-1">
            <Input
                className="h-8 w-[110px]"
                inputMode="decimal"
                value={value}
                disabled={saving}
                onChange={(e) => setValue(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        ; (e.currentTarget as HTMLInputElement).blur()
                    }
                    if (e.key === "Escape") {
                        setError(null)
                        setValue(String(initialValue))
                            ; (e.currentTarget as HTMLInputElement).blur()
                    }
                }}
            />
            {error ? <span className="text-xs text-destructive">{error}</span> : null}
        </div>
    )
}
