"use client"

import Link from "next/link"

import { StatusBadge } from "@/components/institutes/status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatTaka, monthName, monthOf } from "@/lib/billing"
import { statuses } from "@/lib/institutes"
import { useInstitutes } from "@/lib/institutes-store"
import { invoiceState, useSaasInvoices } from "@/lib/saas-invoices"

// Last month's invoicing and what's still owed, and how the institutes
// split by status.
export function BillingCard() {
  const institutes = useInstitutes()
  const invoices = useSaasInvoices()
  const lastMonth = monthOf(-1)

  const billed = invoices.filter((i) => i.month === lastMonth && i.status !== "Void")
  const invoiced = billed.reduce((sum, i) => sum + i.amount, 0)
  const collected = billed.filter((i) => i.status === "Paid").reduce((sum, i) => sum + i.amount, 0)
  const unpaid = invoices.filter((i) => i.status === "Due")
  const overdue = unpaid.filter((i) => invoiceState(i) === "Overdue")
  const sum = (list: typeof invoices) => list.reduce((s, i) => s + i.amount, 0)
  const byStatus = statuses.map((status) => ({
    status,
    count: institutes.filter((i) => i.status === status).length,
  }))

  const rows = [
    { label: `Invoiced for ${monthName(lastMonth)}`, value: formatTaka(invoiced), note: `${billed.length} invoices` },
    {
      label: "Collected",
      value: formatTaka(collected),
      note: invoiced ? `${Math.round((collected * 100) / invoiced)}% of the month` : "",
    },
    { label: "Outstanding", value: formatTaka(sum(unpaid)), note: `${unpaid.length} unpaid` },
    { label: "Overdue", value: formatTaka(sum(overdue)), note: `${overdue.length} past due`, alert: overdue.length > 0 },
  ]

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>Monthly per-student invoices</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/subscriptions?tab=invoices">Invoices</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <dl className="grid gap-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="text-right">
                <span className={row.alert ? "font-semibold text-destructive tabular-nums" : "font-semibold tabular-nums"}>
                  {row.value}
                </span>
                {row.note && <span className="block text-xs text-muted-foreground">{row.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-2 border-t pt-4">
          <p className="text-sm font-medium">Institutes by status</p>
          <div className="flex flex-wrap gap-2">
            {byStatus.map((s) => (
              <div key={s.status} className="flex items-center gap-1.5">
                <StatusBadge status={s.status} />
                <span className="text-sm font-semibold tabular-nums">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
