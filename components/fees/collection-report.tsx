"use client"

import * as React from "react"
import { DownloadIcon, PrinterIcon } from "lucide-react"

import { fmtDate, useFeeScope } from "@/components/fees/fee-scope"
import { PrintArea } from "@/components/reports/print-area"
import { useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { feeHeadStore, formatAmount, roundMoney } from "@/lib/fee-heads"
import { useFeeInvoices } from "@/lib/fee-invoices"
import { onlineGateways, paymentMethods, useFeePayments, type FeePayment } from "@/lib/fee-payments"
import type { Institute } from "@/lib/institutes"
import { downloadCsv } from "@/lib/sms-messages"
import { currentEnrolment, useStudents, type Student } from "@/lib/students"
import { cn, parseInlineStyle } from "@/lib/utils"

const methods = [...new Set<string>([...paymentMethods, ...onlineGateways])]
const today = () => new Date().toISOString().slice(0, 10)

type Summary = { label: string; count: number; amount: number }

function summarize<T>(items: T[], key: (item: T) => string, amount: (item: T) => number, count?: (item: T) => string) {
  const map = new Map<string, { amount: number; ids: Set<string> }>()
  items.forEach((item, index) => {
    const k = key(item)
    const entry = map.get(k) ?? { amount: 0, ids: new Set<string>() }
    entry.amount = roundMoney(entry.amount + amount(item))
    entry.ids.add(count ? count(item) : String(index))
    map.set(k, entry)
  })
  return [...map].map<Summary>(([label, e]) => ({ label, count: e.ids.size, amount: e.amount }))
}

// Fees › Collection Report: what was collected in a date range (valid
// receipts only), day by day, by method and by fee head, then every
// receipt. Printed from this tab or exported as CSV.
export function CollectionReport() {
  const scope = useFeeScope()
  const { institute, institutes, canPick, param, setParam } = scope
  const payments = useFeePayments()
  const invoices = useFeeInvoices()
  const students = useStudents()
  const heads = feeHeadStore.useAll()
  const name = useStudentLookups()
  const from = param("from") || `${today().slice(0, 8)}01`
  const to = param("to") || today()
  const method = param("method")

  const rows = payments
    .filter(
      (p) =>
        p.instituteId === institute?.id &&
        p.status === "Valid" &&
        p.paidOn >= from &&
        p.paidOn <= to &&
        (!method || p.method === method)
    )
    .sort((a, b) => a.paidOn.localeCompare(b.paidOn) || a.id - b.id)
  const studentOf = new Map(students.map((s) => [s.id, s]))
  const headName = new Map(heads.map((h) => [h.id, h.name]))
  const lineHead = new Map(
    invoices.flatMap((i) => i.lines.map((l) => [`${i.id}|${l.id}`, l.feeHeadId] as const))
  )
  const allocations = rows.flatMap((p) => p.allocations.map((a) => ({ ...a, paymentId: p.id })))
  const total = roundMoney(rows.reduce((s, p) => s + p.total, 0))
  const byDay = summarize(rows, (p) => p.paidOn, (p) => p.total)
  const byMethod = summarize(rows, (p) => p.method, (p) => p.total).sort((a, b) => b.amount - a.amount)
  const byHead = summarize(
    allocations,
    (a) => headName.get(lineHead.get(`${a.invoiceId}|${a.lineId}`) ?? -1) ?? "—",
    (a) => a.amount,
    (a) => String(a.paymentId)
  ).sort((a, b) => b.amount - a.amount)

  function exportCsv() {
    downloadCsv(
      `fee-collection-${from}-to-${to}.csv`,
      ["SL", "Date", "Receipt", "Student ID", "Student", "Class", "Section", "Roll", "Method", "Reference", "Amount", "Collected by"],
      rows.map((p, i) => {
        const s = studentOf.get(p.studentId)
        const e = s && currentEnrolment(s)
        return [
          i + 1,
          p.paidOn,
          p.receiptNo,
          s?.studentIdentificationNo ?? "",
          s?.name ?? "",
          name("class", e?.classId),
          name("section", e?.sectionId),
          e?.classRoll ?? "",
          p.method,
          p.reference,
          p.total,
          p.createdBy,
        ]
      })
    )
  }

  const sheet = institute && rows.length > 0 && (
    <CollectionSheet
      institute={institute}
      from={from}
      to={to}
      method={method}
      rows={rows}
      total={total}
      byDay={byDay}
      byMethod={byMethod}
      byHead={byHead}
      studentOf={studentOf}
      name={name}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Collection Report</CardTitle>
          <CardDescription>Fees collected in a date range, by day, method and fee head.</CardDescription>
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
            <FieldLabel htmlFor="collection-from">From</FieldLabel>
            <Input id="collection-from" type="date" value={from} onChange={(e) => setParam({ from: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="collection-to">To</FieldLabel>
            <Input id="collection-to" type="date" value={to} onChange={(e) => setParam({ to: e.target.value })} />
          </Field>
          <FilterField
            label="Method"
            value={method}
            onChange={(v) => setParam({ method: v })}
            options={methods.map((m) => ({ value: m, label: m }))}
            allLabel="All methods"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>{formatAmount(total)} collected</CardTitle>
            <CardDescription>
              {rows.length} receipt{rows.length === 1 ? "" : "s"}, {fmtDate(from)} to {fmtDate(to)}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!sheet}>
              <DownloadIcon data-icon="inline-start" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!sheet}>
              <PrinterIcon data-icon="inline-start" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sheet ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="min-w-[40rem]">{sheet}</div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {institute ? "Nothing was collected in this range." : "Select an institute."}
            </p>
          )}
        </CardContent>
      </Card>
      {sheet && <PrintArea pageSize="A4 portrait">{sheet}</PrintArea>}
    </div>
  )
}

