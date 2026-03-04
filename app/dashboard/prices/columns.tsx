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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type RecordRow = {
    _id: string
    id_sede: string
    id_medico: string
    id_prestazione: string
    what_id: string
    in_vendita: "SI" | "NO"
    sede: string
    medico: string
    nome_prestazione_cup: string
    nome_prestazione_azienda: string
    prezzo: number
    prezzo_min: number
    prezzo_avg: number
    prezzo_max: number
}

type UpdateFn = (_id: string, patch: Partial<Pick<RecordRow, "prezzo" | "in_vendita">>) => Promise<void>
const PRICE_DEVIATION_PERCENT_THRESHOLD = 10

const multiSelectFilter: FilterFn<RecordRow> = (row, _id, value) => {
    if (!Array.isArray(value) || value.length === 0) return true
    const cellValue = row.getValue(_id)
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
    if (n <= 0) return { ok: false, reason: "Il prezzo non può essere 0 o negativo." }
    if (n == 1) return { ok: false, reason: "Il prezzo non può essere 1." }
    if (!Number.isInteger(n))
        return { ok: false, reason: "Il prezzo deve essere un numero intero." }

    if (n > 100000)
        return { ok: false, reason: "Il prezzo sembra troppo alto." }
    const twoDecimals = Math.round(n * 100) / 100
    if (Math.abs(twoDecimals - n) > 1e-9) return { ok: false, reason: "Max 2 decimali." }
    return { ok: true }
}

