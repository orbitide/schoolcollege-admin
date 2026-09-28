"use client"

import Link from "next/link"

import { DashboardMenuButton } from "@/components/configurations/dashboard-menu-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { dashboardMenuGroupStore, dashboardMenuStore } from "@/lib/academic-store"

// The quick-link buttons the institute set up in Dashboard Menu Groups and
// Dashboard Menus (legacy _DashboardMenu), group by group. Inactive groups
// and buttons are left out.
export function DashboardShortcuts({ instituteId }: { instituteId: number }) {
  const groups = dashboardMenuGroupStore.useList(instituteId).filter((g) => g.status === "Active")
  const menus = dashboardMenuStore.useList(instituteId).filter((m) => m.status === "Active")
  const filled = groups
    .map((group) => ({ group, menus: menus.filter((m) => m.groupId === group.id) }))
    .filter((g) => g.menus.length)

  if (!filled.length) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shortcuts</CardTitle>
        <CardDescription>Quick links set up for this institute</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 @3xl/main:grid-cols-2 @6xl/main:grid-cols-3">
        {filled.map(({ group, menus }) => (
          <section key={group.id} className="grid content-start gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">{group.name}</h3>
            <div className="flex flex-wrap gap-2">
              {menus.map((menu) => (
                <Link
                  key={menu.id}
                  href={menu.link || "#"}
                  className="rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <DashboardMenuButton menu={menu} size="sm" className="h-9 px-3 text-sm [&_svg]:size-4" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}
