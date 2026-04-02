"use client"
import clsx from 'clsx';
import * as React from "react"
import { useSearchParams } from "next/navigation"
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
import { Funnel } from "lucide-react"
import { RecordRow, getColumns } from "./columns"

async function updateRecord(
    id: string,
    company: string,
    patch: Partial<Pick<RecordRow, "prezzo" | "in_vendita">>
) {
    const tokenResponse = await fetch("/api/auth/access-token", {
        method: "GET",
        credentials: "include",
    })
    if (!tokenResponse.ok) throw new Error("Missing access token")

    const { accessToken } = (await tokenResponse.json()) as { accessToken?: string }
    if (!accessToken) throw new Error("Missing access token")

    const price = patch.prezzo
    if (typeof price !== "number") throw new Error("Invalid price")

    const res = await fetch("https://sandboxapi.cupsolidale.it/api/v1/sapp/prices/change", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ _id: id, company, price }),
    })

    if (!res.ok) throw new Error("PATCH failed")
}

export function RecordsTable({ data, canChangePrice }: { data: RecordRow[]; canChangePrice: boolean }) {
    const pageSizeOptions = [25, 50, 100]
    const searchParams = useSearchParams()
    const company = searchParams.get("company") ?? "humanray"

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [openFilterColumnId, setOpenFilterColumnId] = React.useState<string | null>(null)
    const [filterSearch, setFilterSearch] = React.useState<Record<string, string>>({})
    const tableContainerRef = React.useRef<HTMLDivElement | null>(null)
    const bottomScrollbarRef = React.useRef<HTMLDivElement | null>(null)
    const [bottomScrollWidth, setBottomScrollWidth] = React.useState(0)
    const isSyncingScrollRef = React.useRef(false)

    const isInteractiveElement = (target: EventTarget | null) => {
        if (!(target instanceof Element)) return false
        return Boolean(target.closest("button, a, input, select, textarea, summary, details, [role='button'], [contenteditable='true']"))
    }

    const columns = React.useMemo(() => getColumns((id, patch) => updateRecord(id, company, patch), canChangePrice), [canChangePrice, company])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnFilters },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,

        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        initialState: {
            pagination: {
                pageSize: pageSizeOptions[2],
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

    React.useEffect(() => {
        const tableContainer = tableContainerRef.current
        if (!tableContainer) return

        const updateBottomScrollWidth = () => {
            setBottomScrollWidth(tableContainer.scrollWidth)
        }

        const resizeObserver = new ResizeObserver(updateBottomScrollWidth)
        resizeObserver.observe(tableContainer)
        updateBottomScrollWidth()

        return () => {
            resizeObserver.disconnect()
        }
    }, [rows.length])

    React.useEffect(() => {
        const tableContainer = tableContainerRef.current
        const bottomScrollbar = bottomScrollbarRef.current

        if (!tableContainer || !bottomScrollbar) return

        const syncFromTable = () => {
            if (isSyncingScrollRef.current) return
            isSyncingScrollRef.current = true
            bottomScrollbar.scrollLeft = tableContainer.scrollLeft
            isSyncingScrollRef.current = false
        }

        const syncFromBottom = () => {
            if (isSyncingScrollRef.current) return
            isSyncingScrollRef.current = true
            tableContainer.scrollLeft = bottomScrollbar.scrollLeft
            isSyncingScrollRef.current = false
        }

        tableContainer.addEventListener("scroll", syncFromTable)
        bottomScrollbar.addEventListener("scroll", syncFromBottom)
        bottomScrollbar.scrollLeft = tableContainer.scrollLeft

        return () => {
            tableContainer.removeEventListener("scroll", syncFromTable)
            bottomScrollbar.removeEventListener("scroll", syncFromBottom)
        }
    }, [rows.length])

    React.useEffect(() => {
        const tableContainer = tableContainerRef.current
        if (!tableContainer) return

        const handleWheel = (event: WheelEvent) => {
            const horizontalDelta = event.deltaX + (event.shiftKey ? event.deltaY : 0)
            if (!horizontalDelta) return

            tableContainer.scrollLeft += horizontalDelta
            event.preventDefault()
        }

        tableContainer.addEventListener("wheel", handleWheel, { passive: false })

        return () => {
            tableContainer.removeEventListener("wheel", handleWheel)
        }
    }, [])

    React.useEffect(() => {
        const tableContainer = tableContainerRef.current
        if (!tableContainer) return

        let isDragging = false
        let startX = 0
        let startScrollLeft = 0

        const handlePointerDown = (event: PointerEvent) => {
            if (event.button !== 0 || isInteractiveElement(event.target)) return

            isDragging = true
            startX = event.clientX
            startScrollLeft = tableContainer.scrollLeft
            tableContainer.classList.add("cursor-grabbing")
            tableContainer.setPointerCapture(event.pointerId)
        }

        const handlePointerMove = (event: PointerEvent) => {
            if (!isDragging) return
            const deltaX = event.clientX - startX
            tableContainer.scrollLeft = startScrollLeft - deltaX
        }

        const stopDragging = (pointerId?: number) => {
            if (!isDragging) return
            isDragging = false
            tableContainer.classList.remove("cursor-grabbing")
            if (pointerId !== undefined && tableContainer.hasPointerCapture(pointerId)) {
                tableContainer.releasePointerCapture(pointerId)
            }
        }

        const handlePointerUp = (event: PointerEvent) => stopDragging(event.pointerId)
        const handlePointerCancel = (event: PointerEvent) => stopDragging(event.pointerId)

        tableContainer.addEventListener("pointerdown", handlePointerDown)
        tableContainer.addEventListener("pointermove", handlePointerMove)
        tableContainer.addEventListener("pointerup", handlePointerUp)
        tableContainer.addEventListener("pointercancel", handlePointerCancel)

        return () => {
            tableContainer.removeEventListener("pointerdown", handlePointerDown)
            tableContainer.removeEventListener("pointermove", handlePointerMove)
            tableContainer.removeEventListener("pointerup", handlePointerUp)
            tableContainer.removeEventListener("pointercancel", handlePointerCancel)
            tableContainer.classList.remove("cursor-grabbing")
        }
    }, [])

    function toggleFilterValue(column: Column<RecordRow, unknown>, value: unknown) {
        const current = (column.getFilterValue() as unknown[] | undefined) ?? []
        const exists = current.some((item) => item === value)
        const next = exists ? current.filter((item) => item !== value) : [...current, value]
        column.setFilterValue(next.length ? next : undefined)
    }

    function renderColumnFilter(column: Column<RecordRow, unknown>) {
        const uniqueValues = Array.from(column.getFacetedUniqueValues().keys())
        if (!uniqueValues.length) return null

        const filterLabel = typeof column.columnDef.header === "string" ? column.columnDef.header : column.id
        const selected = ((column.getFilterValue() as unknown[] | undefined) ?? [])
        const searchValue = filterSearch[column.id] ?? ""
        const normalizedSearch = searchValue.trim().toLowerCase()

        const filteredValues = uniqueValues
            .filter((value) => String(value).toLowerCase().includes(normalizedSearch))
            .sort((a, b) => String(a).localeCompare(String(b), "it", { numeric: true }))

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
                <summary className={clsx('cursor-pointer list-none py-1 text-xs',{'active rounded-md border px-2':selected.length})}>
                    {filterLabel} {selected.length ? `(${selected.length})` : ""} <Funnel size={15} strokeWidth={1} className='inline-block align-bottom'/>
                </summary>

                <div className="absolute z-20 mt-1 w-56 rounded-md border bg-background p-2 shadow">
                    <Input
                        value={searchValue}
                        onChange={(event) => {
                            const next = event.target.value
                            setFilterSearch((current) => ({ ...current, [column.id]: next }))
                        }}
                        placeholder={`Cerca ${filterLabel.toLowerCase()}...`}
                        className="mb-2 h-7 text-xs"
                    />

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
                            {filteredValues.length}/{uniqueValues.length} valori
                        </span>
                    </div>

                    <div className="max-h-56 space-y-1 overflow-auto pr-1">
                        {filteredValues.map((value, idx) => {
                                const checked = selected.some((item) => item === value)

                                return (
                                    <button
                                        key={`${column.id}-${idx}-${String(value)}`}
                                        type="button"
                                        className="flex w-full cursor-pointer items-center gap-2 rounded px-1 py-1 text-left text-xs hover:bg-[var(--secondary-bg)]"
                                        onClick={() => toggleFilterValue(column, value)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            readOnly
                                            tabIndex={-1}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">{String(value)}</span>
                                    </button>
                                )
                            })}

                        {!filteredValues.length ? (
                            <div className="px-1 py-2 text-xs text-muted-foreground">Nessun valore trovato.</div>
                        ) : null}
                    </div>
                </div>
            </details>
        )
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 rounded-md border">
                <Table
                    containerClassName="h-full cursor-grab overflow-y-auto overflow-x-hidden"
                    containerRef={tableContainerRef}
                >
                    <TableHeader className="sticky top-0 z-10 bg-background">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const widthClassName = (header.column.columnDef.meta as { widthClassName?: string } | undefined)?.widthClassName

                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={clsx(
                                                "h-7 border-r border-border px-1 py-0 last:border-r-0",
                                                widthClassName
                                            )}
                                        >
                                            {header.isPlaceholder ? null : renderColumnFilter(header.column)}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>

                    <TableBody>
                        {rows.length ? (
                            <>
                                {rows.map((row) => (
                                    <TableRow key={row.id} className="odd:bg-gray-100 even:bg-background">
                                        {row.getVisibleCells().map((cell) => {
                                            const widthClassName = (cell.column.columnDef.meta as { widthClassName?: string } | undefined)?.widthClassName

                                            return (
                                                <TableCell
                                                    key={cell.id}
                                                    className={clsx(
                                                        "border-r border-border px-1 py-0.5 last:border-r-0",
                                                        widthClassName
                                                    )}
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))}

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

            <div className="border-t bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div
                    ref={bottomScrollbarRef}
                    className="mb-2 w-full overflow-x-auto overflow-y-hidden"
                    aria-label="Scorrimento orizzontale tabella"
                >
                    <div className="h-1" style={{ width: `${bottomScrollWidth}px` }} />
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
        </div>
    )
}
