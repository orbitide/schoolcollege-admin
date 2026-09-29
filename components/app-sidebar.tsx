"use client"

import * as React from "react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain, filterNavItems, type NavItem, type NavMainItem } from "@/components/nav-main"
import { NavSearch, matchesQuery } from "@/components/nav-search"
import { permissionCode, surfaceHref, surfacesOf, useCan } from "@/lib/access"
import { basicSettingsHref, basicSettingsMenu, basicSettingsResource } from "@/lib/basic-settings"
import { isPlatformAdmin, useCurrentUser } from "@/lib/current-user"
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
import { LayoutDashboardIcon, PackageIcon, CreditCardIcon, UsersIcon, Settings2Icon, DatabaseIcon, FileChartColumnIcon, LifeBuoyIcon, GraduationCapIcon, SlidersHorizontalIcon, ClipboardListIcon, FileSpreadsheetIcon, SearchXIcon, UserRoundIcon, CalendarCheckIcon, MessageSquareTextIcon, WrenchIcon, ArmchairIcon, SchoolIcon, HistoryIcon, NewspaperIcon, BanknoteIcon, CalendarClockIcon, MegaphoneIcon, FileQuestionIcon } from "lucide-react"

const data = {
  // The sidebar menu, as labelled groups: the school core first, then the
  // extras (public site, setup, platform console).
  navGroups: [
    {
      label: "Main Menu",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon />, tone: "blue" },
        { title: "Institute Dashboard", url: "/institute-dashboard", icon: <SchoolIcon />, tone: "emerald", platform: true },
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
            { title: "Daily Attendance Report", url: "/reports/daily-attendance", permission: "daily-attendance-report.view" },
            { title: "Student's Individual Attendance Report", url: "/reports/student-attendance", permission: "student-attendance-report.view" },
            { title: "Monthly Attendance Report", url: "/reports/monthly-attendance", permission: "monthly-attendance-report.view" },
            { title: "Attendance Summary", url: "/reports/attendance-summary", permission: "attendance-summary.view" },
            { title: "Exam Attendance Report", url: "/reports/exam-attendance", permission: "exam-attendance-report.view" },
            { title: "Exam Attendance Summary Report", url: "/reports/exam-attendance-summary", permission: "exam-attendance-summary.view" },
            { title: "Manage Monthly Attendance Fine", url: "/attendance/fines" },
            { title: "Absent Fine Date Configuration", url: "/attendance/fines/configuration" },
          ],
        },
        {
          title: "Class Routine",
          icon: <CalendarClockIcon />,
          tone: "blue",
          items: [
            { title: "Manage Period", url: "/routine/periods", resource: "routine-period" },
            { title: "Class Routine", url: "/routine", permission: "class-routine.manage" },
            { title: "View Class Routine", url: "/routine/view", permission: "class-routine.view" },
            { title: "Teacher Routine", url: "/routine/teacher", permission: "teacher-routine.view" },
          ],
        },
        {
          title: "Term Exam",
          icon: <ClipboardListIcon />,
          tone: "amber",
          items: [
            { title: "Manage Term Exam", url: "/term-exam", resource: "term-exam" },
            { title: "Manage Correct Answer", url: "/term-exam/correct-answers", resource: "correct-answer" },
            { title: "Generate Merit List", url: "/term-exam/merit-list", permission: "merit-list.manage" },
            { title: "Generate Question", url: "/term-exam/generate-question", permission: "question-generate.manage" },
            { title: "Manage Generated Question", url: "/term-exam/generated-questions", resource: "generated-question" },
            { title: "OMR Sheet", url: "/term-exam/omr-sheet", permission: "omr-sheet.view" },
          ],
        },
        {
          title: "Question Bank",
          icon: <FileQuestionIcon />,
          tone: "sky",
          items: [
            { title: "Chapter & Topic", url: "/questions/chapters", resource: "question-chapter" },
            { title: "Manage Question", url: "/questions", resource: "question" },
            { title: "Add Question", url: "/questions/new", permission: "question.manage" },
          ],
        },
        {
          title: "Term Exam Marks",
          icon: <FileSpreadsheetIcon />,
          tone: "rose",
          items: [
            { title: "Student Marks Manage", url: "/term-exam-marks" },
            { title: "Marks Upload", url: "/term-exam-marks/upload" },
            { title: "OMR Scan", url: "/term-exam-marks/omr-scan", permission: "omr-scan.manage" },
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
          title: "Fees",
          icon: <BanknoteIcon />,
          tone: "emerald",
          items: [
            { title: "Fee Collection", url: "/fees/collect", permission: "fee-collection.manage" },
            { title: "Fee Head", url: "/fees/heads", resource: "fee-head" },
            { title: "Fee Setup", url: "/fees/setup", permission: "fee-setup.manage" },
            { title: "Student Waiver", url: "/fees/waivers", permission: "fee-waiver.manage" },
            { title: "Generate Dues", url: "/fees/generate", permission: "fee-generate.manage" },
            { title: "Manage Dues", url: "/fees/invoices", permission: "fee-invoice.view" },
            { title: "Receipts", url: "/fees/payments", permission: "fee-payment.view" },
            { title: "Online Payments", url: "/fees/online-payments", permission: "online-payment.view" },
            { title: "Due SMS", url: "/fees/due-sms", permission: "fee-due-sms.manage" },
            { title: "Collection Report", url: "/fees/reports/collection", permission: "fee-collection-report.view" },
            { title: "Due Report", url: "/fees/reports/dues", permission: "fee-due-report.view" },
          ],
        },
        {
          title: "SMS",
          icon: <MessageSquareTextIcon />,
          tone: "sky",
          items: [
            { title: "Send SMS", url: "/sms/send", permission: "sms-send.manage" },
            { title: "Re-send SMS", url: "/sms/resend", permission: "sms-resend.manage" },
            { title: "SMS Summary", url: "/sms/summary", permission: "sms-summary.view" },
            { title: "SMS History", url: "/sms/history", permission: "sms-history.view" },
            { title: "Manage SMS Template", url: "/sms/templates", resource: "sms-template" },
          ],
        },
        {
          title: "Notice",
          icon: <MegaphoneIcon />,
          tone: "amber",
          items: [
            { title: "Manage Notice", url: "/notices", resource: "notice" },
            { title: "Notice Board", url: "/notices/board", permission: "notice-board.view" },
          ],
        },
        {
          title: "Reports",
          icon: <FileChartColumnIcon />,
          tone: "violet",
          items: [
            { title: "Result at a glance", url: "/reports/result-summary", permission: "result-summary.view" },
            { title: "Failed Summary", url: "/reports/failed-summary", permission: "failed-summary.view" },
            { title: "Subject Result Analysis", url: "/reports/result-analysis", permission: "result-analysis.view" },
            { title: "Absent Summary", url: "/reports/absent-summary", permission: "absent-summary.view" },
            { title: "Pass/Fail Report", url: "/reports/pass-fail", permission: "pass-fail-report.view" },
            { title: "Tabulation", url: "/reports/tabulation", permission: "tabulation.view" },
            { title: "Number Sheet", url: "/reports/number-sheet", permission: "number-sheet.view" },
            { title: "Performance Report", url: "/reports/performance", permission: "performance-report.view" },
            { title: "Year Book", url: "/reports/year-book", permission: "year-book.view" },
            { title: "Practical Mark Collection Sheet", url: "/reports/practical-mark-sheet", permission: "practical-mark-sheet.view" },
            { title: "Academic Transcript", url: "/reports/academic-transcript", permission: "academic-transcript.view" },
            { title: "MCQ Mark Checker", url: "/reports/mcq-mark-checker", permission: "mcq-mark-checker.view" },
            { title: "Testimonial", url: "/reports/testimonial", permission: "testimonial-report.view" },
            { title: "Testimonial Collection Sheet", url: "/reports/testimonial-collection-sheet", permission: "testimonial-collection-sheet.view" },
            { title: "Student Information", url: "/reports/student-information", permission: "student-information.view" },
            { title: "Student Statistics", url: "/reports/student-statistics", permission: "student-statistics.view" },
            { title: "Subject Student List", url: "/reports/subject-students", permission: "subject-student-list.view" },
            { title: "Subject Statistics (Section wise)", url: "/reports/subject-statistics", permission: "subject-statistics.view" },
            { title: "Admit Card", url: "/reports/admit-card", permission: "admit-card.view" },
            { title: "ID Card", url: "/reports/id-card", permission: "id-card.view" },
            { title: "Marks Upload Report", url: "/reports/marks-upload", permission: "marks-upload-report.view" },
            { title: "Seat Plan At a Glance", url: "/reports/seat-plan", permission: "seat-plan-report.view" },
            { title: "Seat Plan (Room Wise)", url: "/reports/seat-plan-rooms", permission: "seat-plan-report.view" },
          ],
        },
        {
          title: "Seat Plan",
          icon: <ArmchairIcon />,
          tone: "orange",
          items: [
            { title: "Manage Exam Seat Plan", url: "/seat-plans", permission: "exam-seat-plan.manage" },
            { title: "Manage Building Room", url: "/seat-plans/buildings", resource: "building" },
          ],
        },
        {
          title: "Online Admission",
          icon: <SchoolIcon />,
          tone: "blue",
          items: [
            { title: "Student Import", url: "/online-admission/student-import", permission: "board-student-import.manage" },
            { title: "Education Board", url: "/online-admission/education-boards", permission: "education-board.manage" },
          ],
        },
      ] satisfies NavMainItem[],
    },
    {
      label: "Website & Content",
      items: [
        {
          title: "Blog",
          icon: <NewspaperIcon />,
          tone: "violet",
          items: [
            { title: "Manage Post", url: "/blog/posts", resource: "blog-post" },
            { title: "New Post", url: "/blog/posts/new", permission: "blog-post.manage" },
            { title: "My Post", url: "/blog/my-posts", permission: "blog-author.manage" },
            { title: "Create Post", url: "/blog/my-posts/new", permission: "blog-author.manage" },
            { title: "Category", url: "/blog/categories", resource: "blog-category" },
            { title: "Tags", url: "/blog/tags", resource: "blog-tag" },
            { title: "Manage Comments", url: "/blog/comments", resource: "blog-comment" },
            { title: "My Comments", url: "/blog/my-comments", permission: "blog-my-comment.manage" },
          ],
        },
      ] satisfies NavMainItem[],
    },
    {
      label: "System",
      items: [
        {
          title: "Basic Settings",
          icon: <SlidersHorizontalIcon />,
          tone: "emerald",
          items: basicSettingsMenu.map((item) => ({
            title: item.title,
            url: basicSettingsHref(item.segment),
            resource: item.kind || item.surfaces ? basicSettingsResource(item.segment) : undefined,
          })),
        },
        {
          title: "Configurations",
          icon: <WrenchIcon />,
          tone: "slate",
          items: [
            { title: "Institute Configurations", url: "/configurations/institute", permission: "institute-configuration.manage" },
            { title: "Menu View Configurations", url: "/configurations/menu-view", permission: "menu-view-configuration.manage" },
            { title: "Dashboard Menu Group Manage", url: "/configurations/dashboard-menu-groups", resource: "dashboard-menu-group" },
            { title: "Dashboard Menu Manage", url: "/configurations/dashboard-menus", resource: "dashboard-menu" },
          ],
        },
        {
          title: "Basic Actions",
          icon: <HistoryIcon />,
          tone: "slate",
          items: [
            { title: "Common Log", url: "/basic-actions/common-log", permission: "common-log.manage" },
          ],
        },
        { title: "Pricing", url: "/plans", icon: <PackageIcon />, tone: "orange", platform: true },
        { title: "Subscriptions", url: "/subscriptions", icon: <CreditCardIcon />, tone: "rose", platform: true },
        {
          title: "Users",
          icon: <UsersIcon />,
          tone: "sky",
          platform: true,
          items: [
            { title: "New User", url: "/users/new" },
            { title: "Manage Users", url: "/users" },
            { title: "Manage User Roles", url: "/users/roles" },
          ],
        },
      ] satisfies NavMainItem[],
    },
  ],
  navSecondary: [
    { title: "Settings", url: "/settings", icon: <Settings2Icon />, platform: true },
  ],
  documents: [
    { name: "Support Tickets", url: "/support", icon: <LifeBuoyIcon />, tone: "sky" as const },
    { name: "Audit Logs", url: "/audit-logs", icon: <DatabaseIcon />, tone: "slate" as const, platform: true },
  ],
}

