"use client"

import * as React from "react"
import { ReceiptTextIcon } from "lucide-react"

import { NoBillingInstitute, useBillingScope } from "@/components/billing/billing-shell"
import { PaymentReceiptDialog } from "@/components/billing/payment-receipt"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTaka, monthName } from "@/lib/billing"
import { formatDate } from "@/lib/institutes"
import { useInstitutes } from "@/lib/institutes-store"
import { useSaasInvoices } from "@/lib/saas-invoices"
import { saasPaymentMethods, useSaasPayments, type SaasPayment } from "@/lib/saas-payments"

// Billing › Payments: the institute's purchase history, or every payment
// the platform has received, newest first, each with its receipt.
export function BillingPayments() {
  const { platform, institute } = useBillingScope()
  if (platform) return <PaymentHistory />
  if (!institute) return <NoBillingInstitute />
  return <PaymentHistory key={institute.id} instituteId={institute.id} />
}

function PaymentHistory({ instituteId }: { instituteId?: number }) {
  const all = useSaasPayments()
  const invoices = useSaasInvoices()
  const institutes = useInstitutes()
  const [year, setYear] = React.useState("")
  const [method, setMethod] = React.useState("")
  const [institute, setInstitute] = React.useState("")
  const [receipt, setReceipt] = React.useState<SaasPayment | null>(null)
  const platform = instituteId == null

  const own = all.filter((p) => platform || p.instituteId === instituteId)
  const years = [...new Set(own.map((p) => p.paidAt.slice(0, 4)))].sort().reverse()
  const rows = own
    .filter(
      (p) =>
        (!year || p.paidAt.startsWith(year)) &&
        (!method || p.method === method) &&
        (!institute || String(p.instituteId) === institute)
    )
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt) || b.id - a.id)
  const total = rows.reduce((sum, p) => sum + p.amount, 0)
  const invoiceOf = (p: SaasPayment) => invoices.find((i) => i.id === p.invoiceId)
  const nameOf = (id: number) => institutes.find((i) => i.id === id)?.name ?? `Institute #${id}`

  const stats = [
    { title: "Total paid", value: formatTaka(total), note: year ? `In ${year}` : "All time" },
    { title: "Payments", value: rows.length.toLocaleString(), note: method || "Every method" },
    {
      title: "Last payment",
      value: rows[0] ? formatTaka(rows[0].amount) : "—",
      note: rows[0] ? formatDate(rows[0].paidAt) : "No payments yet",
    },
  ]

  return (
    <>
      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardDescription>{s.title}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{s.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{s.note}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:max-w-3xl">
        <FilterField
          label="Year"
          value={year}
          onChange={setYear}
          allLabel="All years"
          options={years.map((y) => ({ value: y, label: y }))}
        />
        <FilterField
          label="Method"
          value={method}
          onChange={setMethod}
          allLabel="All methods"
          options={saasPaymentMethods.map((m) => ({ value: m, label: m }))}
        />
        {platform && (
          <FilterField
            label="Institute"
            value={institute}
            onChange={setInstitute}
            allLabel="All institutes"
            options={[...new Set(own.map((p) => p.instituteId))]
              .map((id) => ({ value: String(id), label: nameOf(id) }))
              .sort((a, b) => a.label.localeCompare(b.label))}
          />
        )}
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Receipt</TableHead>
                <TableHead>Paid on</TableHead>
                {platform && <TableHead>Institute</TableHead>}
                <TableHead>For invoice</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Receipt</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((p) => {
                  const invoice = invoiceOf(p)
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="pl-4 font-mono text-xs">{p.receiptNo}</TableCell>
                      <TableCell>{formatDate(p.paidAt)}</TableCell>
                      {platform && <TableCell className="max-w-56 truncate">{nameOf(p.instituteId)}</TableCell>}
                      <TableCell>
                        {invoice ? (
                          <span className="grid">
                            <span>{invoice.invoiceNo}</span>
                            <span className="text-xs text-muted-foreground">{monthName(invoice.month)}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5">
                          {p.method}
                          {p.source === "Online" && <Badge variant="outline">Online</Badge>}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.reference || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatTaka(p.amount)}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setReceipt(p)}>
                          <ReceiptTextIcon data-icon="inline-start" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={platform ? 8 : 7} className="h-24 text-center text-muted-foreground">
                    {own.length ? "No payments match these filters." : "No payments yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-4" colSpan={platform ? 6 : 5}>
                    Total
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatTaka(total)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      <PaymentReceiptDialog payment={receipt} onClose={() => setReceipt(null)} />
    </>
  )
}
