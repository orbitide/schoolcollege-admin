"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon, SearchIcon } from "lucide-react"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  logEntityStatuses,
  logTables,
  useCommonLogs,
  type CommonLog,
  type LogEntityStatus,
} from "@/lib/common-log"

const PAGE_SIZES = [10, 20, 50, 100]

type Filters = { table: string; rowId: string; uniqueKey: string; status: "" | LogEntityStatus }

// "2026-09-29 14:05:09", the legacy log's yyyy-MM-dd HH:mm:ss.
function logStamp(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const statusVariant = (status: LogEntityStatus) =>
  status === "Active" ? "secondary" : status === "Inactive" ? "outline" : "destructive"

// Legacy CommonLog/Manage: every logged change, newest first. Table, row id,
// unique key and entity status apply on Search (the page can be opened
// pre-filtered with ?tableName=&id=&uniqueKey=); the search box looks inside
// the object JSON as you type.
export function CommonLogList() {
  const params = useSearchParams()
  const logs = useCommonLogs()
  const initial: Filters = {
    table: params.get("tableName") ?? "",
    rowId: params.get("id") && params.get("id") !== "0" ? params.get("id")! : "",
    uniqueKey: params.get("uniqueKey") ?? "",
    status: "",
  }
  const [draft, setDraft] = React.useState<Filters>(initial)
  const [applied, setApplied] = React.useState<Filters>(initial)
  const [query, setQuery] = React.useState("")
  const [pageSize, setPageSize] = React.useState(20)
  const [page, setPage] = React.useState(0)
  const [viewing, setViewing] = React.useState<CommonLog | null>(null)

  const tables = logTables()
  const needle = query.trim()
  const rows = logs.filter(
    (log) =>
      (!applied.table || log.tableName === applied.table) &&
      (!applied.rowId || log.rowId === Number(applied.rowId)) &&
      (!applied.uniqueKey || log.uniqueKey.includes(applied.uniqueKey.trim())) &&
      (!applied.status || log.entityStatus === applied.status) &&
      (!needle || log.objectJson.includes(needle))
  )
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pages - 1)
  const shown = rows.slice(current * pageSize, (current + 1) * pageSize)

  function search(event: React.FormEvent) {
    event.preventDefault()
    setApplied(draft)
    setPage(0)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Common Log</h2>
        <p className="text-sm text-muted-foreground">
          Every save, update, delete, retrieve and permanent delete of a record, newest first.
        </p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={search} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <FilterField
              label="Table"
              value={draft.table}
              onChange={(table) => setDraft((d) => ({ ...d, table }))}
              options={tables.map((t) => ({ value: t, label: t }))}
              allLabel="Select Table"
            />
            <Field>
              <FieldLabel htmlFor="logRowId">Row Id</FieldLabel>
              <Input
                id="logRowId"
                inputMode="numeric"
                placeholder="Row Id"
                value={draft.rowId}
                onChange={(event) =>
                  setDraft((d) => ({ ...d, rowId: event.target.value.replace(/\D/g, "") }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="logUniqueKey">Unique Key</FieldLabel>
              <Input
                id="logUniqueKey"
                placeholder="Unique Key"
                value={draft.uniqueKey}
                onChange={(event) => setDraft((d) => ({ ...d, uniqueKey: event.target.value }))}
              />
            </Field>
            <FilterField
              label="Entity Status"
              value={draft.status}
              onChange={(status) => setDraft((d) => ({ ...d, status: status as Filters["status"] }))}
              options={logEntityStatuses.map((s) => ({ value: s, label: s }))}
              allLabel="All"
            />
            <Button type="submit">
              <SearchIcon data-icon="inline-start" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Show
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(0)
            }}
            className="h-8 rounded-md border bg-background px-2 text-foreground"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          entries
        </div>
        <div className="relative w-full sm:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(0)
            }}
            placeholder="Search object JSON"
            aria-label="Search object JSON"
            className="pl-8"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Table Name</TableHead>
              <TableHead>Row Id</TableHead>
              <TableHead>Unique Key</TableHead>
              <TableHead>Entity Status</TableHead>
              <TableHead>Object Json</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Create By</TableHead>
              <TableHead>Creation Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length ? (
              shown.map((log, index) => (
                <TableRow key={log.id}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {current * pageSize + index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{log.tableName}</TableCell>
                  <TableCell>{log.tableName}</TableCell>
                  <TableCell className="tabular-nums">{log.rowId}</TableCell>
                  <TableCell>{log.uniqueKey || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(log.entityStatus)}>{log.entityStatus}</Badge>
                  </TableCell>
                  <TableCell className="max-w-72">
                    {log.objectJson ? (
                      <div className="flex items-center gap-1">
                        <code className="truncate font-mono text-xs text-muted-foreground">
                          {log.objectJson}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                          onClick={() => setViewing(log)}
                        >
                          <EyeIcon />
                          <span className="sr-only">View object JSON</span>
                        </Button>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{log.remarks || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{log.createdBy}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums">
                    {logStamp(log.createdAt)}
                  </TableCell>
                  <TableCell>Active</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                  {logs.length
                    ? "No log found."
                    : "Nothing logged yet. Changes made in this session appear here."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {rows.length
            ? `Showing ${current * pageSize + 1} to ${current * pageSize + shown.length} of ${rows.length} entries`
            : "Showing 0 entries"}
          {rows.length !== logs.length && ` (filtered from ${logs.length} total entries)`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            Previous
          </Button>
          <span className="tabular-nums">
            {current + 1} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {viewing?.tableName} #{viewing?.rowId}
            </DialogTitle>
            <DialogDescription>
              {viewing && `${viewing.entityStatus} · ${viewing.createdBy} · ${logStamp(viewing.createdAt)}`}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
            {viewing?.objectJson && JSON.stringify(JSON.parse(viewing.objectJson), null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
