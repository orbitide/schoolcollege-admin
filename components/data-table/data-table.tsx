"use client"

import * as React from "react"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"
import {
  createColumnHelper,
  FlexRender,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table"

import { TablePagination } from "@/components/table-pagination"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type DataTableColumnMeta = {
  // Classes for the column's cells and its header.
  className?: string
  headerClassName?: string
}

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnMeta: {} as DataTableColumnMeta,
})

export type DataTableFeatures = typeof features

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns of mixed value types
export type DataTableColumn<T extends RowData> = ColumnDef<DataTableFeatures, T, any>

export type DataTableSort = { id: string; desc: boolean }

// Typed column definitions for a DataTable: columnHelper.accessor / .display.
export const createDataTableColumns = <T extends RowData>() => createColumnHelper<DataTableFeatures, T>()

// A server-driven table: the API pages, searches and sorts; this draws the rows it
// returned with the shared pagination footer. `page` is 1-based, as the API's PagedList.
// Columns sort only when `onSortChange` is given and the column doesn't set enableSorting: false.
export function DataTable<T extends RowData>({
  columns,
  rows,
  totalItems,
  page,
  pageSize,
  sort,
  noun = "rows",
  empty = "No results.",
  error,
  getRowId,
  rowClassName,
  onPageChange,
  onPageSizeChange,
  onSortChange,
}: {
  columns: DataTableColumn<T>[]
  rows: T[] | undefined
  totalItems: number
  page: number
  pageSize: number
  sort?: DataTableSort
  noun?: string
  empty?: string
  error?: string
  getRowId: (row: T) => string
  rowClassName?: (row: T) => string | undefined
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onSortChange?: (sort: DataTableSort | undefined) => void
}) {
  const sorting: SortingState = sort ? [sort] : []

  const table = useTable({
    features,
    data: rows ?? [],
    columns,
    state: { sorting, pagination: { pageIndex: page - 1, pageSize } },
    manualPagination: true,
    manualSorting: true,
    rowCount: totalItems,
    enableSorting: !!onSortChange,
    enableSortingRemoval: true,
    getRowId,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      onSortChange?.(next[0])
    },
  })

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan} className={meta?.headerClassName}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <FlexRender header={header} />
                          {sorted === "asc" ? (
                            <ArrowUpIcon data-icon="inline-end" />
                          ) : sorted === "desc" ? (
                            <ArrowDownIcon data-icon="inline-end" />
                          ) : (
                            <ArrowUpDownIcon data-icon="inline-end" className="opacity-50" />
                          )}
                        </Button>
                      ) : (
                        <FlexRender header={header} />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={rowClassName?.(row.original)}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className={cn("h-24 text-center text-muted-foreground")}>
                  {error ?? (rows ? empty : "Loading…")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        noun={noun}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  )
}
