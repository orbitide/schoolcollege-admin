"use client"

import Link from "next/link"
import { CalendarDaysIcon, ClipboardListIcon, MessageSquareTextIcon, ReceiptTextIcon } from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { classStore } from "@/lib/academic-store"
import type { UpcomingHoliday } from "@/lib/institute-dashboard"
import type { TermExam } from "@/lib/term-exams"

const SHOWN = 4

const shortDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// A small operational card: an icon and title, a figure or list, and a link
// to the page that deals with it (hidden when the user can't open it).
function OpsCard({
  icon,
  title,
  description,
  href,
  linkLabel = "Open",
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href?: string
  linkLabel?: string
  children: React.ReactNode
}) {
  return (
    <Card className="h-full gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 [&_svg]:size-4 [&_svg]:text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        {href && (
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href={href}>{linkLabel}</Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

export function SmsCard({
  balance,
  sentThisMonth,
  failedThisWeek,
  href,
}: {
  balance: number
  sentThisMonth: number
  failedThisWeek: number
  href?: string
}) {
  return (
    <OpsCard
      icon={<MessageSquareTextIcon />}
      title="SMS"
      description="Prepaid credit and delivery"
      href={href}
      linkLabel="History"
    >
      <div className="text-2xl font-semibold tabular-nums">৳{balance.toLocaleString()}</div>
      <p className="text-sm text-muted-foreground">
        {sentThisMonth.toLocaleString()} sent this month
        {failedThisWeek > 0 && (
          <>
            {" · "}
            <span className="font-medium text-destructive">{failedThisWeek} failed in 7 days</span>
          </>
        )}
      </p>
    </OpsCard>
  )
}

export function HolidaysCard({ holidays, href }: { holidays: UpcomingHoliday[]; href?: string }) {
  return (
    <OpsCard
      icon={<CalendarDaysIcon />}
      title="Upcoming holidays"
      description="In the next 30 days"
      href={href}
    >
      {holidays.length === 0 ? (
        <Empty>No holidays coming up.</Empty>
      ) : (
        <ul className="grid gap-2 text-sm">
          {holidays.slice(0, SHOWN).map(({ holiday, date }) => (
            <li key={holiday.id} className="flex items-baseline justify-between gap-3">
              <span className="truncate">{holiday.name}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">{shortDate(date)}</span>
            </li>
          ))}
        </ul>
      )}
    </OpsCard>
  )
}

export function ExamsCard({
  instituteId,
  exams,
  today,
  href,
}: {
  instituteId: number
  exams: TermExam[]
  today: string
  href?: string
}) {
  const classes = classStore.useList(instituteId)
  const className = (id: number) => classes.find((c) => c.id === id)?.name ?? ""

  return (
    <OpsCard
      icon={<ClipboardListIcon />}
      title="Term exams"
      description="Running now or coming up"
      href={href}
    >
      {exams.length === 0 ? (
        <Empty>No exams scheduled.</Empty>
      ) : (
        <ul className="grid gap-2 text-sm">
          {exams.slice(0, SHOWN).map((exam) => (
            <li key={exam.id} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate">
                {exam.name}
                <span className="text-muted-foreground"> · {className(exam.classId)}</span>
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {exam.examStart <= today ? "Running" : shortDate(exam.examStart)}
              </span>
            </li>
          ))}
          {exams.length > SHOWN && (
            <li className="text-xs text-muted-foreground">And {exams.length - SHOWN} more</li>
          )}
        </ul>
      )}
    </OpsCard>
  )
}

export function FinesCard({
  students,
  days,
  href,
}: {
  students: number
  days: number
  href?: string
}) {
  return (
    <OpsCard
      icon={<ReceiptTextIcon />}
      title="Absent fines"
      description="Fine periods ending this month"
      href={href}
    >
      <div className="text-2xl font-semibold tabular-nums">{students.toLocaleString()}</div>
      <p className="text-sm text-muted-foreground">
        {students === 1 ? "student" : "students"} fined for {days.toLocaleString()}{" "}
        {days === 1 ? "day" : "days"}
      </p>
    </OpsCard>
  )
}
