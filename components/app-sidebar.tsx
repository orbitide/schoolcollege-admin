"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarCheckIcon, DatabaseIcon, SchoolIcon, SearchXIcon, Settings2Icon, SlidersHorizontalIcon, UsersIcon, WrenchIcon } from "lucide-react"

import { BrandMark } from "@/components/brand-mark"
import { NavMain, filterNavItems, type NavMainItem, type NavTone } from "@/components/nav-main"
import { NavSearch } from "@/components/nav-search"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useCurrentUser } from "@/lib/current-user"
import { getNavigation, type NavigationMenu } from "@/lib/navigation"

// Icons and colours for the API's menu icon names (AdminMenu Icon).
const menuLooks: Record<string, { icon: React.ReactNode; tone: NavTone }> = {
  "calendar-check": { icon: <CalendarCheckIcon />, tone: "emerald" },
  "sliders-horizontal": { icon: <SlidersHorizontalIcon />, tone: "emerald" },
  wrench: { icon: <WrenchIcon />, tone: "slate" },
  school: { icon: <SchoolIcon />, tone: "blue" },
  users: { icon: <UsersIcon />, tone: "sky" },
  database: { icon: <DatabaseIcon />, tone: "emerald" },
}

type NavGroup = { label: string; items: NavMainItem[] }

// The menus the API sent (already only what the user holds), as labelled
// sections in the order of their first menu. A one-item menu named like its
// item is a plain link (Database).
function navGroups(menus: readonly NavigationMenu[]): NavGroup[] {
  const groups = new Map<string, NavGroup>()
  for (const menu of menus) {
    const group = groups.get(menu.section) ?? { label: menu.section, items: [] }
    groups.set(menu.section, group)
    const look = menuLooks[menu.icon] ?? { icon: <Settings2Icon />, tone: "slate" as const }
    const items = menu.items.map((item) => ({ title: item.title, url: item.route }))
    group.items.push(
      items.length === 1 && items[0]!.title === menu.name
        ? { ...items[0]!, ...look }
        : { title: menu.name, ...look, items }
    )
  }
  return [...groups.values()]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useCurrentUser()
  const groups = React.useMemo(() => navGroups(getNavigation()), [])
  const [query, setQuery] = React.useState("")
  const nothingFound =
    query.trim() !== "" && groups.every((group) => filterNavItems(group.items, query).length === 0)

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="gap-3 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="gap-3 px-1.5 hover:bg-transparent active:bg-transparent"
            >
              <Link href="/dashboard">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/30 [&_svg]:size-5!">
                  <BrandMark />
                </span>
                <span className="grid flex-1 leading-tight">
                  <span className="text-base font-bold tracking-tight">SMS Admin</span>
                  <span className="text-xs text-sidebar-foreground/60">Control Panel</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavSearch value={query} onChange={setQuery} />
      </SidebarHeader>
      <SidebarSeparator className="mx-0" />
      <SidebarContent className="gap-0 py-1">
        {groups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} query={query} />
        ))}
        {nothingFound && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground/60">
              <SearchXIcon className="size-5" />
            </span>
            <p className="text-sm font-medium">No menu found</p>
            <p className="text-xs text-sidebar-foreground/60">
              Nothing matches &ldquo;{query.trim()}&rdquo;.
            </p>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser user={{ name: user.name, email: user.email, avatar: user.profilePicture }} />
      </SidebarFooter>
    </Sidebar>
  )
}
