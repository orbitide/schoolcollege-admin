"use client"

import * as React from "react"
import { EyeIcon, InfoIcon, SearchIcon } from "lucide-react"

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
import { logTables, useCommonLogs, type CommonLog } from "@/lib/common-log"

const actions = ["Saved", "Deleted", "Permanently deleted"] as const
type Action = (typeof actions)[number]
const PAGE = 50

const actionOf = (log: CommonLog): Action =>
  log.entityStatus === "Permanent Delete" ? "Permanently deleted" : log.entityStatus === "Deleted" ? "Deleted" : "Saved"

const pad = (n: number) => String(n).padStart(2, "0")
function stamp(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
const localDate = (iso: string) => stamp(iso).slice(0, 10)

// The record a log row is about: its name or key when saved, else its id.
function recordOf(log: CommonLog) {
  if (log.uniqueKey) return log.uniqueKey
  try {
    const row = JSON.parse(log.objectJson) as { name?: unknown; subject?: unknown }
    if (typeof row.name === "string" && row.name) return row.name
    if (typeof row.subject === "string" && row.subject) return row.subject
  } catch {}
  return `#${log.rowId}`
}

// Every change any user made, across all institutes and the platform's
// own records (pricing, subscriptions, invoices, users, tickets), from the
// Common Log, filterable by who, what and when.
export function AuditLogList() {
  const logs = useCommonLogs()
  const [user, setUser] = React.useState("")
  const [table, setTable] = React.useState("")
  const [action, setAction] = React.useState("")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [shown, setShown] = React.useState(PAGE)
  const [viewing, setViewing] = React.useState<CommonLog | null>(null)

  const users = [...new Set(logs.map((l) => l.createdBy))].sort()
  const query = search.trim().toLowerCase()
  const rows = logs.filter((l) => {
    const day = localDate(l.createdAt)
    return (
      (!user || l.createdBy === user) &&
      (!table || l.tableName === table) &&
      (!action || actionOf(l) === action) &&
      (!from || day >= from) &&
      (!to || day <= to) &&
      (!query || recordOf(l).toLowerCase().includes(query) || l.objectJson.toLowerCase().includes(query))
    )
  })

  function filter<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setShown(PAGE)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Audit logs</h2>
        <p className="text-sm text-muted-foreground">Who changed what, and when, across the whole platform.</p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        Until the audit API exists, this lists the changes made in this browser session, from the same log as Common
        Log.
      </div>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterField
            label="User"
            value={user}
            onChange={filter(setUser)}
            allLabel="All users"
            options={users.map((u) => ({ value: u, label: u }))}
          />
          <FilterField
            label="Record type"
            value={table}
            onChange={filter(setTable)}
            allLabel="All types"
            options={logTables().map((t) => ({ value: t, label: t }))}
          />
          <FilterField
            label="Action"
            value={action}
            onChange={filter(setAction)}
            allLabel="All actions"
            options={actions.map((a) => ({ value: a, label: a }))}
          />
          <Field>
            <FieldLabel htmlFor="audit-from">From</FieldLabel>
            <Input id="audit-from" type="date" value={from} max={to || undefined} onChange={(e) => filter(setFrom)(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="audit-to">To</FieldLabel>
            <Input id="audit-to" type="date" value={to} min={from || undefined} onChange={(e) => filter(setTo)(e.target.value)} />
          </Field>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Search</span>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Record or saved data"
                value={search}
                onChange={(e) => filter(setSearch)(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Record type</TableHead>
              <TableHead>Record</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {logs.length ? "No changes match your filters." : "No changes yet in this session."}
                </TableCell>
              </TableRow>
            ) : (
              rows.slice(0, shown).map((log) => {
                const act = actionOf(log)
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{stamp(log.createdAt)}</TableCell>
                    <TableCell className="font-medium">{log.createdBy}</TableCell>
                    <TableCell>
                      <Badge variant={act === "Saved" ? "secondary" : "destructive"}>{act}</Badge>
                    </TableCell>
                    <TableCell>{log.tableName}</TableCell>
                    <TableCell className="max-w-80 truncate">{recordOf(log)}</TableCell>
                    <TableCell>
                      {log.objectJson && (
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => setViewing(log)}>
                          <EyeIcon />
                          <span className="sr-only">View saved data</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      {rows.length > shown && (
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          Showing {shown} of {rows.length}
          <Button variant="outline" size="sm" onClick={() => setShown((n) => n + PAGE)}>
            Show more
          </Button>
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {viewing?.tableName} {viewing && recordOf(viewing)}
            </DialogTitle>
            <DialogDescription>
              {viewing && `${actionOf(viewing)} by ${viewing.createdBy} · ${stamp(viewing.createdAt)}`}
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
