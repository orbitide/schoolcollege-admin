"use client"

import { CalendarOffIcon, CircleAlertIcon, DownloadIcon, PrinterIcon } from "lucide-react"

import { AttendanceFilterFields, useAttendanceFilter } from "@/components/reports/attendance-filter"
import { PrintArea } from "@/components/reports/print-area"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { holidayStore } from "@/lib/holidays"
import {
  attendanceStatuses,
  dailyAttendanceReport,
  type AttendanceStatusFilter,
  type DailyAttendanceRow,
} from "@/lib/daily-attendance-report"
import type { Institute } from "@/lib/institutes"
import { FONT_SIZE, orientations, pageSizeFor, paperSizes, ROWS_PER_PAGE } from "@/lib/report-paper"
import { downloadCsv, useSmsMessages } from "@/lib/sms-messages"
import { useStudentAttendance } from "@/lib/student-attendance"
import { useStudents } from "@/lib/students"
import { cn, parseInlineStyle } from "@/lib/utils"

const statusText = (r: DailyAttendanceRow) => (r.isPresent == null ? "N/A" : r.isPresent ? "Present" : "Absent")

// Legacy Partial/_dailyAttendanceReport: pages of `rowsPerPage`, each with
// the institute heading, the date, the filter and head counts, then the
// students — section, roll, name, mobile, status and SMS sent — and
// "Page x of y".
function DailyAttendanceSheet({
  institute,
  title,
  date,
  info,
  rows,
  rowsPerPage,
  fontSize,
  name,
}: {
  institute: Institute
  title: string
  date: string
  info: [label: string, value: string | number][]
  rows: DailyAttendanceRow[]
  rowsPerPage: number
  fontSize: number
  name: (kind: "section", id: number | null) => string
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const dateColor = config.admitCardColor1.trim() || highlight
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const td = "border border-black px-1.5 py-0.5 text-center"
  const pages = Array.from({ length: Math.ceil(rows.length / rowsPerPage) }, (_, p) =>
    rows.slice(p * rowsPerPage, (p + 1) * rowsPerPage)
  )
  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  return (
    <div className="flex flex-col gap-10 bg-white font-serif text-sm text-black">
      {pages.map((page, p) => (
        <section key={p} className="flex break-after-page flex-col gap-3 last:break-after-auto">
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
              <h2 style={parseInlineStyle(config.reportNameStyle)}>{title}</h2>
            </div>
            <div style={{ width: logoWidth }} className="shrink-0" />
          </header>
          <p className="flex items-center justify-end gap-2 text-base">
            Date:
            <strong className="border border-black px-3 py-0.5" style={{ color: dateColor }}>
              {displayDate}
            </strong>
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[15px] sm:grid-cols-4">
            {info.map(([label, value]) => (
              <span key={label} className="flex items-center justify-between gap-2">
                {label} :
                <strong className="min-w-[4rem] border border-black px-2 text-center" style={{ color: highlight }}>
                  {value}
                </strong>
              </span>
            ))}
          </div>

          <table className="w-full border-collapse" style={{ fontSize }}>
            <thead>
              <tr>
                <th className={cn(td, "w-[5%]")}>SL</th>
                <th className={cn(td, "w-[12%]")}>Section</th>
                <th className={cn(td, "w-[12%]")}>Roll</th>
                <th className={cn(td, "text-left")}>Student Name</th>
                <th className={cn(td, "w-[12%]")}>Mobile</th>
                <th className={cn(td, "w-[10%]")}>Status</th>
                <th className={cn(td, "w-[10%]")}>Sms Send</th>
              </tr>
            </thead>
            <tbody>
              {page.map((r, i) => (
                <tr key={r.student.id}>
                  <td className={td}>{p * rowsPerPage + i + 1}</td>
                  <td className={td}>{name("section", r.enrolment.sectionId)}</td>
                  <td className={td}>{r.enrolment.classRoll}</td>
                  <td className={cn(td, "text-left")}>{r.student.name}</td>
                  <td className={td}>{r.student.primaryMobile}</td>
                  <td className={cn(td, "font-bold", r.isPresent ? "text-green-600" : "text-red-600")}>
                    {statusText(r)}
                  </td>
                  <td className={td}>{r.smsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-right font-bold">
            Page {p + 1} of {pages.length}
          </p>
        </section>
      ))}
    </div>
  )
}

// Legacy RptAttendance/DailyAttendanceReport: pick a day and the students
// (institute, branch, medium, class, year, group, version, shift, section,
// roll; all optional but the year) and see who was present, absent or not
// taken, with the paper, orientation, rows per page and font size to print
// on. Everything lives in the URL.
export function DailyAttendanceReportPage() {
  const f = useAttendanceFilter()
  const { institute, selection, date, param, setParam } = f
  const students = useStudents()
  const attendance = useStudentAttendance()
  const sms = useSmsMessages()
  const name = useStudentLookups()
  const holidays = holidayStore.useList(institute?.id ?? -1)
  const status: AttendanceStatusFilter = attendanceStatuses.find((s) => s.value === param("status"))?.value ?? "all"
  const roll = param("roll")

  const clamp = (key: string, { min, max, default: fallback }: { min: number; max: number; default: number }) => {
    const n = Number.parseInt(param(key), 10)
    return n >= min && n <= max ? n : fallback
  }
  const rowsPerPage = clamp("rows", ROWS_PER_PAGE)
  const fontSize = clamp("font", FONT_SIZE)
  const paper = paperSizes.find((p) => p.value === param("paper")) ?? paperSizes[0]
  const orientation = orientations.find((o) => o.value === param("orientation")) ?? orientations[0]
  const pageSize = pageSizeFor(paper, orientation)

  const rank = (list: { id: number; rank: number }[]) => new Map(list.map((r) => [r.id, r.rank]))
  const report =
    institute && selection
      ? dailyAttendanceReport(
          institute,
          { students, attendance, sms, holidays, classRank: rank(f.classes), sectionRank: rank(f.sections) },
          { ...selection, roll, status }
        )
      : undefined

  const statusTitle = attendanceStatuses.find((s) => s.value === status)!.label
  const info: [string, string | number][] = report
    ? [
        ...f.info,
        ["Total Student", report.totals.students],
        ["Total Present", report.totals.present],
        ["Total Absent", report.totals.absent],
        ["Total Sms Count", report.totals.sms],
      ]
    : []

  function exportCsv() {
    if (!report) return
    downloadCsv(
      `daily-attendance-${date}${status === "all" ? "" : `-${status}`}.csv`,
      ["SL", "Class", "Section", "Roll", "Student Name", "Mobile", "Status", "Sms Send"],
      report.rows.map((r, i) => [
        i + 1,
        name("class", r.enrolment.classId),
        name("section", r.enrolment.sectionId),
        r.enrolment.classRoll,
        r.student.name,
        r.student.primaryMobile,
        statusText(r),
        r.smsCount,
      ])
    )
  }

  const sheet = institute && report && report.rows.length > 0 && (
    <DailyAttendanceSheet
      institute={institute}
      title={`Daily Attendance Report (${statusTitle})`}
      date={date}
      info={info}
      rows={report.rows}
      rowsPerPage={rowsPerPage}
      fontSize={fontSize}
      name={name}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Daily Attendance Report</CardTitle>
          <CardDescription>Who was present, absent or not taken on a day, with the attendance SMS sent.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AttendanceFilterFields filter={f} />
          <FilterField
            label="Status"
            value={status}
            onChange={(v) => setParam({ status: v === "all" ? "" : v })}
            options={attendanceStatuses.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Field>
            <FieldLabel htmlFor="daily-roll">Roll</FieldLabel>
            <Input
              id="daily-roll"
              inputMode="numeric"
              placeholder="All students, or one roll"
              value={roll}
              onChange={(e) => setParam({ roll: e.target.value.trim() })}
              disabled={!institute}
            />
          </Field>
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
          <Field>
            <FieldLabel htmlFor="daily-rows">
              Rows per page ({ROWS_PER_PAGE.min}–{ROWS_PER_PAGE.max})
            </FieldLabel>
            <Input
              id="daily-rows"
              type="number"
              min={ROWS_PER_PAGE.min}
              max={ROWS_PER_PAGE.max}
              placeholder={String(ROWS_PER_PAGE.default)}
              value={param("rows")}
              onChange={(e) => setParam({ rows: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="daily-font">
              Font size ({FONT_SIZE.min}–{FONT_SIZE.max}px)
            </FieldLabel>
            <Input
              id="daily-font"
              type="number"
              min={FONT_SIZE.min}
              max={FONT_SIZE.max}
              placeholder={String(FONT_SIZE.default)}
              value={param("font")}
              onChange={(e) => setParam({ font: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Daily Attendance Report ({statusTitle})</CardTitle>
            <CardDescription>
              {sheet
                ? `${report.totals.students} students · ${report.totals.present} present · ${report.totals.absent} absent · ${report.totals.sms} SMS · print on ${paper.label} ${orientation.label.toLowerCase()}`
                : "Pick a day and the students to report on."}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!sheet}>
              <DownloadIcon data-icon="inline-start" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!sheet}>
              <PrinterIcon data-icon="inline-start" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sheet ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="min-w-[40rem]">{sheet}</div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {report?.dayOff ? (
                <CalendarOffIcon className="size-4 shrink-0" />
              ) : (
                <CircleAlertIcon className="size-4 shrink-0" />
              )}
              {!institute
                ? "Select an institute"
                : !f.year
                  ? "Select a year"
                  : report?.dayOff
                    ? `No attendance: ${report.dayOff}`
                    : "No Data Found"}
            </p>
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize={pageSize}>{sheet}</PrintArea>}
    </div>
  )
}
