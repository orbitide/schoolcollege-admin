"use client"

import { DataTable } from "@/components/data-table"
import { InstitutesGrowthChart } from "@/components/dashboard/institutes-growth-chart"
import { NeedsAttentionCard } from "@/components/dashboard/needs-attention-card"
import { PlanStatusCard } from "@/components/dashboard/plan-status-card"
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card"
import { SectionCards } from "@/components/section-cards"

// The platform console's home: revenue, tenant growth and the institutes
// that need the platform team, then every institute.
export function PlatformDashboard() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Platform dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Revenue, growth and health across every institute on the platform.
        </p>
      </div>
      <SectionCards />
      <div className="grid gap-4 px-4 md:gap-6 lg:px-6 @5xl/main:grid-cols-3">
        <div className="@5xl/main:col-span-2">
          <InstitutesGrowthChart />
        </div>
        <PlanStatusCard />
      </div>
      <div className="grid gap-4 px-4 md:gap-6 lg:px-6 @3xl/main:grid-cols-2">
        <NeedsAttentionCard />
        <RecentActivityCard
          tables={["Institute", "UserInstitute"]}
          description="Institutes and user access changed in this session"
        />
      </div>
      <DataTable />
    </div>
  )
}
