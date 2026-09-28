"use client"

import Link from "next/link"
import { DownloadIcon, PrinterIcon } from "lucide-react"

import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { subjectStore } from "@/lib/academic-store"
import { useExamAttendance } from "@/lib/exam-attendance"
import {
  examAttendanceSummary,
  type ExamAttendanceSummary as Summary,
  type SubjectCount,
} from "@/lib/exam-attendance-summary"
import { academicVersions, type AcademicClass, type Institute } from "@/lib/institutes"
import { downloadCsv } from "@/lib/sms-messages"
import { useStudents } from "@/lib/students"
import type { TermExam } from "@/lib/term-exams"
import { cn, parseInlineStyle } from "@/lib/utils"

const statuses = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
] as const
type Status = (typeof statuses)[number]["value"]

const th = "border border-black px-1.5 py-1 text-center font-semibold"
const td = "border border-black px-1.5 py-1 text-center tabular-nums"

type ReportLink = (row: { subjectId: number; sectionId?: number; groupId?: number | null; version?: string }) => string

// Legacy Partial/_examAttendanceSummaryReport: the institute heading, the
// exam and class, then a row per section under its group and version —
// its students and, per subject, how many were present (or absent), with
// `details` "count/taken" — and the subject totals. A count opens those
// students in the Exam Attendance Report.
function ExamAttendanceSummarySheet({
  institute,
  exam,
  academicClass,
  status,
  details,
  summary,
  name,
  subjectLabel,
  link,
}: {
  institute: Institute
  exam: TermExam
  academicClass?: AcademicClass
  status: Status
  details: boolean
  summary: Summary
  name: (kind: "group" | "section", id: number | null) => string
  subjectLabel: (id: number) => string
  link?: ReportLink
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const showGroup = institute.enableGroup
  const showVersion = institute.enableVersion
  const lead = 1 + Number(showGroup) + Number(showVersion)
  const statusLabel = statuses.find((s) => s.value === status)!.label
  const cell = (c: SubjectCount | undefined, href: string | undefined) => {
    if (!c) return "-"
    const value = c[status]
    const shown = href ? (
      <Link href={href} className="underline-offset-2 hover:underline print:no-underline">
        {value}
      </Link>
    ) : (
      value
    )
    return details ? (
      <>
        {shown}
        <strong>/</strong>
        {c.taken}
      </>
    ) : (
      shown
    )
  }

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
          <h2 style={parseInlineStyle(config.reportNameStyle)}>Exam Attendance at a glance ({statusLabel})</h2>
        </div>
        <div style={{ width: logoWidth }} className="shrink-0" />
      </header>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[15px]">
        {(
          [
            ["Exam Name", exam.name],
            ["Class", academicClass?.name ?? "—"],
          ] as const
        ).map(([label, value]) => (
          <span key={label} className="flex items-center gap-2">
            {label}:
            <strong className="border border-black px-3 py-0.5" style={{ color: highlight }}>
              {value}
            </strong>
          </span>
        ))}
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            {showGroup && <th className={th}>Group</th>}
            {showVersion && <th className={th}>Version</th>}
            <th className={th}>Section</th>
            <th className={th}>Total Student</th>
            {summary.subjectIds.map((id) => (
              <th key={id} className={th}>
                {subjectLabel(id)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summary.rows.map((row, i) => {
            const groupSpan = spanAt(summary.rows, i, (r) => String(r.groupId))
            const versionSpan = spanAt(summary.rows, i, (r) => `${r.groupId}|${r.version}`)
            return (
              <tr key={`${row.sectionId}-${row.groupId}-${row.version}`}>
                {showGroup && groupSpan > 0 && (
                  <td className={td} rowSpan={groupSpan}>
                    {row.groupId != null ? name("group", row.groupId) : "—"}
                  </td>
                )}
                {showVersion && versionSpan > 0 && (
                  <td className={td} rowSpan={versionSpan}>
                    {row.version || "—"}
                  </td>
                )}
                <td className={td}>{name("section", row.sectionId)}</td>
                <td className={td}>{row.students}</td>
                {summary.subjectIds.map((id) => (
                  <td key={id} className={td}>
                    {cell(
                      row.subjects.get(id),
                      link?.({ subjectId: id, sectionId: row.sectionId, groupId: row.groupId, version: row.version })
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="font-bold" style={{ color: highlight }}>
            <td className={cn(td, "text-right text-black")} colSpan={lead}>
              Total=
            </td>
            <td className={td}>{summary.students}</td>
            {summary.subjectIds.map((id) => (
              <td key={id} className={td}>
                {cell(summary.subjects.get(id), link?.({ subjectId: id }))}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// Legacy RptAttendance/ExamAttendanceSummaryReport: pick an exam, whether to
// count who sat or who was absent — a group, version or section to narrow
// it — and see the counts per section and subject. Everything lives in the URL.
export function ExamAttendanceSummary() {
  const f = useExamReportFilter({ meritList: false })
  const { institute, chosen, academicClass, param, setParam } = f
  const students = useStudents()
  const records = useExamAttendance()
  const name = useStudentLookups()
  const subjects = subjectStore.useList(institute?.id ?? -1)

  const section = f.examSections.find((s) => String(s.id) === param("section"))
  const groupOptions =
    institute?.enableGroup && academicClass?.hasSubjectGroup && chosen?.groupId == null
      ? f.groups.filter((g) => academicClass.groupIds.includes(g.id))
      : []
  const group = groupOptions.find((g) => String(g.id) === param("group"))
  const version = institute?.enableVersion && !chosen?.version ? param("version") : ""
  const status: Status = statuses.find((s) => s.value === param("status"))?.value ?? "present"
  const details = param("details") === "on"

  const byId = new Map(subjects.map((s) => [s.id, s]))
  const subjectLabel = (id: number) => byId.get(id)?.code.trim() || byId.get(id)?.name || name("subject", id)
  const rank = (list: { id: number; rank: number }[]) => new Map(list.map((r) => [r.id, r.rank]))

  const summary = chosen
    ? examAttendanceSummary(
        chosen,
        records,
        students,
        { sectionId: section?.id, groupId: group?.id, version },
        { group: rank(f.groups), section: rank(f.sections) }
      )
    : undefined
  const anyTaken = summary ? [...summary.subjects.values()].some((c) => c.taken > 0) : false

  // A count opens the Exam Attendance Report on the same exam, narrowed to the cell.
  const link: ReportLink = (row) => {
    const params = new URLSearchParams()
    const set = (key: string, value: string | number | null | undefined) => {
      if (value != null && value !== "") params.set(key, String(value))
    }
    set("institute", institute?.id)
    set("branch", f.filter.branch)
    set("medium", f.filter.medium)
    set("class", f.filter.class)
    set("year", f.filter.year)
    set("exam", chosen?.id)
    set("subject", row.subjectId)
    set("section", row.sectionId ?? section?.id)
    set("group", row.groupId ?? group?.id)
    set("version", row.version ?? version)
    set("status", status)
    return `/reports/exam-attendance?${params}`
  }

  function exportCsv() {
    if (!summary || !chosen) return
    downloadCsv(
      `exam-attendance-summary-${status}-${chosen.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
      ["Group", "Version", "Section", "Total Student", ...summary.subjectIds.flatMap((id) => [subjectLabel(id), `${subjectLabel(id)} taken`])],
      [
        ...summary.rows.map((r) => [
          r.groupId != null ? name("group", r.groupId) : "",
          r.version,
          name("section", r.sectionId),
          r.students,
          ...summary.subjectIds.flatMap((id): (string | number)[] => {
            const c = r.subjects.get(id)
            return c ? [c[status], c.taken] : ["", ""]
          }),
        ]),
        ["", "", "Total", summary.students, ...summary.subjectIds.flatMap((id): (string | number)[] => {
          const c = summary.subjects.get(id)
          return c ? [c[status], c.taken] : ["", ""]
        })],
      ]
    )
  }

  const sheetProps = institute && chosen && summary && summary.rows.length > 0 && anyTaken && {
    institute,
    exam: chosen,
    academicClass,
    status,
    details,
    summary,
    name,
    subjectLabel,
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Exam Attendance Summary Report</CardTitle>
          <CardDescription>How many of each section sat (or missed) each subject of an exam.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExamReportFilterFields filter={f} />
          <FilterField
            label="Status"
            required
            value={status}
            onChange={(v) => setParam({ status: v === "present" ? "" : v })}
            options={statuses.map((s) => ({ value: s.value, label: s.label }))}
          />
          {groupOptions.length > 0 && (
            <FilterField
              label="Group"
              value={group ? String(group.id) : ""}
              onChange={(v) => setParam({ group: v, section: "" })}
              options={groupOptions.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          {institute?.enableVersion && !chosen?.version && (
            <FilterField
              label="Version"
              value={version}
              onChange={(v) => setParam({ version: v })}
              options={academicVersions.map((v) => ({ value: v, label: v }))}
              allLabel="All versions"
            />
          )}
          <FilterField
            label="Section"
            value={section ? String(section.id) : ""}
            onChange={(v) => setParam({ section: v })}
            options={f.examSections.map((s) => ({ value: String(s.id), label: s.name }))}
            allLabel="All sections"
            disabled={!chosen}
          />
          <Field orientation="horizontal" className="self-end pb-2">
            <Checkbox
              id="exam-attendance-details"
              checked={details}
              onCheckedChange={(checked) => setParam({ details: checked === true ? "on" : "" })}
            />
            <FieldLabel htmlFor="exam-attendance-details">Details (count / attendance taken)</FieldLabel>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Exam Attendance at a glance</CardTitle>
            <CardDescription>
              {sheetProps
                ? `${chosen.fullName} · ${statuses.find((s) => s.value === status)!.label.toLowerCase()} per section and subject. A count opens those students.`
                : "Pick an exam."}
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
              <div className="min-w-[40rem]">
                <ExamAttendanceSummarySheet {...sheetProps} link={link} />
              </div>
            </div>
          ) : (
            <ExamReportEmpty
              filter={f}
              empty={!!summary}
              emptyMessage={summary?.rows.length ? "Attendance hasn't been taken for this exam yet" : "No Data Found"}
            />
          )}
        </CardContent>
      </Card>

      {sheetProps && (
        <PrintArea pageSize="216mm 356mm">
          <ExamAttendanceSummarySheet {...sheetProps} />
        </PrintArea>
      )}
    </div>
  )
}
