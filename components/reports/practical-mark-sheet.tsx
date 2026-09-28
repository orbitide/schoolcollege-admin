"use client"

import { PrinterIcon } from "lucide-react"

import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
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
import { classYearSubjectStore, subjectStore } from "@/lib/academic-store"
import type { Institute } from "@/lib/institutes"
import { useStudents, type Enrolment, type Student } from "@/lib/students"
import { subjectStudents } from "@/lib/subject-student-list"
import { cn, parseInlineStyle } from "@/lib/utils"

// Legacy firstPageCount / SecondPageCount: students on each printed page.
const STUDENTS_PER_PAGE = 35

// Legacy Partial/_practicalMarkSheet: pages of 35 students, each with the
// institute heading, the exam, class, group, section and subject, then the
// students with blank Note Book, Viva, Written and Total columns to fill in
// by hand, and "Page x of y".
function PracticalMarkSheetSheet({
  institute,
  examName,
  details,
  rows,
}: {
  institute: Institute
  examName: string
  details: [label: string, value: string][]
  rows: { student: Student; enrolment: Enrolment }[]
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const td = "border border-black px-1.5 py-1"
  const pages = Array.from({ length: Math.ceil(rows.length / STUDENTS_PER_PAGE) }, (_, p) =>
    rows.slice(p * STUDENTS_PER_PAGE, (p + 1) * STUDENTS_PER_PAGE)
  )

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
              <h2 style={parseInlineStyle(config.reportNameStyle)}>Practical Mark Collection Sheet</h2>
            </div>
            <div style={{ width: logoWidth }} className="shrink-0" />
          </header>
          <p className="mx-auto border border-black px-2.5 py-1.5">
            Name of Examination :{" "}
            <strong className="text-base" style={{ color: highlight }}>
              {examName}
            </strong>
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {details.map(([label, value]) => (
              <p key={label} className="border border-black px-2.5 py-1.5">
                {label} :{" "}
                <strong className="text-base" style={{ color: highlight }}>
                  {value}
                </strong>
              </p>
            ))}
          </div>

          <table className="w-full border-collapse text-center">
            <thead>
              <tr>
                <th className={cn(td, "w-[7%] font-normal")}>Sl</th>
                <th className={cn(td, "w-[10%] font-normal")}>Roll</th>
                <th className={cn(td, "font-normal")}>Student Name</th>
                {["Note Book", "Viva", "Written", "Total"].map((label) => (
                  <th key={label} className={cn(td, "w-[11%] font-normal")}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.map(({ student, enrolment }, i) => (
                <tr key={student.id}>
                  <td className={td}>{p * STUDENTS_PER_PAGE + i + 1}</td>
                  <td className={td}>{enrolment.classRoll}</td>
                  <td className={cn(td, "text-left whitespace-nowrap")}>{student.name}</td>
                  <td className={td} />
                  <td className={td} />
                  <td className={td} />
                  <td className={td} />
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

// Legacy RptResult/PracticalMarkSheet ("Practical Mark Collection Sheet"):
// pick an exam, a section and one of the exam's practical subjects, and
// print a blank sheet listing the section's students who take it, for the
// practical marks to be written in. Everything lives in the URL.
export function PracticalMarkSheet() {
  const f = useExamReportFilter({ meritList: false })
  const { institute, chosen, academicClass } = f
  const iid = institute?.id ?? -1
  const students = useStudents()
  const name = useStudentLookups()
  const subjects = subjectStore.useList(iid)
  const sets = classYearSubjectStore.useList(iid)

  const section = f.examSections.find((s) => String(s.id) === f.param("section"))
  // Legacy LoadTermExamSubjectByPracticalMcq(withPractical): the exam's subjects with practical marks.
  const practical = (chosen?.subjects ?? []).filter((s) => s.practicalMarks > 0)
  const subject = practical.find((s) => String(s.subjectId) === f.param("subject"))
  const byId = new Map(subjects.map((s) => [s.id, s]))
  const subjectName = (id: number) => byId.get(id)?.name ?? name("subject", id)
  const subjectCode = (id: number) => byId.get(id)?.code.trim() || subjectName(id)

  const rows =
    institute && chosen && section && subject
      ? subjectStudents(
          institute,
          students,
          sets,
          {
            classId: chosen.classId,
            yearId: chosen.yearId,
            sectionId: section.id,
            branchId: chosen.branchId,
            medium: chosen.medium,
            groupId: chosen.groupId,
            version: chosen.version,
          },
          subject.subjectId
        )
      : undefined

  const sheet = institute && chosen && section && subject && rows && rows.length > 0 && (
    <PracticalMarkSheetSheet
      institute={institute}
      examName={chosen.name}
      details={[
        ["Class", academicClass?.name ?? "—"],
        ["Group", chosen.groupId != null ? name("group", chosen.groupId) : "All"],
        ["Section", section.name],
        ["Subject", subjectCode(subject.subjectId)],
      ]}
      rows={rows}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Practical Mark Collection Sheet</CardTitle>
          <CardDescription>
            A blank sheet of a section&apos;s students in a practical subject, for the marks to be
            written in.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExamReportFilterFields filter={f} />
          <FilterField
            label="Section"
            required
            value={section ? String(section.id) : ""}
            onChange={(v) => f.setParam({ section: v })}
            options={f.examSections.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Select section"
            disabled={!chosen}
          />
          <FilterField
            label="Subject"
            required
            value={subject ? String(subject.subjectId) : ""}
            onChange={(v) => f.setParam({ subject: v })}
            options={practical.map((s) => ({
              value: String(s.subjectId),
              label: `${subjectName(s.subjectId)} (${subjectCode(s.subjectId)})`,
            }))}
            placeholder={chosen && !practical.length ? "No practical subject" : "Select subject"}
            disabled={!practical.length}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Practical Mark Collection Sheet</CardTitle>
            <CardDescription>
              {sheet
                ? `${chosen.fullName} · ${section.name} · ${subjectName(subject.subjectId)} · ${rows.length} student${rows.length === 1 ? "" : "s"}`
                : "Pick an exam, a section and a practical subject."}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!sheet}>
            <PrinterIcon data-icon="inline-start" />
            Print
          </Button>
        </CardHeader>
        <CardContent>
          {sheet ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="mx-auto max-w-[52rem] min-w-[36rem]">{sheet}</div>
            </div>
          ) : chosen && !(section && subject) ? (
            <ExamReportEmpty
              filter={f}
              empty
              emptyMessage={
                !practical.length
                  ? `${chosen.name} has no subject with practical marks`
                  : !section
                    ? "Select a section"
                    : "Select a subject"
              }
            />
          ) : (
            <ExamReportEmpty filter={f} empty={!!rows} emptyMessage="No Student Found" />
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="210mm 297mm">{sheet}</PrintArea>}
    </div>
  )
}
