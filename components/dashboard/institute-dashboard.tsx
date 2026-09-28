"use client"

import * as React from "react"
import Link from "next/link"
import {
  CalendarCheckIcon,
  CalendarXIcon,
  GraduationCapIcon,
  UserRoundIcon,
} from "lucide-react"

import { AttendancePeriodTable } from "@/components/dashboard/attendance-period-table"
import { AttendanceTrendChart } from "@/components/dashboard/attendance-trend-chart"
import { DashboardShortcuts } from "@/components/dashboard/dashboard-shortcuts"
import {
  ExamsCard,
  FinesCard,
  HolidaysCard,
  SmsCard,
} from "@/components/dashboard/institute-ops-cards"
import { StatCard, StatGrid } from "@/components/dashboard/stat-card"
import {
  InstitutePicker,
  NoInstitute,
  useInstitutePicker,
} from "@/components/configurations/institute-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { surfaceHref, useCan, useSurfaces } from "@/lib/access"
import { yearStore } from "@/lib/academic-store"
import { useAttendanceFines } from "@/lib/attendance-fines"
import { basicSettingsHref, basicSettingsResource } from "@/lib/basic-settings"
import { useAllHolidays } from "@/lib/holidays"
import {
  addDays,
  attendanceTrend,
  finesThisMonth,
  periodTotals,
  studentCounts,
  upcomingExams,
  upcomingHolidays,
} from "@/lib/institute-dashboard"
import type { Institute } from "@/lib/institutes"
import { useSmsBalance, useSmsMessages } from "@/lib/sms-messages"
import { dayOffNote, todayIso, useStudentAttendance } from "@/lib/student-attendance"
import { useStudents } from "@/lib/students"
import { useTeachers } from "@/lib/teachers"
import { useTermExams } from "@/lib/term-exams"

const percent = (part: number, whole: number) => (whole ? Math.round((part * 100) / whole) : 0)

// The link to a resource's page on the first surface the user holds, if any.
function useResourceHref(baseUrl: string, resource: string) {
  const surface = useSurfaces(resource)[0]
  return surface ? surfaceHref(baseUrl, surface) : undefined
}

// An institute's home (legacy SchoolCollegeDashboard): its students and
// today's attendance, the 30-day attendance graph and summary, what's
// coming up, and the institute's shortcut buttons. A user with several
// institutes picks one first.
export function InstituteDashboard() {
  const picker = useInstitutePicker()
  const { institute } = picker

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {institute ? institute.name : "Dashboard"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Students, attendance and what needs doing today.
          </p>
        </div>
        <InstitutePicker picker={picker} />
        {!institute && <NoInstitute picker={picker} what="dashboard" />}
      </div>
      {institute && <InstituteOverview key={institute.id} institute={institute} />}
    </div>
  )
}

