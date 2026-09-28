"use client"

import { CircleAlertIcon, DownloadIcon, PrinterIcon } from "lucide-react"

import { PrintArea } from "@/components/reports/print-area"
import { SectionStudentFilterFields, useSectionStudentFilter } from "@/components/reports/section-student-filter"
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { holidayStore } from "@/lib/holidays"
import type { Institute } from "@/lib/institutes"
import { monthlyAttendanceRegister, type AttendanceRegister } from "@/lib/monthly-attendance-report"
import { orientations, pageSizeFor, paperSizes, ROWS_PER_PAGE } from "@/lib/report-paper"
import { downloadCsv, useSmsMessages } from "@/lib/sms-messages"
import { todayIso, useStudentAttendance } from "@/lib/student-attendance"
import { MAX_DAYS } from "@/lib/student-attendance-report"
import { studentInformation } from "@/lib/student-information"
import { useStudents } from "@/lib/students"
import { cn, parseInlineStyle } from "@/lib/utils"

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

// Legacy Partial/_monthlyAttendanceReport: pages of `rowsPerPage` students,
// each with the institute heading, the date range, class, group, version
// and section, then the register — months over day numbers, a mark per
// day, and each student's present, absent and SMS sent — and "Page x of y".
function RegisterSheet({
  institute,
  from,
  to,
  info,
  register,
  rowsPerPage,
}: {
  institute: Institute
  from: string
  to: string
  info: [label: string, value: string][]
  register: AttendanceRegister
  rowsPerPage: number
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const accent = config.admitCardColor1.trim() || highlight
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const td = "border border-black px-0.5 py-0.5 text-center"
  const pages = Array.from({ length: Math.ceil(register.rows.length / rowsPerPage) }, (_, p) =>
    register.rows.slice(p * rowsPerPage, (p + 1) * rowsPerPage)
  )
  const vertical = "[writing-mode:vertical-rl] rotate-180 font-normal whitespace-nowrap"

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
              <h2 style={parseInlineStyle(config.reportNameStyle)}>Monthly Attendance Report</h2>
            </div>
            <div style={{ width: logoWidth }} className="shrink-0" />
          </header>
          <p className="flex items-center justify-end gap-2 text-base">
            Date:
            <strong className="border border-black px-3 py-0.5" style={{ color: accent }}>
              {shortDate(from)} To {shortDate(to)}
            </strong>
          </p>
          <table className="w-full border-collapse text-[15px]">
            <tbody>
              <tr>
                {info.map(([label, value]) => (
                  <td key={label} className="border border-black px-1.5 py-1">
                    {label} :{" "}
                    <strong style={{ color: highlight }} className="ml-1">
                      {value}
                    </strong>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse text-[11px] leading-tight">
            <thead>
              <tr className="font-bold">
                <th className={cn(td, "w-8")} rowSpan={2}>
                  SL
                </th>
                <th className={cn(td, "min-w-32")} rowSpan={2}>
                  Student Name
                </th>
                <th className={cn(td, "w-10")} rowSpan={2}>
                  Roll
                </th>
                {register.months.map((m) => (
                  <th key={m.label} className={td} colSpan={m.days}>
                    {m.label}
                  </th>
                ))}
                {["Present", "Absent", "Sms Send"].map((label) => (
                  <th key={label} className={cn(td, "h-16 w-6")} rowSpan={2}>
                    <span className={vertical}>{label}</span>
                  </th>
                ))}
              </tr>
              <tr>
                {register.days.map((date) => (
                  <th key={date} className={cn(td, "font-normal")}>
                    {Number(date.slice(8))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.map((row, i) => (
                <tr key={row.student.id}>
                  <td className={td}>{p * rowsPerPage + i + 1}</td>
                  <td className={cn(td, "max-w-40 truncate px-1 text-left")}>{row.student.name}</td>
                  <td className={td}>{row.enrolment.classRoll}</td>
                  {row.marks.map((mark, d) => (
                    <td
                      key={register.days[d]}
                      className={cn(td, (mark === "A" || mark === "N/A") && "text-red-600", mark === "N/A" && "text-[9px]")}
                    >
                      {mark}
                    </td>
                  ))}
                  <td className={td}>{row.present}</td>
                  <td className={td}>{row.absent}</td>
                  <td className={td}>{row.smsCount}</td>
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

// Legacy RptAttendance/MonthlyAttendanceReport: pick a section (class, year
// and section; branch, medium, group and version where the institute uses
// them — a roll narrows it to one student) and a date range — this month so
// far by default — and see the attendance register, with the paper,
// orientation and rows per page to print on. The filters live in the URL.
export function MonthlyAttendanceReport() {
  const f = useSectionStudentFilter()
  const { institute, academicClass, section, selection, param, setParam } = f
  const students = useStudents()
  const attendance = useStudentAttendance()
  const sms = useSmsMessages()
  const name = useStudentLookups()
  const holidays = holidayStore.useList(institute?.id ?? -1)

  const today = todayIso()
  const monthStart = `${today.slice(0, 8)}01`
  const isoOr = (key: string, fallback: string) => (/^\d{4}-\d{2}-\d{2}$/.test(param(key)) ? param(key) : fallback)
  const from = isoOr("from", monthStart)
  const to = isoOr("to", today)
  const rangeInvalid = from > to

  const rowsParam = Number.parseInt(param("rows"), 10)
  const rowsPerPage = rowsParam >= ROWS_PER_PAGE.min && rowsParam <= ROWS_PER_PAGE.max ? rowsParam : ROWS_PER_PAGE.default
  const paper = paperSizes.find((p) => p.value === param("paper")) ?? paperSizes[0]
  const orientation = orientations.find((o) => o.value === param("orientation")) ?? orientations[0]

  const register =
    institute && selection && !rangeInvalid
      ? monthlyAttendanceRegister(
          institute,
          studentInformation(institute, students, { ...selection, classYearSubjects: [], subjectRank: () => 0 }),
          { attendance, sms, holidays },
          from,
          to
        )
      : undefined
  const problem = f.problem ?? (rangeInvalid ? "The From date is after the To date" : "No Data Found")

  const info: [string, string][] = [
    ["Class", academicClass?.name ?? "All"],
    ["Group", f.filter.group ? name("group", Number(f.filter.group)) : "All"],
    ["Version", f.filter.version || "All"],
    ["Section", section?.name ?? "All"],
  ]

  function exportCsv() {
    if (!register) return
    downloadCsv(
      `attendance-register-${section?.name ?? "section"}-${from}-to-${to}.csv`,
      ["SL", "Student Name", "Roll", ...register.days, "Present", "Absent", "Sms Send"],
      register.rows.map((r, i) => [i + 1, r.student.name, r.enrolment.classRoll, ...r.marks, r.present, r.absent, r.smsCount])
    )
  }

  const sheet = institute && register && register.rows.length > 0 && (
    <RegisterSheet institute={institute} from={from} to={register.days.at(-1) ?? to} info={info} register={register} rowsPerPage={rowsPerPage} />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Monthly Attendance Report</CardTitle>
          <CardDescription>A section&apos;s attendance register over a date range.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SectionStudentFilterFields filter={f} />
          <Field>
            <FieldLabel htmlFor="register-from">From</FieldLabel>
            <Input
              id="register-from"
              type="date"
              value={from}
              onChange={(ev) => setParam({ from: ev.target.value === monthStart ? "" : ev.target.value })}
            />
          </Field>
          <Field data-invalid={rangeInvalid}>
            <FieldLabel htmlFor="register-to">To</FieldLabel>
            <Input
              id="register-to"
              type="date"
              value={to}
              onChange={(ev) => setParam({ to: ev.target.value === today ? "" : ev.target.value })}
              aria-invalid={rangeInvalid}
            />
            {rangeInvalid && <FieldError>Must be on or after the From date.</FieldError>}
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
            <FieldLabel htmlFor="register-rows">
              Rows per page ({ROWS_PER_PAGE.min}–{ROWS_PER_PAGE.max})
            </FieldLabel>
            <Input
              id="register-rows"
              type="number"
              min={ROWS_PER_PAGE.min}
              max={ROWS_PER_PAGE.max}
              placeholder={String(ROWS_PER_PAGE.default)}
              value={param("rows")}
              onChange={(ev) => setParam({ rows: ev.target.value.replace(/\D/g, "") })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Monthly Attendance Report</CardTitle>
            <CardDescription>
              {sheet
                ? `${academicClass?.name} · ${section?.name} · ${register.rows.length} student${register.rows.length === 1 ? "" : "s"} · ${register.days.length} day${register.days.length === 1 ? "" : "s"}${register.days.length === MAX_DAYS ? ` (first ${MAX_DAYS})` : ""} · print on ${paper.label} ${orientation.label.toLowerCase()}`
                : "Pick a section and a date range."}
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
              <div className="min-w-[56rem]">{sheet}</div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleAlertIcon className="size-4 shrink-0" />
              {problem}
            </p>
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize={pageSizeFor(paper, orientation)}>{sheet}</PrintArea>}
    </div>
  )
}
