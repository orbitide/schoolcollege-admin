"use client"

import { DownloadIcon, PrinterIcon } from "lucide-react"

import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { subjectStore } from "@/lib/academic-store"
import { attendanceStatuses, type AttendanceStatusFilter } from "@/lib/daily-attendance-report"
import { examAttendanceSheet, useExamAttendance, type ExamAttendanceRow } from "@/lib/exam-attendance"
import { academicVersions, type Institute } from "@/lib/institutes"
import { ROWS_PER_PAGE } from "@/lib/report-paper"
import { downloadCsv } from "@/lib/sms-messages"
import { useStudents } from "@/lib/students"
import { rollGrid, ROLLS_PER_COLUMN } from "@/lib/subject-student-list"
import { cn, parseInlineStyle } from "@/lib/utils"

// Legacy firstPageCountForRoll: rolls on each page of the roll-only list.
const ROLLS_PER_PAGE = ROLLS_PER_COLUMN * 5

type TakenRow = ExamAttendanceRow & { record: NonNullable<ExamAttendanceRow["record"]> }

// Legacy Partial/_examAttendanceReport: pages with the institute heading,
// the exam and subject, class, group, version and section and the head
// counts, then either the students — section (when all are listed), roll,
// name, mobile, present or absent — or, with `onlyRoll`, just their rolls
// down columns of 25; and "Page x of y".
function ExamAttendanceSheet({
  institute,
  title,
  examName,
  subjectName,
  info,
  rows,
  rowsPerPage,
  onlyRoll,
  showSection,
  name,
}: {
  institute: Institute
  title: string
  examName: string
  subjectName: string
  info: [label: string, value: string | number][]
  rows: TakenRow[]
  rowsPerPage: number
  onlyRoll: boolean
  showSection: boolean
  name: (kind: "section", id: number | null) => string
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const td = "border border-black px-1.5 py-0.5 text-center"
  const perPage = onlyRoll ? ROLLS_PER_PAGE : rowsPerPage
  const pages = Array.from({ length: Math.ceil(rows.length / perPage) }, (_, p) => rows.slice(p * perPage, (p + 1) * perPage))

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
          <div className="flex flex-wrap items-center justify-between gap-2 text-base">
            <p className="border border-black px-2.5 py-1">
              Exam : <strong style={{ color: highlight }}>{examName}</strong>
            </p>
            <p className="border border-black px-2.5 py-1">
              Subject : <strong style={{ color: highlight }}>{subjectName}</strong>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[15px] sm:grid-cols-4">
            {info.map(([label, value]) => (
              <span key={label} className="flex items-center justify-between gap-2">
                {label} :
                <strong className="min-w-[3rem] border border-black px-2 text-center" style={{ color: highlight }}>
                  {value}
                </strong>
              </span>
            ))}
          </div>

          {onlyRoll ? (
            <table className="w-full border-collapse text-center leading-6 tabular-nums">
              <tbody>
                {rollGrid(page.map((r) => r.enrolment.classRoll)).map((row, r) => (
                  <tr key={r}>
                    {row.map((roll, c) => (
                      <td key={c} className="border border-black px-1">
                        {roll}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={cn(td, "w-[5%]")}>SL</th>
                  {showSection && <th className={cn(td, "w-[12%]")}>Section</th>}
                  <th className={cn(td, "w-[12%]")}>Roll</th>
                  <th className={cn(td, "text-left")}>Student Name</th>
                  <th className={cn(td, "w-[12%]")}>Mobile</th>
                  <th className={cn(td, "w-[10%]")}>Status</th>
                </tr>
              </thead>
              <tbody>
                {page.map((r, i) => (
                  <tr key={r.student.id}>
                    <td className={td}>{p * perPage + i + 1}</td>
                    {showSection && <td className={td}>{name("section", r.enrolment.sectionId)}</td>}
                    <td className={td}>{r.enrolment.classRoll}</td>
                    <td className={cn(td, "text-left")}>{r.student.name}</td>
                    <td className={td}>{r.student.primaryMobile}</td>
                    <td className={cn(td, "font-bold", r.record.isPresent ? "text-green-600" : "text-red-600")}>
                      {r.record.isPresent ? "Present" : "Absent"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-right font-bold">
            Page {p + 1} of {pages.length}
          </p>
        </section>
      ))}
    </div>
  )
}

// Legacy RptAttendance/ExamAttendanceReport: pick an exam and one of its
// subjects — a section, group, version or roll to narrow it — and see who
// sat it and who was absent; Present or Absent only, or just the rolls
// (e.g. a list of absentees to post). Everything lives in the URL.
export function ExamAttendanceReport() {
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
  const subject = chosen?.subjects.find((s) => String(s.subjectId) === param("subject"))
  const status: AttendanceStatusFilter = attendanceStatuses.find((s) => s.value === param("status"))?.value ?? "all"
  const roll = param("roll")
  const onlyRoll = param("only") === "roll"
  const rowsParam = Number.parseInt(param("rows"), 10)
  const rowsPerPage = rowsParam >= ROWS_PER_PAGE.min && rowsParam <= ROWS_PER_PAGE.max ? rowsParam : ROWS_PER_PAGE.default

  const byId = new Map(subjects.map((s) => [s.id, s]))
  const subjectName = (id: number) => byId.get(id)?.name ?? name("subject", id)

  // Legacy lists the students whose attendance was taken for the subject.
  const sheet = chosen && subject ? examAttendanceSheet(chosen, subject.subjectId, {
    sectionId: section?.id,
    groupId: group?.id,
    version,
  }, records, students).filter((r) => !roll || r.enrolment.classRoll.trim() === roll) : undefined
  const taken = sheet?.filter((r): r is TakenRow => r.record != null) ?? []
  const notTaken = (sheet?.length ?? 0) - taken.length
  const totals = {
    students: taken.length,
    present: taken.filter((r) => r.record.isPresent).length,
    absent: taken.filter((r) => !r.record.isPresent).length,
  }
  const rows = status === "all" ? taken : taken.filter((r) => r.record.isPresent === (status === "present"))

  const statusTitle = status === "all" ? "" : ` (${attendanceStatuses.find((s) => s.value === status)!.label})`
  const info: [string, string | number][] = [
    ["Class", academicClass?.name ?? "—"],
    ["Group", group?.name ?? (chosen?.groupId != null ? name("group", chosen.groupId) : "All")],
    ["Version", version || chosen?.version || "All"],
    ["Section", section?.name ?? "All"],
    ["Total Student", totals.students],
    ["Total Present", totals.present],
    ["Total Absent", totals.absent],
  ]

  function exportCsv() {
    if (!chosen || !subject) return
    downloadCsv(
      `exam-attendance-${chosen.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${subjectName(subject.subjectId).toLowerCase().replace(/[^a-z0-9]+/g, "-")}${status === "all" ? "" : `-${status}`}.csv`,
      ["SL", "Section", "Roll", "Student Name", "Mobile", "Status"],
      rows.map((r, i) => [
        i + 1,
        name("section", r.enrolment.sectionId),
        r.enrolment.classRoll,
        r.student.name,
        r.student.primaryMobile,
        r.record.isPresent ? "Present" : "Absent",
      ])
    )
  }

  const printable = institute && chosen && subject && rows.length > 0 && (
    <ExamAttendanceSheet
      institute={institute}
      title={`Exam Attendance Report${statusTitle}`}
      examName={chosen.name}
      subjectName={subjectName(subject.subjectId)}
      info={info}
      rows={rows}
      rowsPerPage={rowsPerPage}
      onlyRoll={onlyRoll}
      showSection={!section}
      name={name}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Exam Attendance Report</CardTitle>
          <CardDescription>Who sat a subject of an exam and who was absent.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExamReportFilterFields filter={f} />
          <FilterField
            label="Subject"
            required
            value={subject ? String(subject.subjectId) : ""}
            onChange={(v) => setParam({ subject: v })}
            options={(chosen?.subjects ?? []).map((s) => ({ value: String(s.subjectId), label: subjectName(s.subjectId) }))}
            placeholder="Select subject"
            disabled={!chosen}
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
          <FilterField
            label="Status"
            value={status}
            onChange={(v) => setParam({ status: v === "all" ? "" : v })}
            options={attendanceStatuses.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Field>
            <FieldLabel htmlFor="exam-attendance-roll">{classRollLabel(institute)}</FieldLabel>
            <Input
              id="exam-attendance-roll"
              inputMode="numeric"
              placeholder="All students, or one roll"
              value={roll}
              onChange={(e) => setParam({ roll: e.target.value.trim() })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="exam-attendance-rows">
              Rows per page ({ROWS_PER_PAGE.min}–{ROWS_PER_PAGE.max})
            </FieldLabel>
            <Input
              id="exam-attendance-rows"
              type="number"
              min={ROWS_PER_PAGE.min}
              max={ROWS_PER_PAGE.max}
              placeholder={String(ROWS_PER_PAGE.default)}
              value={param("rows")}
              onChange={(e) => setParam({ rows: e.target.value.replace(/\D/g, "") })}
              disabled={onlyRoll}
            />
          </Field>
          <Field orientation="horizontal" className="self-end pb-2">
            <Checkbox
              id="exam-attendance-only-roll"
              checked={onlyRoll}
              onCheckedChange={(checked) => setParam({ only: checked === true ? "roll" : "" })}
            />
            <FieldLabel htmlFor="exam-attendance-only-roll">Only roll</FieldLabel>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Exam Attendance Report{statusTitle}</CardTitle>
            <CardDescription>
              {printable
                ? `${totals.students} students · ${totals.present} present · ${totals.absent} absent${notTaken ? ` · ${notTaken} without attendance taken, not listed` : ""}`
                : "Pick an exam and a subject."}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!printable}>
              <DownloadIcon data-icon="inline-start" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!printable}>
              <PrinterIcon data-icon="inline-start" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {printable ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="mx-auto max-w-[52rem] min-w-[36rem]">{printable}</div>
            </div>
          ) : chosen && !subject ? (
            <ExamReportEmpty filter={f} empty emptyMessage="Select a subject" />
          ) : (
            <ExamReportEmpty
              filter={f}
              empty={!!sheet}
              emptyMessage={
                notTaken && !taken.length ? "Attendance hasn't been taken for this subject yet" : "No Data Found"
              }
            />
          )}
        </CardContent>
      </Card>

      {printable && <PrintArea pageSize="216mm 356mm">{printable}</PrintArea>}
    </div>
  )
}
