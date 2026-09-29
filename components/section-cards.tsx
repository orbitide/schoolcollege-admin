"use client"

import { BanknoteIcon, BuildingIcon, GraduationCapIcon, LoaderIcon } from "lucide-react"

import { StatCard, StatGrid } from "@/components/dashboard/stat-card"
import { formatTaka } from "@/lib/billing"
import { useBillOf, type InstituteBill } from "@/lib/institute-billing"
import type { Institute } from "@/lib/institutes"
import { useInstitutes } from "@/lib/institutes-store"

function getSummary(institutes: Institute[], billOf: (i: Institute) => InstituteBill) {
  const active = institutes.filter((i) => i.status === "Active")
  const trial = institutes.filter((i) => i.status === "Trial").length
  const suspended = institutes.filter((i) => i.status === "Suspended").length
  const month = new Date().toISOString().slice(0, 7)

  return {
    billing: active.reduce((sum, i) => sum + billOf(i).amount, 0),
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

// The platform dashboard's KPI row: billing and tenants across every
// institute.
export function SectionCards() {
  const summary = getSummary(useInstitutes(), useBillOf())

  return (
    <StatGrid>
      <StatCard
        label="This Month's Billing (est.)"
        value={formatTaka(summary.billing)}
        headline="At today's student counts"
        detail={`Across ${summary.paying} active institutes`}
        icon={<BanknoteIcon />}
        href="/subscriptions"
      />
      <StatCard
        label="Total Institutes"
        value={summary.total.toLocaleString()}
        headline={`${summary.newThisMonth} new this month`}
        detail={`${summary.trial} on trial, ${summary.suspended} suspended`}
        icon={<BuildingIcon />}
        href="/institutes"
      />
      <StatCard
        label="Total Students"
        value={summary.students.toLocaleString()}
        headline="Enrolled across all institutes"
        detail={`Plus ${summary.teachers.toLocaleString()} teachers`}
        icon={<GraduationCapIcon />}
      />
      <StatCard
        label="On Trial"
        value={`${summary.trialShare}%`}
        headline={`${summary.trial} institutes evaluating`}
        detail="Share of institutes still on a trial"
        icon={<LoaderIcon />}
        href="/institutes"
      />
    </StatGrid>
  )
}
