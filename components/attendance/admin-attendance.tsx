"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarDaysIcon } from "lucide-react"

import { DailyAttendanceSheet, DateField, savedKey } from "@/components/attendance/attendance-sheet"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  branchStore,
  classStore,
  groupStore,
  holidayStore,
  sectionStore,
  shiftStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, academicVersions } from "@/lib/institutes"
import {
  attendanceSheet,
  dayOffNote,
  todayIso,
  useStudentAttendance,
} from "@/lib/student-attendance"
import { useStudents } from "@/lib/students"

// Legacy "Take Attendance By Admin" (StudentAttendance/AdminAttendance):
// pick a section and a day, tick who was present, and save. Taking it again
// for the same day updates what was saved.
export function AdminAttendance() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const students = useStudents()
  const records = useStudentAttendance()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const branches = branchStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const groups = groupStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const holidays = holidayStore.useList(iid)

  const today = todayIso()
  const date = param("date") || today
  const year = param("year") || String(years.find((y) => y.isCurrent)?.id ?? "")
  const medium = param("medium")
  const selectedClass = classes.find((c) => String(c.id) === param("class"))
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []
  const classSections = sections.filter(
    (s) =>
      s.status === "Active" &&
      s.classId === selectedClass?.id &&
      (!param("branch") || String(s.branchId) === param("branch")) &&
      (!param("shift") || String(s.shiftId) === param("shift")) &&
      (!param("version") || !s.version || s.version === param("version")) &&
      (!param("group") || s.groupId == null || String(s.groupId) === param("group"))
  )
  const section = classSections.find((s) => String(s.id) === param("section"))
  const dateError = date > today ? "Attendance can't be taken for a future date." : undefined

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const ready = institute && selectedClass && year && section && date && !dateError
  const rows = ready
    ? attendanceSheet(students, records, institute.id, {
        yearId: Number(year),
        classId: selectedClass.id,
        sectionId: section.id,
        medium,
        groupId: param("group") ? Number(param("group")) : null,
        version: param("version"),
      }, date)
    : []
  const missing = [
    !institute && "institute",
    !selectedClass && "class",
    !year && "academic year",
    !section && "section",
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Take Attendance By Admin</CardTitle>
          <CardDescription>
            Pick a section and a day, tick the students who were present and save. Taking
            attendance again for the same day updates it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) =>
                setParam({
                  institute: v,
                  branch: "",
                  medium: "",
                  class: "",
                  group: "",
                  year: "",
                  version: "",
                  shift: "",
                  section: "",
                })
              }
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={param("branch")}
              onChange={(v) => setParam({ branch: v, section: "" })}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          {institute?.enableMedium && (
            <FilterField
              label="Medium"
              value={medium}
              onChange={(v) => setParam({ medium: v, class: "", group: "", section: "" })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          <FilterField
            label="Class"
            required
            value={param("class")}
            onChange={(v) => setParam({ class: v, group: "", section: "" })}
            options={classes
              .filter((c) => c.status === "Active" && (!medium || !c.medium || c.medium === medium))
              .map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="Select class"
            disabled={!institute}
          />
          {classGroups.length > 0 && (
            <FilterField
              label="Academic group"
              value={param("group")}
              onChange={(v) => setParam({ group: v, section: "" })}
              options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          <FilterField
            label="Academic year"
            required
            value={year}
            onChange={(v) => setParam({ year: v })}
            options={years.map((y) => ({
              value: String(y.id),
              label: y.isCurrent ? `${y.name} (current)` : y.name,
            }))}
            placeholder="Select year"
            disabled={!institute}
          />
          {institute?.enableVersion && (
            <FilterField
              label="Version"
              value={param("version")}
              onChange={(v) => setParam({ version: v, section: "" })}
              options={academicVersions.map((v) => ({ value: v, label: v }))}
              allLabel="All versions"
            />
          )}
          {institute?.enableShift && (
            <FilterField
              label="Shift"
              value={param("shift")}
              onChange={(v) => setParam({ shift: v, section: "" })}
              options={shifts.map((s) => ({ value: String(s.id), label: s.name }))}
              allLabel="All shifts"
            />
          )}
          <FilterField
            label="Section"
            required
            value={section ? String(section.id) : ""}
            onChange={(v) => setParam({ section: v })}
            options={classSections.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder={selectedClass ? "Select section" : "Pick a class first"}
            disabled={!selectedClass}
          />
          <DateField
            value={date}
            max={today}
            onChange={(v) => setParam({ date: v === today ? "" : v })}
            error={dateError}
          />
        </CardContent>
      </Card>

      {ready ? (
        <DailyAttendanceSheet
          key={`${section.id}|${year}|${date}|${medium}|${param("group")}|${param("version")}|${savedKey(rows)}`}
          institute={institute}
          sectionId={section.id}
          rows={rows}
          date={date}
          title={`${selectedClass.name}, Section ${section.name}`}
          note={dayOffNote(institute, holidays, date, selectedClass.medium || medium)}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarDaysIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">
              {dateError ? "Pick a day up to today." : `Select the ${missing.join(", ")}.`}
            </p>
            <p className="text-sm text-muted-foreground">
              The section&apos;s students are listed here to take attendance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
