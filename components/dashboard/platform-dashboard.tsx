"use client"

import { DataTable } from "@/components/data-table"
import { BillingCard } from "@/components/dashboard/billing-card"
import { NeedsAttentionCard } from "@/components/dashboard/needs-attention-card"
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card"
import { SmsUsageChart } from "@/components/dashboard/sms-usage-chart"
import { SectionCards } from "@/components/section-cards"

// The platform console's home: billing, SMS usage and the institutes that
// need the platform team, then every institute.
export function PlatformDashboard() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Platform dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Billing, growth and health across every institute on the platform.
        </p>
      </div>
      <SectionCards />
      <div className="grid gap-4 px-4 md:gap-6 lg:px-6 @5xl/main:grid-cols-3">
        <div className="@5xl/main:col-span-2">
          <SmsUsageChart />
        </div>
        <BillingCard />
      </div>
      <div className="grid gap-4 px-4 md:gap-6 lg:px-6 @3xl/main:grid-cols-2">
        <NeedsAttentionCard />
        <RecentActivityCard
          tables={["Institute", "Subscription", "SaasInvoice", "BillingSetting", "AdminUser", "UserInstitute"]}
          description="Institutes, billing and users changed in this session"
        />
      </div>
      <DataTable />
    </div>
  )
}
