"use client"

import * as React from "react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { LayoutDashboardIcon, SchoolIcon, PackageIcon, CreditCardIcon, UsersIcon, Settings2Icon, CircleHelpIcon, SearchIcon, DatabaseIcon, FileChartColumnIcon, LifeBuoyIcon, GraduationCapIcon } from "lucide-react"

const data = {
  user: {
    name: "Super Admin",
    email: "admin@sms.app",
    avatar: "",
  },
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
    { title: "Institutes", url: "/institutes", icon: <SchoolIcon /> },
    { title: "Plans", url: "/plans", icon: <PackageIcon /> },
    { title: "Subscriptions", url: "/subscriptions", icon: <CreditCardIcon /> },
    { title: "Users", url: "/users", icon: <UsersIcon /> },
  ],
  navSecondary: [
    { title: "Settings", url: "/settings", icon: <Settings2Icon /> },
    { title: "Get Help", url: "#", icon: <CircleHelpIcon /> },
    { title: "Search", url: "#", icon: <SearchIcon /> },
  ],
  documents: [
    { name: "Support Tickets", url: "/support", icon: <LifeBuoyIcon /> },
    { name: "Reports", url: "/reports", icon: <FileChartColumnIcon /> },
    { name: "Audit Logs", url: "/audit-logs", icon: <DatabaseIcon /> },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard">
                <GraduationCapIcon className="size-5!" />
                <span className="text-base font-semibold">SMS Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