export function getColumns(updateRecord: UpdateFn): ColumnDef<RecordRow>[] {
    return [
        { accessorKey: "sede", header: "Sede", filterFn: multiSelectFilter },
        { accessorKey: "medico", header: "Medico", filterFn: multiSelectFilter },
        { accessorKey: "id_medico", header: "ID Medico", filterFn: multiSelectFilter },
        { accessorKey: "nome_prestazione_cup", header: "Prestazione", filterFn: multiSelectFilter },
        { accessorKey: "id_prestazione", header: "ID Prestazione", filterFn: multiSelectFilter },
        { accessorKey: "nome_prestazione_azienda", header: "Prestazione (Azienda)", filterFn: multiSelectFilter },
        {
            accessorKey: "prezzo",
            header: "Prezzo",
            cell: ({ row }) => {
                const r = row.original

                return (
                    <EditablePriceCell
                        initialValue={r.prezzo}
                        marketMinPrice={r.prezzo_min}
                        marketPrice={r.prezzo_avg}
                        marketMaxPrice={r.prezzo_max}
                        onCommit={async (next) => {
                            await updateRecord(r._id, { prezzo: next })
                        }}
                    />
                )
            },
            filterFn: multiSelectFilter,
        },
        {
            accessorKey: "in_vendita",
            header: "In vendita",
            cell: ({ row }) => {
                const r = row.original

                return <EditableInVenditaCell
                    initialValue={r.in_vendita}
                    onCommit={async (next) => {
                        if (next === r.in_vendita) return
                        await updateRecord(r._id, { in_vendita: next })
                    }}
                />
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
            <SelectTrigger
                size="sm"
                className={cn(
                    "h-7 w-[80px] border-2 px-2 text-[12px] disabled:cursor-not-allowed disabled:bg-black",
                    {
                        "bg-gray-100 border-orange-500": value === "NO",
                        "border-[var(--accent-bg)]": value === "SI",
                    }
                )}
            >
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
    marketMinPrice,
    marketPrice,
    marketMaxPrice,
    onCommit,
}: {
    initialValue: number
    marketMinPrice?: number
    marketPrice?: number
    marketMaxPrice?: number
    onCommit: (next: number) => Promise<void>
}) {
    const [value, setValue] = React.useState(String(initialValue))
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [isErrorDialogOpen, setIsErrorDialogOpen] = React.useState(false)
    const [confirmPrice, setConfirmPrice] = React.useState<number | null>(null)
    const [isMarketDialogOpen, setIsMarketDialogOpen] = React.useState(false)
    const [isTooltipOpen, setIsTooltipOpen] = React.useState(false)
    const [isPriceFieldFocused, setIsPriceFieldFocused] = React.useState(false)

    const isPriceOutOfThreshold = React.useMemo(() => {
        const parsed = normalizePriceInput(value)
        if (parsed === null || typeof marketPrice !== "number" || marketPrice === 0) return false

        const deviationPercent = (Math.abs(parsed - marketPrice) / marketPrice) * 100
        return deviationPercent >= PRICE_DEVIATION_PERCENT_THRESHOLD
    }, [marketPrice, value])

    React.useEffect(() => {
        // se la riga viene aggiornata dall'esterno, sincronizza
        setValue(String(initialValue))
    }, [initialValue])

    async function commit() {
        setError(null)

        const parsed = normalizePriceInput(value)
        if (parsed === null) {
            setError("Inserisci un numero.")
            setIsErrorDialogOpen(true)
            setValue(String(initialValue))
            return
        }

        const rounded = Math.round(parsed * 100) / 100
        const v = validatePrice(rounded)
        if (!v.ok) {
            setError(v.reason)
            setIsErrorDialogOpen(true)
            setValue(String(initialValue))
            return
        }

        if (rounded === initialValue) return

        if (typeof marketPrice === "number" && Math.abs(rounded - marketPrice) > 10) {
            setConfirmPrice(rounded)
            setIsMarketDialogOpen(true)
            return
        }

        await persistPrice(rounded)
    }

    async function persistPrice(nextPrice: number) {
        try {
            setSaving(true)
            await onCommit(nextPrice)
        } catch {
            setError("Errore nel salvataggio.")
            setIsErrorDialogOpen(true)
            setValue(String(initialValue))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-1">
            <Tooltip open={isTooltipOpen}>
                <TooltipTrigger asChild>
                    <Input
                        className={cn("h-7 w-[60px] border-2 px-1 text-right", {
                            "border-orange-500": isPriceOutOfThreshold,
                        })}
                        inputMode="decimal"
                        value={value}
                        disabled={saving}
                        aria-invalid={Boolean(error)}
                        onChange={(e) => setValue(e.target.value)}
                        onMouseEnter={() => setIsTooltipOpen(true)}
                        onMouseLeave={() => {
                            if (!isPriceFieldFocused) setIsTooltipOpen(false)
                        }}
                        onFocus={() => {
                            setIsPriceFieldFocused(true)
                            setIsTooltipOpen(true)
                        }}
                        onBlur={async () => {
                            setIsPriceFieldFocused(false)
                            setIsTooltipOpen(false)
                            await commit()
                        }}
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
                </TooltipTrigger>
                <TooltipContent side="top" className="space-y-0.5 text-left">
                    <p>Minimo: {marketMinPrice ?? "-"}</p>
                    <p>Medio: {marketPrice ?? "-"}</p>
                    <p>Massimo: {marketMaxPrice ?? "-"}</p>
                </TooltipContent>
            </Tooltip>

            <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Errore validazione prezzo</DialogTitle>
                        <DialogDescription>{error}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" onClick={() => setIsErrorDialogOpen(false)}>
                            Chiudi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isMarketDialogOpen}
                onOpenChange={(open) => {
                    setIsMarketDialogOpen(open)
                    if (!open) {
                        setConfirmPrice(null)
                        setValue(String(initialValue))
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Conferma cambio prezzo</DialogTitle>
                        <DialogDescription>
                            Il prezzo di mercato per questa prestazione nella tua zona è di {marketPrice}. Vuoi confermare il tuo prezzo?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setConfirmPrice(null)
                                setIsMarketDialogOpen(false)
                                setValue(String(initialValue))
                            }}
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            onClick={async () => {
                                if (confirmPrice === null) return
                                setIsMarketDialogOpen(false)
                                await persistPrice(confirmPrice)
                                setConfirmPrice(null)
                            }}
                        >
                            Conferma
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
