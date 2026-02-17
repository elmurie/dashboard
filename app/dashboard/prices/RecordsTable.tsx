"use client"

import * as React from "react"
import {
    Column,
    ColumnFiltersState,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    flexRender
} from "@tanstack/react-table"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { RecordRow, getColumns } from "./columns"

async function updateRecord(what_id: string, patch: Partial<Pick<RecordRow, "prezzo" | "in_vendita">>) {
    const res = await fetch(`/api/records/${what_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error("PATCH failed")
}

export function RecordsTable({ data }: { data: RecordRow[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = React.useState("")

    const columns = React.useMemo(() => getColumns(updateRecord), [])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnFilters, globalFilter },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,

        globalFilterFn: (row, _columnId, filterValue) => {
            const q = String(filterValue ?? "").toLowerCase().trim()
            if (!q) return true

            // ricerca “umana” su campi chiave
            const r = row.original
            const hay = [
                r.sede,
                r.medico,
                r.nome_prestazione,
                r.nome_prestazione_azienda,
                r.codice_azienda,
                r.in_vendita,
                String(r.prezzo),
                r.what_id,
            ]
                .join(" ")
                .toLowerCase()

            return hay.includes(q)
        },

        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    })

    function renderColumnFilter(column: Column<RecordRow>) {
        const value = (column.getFilterValue() as string) ?? ""

        if (column.id === "in_vendita") {
            return (
                <Select
                    value={value || "all"}
                    onValueChange={(next) => column.setFilterValue(next === "all" ? "" : next)}
                >
                    <SelectTrigger className="h-8 w-full min-w-[120px]">
                        <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tutti</SelectItem>
                        <SelectItem value="SI">SI</SelectItem>
                        <SelectItem value="NO">NO</SelectItem>
                    </SelectContent>
                </Select>
            )
        }

        if (column.id === "prezzo") {
            return (
                <Input
                    placeholder=">= 70"
                    value={value}
                    onChange={(e) => column.setFilterValue(e.target.value)}
                    className="h-8 min-w-[100px]"
                />
            )
        }

        if (["sede", "medico", "nome_prestazione", "codice_azienda", "nome_prestazione_azienda"].includes(column.id)) {
            return (
                <Input
                    placeholder="Filtra..."
                    value={value}
                    onChange={(e) => column.setFilterValue(e.target.value)}
                    className="h-8 min-w-[120px]"
                />
            )
        }

        return null
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Input
                    placeholder="Cerca (sede, medico, prestazione, codice...)"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="sm:max-w-md"
                />

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setGlobalFilter("")
                            setColumnFilters([])
                        }}
                    >
                        Reset
                    </Button>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}

                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={`${headerGroup.id}-filters`}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={`${header.id}-filter`}>
                                        {header.isPlaceholder ? null : renderColumnFilter(header.column)}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                                    Nessun risultato.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {table.getFilteredRowModel().rows.length} record
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                        Prev
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}
