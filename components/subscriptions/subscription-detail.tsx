"use client"

import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { BillingProfileCard } from "@/components/billing/billing-profile-card"
import { StatusBadge } from "@/components/institutes/status-badge"
import { InvoiceList } from "@/components/subscriptions/invoice-list"
import { SubscriptionActions } from "@/components/subscriptions/subscription-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatTaka, useBillingSettings } from "@/lib/billing"
import { useBillOf, useOutstanding } from "@/lib/institute-billing"
import { formatDate } from "@/lib/institutes"
import { useInstitute } from "@/lib/institutes-store"
import { useSubscription } from "@/lib/subscriptions"

// One institute's subscription: its rates and trial, this month's estimate,
// what it owes, and every invoice issued to it.
export function SubscriptionDetail({ instituteId }: { instituteId: number }) {
  const institute = useInstitute(instituteId)
  const subscription = useSubscription(instituteId)
  const settings = useBillingSettings()
  const billOf = useBillOf()
  const owed = useOutstanding().get(instituteId)

  if (!institute || !subscription) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Subscription not found</h2>
        <p className="text-sm text-muted-foreground">The institute may have been deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/subscriptions">Back to subscriptions</Link>
        </Button>
      </div>
    )
  }

  const bill = billOf(institute)
  const facts = [
    { label: "Status", value: <StatusBadge status={institute.status} /> },
    { label: "Subscribed since", value: formatDate(subscription.startedAt) },
    ...(institute.status === "Trial"
      ? [{ label: "Trial ends", value: subscription.trialEndsAt ? formatDate(subscription.trialEndsAt) : "Not set" }]
      : []),
    {
      label: `Lower rate (under ${settings.threshold.toLocaleString()})`,
      value: (
        <>
          {formatTaka(bill.rates.lowerRate)}{" "}
          {subscription.customLowerRate != null && <Badge variant="outline">Custom</Badge>}
        </>
      ),
    },
    {
      label: `Upper rate (${settings.threshold.toLocaleString()}+)`,
      value: (
        <>
          {formatTaka(bill.rates.upperRate)}{" "}
          {subscription.customUpperRate != null && <Badge variant="outline">Custom</Badge>}
        </>
      ),
    },
    ...(subscription.notes ? [{ label: "Notes", value: subscription.notes }] : []),
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="link" className="h-auto px-0 text-muted-foreground">
            <Link href="/subscriptions">
              <ArrowLeftIcon data-icon="inline-start" />
              Subscriptions
            </Link>
          </Button>
          <h2 className="text-2xl font-semibold tracking-tight">
            <Link href={`/institutes/${institute.id}`} className="hover:underline">
              {institute.name}
            </Link>
          </h2>
        </div>
        <SubscriptionActions institute={institute} subscription={subscription} showOpen={false} />
      </div>

      <div className="grid gap-4 md:gap-6 @4xl/main:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>All features plan</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              {facts.map((f) => (
                <div key={f.label} className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="text-right">{f.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>This month (est.)</CardTitle>
            <CardDescription>If the month closed today</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1">
            <span className="text-3xl font-semibold tabular-nums">
              {institute.status === "Active" ? formatTaka(bill.amount) : "—"}
            </span>
            <span className="text-sm text-muted-foreground">
              {institute.status === "Active"
                ? `${bill.students.toLocaleString()} students × ${formatTaka(bill.rate)}`
                : `Not billed while ${institute.status.toLowerCase()}`}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Outstanding</CardTitle>
            <CardDescription>Unpaid invoices</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1">
            <span className="text-3xl font-semibold tabular-nums">
              {formatTaka(owed ? owed.due + owed.overdue : 0)}
            </span>
            <span className={owed?.overdue ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
              {owed?.overdue
                ? `${formatTaka(owed.overdue)} overdue`
                : owed
                  ? `${owed.dueCount} due, none overdue`
                  : "Nothing owed"}
            </span>
          </CardContent>
        </Card>
      </div>

      <BillingProfileCard institute={institute} editable />

      <div className="grid gap-3">
        <h3 className="text-lg font-semibold">Invoices</h3>
        <InvoiceList instituteId={institute.id} />
      </div>
    </div>
  )
}
