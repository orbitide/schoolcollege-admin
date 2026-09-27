"use client"

import * as React from "react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain, type NavMainItem } from "@/components/nav-main"
import { basicSettingsHref, basicSettingsMenu } from "@/lib/basic-settings"
import { useCurrentUser } from "@/lib/current-user"
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
import { LayoutDashboardIcon, PackageIcon, CreditCardIcon, UsersIcon, Settings2Icon, CircleHelpIcon, SearchIcon, DatabaseIcon, FileChartColumnIcon, LifeBuoyIcon, GraduationCapIcon, SlidersHorizontalIcon } from "lucide-react"

const data = {
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
    {
      title: "Students",
      icon: <GraduationCapIcon />,
      items: [
        { title: "Manage Students", url: "/students" },
        { title: "Add Student", url: "/students/new" },
        { title: "Add Previous Student", url: "/students/previous" },
        { title: "Student Transfer", url: "/students/transfer" },
        { title: "Clear Student", url: "/students/clear" },
      ],
    },
    {
      title: "Basic Settings",
      icon: <SlidersHorizontalIcon />,
      items: basicSettingsMenu.map((item) => ({
        title: item.title,
        url: basicSettingsHref(item.segment),
      })),
    },
    { title: "Plans", url: "/plans", icon: <PackageIcon /> },
    { title: "Subscriptions", url: "/subscriptions", icon: <CreditCardIcon /> },
    { title: "Users", url: "/users", icon: <UsersIcon /> },
  ] satisfies NavMainItem[],
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
  const user = useCurrentUser()
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
        <NavUser user={{ name: user.name, email: user.email, avatar: "" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
