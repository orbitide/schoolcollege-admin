"use client"

import * as React from "react"
import Link from "next/link"
import { SearchIcon } from "lucide-react"

import { StatusBadge } from "@/components/institutes/status-badge"
import { InvoiceStateBadge } from "@/components/subscriptions/invoice-state-badge"
import { SubscriptionActions } from "@/components/subscriptions/subscription-actions"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTaka, monthName } from "@/lib/billing"
import { latestInvoices, useBillOf, useOutstanding } from "@/lib/institute-billing"
import { formatDate, statuses } from "@/lib/institutes"
import { useInstitutes } from "@/lib/institutes-store"
import { invoiceState, useSaasInvoices } from "@/lib/saas-invoices"
import { useSubscriptions } from "@/lib/subscriptions"

const rateFilters = [
  { value: "custom", label: "Custom rates" },
  { value: "default", label: "Default rates" },
]

// Every institute's subscription: its status, what it would be billed this
// month, its latest invoice and what it still owes.
export function SubscriptionList() {
  const institutes = useInstitutes()
  const subscriptions = useSubscriptions()
  const billOf = useBillOf()
  const outstanding = useOutstanding()
  const latest = latestInvoices(useSaasInvoices())
  const [status, setStatus] = React.useState("")
  const [rates, setRates] = React.useState("")
  const [search, setSearch] = React.useState("")

  const rows = institutes
    .flatMap((institute) => {
      const subscription = subscriptions.find((s) => s.instituteId === institute.id)
      return subscription ? [{ institute, subscription, bill: billOf(institute) }] : []
    })
    .filter(
      ({ institute, bill }) =>
        (!status || institute.status === status) &&
        (!rates || bill.rates.custom === (rates === "custom")) &&
        (!search.trim() || institute.name.toLowerCase().includes(search.trim().toLowerCase()))
    )
    .sort((a, b) => a.institute.name.localeCompare(b.institute.name))

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FilterField
            label="Status"
            value={status}
            onChange={setStatus}
            allLabel="All statuses"
            options={statuses.map((s) => ({ value: s, label: s }))}
          />
          <FilterField label="Rates" value={rates} onChange={setRates} allLabel="All rates" options={rateFilters} />
          <div className="grid gap-2">
            <span className="text-sm font-medium">Search</span>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Institute name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
              <TableHead>Institute</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Active students</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">This month (est.)</TableHead>
              <TableHead>Last invoice</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No subscriptions match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ institute, subscription, bill }) => {
                const last = latest.get(institute.id)
                const owed = outstanding.get(institute.id)
                return (
                  <TableRow key={institute.id}>
                    <TableCell>
                      <Link href={`/subscriptions/${institute.id}`} className="font-medium hover:underline">
                        {institute.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        Since {formatDate(subscription.startedAt)}
                        {institute.status === "Trial" && subscription.trialEndsAt &&
                          ` · trial ends ${formatDate(subscription.trialEndsAt)}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={institute.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{bill.students.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {bill.rates.custom && (
                        <Badge variant="outline" className="mr-1.5">
                          Custom
                        </Badge>
                      )}
                      {formatTaka(bill.rate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {institute.status === "Active" ? formatTaka(bill.amount) : "—"}
                    </TableCell>
                    <TableCell>
                      {last ? (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="text-sm">{monthName(last.month)}</span>
                          <InvoiceStateBadge state={invoiceState(last)} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">None yet</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {owed ? (
                        <span className={owed.overdue ? "font-medium text-destructive" : undefined}>
                          {formatTaka(owed.due + owed.overdue)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <SubscriptionActions institute={institute} subscription={subscription} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