export type PermissionMenu = {
  title: string
  items: { title: string; codes: { code: string; label: string }[] }[]
}

// Every permission the menu checks, grouped as the sidebar shows it: the
// tree Users › Extra Permission picks from (legacy module › admin menu ›
// menu item). Items that check nothing aren't listed; a code two items share
// shows once, under both titles.
export function permissionMenus(): PermissionMenu[] {
  const seen = new Map<string, { title: string }>()
  return data.navGroups.flatMap<NavMainItem>((group) => group.items).flatMap((menu) => {
    const items = ("items" in menu ? menu.items : [menu]).flatMap((item) => {
      const codes = item.resource
        ? surfacesOf(item.resource).map((s) => ({ code: permissionCode(item.resource!, s), label: s }))
        : item.permission
          ? [{ code: item.permission, label: item.permission.endsWith(".view") ? "View" : "Manage" }]
          : []
      const shared = codes.length === 1 ? seen.get(codes[0]!.code) : undefined
      if (shared) {
        shared.title += ` / ${item.title}`
        return []
      }
      if (!codes.length) return []
      const entry = { title: item.title, codes }
      codes.forEach((c) => seen.set(c.code, entry))
      return [entry]
    })
    return items.length ? [{ title: menu.title, items }] : []
  })
}

// The menu as the current user may use it: an item with a resource links to
// the first surface they hold (Admin, else Manage, else View) and is dropped
// when they hold none; a menu left empty is dropped too. The page's surface
// tabs lead to the others. Platform pages show to platform admins only.
function resolveNav(items: NavMainItem[], can: (code: string) => boolean, platform: boolean) {
  const resolve = (item: NavItem): NavItem[] => {
    if (item.platform && !platform) return []
    if (item.permission && !can(item.permission)) return []
    // A platform admin's /dashboard is the platform one, beside Institute Dashboard.
    if (platform && item.url === "/dashboard") return [{ ...item, title: "Platform Dashboard" }]
    if (!item.resource) return [item]
    const surface = surfacesOf(item.resource).find((s) => can(permissionCode(item.resource!, s)))
    return surface ? [{ ...item, href: surfaceHref(item.url, surface) }] : []
  }
  return items.flatMap<NavMainItem>((item) => {
    if (!("items" in item)) return resolve(item)
    if (item.platform && !platform) return []
    const subs = item.items.flatMap(resolve)
    return subs.length ? [{ ...item, items: subs }] : []
  })
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useCurrentUser()
  const can = useCan()
  const platform = isPlatformAdmin(user)
  // Each group as the user may use it; a group left empty is dropped.
  const navGroups = React.useMemo(
    () =>
      data.navGroups.flatMap((group) => {
        const items = resolveNav(group.items, can, platform)
        return items.length ? [{ label: group.label, items }] : []
      }),
    [can, platform]
  )
  const documents = React.useMemo(
    () => data.documents.filter((item) => !item.platform || platform),
    [platform]
  )
  const navSecondary = React.useMemo(
    () => data.navSecondary.filter((item) => !item.platform || platform),
    [platform]
  )
  const [query, setQuery] = React.useState("")
  const nothingFound =
    query.trim() !== "" &&
    navGroups.every((group) => filterNavItems(group.items, query).length === 0) &&
    !documents.some((item) => matchesQuery(item.name, query)) &&
    !navSecondary.some((item) => matchesQuery(item.title, query))

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
        {navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} query={query} />
        ))}
        <NavDocuments items={documents} query={query} />
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
        <NavSecondary items={navSecondary} query={query} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser user={{ name: user.name, email: user.email, avatar: user.profilePicture }} />
      </SidebarFooter>
    </Sidebar>
  )
}
