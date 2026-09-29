"use client"

import * as React from "react"
import { BanIcon, DownloadIcon, PrinterIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { FeeReceiptDialog } from "@/components/fees/fee-receipt-dialog"
import { dueStatusClass, fmtDate, useFeeScope } from "@/components/fees/fee-scope"
import { useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useCan } from "@/lib/access"
import { useCurrentUser } from "@/lib/current-user"
import { formatAmount, roundMoney } from "@/lib/fee-heads"
import { cancelPayment, onlineGateways, paymentMethods, useFeePayments, type FeePayment } from "@/lib/fee-payments"
import { downloadCsv } from "@/lib/sms-messages"
import { currentEnrolment, useStudents } from "@/lib/students"

const methods = [...new Set<string>([...paymentMethods, ...onlineGateways])]

// Fees › Receipts: every collection of the institute in a date range, by
// method, counter or online, with reprint; a valid receipt can be cancelled
// with a reason by those who collect fees (the dues it paid open again).
export function PaymentList() {
  const scope = useFeeScope()
  const { institute, institutes, canPick, param, setParam } = scope
  const payments = useFeePayments()
  const students = useStudents()
  const name = useStudentLookups()
  const can = useCan()
  const user = useCurrentUser()
  const studentOf = new Map(students.map((s) => [s.id, s]))
  const [query, setQuery] = React.useState("")
  const [receipt, setReceipt] = React.useState<FeePayment | null>(null)
  const [cancelling, setCancelling] = React.useState<FeePayment | null>(null)
  const [reason, setReason] = React.useState("")
  const canCancel = can("fee-collection.manage")

  const from = param("from")
  const to = param("to")
  const needle = query.trim().toLowerCase()
  const rows = payments
    .filter(
      (p) =>
        p.instituteId === institute?.id &&
        (!from || p.paidOn >= from) &&
        (!to || p.paidOn <= to) &&
        (!param("method") || p.method === param("method")) &&
        (!param("source") || p.source === param("source")) &&
        (!param("status") || p.status === param("status"))
    )
    .filter((p) => {
      if (!needle) return true
      const s = studentOf.get(p.studentId)
      return (
        p.receiptNo.toLowerCase().includes(needle) ||
        p.reference.toLowerCase().includes(needle) ||
        !!s?.name.toLowerCase().includes(needle) ||
        String(s?.studentIdentificationNo ?? "").includes(needle)
      )
    })
    .sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.id - a.id)
  const valid = rows.filter((p) => p.status === "Valid")
  const total = roundMoney(valid.reduce((s, p) => s + p.total, 0))
  const shown = rows.slice(0, 300)

  function exportCsv() {
    downloadCsv(
      "receipts.csv",
      ["Receipt", "Date", "Student ID", "Student", "Class", "Method", "Reference", "Source", "Amount", "Status", "Collected by"],
      rows.map((p) => {
        const s = studentOf.get(p.studentId)
        return [
          p.receiptNo,
          p.paidOn,
          s?.studentIdentificationNo ?? "",
          s?.name ?? "",
          s ? name("class", currentEnrolment(s)?.classId) : "",
          p.method,
          p.reference,
          p.source,
          p.total,
          p.status,
          p.createdBy,
        ]
      })
    )
  }

  function cancel() {
    if (!cancelling) return
    try {
      cancelPayment(cancelling.id, reason, user.name)
      toast.success(`Receipt ${cancelling.receiptNo} cancelled`, { description: "The dues it paid are open again." })
      setCancelling(null)
      setReason("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The receipt could not be cancelled.")
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Receipts</CardTitle>
          <CardDescription>Every fee collection, at the counter or online.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select an institute"
            />
          )}
          <Field>
            <FieldLabel htmlFor="receipts-from">From</FieldLabel>
            <Input id="receipts-from" type="date" value={from} onChange={(e) => setParam({ from: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="receipts-to">To</FieldLabel>
            <Input id="receipts-to" type="date" value={to} onChange={(e) => setParam({ to: e.target.value })} />
          </Field>
          <FilterField
            label="Method"
            value={param("method")}
            onChange={(v) => setParam({ method: v })}
            options={methods.map((m) => ({ value: m, label: m }))}
            allLabel="All methods"
          />
          <FilterField
            label="Source"
            value={param("source")}
            onChange={(v) => setParam({ source: v })}
            options={["Counter", "Online"].map((s) => ({ value: s, label: s }))}
            allLabel="Counter and online"
          />
          <FilterField
            label="Status"
            value={param("status")}
            onChange={(v) => setParam({ status: v })}
            options={["Valid", "Cancelled"].map((s) => ({ value: s, label: s }))}
            allLabel="All"
          />
          <Field>
            <FieldLabel htmlFor="receipts-search">Search</FieldLabel>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="receipts-search"
                className="pl-8"
                placeholder="Receipt, reference, student"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>
              {rows.length} receipt{rows.length === 1 ? "" : "s"}
            </CardTitle>
            <CardDescription>
              {formatAmount(total)} collected (cancelled receipts not counted)
              {rows.length > shown.length && ` · showing the latest ${shown.length}`}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <DownloadIcon data-icon="inline-start" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Collected by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.length ? (
                  shown.map((p) => {
                    const s = studentOf.get(p.studentId)
                    const e = s && currentEnrolment(s)
                    return (
                      <TableRow key={p.id} className={p.status === "Cancelled" ? "text-muted-foreground" : undefined}>
                        <TableCell className="font-mono text-xs">{p.receiptNo}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtDate(p.paidOn)}</TableCell>
                        <TableCell>
                          <span className="font-medium">{s?.name ?? "—"}</span>
                          <span className="block text-xs text-muted-foreground">
                            ID {s?.studentIdentificationNo} · {name("class", e?.classId)} {name("section", e?.sectionId)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {p.method}
                          {p.source === "Online" && (
                            <Badge variant="secondary" className="ml-1">
                              Online
                            </Badge>
                          )}
                          {p.reference && <span className="block font-mono text-xs text-muted-foreground">{p.reference}</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatAmount(p.total)}</TableCell>
                        <TableCell className="text-xs">{p.createdBy}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={p.status === "Cancelled" ? dueStatusClass.Overdue : dueStatusClass.Paid}>
                            {p.status}
                          </Badge>
                          {p.status === "Cancelled" && <span className="block text-xs">{p.cancelReason}</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button size="icon" variant="ghost" className="size-8" onClick={() => setReceipt(p)}>
                              <PrinterIcon />
                              <span className="sr-only">Print receipt</span>
                            </Button>
                            {canCancel && p.status === "Valid" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setCancelling(p)}
                              >
                                <BanIcon />
                                <span className="sr-only">Cancel receipt</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      {institute ? "No receipt matches these filters." : "Select an institute."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FeeReceiptDialog payment={receipt} onClose={() => setReceipt(null)} />
      <Dialog open={!!cancelling} onOpenChange={(open) => !open && setCancelling(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel receipt {cancelling?.receiptNo}?</DialogTitle>
            <DialogDescription>
              {cancelling && formatAmount(cancelling.total)} stops counting as collected and the dues it paid are
              open again. The receipt stays listed as cancelled.
              {cancelling?.source === "Online" && " Refund the money at the gateway separately."}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="receipt-cancel-reason">Reason</FieldLabel>
            <Textarea id="receipt-cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={cancel} disabled={!reason.trim()}>
              Cancel receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
