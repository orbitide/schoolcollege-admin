"use client"

import * as React from "react"
import Link from "next/link"
import { BanIcon, DownloadIcon, PlusIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { dueStatusClass, FeeScopeFields, fmtDate, useFeeScope } from "@/components/fees/fee-scope"
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
import { feeHeadStore, formatAmount, roundMoney } from "@/lib/fee-heads"
import { monthLabel, type FeeInvoice } from "@/lib/fee-invoices"
import { cancelFeeInvoice, useFeeLedger, type DueStatus } from "@/lib/fee-payments"
import { downloadCsv } from "@/lib/sms-messages"
import { useStudents } from "@/lib/students"

const statuses: DueStatus[] = ["Unpaid", "Overdue", "Partial", "Paid", "Cancelled"]

// Fees › Manage Dues: every invoice generated, by institute, year, class,
// section, month and status, with what is paid and still due. An invoice
// nothing has been paid on can be cancelled (with a reason) by those who
// may generate dues.
export function InvoiceList() {
  const scope = useFeeScope()
  const { institute, year, academicClass, section, param, setParam } = scope
  const ledger = useFeeLedger()
  const students = useStudents()
  const name = useStudentLookups()
  const can = useCan()
  const user = useCurrentUser()
  const heads = feeHeadStore.useAll()
  const headName = new Map(heads.map((h) => [h.id, h.name]))
  const studentOf = new Map(students.map((s) => [s.id, s]))
  const [query, setQuery] = React.useState("")
  const [cancelling, setCancelling] = React.useState<FeeInvoice | null>(null)
  const [reason, setReason] = React.useState("")
  const canCancel = can("fee-generate.manage")

  const month = param("month")
  const status = param("status") as DueStatus | ""
  const needle = query.trim().toLowerCase()
  const months = [...new Set(ledger.invoices.filter((i) => i.instituteId === institute?.id).map((i) => i.month))].sort().reverse()

  const rows = ledger.invoices
    .filter(
      (i) =>
        i.instituteId === institute?.id &&
        (!year || i.yearId === year.id) &&
        (!academicClass || i.classId === academicClass.id) &&
        (!section || i.sectionId === section.id) &&
        (!month || i.month === month)
    )
    .map((invoice) => ({ invoice, balance: ledger.balanceOf(invoice), student: studentOf.get(invoice.studentId) }))
    .filter(
      (r) =>
        (!status || r.balance.status === status) &&
        (!needle ||
          r.invoice.invoiceNo.toLowerCase().includes(needle) ||
          r.student?.name.toLowerCase().includes(needle) ||
          String(r.student?.studentIdentificationNo ?? "").includes(needle))
    )
    .sort((a, b) => b.invoice.month.localeCompare(a.invoice.month) || a.invoice.id - b.invoice.id)

  const live = rows.filter((r) => r.balance.status !== "Cancelled")
  const totals = {
    payable: roundMoney(live.reduce((s, r) => s + r.balance.payable, 0)),
    paid: roundMoney(live.reduce((s, r) => s + r.balance.paid, 0)),
    due: roundMoney(live.reduce((s, r) => s + r.balance.due, 0)),
  }
  const shown = rows.slice(0, 300)

  function exportCsv() {
    downloadCsv(
      `dues${month ? `-${month}` : ""}.csv`,
      ["Invoice", "Month", "Student ID", "Student", "Class", "Section", "Roll", "Payable", "Paid", "Due", "Status", "Due date"],
      rows.map((r) => {
        const e = r.student?.enrolments.find((en) => en.yearId === r.invoice.yearId)
        return [
          r.invoice.invoiceNo,
          monthLabel(r.invoice.month),
          r.student?.studentIdentificationNo ?? "",
          r.student?.name ?? "",
          name("class", r.invoice.classId),
          name("section", r.invoice.sectionId),
          e?.classRoll ?? "",
          r.balance.payable,
          r.balance.paid,
          r.balance.due,
          r.balance.status,
          r.invoice.dueDate,
        ]
      })
    )
  }

  function cancel() {
    if (!cancelling) return
    try {
      cancelFeeInvoice(cancelling.id, reason, user.name)
      toast.success(`Invoice ${cancelling.invoiceNo} cancelled`)
      setCancelling(null)
      setReason("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The invoice could not be cancelled.")
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Manage Dues</CardTitle>
            <CardDescription>Every invoice generated, with what is paid and still due.</CardDescription>
          </div>
          {can("fee-generate.manage") && (
            <Button asChild size="sm">
              <Link href="/fees/generate">
                <PlusIcon data-icon="inline-start" />
                Generate dues
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeeScopeFields scope={scope} />
          <FilterField
            label="Month"
            value={month}
            onChange={(v) => setParam({ month: v })}
            options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
            allLabel="All months"
            disabled={!institute}
          />
          <FilterField
            label="Status"
            value={status}
            onChange={(v) => setParam({ status: v })}
            options={statuses.map((s) => ({ value: s, label: s }))}
            allLabel="All statuses"
          />
          <Field>
            <FieldLabel htmlFor="dues-search">Search</FieldLabel>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="dues-search"
                className="pl-8"
                placeholder="Invoice, student or ID"
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
              {rows.length} invoice{rows.length === 1 ? "" : "s"}
            </CardTitle>
            <CardDescription>
              Payable {formatAmount(totals.payable)} · collected {formatAmount(totals.paid)} · due{" "}
              <strong className="text-foreground">{formatAmount(totals.due)}</strong>
              {rows.length > shown.length && ` · showing the first ${shown.length}`}
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
                  <TableHead>Invoice</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead className="text-right">Payable</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Status</TableHead>
                  {canCancel && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.length ? (
                  shown.map(({ invoice, balance, student }) => (
                    <TableRow key={invoice.id} className={balance.status === "Cancelled" ? "text-muted-foreground" : undefined}>
                      <TableCell className="font-mono text-xs">
                        {invoice.invoiceNo}
                        <span className="block font-sans text-muted-foreground">Due {fmtDate(invoice.dueDate)}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{monthLabel(invoice.month)}</TableCell>
                      <TableCell>
                        {student ? (
                          <Link
                            className="font-medium underline-offset-4 hover:underline"
                            href={`/fees/collect?institute=${invoice.instituteId}&student=${student.id}`}
                          >
                            {student.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                        <span className="block text-xs text-muted-foreground">ID {student?.studentIdentificationNo}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {name("class", invoice.classId)} {name("section", invoice.sectionId)}
                      </TableCell>
                      <TableCell className="max-w-64 text-xs">
                        {invoice.lines.map((l) => headName.get(l.feeHeadId)).join(", ")}
                        {invoice.status === "Cancelled" && (
                          <span className="block text-destructive">Cancelled: {invoice.cancelReason}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatAmount(balance.payable)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatAmount(balance.paid)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatAmount(balance.due)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={dueStatusClass[balance.status]}>
                          {balance.status}
                        </Badge>
                      </TableCell>
                      {canCancel && (
                        <TableCell>
                          {invoice.status === "Issued" && balance.paid === 0 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setCancelling(invoice)}
                            >
                              <BanIcon />
                              <span className="sr-only">Cancel invoice</span>
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canCancel ? 10 : 9} className="h-24 text-center text-muted-foreground">
                      {institute ? "No invoice matches these filters." : "Select an institute."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!cancelling} onOpenChange={(open) => !open && setCancelling(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel invoice {cancelling?.invoiceNo}?</DialogTitle>
            <DialogDescription>
              Its lines stop being due and can be billed again by Generate Dues. The invoice stays listed as
              cancelled.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="invoice-cancel-reason">Reason</FieldLabel>
            <Textarea id="invoice-cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={cancel} disabled={!reason.trim()}>
              Cancel invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
