"use client"

import Link from "next/link"
import { CalendarOffIcon, CircleAlertIcon, DownloadIcon, PrinterIcon } from "lucide-react"

import { AttendanceFilterFields, useAttendanceFilter } from "@/components/reports/attendance-filter"
import { PrintArea } from "@/components/reports/print-area"
import { spanAt } from "@/components/reports/result-summary-sheet"
import { useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { groupStore } from "@/lib/academic-store"
import { holidayStore } from "@/lib/holidays"
import {
  attendanceSummary,
  presentPercent,
  type AttendanceCounts,
  type AttendanceSummary as Summary,
} from "@/lib/attendance-summary"
import { dailyAttendanceReport } from "@/lib/daily-attendance-report"
import type { Institute } from "@/lib/institutes"
import { orientations, pageSizeFor, paperSizes } from "@/lib/report-paper"
import { downloadCsv, useSmsMessages } from "@/lib/sms-messages"
import { useStudentAttendance } from "@/lib/student-attendance"
import { useStudents } from "@/lib/students"
import { cn, parseInlineStyle } from "@/lib/utils"

const th = "border border-black px-1.5 py-1 text-center font-semibold"
const td = "border border-black px-1.5 py-1 text-center tabular-nums"

type DailyLink = (row: { classId?: number; groupId?: number | null; version?: string; sectionId?: number; status?: "present" | "absent" }) => string

// Legacy Partial/_attendanceSummaryReport: the institute heading and date,
// a table per class — its sections under their group and version, each
// with its students, present, absent, not taken and present % — the
// class's totals, then the grand totals. A count opens those students in
// the Daily Attendance Report.
function AttendanceSummarySheet({
  institute,
  date,
  summary,
  name,
  link,
}: {
  institute: Institute
  date: string
  summary: Summary
  name: (kind: "class" | "group" | "section", id: number | null) => string
  link?: DailyLink
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const accent = config.admitCardColor1.trim() || highlight
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const lead = 2 + Number(institute.enableGroup) + Number(institute.enableVersion)
  const count = (value: number, href?: string) =>
    link && href ? (
      <Link href={href} className="underline-offset-2 hover:underline print:no-underline">
        {value}
      </Link>
    ) : (
      value
    )
  const counts = (c: AttendanceCounts, row: Parameters<DailyLink>[0]) => (
    <>
      <td className={td}>{count(c.students, link?.(row))}</td>
      <td className={td}>{count(c.present, link?.({ ...row, status: "present" }))}</td>
      <td className={td}>{count(c.absent, link?.({ ...row, status: "absent" }))}</td>
      <td className={td}>{c.notTaken}</td>
      <td className={td}>{presentPercent(c).toFixed(2)}</td>
    </>
  )

  return (
    <div className="flex flex-col gap-4 bg-white font-serif text-sm text-black">
      <header className="flex items-center justify-center gap-5">
        <div style={{ width: logoWidth }} className="shrink-0">
          {institute.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institute.logoUrl} alt="" className="h-auto w-full" />
          )}
        </div>
        <div className="flex flex-col items-center text-center">
          <h1 style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</h1>
          <p>{institute.address}</p>
          <h2 style={parseInlineStyle(config.reportNameStyle)}>Attendance Summary</h2>
        </div>
        <div style={{ width: logoWidth }} className="shrink-0" />
      </header>
      <p className="flex items-center justify-end gap-2 text-base">
        Date:
        <strong className="border border-black px-3 py-0.5" style={{ color: accent }}>
          {new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </strong>
      </p>

      {summary.classes.map((cls) => (
        <table key={cls.classId} className="w-full border-collapse break-inside-avoid">
          <thead>
            <tr>
              <th className={th}>Class</th>
              {institute.enableGroup && <th className={th}>Group</th>}
              {institute.enableVersion && <th className={th}>Version</th>}
              <th className={th}>Section</th>
              <th className={th}>Total Student</th>
              <th className={th}>Total Present</th>
              <th className={th}>Total Absent</th>
              <th className={th}>Total N/A</th>
              <th className={th}>Present(%)</th>
            </tr>
          </thead>
          <tbody>
            {cls.sections.map((s, i) => {
              const groupSpan = spanAt(cls.sections, i, (x) => String(x.groupId))
              const versionSpan = spanAt(cls.sections, i, (x) => `${x.groupId}|${x.version}`)
              return (
                <tr key={`${s.sectionId}-${s.groupId}-${s.version}`}>
                  {i === 0 && (
                    <td className={td} rowSpan={cls.sections.length}>
                      {name("class", cls.classId)}
                    </td>
                  )}
                  {institute.enableGroup && groupSpan > 0 && (
                    <td className={td} rowSpan={groupSpan}>
                      {s.groupId != null ? name("group", s.groupId) : "—"}
                    </td>
                  )}
                  {institute.enableVersion && versionSpan > 0 && (
                    <td className={td} rowSpan={versionSpan}>
                      {s.version || "—"}
                    </td>
                  )}
                  <td className={td}>{name("section", s.sectionId)}</td>
                  {counts(s, { classId: cls.classId, groupId: s.groupId, version: s.version, sectionId: s.sectionId })}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold" style={{ color: highlight }}>
              <td className={cn(td, "text-right text-black")} colSpan={lead}>
                Total:
              </td>
              {counts(cls, { classId: cls.classId })}
            </tr>
          </tfoot>
        </table>
      ))}

      <table className="w-full border-collapse break-inside-avoid">
        <thead>
          <tr>
            <th className={th} />
            <th className={th}>Total Students</th>
            <th className={th}>Total Present</th>
            <th className={th}>Total Absent</th>
            <th className={th}>Total N/A</th>
            <th className={th}>Total Present(%)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="font-bold" style={{ color: highlight }}>
            <td className={cn(td, "text-right text-black")}>Grand Total:</td>
            {counts(summary.total, {})}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// Legacy RptAttendance/AttendanceSummary: pick a day and the students
// (institute, branch, medium, class, year, group, version, shift, section;
// all optional but the year) and see the day's attendance counted per
// section, with the paper and orientation to print on. The filters live
// in the URL.
export function AttendanceSummaryPage() {
  const f = useAttendanceFilter()
  const { institute, selection, date, param, setParam } = f
  const students = useStudents()
  const attendance = useStudentAttendance()
  const sms = useSmsMessages()
  const name = useStudentLookups()
  const iid = institute?.id ?? -1
  const holidays = holidayStore.useList(iid)
  const groups = groupStore.useList(iid)

  const paper = paperSizes.find((p) => p.value === param("paper")) ?? paperSizes[0]
  const orientation = orientations.find((o) => o.value === param("orientation")) ?? orientations[0]

  const rank = (list: { id: number; rank: number }[]) => new Map(list.map((r) => [r.id, r.rank]))
  const daily =
    institute && selection
      ? dailyAttendanceReport(
          institute,
          { students, attendance, sms, holidays, classRank: rank(f.classes), sectionRank: rank(f.sections) },
          { ...selection, roll: "", status: "all" }
        )
      : undefined
  const summary = daily
    ? attendanceSummary(daily.rows, { class: rank(f.classes), group: rank(groups), section: rank(f.sections) })
    : undefined

  // A count opens the Daily Attendance Report on the same day and students, narrowed to the row.
  const link: DailyLink = (row) => {
    const params = new URLSearchParams()
    const set = (key: string, value: string | number | null | undefined) => {
      if (value != null && value !== "") params.set(key, String(value))
    }
    set("institute", institute?.id)
    set("date", date)
    set("year", f.year?.id)
    set("branch", f.branch?.id)
    set("medium", f.medium)
    set("class", row.classId ?? f.academicClass?.id)
    set("group", row.groupId ?? f.group?.id)
    set("version", row.version ?? f.version)
    set("shift", f.shift?.id)
    set("section", row.sectionId ?? f.section?.id)
    set("status", row.status)
    return `/reports/daily-attendance?${params}`
  }

  function exportCsv() {
    if (!summary) return
    downloadCsv(
      `attendance-summary-${date}.csv`,
      ["Class", "Group", "Version", "Section", "Total Student", "Total Present", "Total Absent", "Total N/A", "Present(%)"],
      [
        ...summary.classes.flatMap((cls) => [
          ...cls.sections.map((s) => [
            name("class", cls.classId),
            s.groupId != null ? name("group", s.groupId) : "",
            s.version,
            name("section", s.sectionId),
            s.students,
            s.present,
            s.absent,
            s.notTaken,
            presentPercent(s).toFixed(2),
          ]),
          [name("class", cls.classId), "", "", "Total", cls.students, cls.present, cls.absent, cls.notTaken, presentPercent(cls).toFixed(2)],
        ]),
        ["", "", "", "Grand Total", summary.total.students, summary.total.present, summary.total.absent, summary.total.notTaken, presentPercent(summary.total).toFixed(2)],
      ]
    )
  }

  const sheetProps = institute && summary && summary.classes.length > 0 && { institute, date, summary, name }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Attendance Summary</CardTitle>
          <CardDescription>A day&apos;s attendance counted per section, with class and grand totals.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AttendanceFilterFields filter={f} />
          <FilterField
            label="Paper size"
            value={paper.value}
            onChange={(v) => setParam({ paper: v === "legal" ? "" : v })}
            options={paperSizes.map((p) => ({ value: p.value, label: p.label }))}
          />
          <FilterField
            label="Orientation"
            value={orientation.value}
            onChange={(v) => setParam({ orientation: v === "portrait" ? "" : v })}
            options={orientations.map((o) => ({ value: o.value, label: o.label }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Attendance Summary</CardTitle>
            <CardDescription>
              {sheetProps
                ? `${summary.total.students} students · ${summary.total.present} present · ${summary.total.absent} absent · ${summary.total.notTaken} not taken · ${presentPercent(summary.total).toFixed(2)}% present. A count opens those students.`
                : "Pick a day and the students to count."}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!sheetProps}>
              <DownloadIcon data-icon="inline-start" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!sheetProps}>
              <PrinterIcon data-icon="inline-start" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sheetProps ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="min-w-[44rem]">
                <AttendanceSummarySheet {...sheetProps} link={link} />
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {daily?.dayOff ? (
                <CalendarOffIcon className="size-4 shrink-0" />
              ) : (
                <CircleAlertIcon className="size-4 shrink-0" />
              )}
              {!institute
                ? "Select an institute"
                : !f.year
                  ? "Select a year"
                  : daily?.dayOff
                    ? `No attendance: ${daily.dayOff}`
                    : "No Data Found"}
            </p>
          )}
        </CardContent>
      </Card>

      {sheetProps && (
        <PrintArea pageSize={pageSizeFor(paper, orientation)}>
          <AttendanceSummarySheet {...sheetProps} />
        </PrintArea>
      )}
    </div>
  )
}
