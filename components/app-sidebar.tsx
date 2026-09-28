"use client"

import * as React from "react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain, filterNavItems, type NavItem, type NavMainItem } from "@/components/nav-main"
import { NavSearch, matchesQuery } from "@/components/nav-search"
import { accessSurfaces, permissionCode, surfaceHref, useCan } from "@/lib/access"
import { basicSettingsHref, basicSettingsMenu, basicSettingsResource } from "@/lib/basic-settings"
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
  SidebarSeparator,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { LayoutDashboardIcon, PackageIcon, CreditCardIcon, UsersIcon, Settings2Icon, CircleHelpIcon, DatabaseIcon, FileChartColumnIcon, LifeBuoyIcon, GraduationCapIcon, SlidersHorizontalIcon, ClipboardListIcon, FileSpreadsheetIcon, SearchXIcon, UserRoundIcon, CalendarCheckIcon, MessageSquareTextIcon } from "lucide-react"

const data = {
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon />, tone: "blue" },
    {
      title: "Students",
      icon: <GraduationCapIcon />,
      tone: "violet",
      items: [
        { title: "Manage Students", url: "/students" },
        { title: "Student Import", url: "/students/import" },
        { title: "Student Transfer", url: "/students/transfer" },
        { title: "Student Dynamic Report", url: "/students/report" },
        { title: "Manage Testimonial", url: "/students/testimonials" },
        { title: "Clear Student", url: "/students/clear" },
      ],
    },
    {
      title: "Teacher",
      icon: <UserRoundIcon />,
      tone: "sky",
      items: [
        { title: "Manage Teacher", url: "/teachers", resource: "teacher" },
        { title: "Section Teacher (Admin)", url: "/section-teachers" },
      ],
    },
    {
      title: "Attendance",
      icon: <CalendarCheckIcon />,
      tone: "emerald",
      items: [
        { title: "Take Attendance", url: "/attendance/take" },
        { title: "Take Attendance By Admin", url: "/attendance" },
        { title: "Exam Attendance By Admin", url: "/attendance/exam" },
        { title: "Manage Monthly Attendance Fine", url: "/attendance/fines" },
        { title: "Absent Fine Date Configuration", url: "/attendance/fines/configuration" },
      ],
    },
    {
      title: "Term Exam",
      icon: <ClipboardListIcon />,
      tone: "amber",
      items: [
        { title: "Manage Term Exam", url: "/term-exam" },
        { title: "Correct Answer", url: "/term-exam/correct-answers" },
        { title: "Generate Merit List", url: "/term-exam/merit-list" },
      ],
    },
    {
      title: "Term Exam Marks",
      icon: <FileSpreadsheetIcon />,
      tone: "rose",
      items: [
        { title: "Student Marks Manage", url: "/term-exam-marks" },
        { title: "Marks Upload", url: "/term-exam-marks/upload" },
        { title: "Edit Student Marks", url: "/term-exam-marks/edit" },
        { title: "Subject Marks Edit", url: "/term-exam-marks/subject-edit" },
        { title: "Student Marks Set Change", url: "/term-exam-marks/set-change" },
        { title: "Marks Clear", url: "/term-exam-marks/clear" },
        { title: "Grace Marks", url: "/term-exam-marks/grace-marks" },
        { title: "Marks Recalculation", url: "/term-exam-marks/recalculation" },
        { title: "Pass Fail ReGenerate", url: "/term-exam-marks/pass-fail-regenerate" },
        { title: "Student Exam", url: "/term-exam-marks/students" },
      ],
    },
    {
      title: "SMS",
      icon: <MessageSquareTextIcon />,
      tone: "sky",
      items: [{ title: "Manage SMS Template", url: "/sms/templates", resource: "sms-template" }],
    },
    {
      title: "Basic Settings",
      icon: <SlidersHorizontalIcon />,
      tone: "emerald",
      items: basicSettingsMenu.map((item) => ({
        title: item.title,
        url: basicSettingsHref(item.segment),
        resource: item.kind && basicSettingsResource(item.segment),
      })),
    },
    { title: "Plans", url: "/plans", icon: <PackageIcon />, tone: "orange" },
    { title: "Subscriptions", url: "/subscriptions", icon: <CreditCardIcon />, tone: "rose" },
    { title: "Users", url: "/users", icon: <UsersIcon />, tone: "sky" },
  ] satisfies NavMainItem[],
  navSecondary: [
    { title: "Settings", url: "/settings", icon: <Settings2Icon /> },
    { title: "Get Help", url: "#", icon: <CircleHelpIcon /> },
  ],
  documents: [
    { name: "Support Tickets", url: "/support", icon: <LifeBuoyIcon />, tone: "sky" as const },
    { name: "Reports", url: "/reports", icon: <FileChartColumnIcon />, tone: "violet" as const },
    { name: "Audit Logs", url: "/audit-logs", icon: <DatabaseIcon />, tone: "slate" as const },
  ],
}

// The menu as the current user may use it: an item with a resource links to
// the first surface they hold (Admin, else Manage, else View) and is dropped
// when they hold none; a menu left empty is dropped too. The page's surface
// tabs lead to the others.
function resolveNav(items: NavMainItem[], can: (code: string) => boolean) {
  const resolve = (item: NavItem): NavItem[] => {
    if (!item.resource) return [item]
    const surface = accessSurfaces.find((s) => can(permissionCode(item.resource!, s)))
    return surface ? [{ ...item, href: surfaceHref(item.url, surface) }] : []
  }
  return items.flatMap<NavMainItem>((item) => {
    if (!("items" in item)) return resolve(item)
    const subs = item.items.flatMap(resolve)
    return subs.length ? [{ ...item, items: subs }] : []
  })
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useCurrentUser()
  const can = useCan()
  const navMain = React.useMemo(() => resolveNav(data.navMain, can), [can])
  const [query, setQuery] = React.useState("")
  const nothingFound =
    query.trim() !== "" &&
    filterNavItems(navMain, query).length === 0 &&
    !data.documents.some((item) => matchesQuery(item.name, query)) &&
    !data.navSecondary.some((item) => matchesQuery(item.title, query))

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
                  <GraduationCapIcon />
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
        <NavMain items={navMain} query={query} />
        <NavDocuments items={data.documents} query={query} />
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
        <NavSecondary items={data.navSecondary} query={query} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser user={{ name: user.name, email: user.email, avatar: "" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