function InstituteOverview({ institute }: { institute: Institute }) {
  const can = useCan()
  const students = useStudents()
  const attendance = useStudentAttendance()
  const teachers = useTeachers()
  const sms = useSmsMessages()
  const smsBalance = useSmsBalance(institute.id)
  const allHolidays = useAllHolidays()
  const exams = useTermExams()
  const fines = useAttendanceFines()
  const years = yearStore.useList(institute.id)
  const today = todayIso()

  const teacherHref = useResourceHref("/teachers", "teacher")
  const holidaysHref = useResourceHref(basicSettingsHref("holidays"), basicSettingsResource("holidays"))
  const examsHref = useResourceHref("/term-exam", "term-exam")
  const dailyReportHref = can("daily-attendance-report.view") ? "/reports/daily-attendance" : undefined

  const yearId = years.find((y) => y.isCurrent)?.id
  const counts = React.useMemo(
    () => studentCounts(institute, students, attendance, yearId, today),
    [institute, students, attendance, yearId, today]
  )
  const holidays = React.useMemo(
    () => allHolidays.filter((h) => h.instituteId === institute.id),
    [allHolidays, institute.id]
  )
  const trend = React.useMemo(
    () => attendanceTrend(institute, { attendance, sms, holidays }, today),
    [institute, attendance, sms, holidays, today]
  )
  const periods = React.useMemo(() => periodTotals(trend), [trend])
  const coming = React.useMemo(() => upcomingHolidays(institute, holidays, today), [institute, holidays, today])
  const nextExams = React.useMemo(() => upcomingExams(institute.id, exams, today), [institute.id, exams, today])
  const fined = React.useMemo(() => finesThisMonth(institute.id, fines, today), [institute.id, fines, today])
  const smsStats = React.useMemo(() => {
    const month = today.slice(0, 7)
    const weekAgo = addDays(today, -6)
    let sent = 0
    let failed = 0
    for (const m of sms) {
      if (m.instituteId !== institute.id) continue
      if (m.status === "Sent" && m.sentAt?.startsWith(month)) sent++
      if (m.status === "Failed" && m.createdAt.slice(0, 10) >= weekAgo) failed++
    }
    return { sent, failed }
  }, [sms, institute.id, today])
  const activeTeachers = teachers.filter((t) => t.instituteId === institute.id && t.status === "Active").length
  const dayOff = dayOffNote(institute, holidays, today)
  const taken = counts.present + counts.absent

  return (
    <>
      {!dayOff && counts.sectionsNotTaken > 0 && (
        <div className="px-4 lg:px-6">
          <Card className="border-amber-500/40 bg-amber-500/5 py-4">
            <CardContent className="flex flex-wrap items-center gap-3">
              <CalendarXIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  Attendance not taken yet in {counts.sectionsNotTaken}{" "}
                  {counts.sectionsNotTaken === 1 ? "section" : "sections"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {counts.notTaken.toLocaleString()} students have no attendance for today.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/attendance">Take attendance</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      <StatGrid>
        <StatCard
          label="Total Students"
          value={counts.total.toLocaleString()}
          headline={`${counts.male.toLocaleString()} male, ${counts.female.toLocaleString()} female`}
          detail="Active students this academic year"
          icon={<GraduationCapIcon />}
          href="/students"
        />
        <StatCard
          label="Present Today"
          value={counts.present.toLocaleString()}
          headline={dayOff ? dayOff : `${percent(counts.present, taken)}% of attendance taken`}
          detail={`${taken.toLocaleString()} of ${counts.total.toLocaleString()} students recorded`}
          icon={<CalendarCheckIcon />}
          href={dailyReportHref}
        />
        <StatCard
          label="Absent Today"
          value={counts.absent.toLocaleString()}
          headline={`${percent(counts.absent, taken)}% of attendance taken`}
          detail={
            counts.notTaken
              ? `${counts.notTaken.toLocaleString()} students not taken yet`
              : "Attendance taken for every student"
          }
          icon={<CalendarXIcon />}
          href={dailyReportHref}
        />
        <StatCard
          label="Teachers"
          value={activeTeachers.toLocaleString()}
          headline="Active teachers"
          detail={
            activeTeachers
              ? `${Math.round(counts.total / activeTeachers)} students per teacher`
              : "No teachers added yet"
          }
          icon={<UserRoundIcon />}
          href={teacherHref}
        />
      </StatGrid>
      <div className="grid gap-4 px-4 md:gap-6 lg:px-6 @5xl/main:grid-cols-3">
        <div className="@5xl/main:col-span-2">
          <AttendanceTrendChart trend={trend} />
        </div>
        <AttendancePeriodTable periods={periods} />
      </div>
      <div className="grid gap-4 px-4 md:gap-6 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <SmsCard
          balance={smsBalance}
          sentThisMonth={smsStats.sent}
          failedThisWeek={smsStats.failed}
          href={can("sms-history.view") ? "/sms/history" : undefined}
        />
        <ExamsCard instituteId={institute.id} exams={nextExams} today={today} href={examsHref} />
        <HolidaysCard holidays={coming} href={holidaysHref} />
        <FinesCard students={fined.students} days={fined.days} href="/attendance/fines" />
      </div>
      <div className="px-4 lg:px-6">
        <DashboardShortcuts instituteId={institute.id} />
      </div>
    </>
  )
}
