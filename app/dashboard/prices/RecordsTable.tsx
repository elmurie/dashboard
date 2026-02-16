"use client"

import * as React from "react"
import {
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
                    <Input
                        placeholder='Filtro prezzo es: ">= 70"'
                        value={(table.getColumn("prezzo")?.getFilterValue() as string) ?? ""}
                        onChange={(e) => table.getColumn("prezzo")?.setFilterValue(e.target.value)}
                        className="w-[180px]"
                    />

                    <Input
                        placeholder='In vendita: "SI" o "NO"'
                        value={(table.getColumn("in_vendita")?.getFilterValue() as string) ?? ""}
                        onChange={(e) => table.getColumn("in_vendita")?.setFilterValue(e.target.value.toUpperCase())}
                        className="w-[150px]"
                    />

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