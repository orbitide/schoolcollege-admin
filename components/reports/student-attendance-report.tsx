"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CircleAlertIcon, DownloadIcon, PrinterIcon } from "lucide-react"

import { PrintArea } from "@/components/reports/print-area"
import { classRollLabel, useStudentLookups } from "@/components/students/student-lookups"
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
import { branchStore, classStore, holidayStore, yearStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, type Institute } from "@/lib/institutes"
import { downloadCsv, useSmsMessages } from "@/lib/sms-messages"
import { todayIso, useStudentAttendance } from "@/lib/student-attendance"
import {
  DAYS_PER_PAGE,
  findStudentByRoll,
  MAX_DAYS,
  studentAttendanceReport,
  type AttendanceDay,
  type StudentAttendanceReport,
} from "@/lib/student-attendance-report"
import { useStudents } from "@/lib/students"
import { cn, parseInlineStyle } from "@/lib/utils"

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

const statusClass = (s: AttendanceDay["status"]) =>
  s === "Present" ? "text-green-600" : s === "Absent" || s === "N/A" ? "text-red-600" : "tracking-[3px]"

// Legacy Partial/_studentAttendanceReport: pages of 32 days, each with the
// institute heading, the date range, the student's class details and
// mobiles, the totals, then the days — date, status and SMS sent — and
// "Page x of y".
function StudentAttendanceSheet({
  institute,
  info,
  from,
  to,
  report,
}: {
  institute: Institute
  info: [label: string, value: string][]
  from: string
  to: string
  report: StudentAttendanceReport
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const accent = config.admitCardColor1.trim() || highlight
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const td = "border border-black px-1.5 py-0.5 text-center"
  const pages = Array.from({ length: Math.ceil(report.days.length / DAYS_PER_PAGE) }, (_, p) =>
    report.days.slice(p * DAYS_PER_PAGE, (p + 1) * DAYS_PER_PAGE)
  )
  const t = report.totals
  const totals: [string, number][] = [
    ["Total Working Day", t.workingDays],
    ["Total Present", t.present],
    ["Total Absent", t.absent],
    ["Total Holiday", t.holidays],
    ["Total Weekend", t.weekends],
    ["Total Sms Send", t.sms],
  ]

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
              <h2 style={parseInlineStyle(config.reportNameStyle)}>Student&apos;s Individual Attendance Report</h2>
            </div>
            <div style={{ width: logoWidth }} className="shrink-0" />
          </header>
          <p className="flex flex-wrap items-center justify-end gap-2 text-base">
            From:
            <strong className="border border-black px-3 py-0.5" style={{ color: accent }}>
              {longDate(from)}
            </strong>
            To:
            <strong className="border border-black px-3 py-0.5" style={{ color: accent }}>
              {longDate(to)}
            </strong>
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[15px]">
            {info.map(([label, value]) => (
              <span key={label} className="flex items-center justify-between gap-2">
                {label} :
                <strong className="border border-black px-2 text-center" style={{ color: highlight }}>
                  {value || "-"}
                </strong>
              </span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-1 border border-black p-1.5 text-[15px]">
            {totals.map(([label, value]) => (
              <span key={label}>
                {label} : <strong style={{ color: highlight }}>{value}</strong>
              </span>
            ))}
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={cn(td, "w-[10%]")}>SL</th>
                <th className={cn(td, "w-[30%]")}>Date</th>
                <th className={cn(td, "w-[30%]")}>Status</th>
                <th className={cn(td, "w-[30%]")}>Sms Send</th>
              </tr>
            </thead>
            <tbody>
              {page.map((day, i) => (
                <tr key={day.date}>
                  <td className={td}>{p * DAYS_PER_PAGE + i + 1}</td>
                  <td className={td}>{longDate(day.date)}</td>
                  <td
                    className={cn(td, "font-bold", statusClass(day.status))}
                    style={day.status === "Holiday" || day.status === "Weekend" ? { color: accent } : undefined}
                  >
                    {day.status}
                  </td>
                  <td className={td}>{day.smsCount}</td>
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

// Legacy RptAttendance/StudentAttendanceReport: pick a class, year and roll
// (branch and medium where the institute uses them) and a date range —
// this month so far by default — and see the student's attendance day by
// day. The filters live in the URL.
export function StudentAttendanceReportPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const students = useStudents()
  const attendance = useStudentAttendance()
  const sms = useSmsMessages()
  const name = useStudentLookups()

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute =
    institutes.length === 1 ? institutes[0] : institutes.find((i) => String(i.id) === param("institute"))
  const iid = institute?.id ?? -1
  const branches = branchStore.useList(iid)
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const holidays = holidayStore.useList(iid)

  const today = todayIso()
  const monthStart = `${today.slice(0, 8)}01`
  const isoOr = (key: string, fallback: string) => (/^\d{4}-\d{2}-\d{2}$/.test(param(key)) ? param(key) : fallback)
  const from = isoOr("from", monthStart)
  const to = isoOr("to", today)
  const branch = institute?.enableBranch ? branches.find((b) => String(b.id) === param("branch")) : undefined
  const medium = institute?.enableMedium ? param("medium") : ""
  const academicClass = classes.find((c) => String(c.id) === param("class"))
  const year = years.find((y) => String(y.id) === param("year")) ?? years.find((y) => y.isCurrent)
  const roll = param("roll")
  const rollInvalid = !!roll && !/^\d+$/.test(roll)

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    if (institute) params.set("institute", String(institute.id))
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const found =
    institute && academicClass && year && roll && !rollInvalid
      ? findStudentByRoll(institute, students, {
          classId: academicClass.id,
          yearId: year.id,
          branchId: branch?.id ?? null,
          medium,
          roll,
        })
      : undefined
  const rangeInvalid = from > to
  const report =
    institute && found && !rangeInvalid
      ? studentAttendanceReport(institute, found.student, found.enrolment, { attendance, sms, holidays }, from, to)
      : undefined

  const problem = !institute
    ? "Select an institute"
    : !academicClass || !year
      ? "Select a class and year"
      : !roll
        ? "Enter a roll"
        : rollInvalid
          ? "Please enter valid roll no."
          : !found
            ? "Invalid Roll No."
            : rangeInvalid
              ? "The From date is after the To date"
              : null

  const e = found?.enrolment
  const info: [string, string][] =
    found && e && academicClass
      ? [
          ...(institute?.enableBranch ? [["Branch", name("branch", e.branchId)] as [string, string]] : []),
          ...(institute?.enableMedium ? [["Medium", e.medium] as [string, string]] : []),
          ...(institute?.enableVersion ? [["Version", e.version] as [string, string]] : []),
          ["Class", academicClass.name],
          ...(institute?.enableGroup && academicClass.hasSubjectGroup
            ? [["Group", e.groupId != null ? name("group", e.groupId) : ""] as [string, string]]
            : []),
          ["Section", e.sectionId != null ? name("section", e.sectionId) : ""],
          ...(institute?.enableShift ? [["Shift", e.shiftId != null ? name("shift", e.shiftId) : ""] as [string, string]] : []),
          ["Roll", e.classRoll],
          ["Student Name", found.student.name],
          ["Mobile(own)", found.student.primaryMobile],
          ["Father's Mobile", found.student.fatherMobile],
          ["Mother's Mobile", found.student.motherMobile],
        ]
      : []

  function exportCsv() {
    if (!report || !found) return
    downloadCsv(
      `attendance-${found.enrolment.classRoll}-${from}-to-${to}.csv`,
      ["SL", "Date", "Status", "Sms Send"],
      report.days.map((d, i) => [i + 1, d.date, d.status, d.smsCount])
    )
  }

  const sheet = institute && report && (
    <StudentAttendanceSheet institute={institute} info={info} from={from} to={to} report={report} />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Student&apos;s Individual Attendance Report</CardTitle>
          <CardDescription>One student&apos;s attendance day by day over a date range.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {institutes.length > 1 && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, branch: "", medium: "", class: "", year: "", roll: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={branch ? String(branch.id) : ""}
              onChange={(v) => setParam({ branch: v })}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          {institute?.enableMedium && (
            <FilterField
              label="Medium"
              value={medium}
              onChange={(v) => setParam({ medium: v })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          <FilterField
            label="Class"
            required
            value={academicClass ? String(academicClass.id) : ""}
            onChange={(v) => setParam({ class: v })}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="Select class"
            disabled={!institute}
          />
          <FilterField
            label="Academic year"
            required
            value={year ? String(year.id) : ""}
            onChange={(v) => setParam({ year: v })}
            options={years.map((y) => ({ value: String(y.id), label: y.isCurrent ? `${y.name} (current)` : y.name }))}
            placeholder="Select year"
            disabled={!institute}
          />
          <Field data-invalid={rollInvalid}>
            <FieldLabel htmlFor="attendance-roll">
              {classRollLabel(institute)}
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </FieldLabel>
            <Input
              id="attendance-roll"
              inputMode="numeric"
              placeholder="Enter roll"
              value={roll}
              onChange={(ev) => setParam({ roll: ev.target.value.trim() })}
              aria-invalid={rollInvalid}
              disabled={!institute}
            />
            {rollInvalid && <FieldError>Please enter valid roll no.</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="attendance-from">From</FieldLabel>
            <Input
              id="attendance-from"
              type="date"
              value={from}
              onChange={(ev) => setParam({ from: ev.target.value === monthStart ? "" : ev.target.value })}
            />
          </Field>
          <Field data-invalid={rangeInvalid}>
            <FieldLabel htmlFor="attendance-to">To</FieldLabel>
            <Input
              id="attendance-to"
              type="date"
              value={to}
              onChange={(ev) => setParam({ to: ev.target.value === today ? "" : ev.target.value })}
              aria-invalid={rangeInvalid}
            />
            {rangeInvalid && <FieldError>Must be on or after the From date.</FieldError>}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Student&apos;s Individual Attendance Report</CardTitle>
            <CardDescription>
              {report && found
                ? `${found.student.name} · roll ${found.enrolment.classRoll} · ${report.totals.present} present, ${report.totals.absent} absent of ${report.totals.workingDays} working days${report.days.length === MAX_DAYS ? ` (first ${MAX_DAYS} days shown)` : ""}`
                : "Pick a class, year, roll and date range."}
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
              <div className="mx-auto max-w-[52rem] min-w-[36rem]">{sheet}</div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleAlertIcon className="size-4 shrink-0" />
              {problem}
            </p>
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="216mm 356mm">{sheet}</PrintArea>}
    </div>
  )
}
