"use client"

import { StatusBadge } from "@/components/institutes/status-badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { monthlyRevenue, plans, statuses } from "@/lib/institutes"
import { useInstitutes } from "@/lib/institutes-store"

// Where the recurring revenue comes from (active institutes by plan) and
// how the institutes split by status.
export function PlanStatusCard() {
  const institutes = useInstitutes()
  const byPlan = plans.map((plan) => {
    const active = institutes.filter((i) => i.plan === plan && i.status === "Active")
    return {
      plan,
      institutes: active.length,
      mrr: Math.round(active.reduce((sum, i) => sum + monthlyRevenue(i), 0)),
    }
  })
  const maxMrr = Math.max(1, ...byPlan.map((p) => p.mrr))
  const byStatus = statuses.map((status) => ({
    status,
    count: institutes.filter((i) => i.status === status).length,
  }))

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Revenue by plan</CardTitle>
        <CardDescription>Monthly recurring revenue from active institutes</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ul className="flex flex-col gap-4">
          {byPlan.map((p) => (
            <li key={p.plan} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{p.plan}</span>
                <span className="tabular-nums">
                  ${p.mrr.toLocaleString()}
                  <span className="text-muted-foreground"> · {p.institutes} institutes</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]"
                  style={{ width: `${(p.mrr / maxMrr) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
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
