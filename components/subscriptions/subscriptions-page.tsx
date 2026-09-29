"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { InvoiceList } from "@/components/subscriptions/invoice-list"
import { SubscriptionList } from "@/components/subscriptions/subscription-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const tabs = ["subscriptions", "invoices"] as const

// Institutes' subscriptions and the platform's invoices to them; the tab
// is kept in ?tab= so the dashboard can link straight to invoices.
export function SubscriptionsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = tabs.find((t) => t === searchParams.get("tab")) ?? "subscriptions"

  function pick(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value === "subscriptions") params.delete("tab")
    else params.set("tab", value)
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Subscriptions</h2>
        <p className="text-sm text-muted-foreground">
          Institutes&apos; rates and trials, and the monthly per-student invoices issued to them.
        </p>
      </div>
      <Tabs value={tab} onValueChange={pick} className="gap-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="subscriptions">
          <SubscriptionList />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoiceList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
