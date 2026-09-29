"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTaka, monthOf, useBillingSettings, usePlatformBillingInfo } from "@/lib/billing"
import { useBillOf, useOutstanding } from "@/lib/institute-billing"
import { useInstitutes } from "@/lib/institutes-store"
import { useSaasPayments } from "@/lib/saas-payments"

// Billing › Overview for platform admins: what institutes bring in and owe,
// and who bills them. Invoices and payments have their own tabs; rates and
// trials per institute stay on Subscriptions.
export function PlatformOverview() {
  const institutes = useInstitutes()
  const billOf = useBillOf()
  const outstanding = useOutstanding()
  const payments = useSaasPayments()
  const settings = useBillingSettings()
  const from = usePlatformBillingInfo()

  const totals = React.useMemo(() => {
    const active = institutes.filter((i) => i.status === "Active")
    const estimate = active.reduce((sum, i) => sum + billOf(i).amount, 0)
    let due = 0
    let overdue = 0
    let overdueInstitutes = 0
    for (const t of outstanding.values()) {
      due += t.due
      overdue += t.overdue
      if (t.overdue) overdueInstitutes++
    }
    const thisMonth = monthOf(0)
    const paid = payments.filter((p) => p.paidAt.startsWith(thisMonth))
    return {
      active: active.length,
      estimate,
      owed: due + overdue,
      owingInstitutes: outstanding.size,
      overdue,
      overdueInstitutes,
      collected: paid.reduce((sum, p) => sum + p.amount, 0),
      collectedCount: paid.length,
    }
  }, [institutes, billOf, outstanding, payments])

  const stats = [
    {
      title: "This month (est.)",
      value: formatTaka(totals.estimate),
      note: `${totals.active} active institutes, if the month closed today`,
    },
    {
      title: "Collected this month",
      value: formatTaka(totals.collected),
      note: `${totals.collectedCount} payments received`,
    },
    {
      title: "Outstanding",
      value: formatTaka(totals.owed),
      note: totals.owingInstitutes ? `${totals.owingInstitutes} institutes owe` : "Nothing owed",
    },
    {
      title: "Overdue",
      value: formatTaka(totals.overdue),
      note: totals.overdueInstitutes ? `${totals.overdueInstitutes} institutes past due` : "Nothing overdue",
      alert: totals.overdue > 0,
    },
  ]

  return (
    <>
      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardDescription>{s.title}</CardDescription>
              <CardTitle className={s.alert ? "text-3xl tabular-nums text-destructive" : "text-3xl tabular-nums"}>
                {s.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{s.note}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:gap-6 @4xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Billing details</CardTitle>
            <CardDescription>&ldquo;From&rdquo; on every new invoice</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-0.5 text-sm">
            <span className="font-medium">{from.companyName}</span>
            <span className="text-muted-foreground">{from.address}</span>
            <span className="text-muted-foreground">
              {[from.email, from.phone, from.bin && `BIN ${from.bin}`].filter(Boolean).join(" · ")}
            </span>
          </CardContent>
          <CardFooter className="border-t">
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/billing">Edit billing details</Link>
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Default rates; an institute may have its own on Subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Under {settings.threshold.toLocaleString()} students</dt>
                <dd className="tabular-nums">{formatTaka(settings.lowerRate)} / student</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{settings.threshold.toLocaleString()}+ students</dt>
                <dd className="tabular-nums">{formatTaka(settings.upperRate)} / student</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Invoice due after</dt>
                <dd>{settings.invoiceDueDays} days</dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter className="flex gap-2 border-t">
            <Button asChild variant="outline" size="sm">
              <Link href="/plans">Edit pricing</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/subscriptions">Subscriptions</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
