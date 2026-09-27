"use client"

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { monthlyRevenue, type Institute } from "@/lib/institutes"
import { useInstitutes } from "@/lib/institutes-store"

function getSummary(institutes: Institute[]) {
  const active = institutes.filter((i) => i.status === "Active")
  const trial = institutes.filter((i) => i.status === "Trial").length
  const suspended = institutes.filter((i) => i.status === "Suspended").length
  const month = new Date().toISOString().slice(0, 7)

  return {
    mrr: Math.round(active.reduce((sum, i) => sum + monthlyRevenue(i), 0)),
    paying: active.length,
    total: institutes.length,
    newThisMonth: institutes.filter((i) => i.joinedAt.startsWith(month)).length,
    trial,
    suspended,
    students: institutes.reduce((sum, i) => sum + i.students, 0),
    teachers: institutes.reduce((sum, i) => sum + i.teachers, 0),
    trialShare: institutes.length
      ? Math.round((trial / institutes.length) * 100)
      : 0,
  }
}

export function SectionCards() {
  const summary = getSummary(useInstitutes())

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <SummaryCard
        label="Monthly Recurring Revenue"
        value={`$${summary.mrr.toLocaleString()}`}
        headline="From active subscriptions"
        detail={`Across ${summary.paying} paying institutes`}
      />
      <SummaryCard
        label="Total Institutes"
        value={summary.total.toLocaleString()}
        headline={`${summary.newThisMonth} new this month`}
        detail={`${summary.trial} on trial, ${summary.suspended} suspended`}
      />
      <SummaryCard
        label="Total Students"
        value={summary.students.toLocaleString()}
        headline="Enrolled across all institutes"
        detail={`Plus ${summary.teachers.toLocaleString()} teachers`}
      />
      <SummaryCard
        label="On Trial"
        value={`${summary.trialShare}%`}
        headline={`${summary.trial} institutes evaluating`}
        detail="Share of institutes still on a trial"
      />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  headline,
  detail,
}: {
  label: string
  value: string
  headline: string
  detail: string
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 font-medium">{headline}</div>
        <div className="text-muted-foreground">{detail}</div>
      </CardFooter>
    </Card>
  )
}
