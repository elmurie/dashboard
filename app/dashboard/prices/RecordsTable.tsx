"use client"
import clsx from 'clsx';
import * as React from "react"
import {
    Column,
    ColumnFiltersState,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
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
    const pageSizeOptions = [25, 50, 100]

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = React.useState("")
    const [openFilterColumnId, setOpenFilterColumnId] = React.useState<string | null>(null)

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
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        initialState: {
            pagination: {
                pageSize: pageSizeOptions[0],
            },
        },
    })

    const rows = table.getRowModel().rows

    const pagination = table.getState().pagination
    const pageCount = table.getPageCount()

    const pageButtons = React.useMemo(() => {
        if (pageCount <= 7) {
            return Array.from({ length: pageCount }, (_, i) => i)
        }

        const current = pagination.pageIndex
        const pages = new Set<number>([0, pageCount - 1, current, current - 1, current + 1])

        return Array.from(pages)
            .filter((p) => p >= 0 && p < pageCount)
            .sort((a, b) => a - b)
    }, [pageCount, pagination.pageIndex])

    function toggleFilterValue(column: Column<RecordRow, unknown>, value: unknown) {
        const current = (column.getFilterValue() as unknown[] | undefined) ?? []
        const exists = current.some((item) => item === value)
        const next = exists ? current.filter((item) => item !== value) : [...current, value]
        column.setFilterValue(next.length ? next : undefined)
    }

    function renderColumnFilter(column: Column<RecordRow, unknown>) {
        const uniqueValues = Array.from(column.getFacetedUniqueValues().keys())
        if (!uniqueValues.length) return null

        const selected = ((column.getFilterValue() as unknown[] | undefined) ?? [])

        return (
            <details
                className="relative"
                open={openFilterColumnId === column.id}
                onToggle={(event) => {
                    const isOpen = event.currentTarget.open
                    if (isOpen) {
                        setOpenFilterColumnId(column.id)
                        return
                    }

                    setOpenFilterColumnId((current) => (current === column.id ? null : current))
                }}
                onBlurCapture={(event) => {
                    const nextFocusedElement = event.relatedTarget as Node | null
                    if (!event.currentTarget.contains(nextFocusedElement)) {
                        setOpenFilterColumnId((current) => (current === column.id ? null : current))
                    }
                }}
            >
                <summary className={clsx('cursor-pointer list-none rounded-md border px-2 py-1 text-xs hover:bg-muted',{'active':selected.length})}>
                    Filtro {selected.length ? `(${selected.length})` : ""}
                </summary>

                <div className="absolute z-20 mt-1 w-56 rounded-md border bg-background p-2 shadow">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => column.setFilterValue(undefined)}
                        >
                            Tutti
                        </Button>
                        <span className="text-[11px] text-muted-foreground">
                            {uniqueValues.length} valori
                        </span>
                    </div>

                    <div className="max-h-56 space-y-1 overflow-auto pr-1">
                        {uniqueValues
                            .sort((a, b) => String(a).localeCompare(String(b), "it", { numeric: true }))
                            .map((value, idx) => {
                                const checked = selected.some((item) => item === value)
                                const id = `${column.id}-${idx}-${String(value)}`

                                return (
                                    <label key={id} htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-muted">
                                        <input
                                            id={id}
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleFilterValue(column, value)}
                                        />
                                        <span className="truncate">{String(value)}</span>
                                    </label>
                                )
                            })}
                    </div>
                </div>
            </details>
        )
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
                        {rows.length ? (
                            <>
                                {rows.map((row) => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}

                                {/* 👇 FILLER: mantiene la tabella "alta" quando ci sono poche righe */}
                                <TableRow>
                                    <TableCell
                                        colSpan={table.getAllColumns().length}
                                        className="p-0"
                                    >
                                        <div className="h-[40vh]" />
                                    </TableCell>
                                </TableRow>
                            </>
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                    {table.getFilteredRowModel().rows.length} record
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Righe per pagina</span>
                        <Select
                            value={String(pagination.pageSize)}
                            onValueChange={(value) => table.setPageSize(Number(value))}
                        >
                            <SelectTrigger className="h-8 w-[90px]" size="sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {pageSizeOptions.map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                        Prev
                    </Button>

                    {pageButtons.map((pageIndex, idx) => {
                        const previous = pageButtons[idx - 1]
                        const showDots = previous !== undefined && pageIndex - previous > 1

                        return (
                            <React.Fragment key={`page-${pageIndex}`}>
                                {showDots ? <span className="px-1 text-sm text-muted-foreground">…</span> : null}
                                <Button
                                    variant={pagination.pageIndex === pageIndex ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => table.setPageIndex(pageIndex)}
                                    className="min-w-8"
                                >
                                    {pageIndex + 1}
                                </Button>
                            </React.Fragment>
                        )
                    })}

                    <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}