function CollectionSheet({
  institute,
  from,
  to,
  method,
  rows,
  total,
  byDay,
  byMethod,
  byHead,
  studentOf,
  name,
}: {
  institute: Institute
  from: string
  to: string
  method: string
  rows: FeePayment[]
  total: number
  byDay: Summary[]
  byMethod: Summary[]
  byHead: Summary[]
  studentOf: Map<number, Student>
  name: ReturnType<typeof useStudentLookups>
}) {
  const config = institute.configuration
  const td = "border border-black px-1.5 py-0.5"
  const summaryTable = (title: string, first: string, list: Summary[], countLabel = "Receipts") => (
    <table className="w-full border-collapse self-start text-xs">
      <caption className="pb-1 text-left font-bold">{title}</caption>
      <thead>
        <tr>
          <th className={cn(td, "text-left")}>{first}</th>
          <th className={cn(td, "w-16 text-right")}>{countLabel}</th>
          <th className={cn(td, "w-24 text-right")}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {list.map((s) => (
          <tr key={s.label}>
            <td className={td}>{first === "Date" ? fmtDate(s.label) : s.label}</td>
            <td className={cn(td, "text-right tabular-nums")}>{s.count}</td>
            <td className={cn(td, "text-right tabular-nums")}>{formatAmount(s.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div className="flex flex-col gap-4 bg-white font-serif text-sm text-black">
      <header className="flex flex-col items-center text-center">
        <h1 style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</h1>
        <p>{institute.address}</p>
        <h2 style={parseInlineStyle(config.reportNameStyle)}>Fee Collection Report</h2>
        <p>
          {fmtDate(from)} to {fmtDate(to)}
          {method && ` · ${method}`} · Total <strong>{formatAmount(total)}</strong>
        </p>
      </header>
      <div className="grid grid-cols-3 gap-4">
        {summaryTable("By date", "Date", byDay)}
        {summaryTable("By method", "Method", byMethod)}
        {summaryTable("By fee head", "Fee head", byHead)}
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={cn(td, "w-8")}>SL</th>
            <th className={td}>Date</th>
            <th className={td}>Receipt</th>
            <th className={cn(td, "text-left")}>Student</th>
            <th className={td}>Class</th>
            <th className={td}>Roll</th>
            <th className={td}>Method</th>
            <th className={cn(td, "text-right")}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const s = studentOf.get(p.studentId)
            const e = s && currentEnrolment(s)
            return (
              <tr key={p.id}>
                <td className={cn(td, "text-center")}>{i + 1}</td>
                <td className={cn(td, "whitespace-nowrap")}>{fmtDate(p.paidOn)}</td>
                <td className={cn(td, "font-mono")}>{p.receiptNo}</td>
                <td className={td}>
                  {s?.name ?? "—"} ({s?.studentIdentificationNo})
                </td>
                <td className={td}>
                  {name("class", e?.classId)} {name("section", e?.sectionId)}
                </td>
                <td className={cn(td, "text-center")}>{e?.classRoll}</td>
                <td className={td}>{p.method}</td>
                <td className={cn(td, "text-right tabular-nums")}>{formatAmount(p.total)}</td>
              </tr>
            )
          })}
          <tr>
            <td className={cn(td, "text-right font-bold")} colSpan={7}>
              Total
            </td>
            <td className={cn(td, "text-right font-bold tabular-nums")}>{formatAmount(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
