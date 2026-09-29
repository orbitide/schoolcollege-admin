"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { WalletIcon } from "lucide-react"

import { BillingProfileCard } from "@/components/billing/billing-profile-card"
import { NoBillingInstitute, useBillingScope } from "@/components/billing/billing-shell"
import { PlatformOverview } from "@/components/billing/platform-billing"
import { StatusBadge } from "@/components/institutes/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { permissionCode, useCan } from "@/lib/access"
import { formatTaka, useBillingSettings } from "@/lib/billing"
import { useBillOf, useOutstanding } from "@/lib/institute-billing"
import { formatDate, type Institute } from "@/lib/institutes"
import { useSaasPayments } from "@/lib/saas-payments"
import { useSubscription } from "@/lib/subscriptions"

export const BILLING_RESOURCE = "institute-billing"

// Billing › Overview: the platform's totals, or the institute's plan and
// what it owes and has paid.
export function BillingOverview() {
  const { platform, institute } = useBillingScope()
  if (platform) return <PlatformOverview />
  if (!institute) return <NoBillingInstitute />
  return <InstituteOverview key={institute.id} institute={institute} />
}

function InstituteOverview({ institute }: { institute: Institute }) {
  const subscription = useSubscription(institute.id)
  const settings = useBillingSettings()
  const bill = useBillOf()(institute)
  const owed = useOutstanding().get(institute.id)
  const payments = useSaasPayments().filter((p) => p.instituteId === institute.id)
  const can = useCan()
  const canManage = can(permissionCode(BILLING_RESOURCE, "Manage"))
  const search = useSearchParams().toString()
  const tab = (path: string) => (search ? `${path}?${search}` : path)

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const last = payments.reduce<(typeof payments)[number] | undefined>(
    (latest, p) => (!latest || p.paidAt > latest.paidAt ? p : latest),
    undefined
  )

  const facts = [
    { label: "Status", value: <StatusBadge status={institute.status} /> },
    { label: "Plan", value: "All features" },
    ...(subscription ? [{ label: "Subscribed since", value: formatDate(subscription.startedAt) }] : []),
    ...(institute.status === "Trial" && subscription?.trialEndsAt
      ? [{ label: "Trial ends", value: formatDate(subscription.trialEndsAt) }]
      : []),
    { label: `Rate under ${settings.threshold.toLocaleString()} students`, value: formatTaka(bill.rates.lowerRate) },
    { label: `Rate at ${settings.threshold.toLocaleString()}+ students`, value: formatTaka(bill.rates.upperRate) },
  ]

  return (
    <>
      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card className="@xl/main:row-span-2 @5xl/main:row-span-1">
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Charged per active student each month</CardDescription>
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
            <CardDescription>This month (est.)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {institute.status === "Active" ? formatTaka(bill.amount) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {institute.status === "Active"
              ? `${bill.students.toLocaleString()} students × ${formatTaka(bill.rate)}, if the month closed today`
              : institute.status === "Trial"
                ? "Free while on trial"
                : `Not billed while ${institute.status.toLowerCase()}`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className={owed?.overdue ? "text-3xl tabular-nums text-destructive" : "text-3xl tabular-nums"}>
              {formatTaka(owed ? owed.due + owed.overdue : 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {owed?.overdue
              ? `${formatTaka(owed.overdue)} overdue, please pay now`
              : owed
                ? `${owed.dueCount} invoice${owed.dueCount === 1 ? "" : "s"} due, none overdue`
                : "Nothing owed"}
          </CardContent>
          {owed && canManage && (
            <CardFooter>
              <Button asChild size="sm">
                <Link href={tab("/billing/invoices")}>
                  <WalletIcon data-icon="inline-start" />
                  Pay now
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total paid</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{formatTaka(totalPaid)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {last
              ? `Last paid ${formatTaka(last.amount)} on ${formatDate(last.paidAt)}`
              : "No payments yet"}
          </CardContent>
          {last && (
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <Link href={tab("/billing/payments")}>Payment history</Link>
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      <BillingProfileCard institute={institute} editable={canManage} />
      <p className="text-xs text-muted-foreground">
        Questions about a bill?{" "}
        <Link href="/support/new" className="underline underline-offset-2">
          Raise a support ticket
        </Link>
        .
      </p>
    </>
  )
}
