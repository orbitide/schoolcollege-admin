"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarDaysIcon, UserRoundXIcon } from "lucide-react"

import { DailyAttendanceSheet, DateField, savedKey } from "@/components/attendance/attendance-sheet"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { classStore, holidayStore, sectionStore, shiftStore, yearStore } from "@/lib/academic-store"
import { useCurrentTeacher, useCurrentUser } from "@/lib/current-user"
import { useInstitute } from "@/lib/institutes-store"
import { teacherSectionIds } from "@/lib/section-teachers"
import {
  attendanceSheet,
  dayOffNote,
  todayIso,
  useStudentAttendance,
} from "@/lib/student-attendance"
import { useStudents } from "@/lib/students"
import type { Teacher } from "@/lib/teachers"
import { cn } from "@/lib/utils"

// Legacy "Take Attendance" (StudentAttendance/TakeAttendance): a teacher
// takes attendance of the sections they take this year. Anyone else is sent
// to Take Attendance By Admin, as in legacy. Legacy also locked a teacher's
// sheet once the day's absence SMS had gone out; that waits for the SMS
// module.
export function TeacherAttendance() {
  const router = useRouter()
  const user = useCurrentUser()
  const teacher = useCurrentTeacher()
  const isTeacher = user.role === "Teacher"

  React.useEffect(() => {
    if (!isTeacher) router.replace("/attendance")
  }, [isTeacher, router])

  if (!isTeacher) return null
  if (!teacher || teacher.status !== "Active") {
    return (
      <Notice
        title={teacher ? "Your teacher record is inactive." : "Your user isn't linked to a teacher."}
        detail="Ask an institute admin to link your login to an active teacher."
      />
    )
  }
  return <TeacherSheet teacher={teacher} />
}

function TeacherSheet({ teacher }: { teacher: Teacher }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institute = useInstitute(teacher.instituteId)
  const iid = teacher.instituteId
  const students = useStudents()
  const records = useStudentAttendance()
  const years = yearStore.useList(iid)
  const classes = classStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const holidays = holidayStore.useList(iid)

  const param = (key: string) => searchParams.get(key) ?? ""
  const today = todayIso()
  const date = param("date") || today
  const dateError = date > today ? "Attendance can't be taken for a future date." : undefined
  const year = years.find((y) => y.isCurrent)

  // The teacher's sections this year, in class order, each with its sheet
  // for the day so the chooser can say which are still to be taken.
  const classRank = new Map(classes.map((c) => [c.id, c.rank]))
  const ids = new Set(year ? teacherSectionIds(teacher, year.id) : [])
  const mine = sections
    .filter((s) => ids.has(s.id) && s.status === "Active")
    .sort(
      (a, b) =>
        (classRank.get(a.classId) ?? 0) - (classRank.get(b.classId) ?? 0) ||
        a.name.localeCompare(b.name)
    )
    .map((section) => {
      const academicClass = classes.find((c) => c.id === section.classId)
      const rows =
        year && institute && !dateError
          ? attendanceSheet(students, records, iid, { yearId: year.id, classId: section.classId, sectionId: section.id }, date)
          : []
      return { section, academicClass, rows }
    })
  const picked = mine.find((m) => String(m.section.id) === param("section")) ?? (mine.length === 1 ? mine[0] : undefined)

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  if (!institute) return null
  if (!year || !mine.length) {
    return (
      <Notice
        title={year ? `You aren't assigned a section for ${year.name}.` : "The institute has no current academic year."}
        detail="An institute admin assigns teachers to sections under Section Teacher."
      />
    )
  }

  const shiftName = (id: number | null) =>
    institute.enableShift ? shifts.find((s) => s.id === id)?.name : undefined

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Take Attendance</CardTitle>
          <CardDescription>
            {teacher.name} · {year.name}. Pick your section and the day, tick the students who were
            present and save.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_14rem]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Section">
            {mine.map(({ section, academicClass, rows }) => {
              const selected = picked?.section.id === section.id
              const saved = rows.filter((r) => r.record)
              const present = saved.filter((r) => r.record!.isPresent).length
              const shift = shiftName(section.shiftId)
              return (
                <button
                  key={section.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setParam({ section: String(section.id) })}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    selected && "border-primary bg-primary/5 ring-1 ring-primary"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-muted-foreground">
                        {academicClass?.name ?? "Class"}
                        {shift && ` · ${shift}`}
                      </p>
                      <p className="text-2xl font-semibold">Section {section.name}</p>
                    </div>
                    {saved.length ? (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                        Taken
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
                        Not taken
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {rows.length} student{rows.length === 1 ? "" : "s"}
                    {saved.length > 0 && ` · ${present} present, ${saved.length - present} absent`}
                  </p>
                </button>
              )
            })}
          </div>
          <DateField
            value={date}
            max={today}
            onChange={(v) => setParam({ date: v === today ? "" : v })}
            error={dateError}
          />
        </CardContent>
      </Card>

      {picked && !dateError ? (
        <DailyAttendanceSheet
          key={`${picked.section.id}|${date}|${savedKey(picked.rows)}`}
          institute={institute}
          sectionId={picked.section.id}
          teacherId={teacher.id}
          rows={picked.rows}
          date={date}
          title={`${picked.academicClass?.name ?? "Class"}, Section ${picked.section.name}`}
          note={dayOffNote(institute, holidays, date, picked.academicClass?.medium)}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarDaysIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">{dateError ? "Pick a day up to today." : "Pick a section."}</p>
            <p className="text-sm text-muted-foreground">
              The section&apos;s students are listed here to take attendance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Notice({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="px-4 py-4 md:py-6 lg:px-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <UserRoundXIcon className="size-8 text-muted-foreground" />
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{detail}</p>
          <Link href="/dashboard" className="text-sm text-primary underline-offset-4 hover:underline">
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
