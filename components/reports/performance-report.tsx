"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CircleAlertIcon, PrinterIcon } from "lucide-react"

import { PerformanceReportSheet } from "@/components/reports/performance-report-sheet"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { branchStore, classStore, classYearSubjectStore, subjectStore, yearStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { useMeritLists } from "@/lib/merit-lists"
import { performanceProblem, performanceReport } from "@/lib/performance-report"
import { sectionTeachers } from "@/lib/section-teachers"
import { useStudents } from "@/lib/students"
import { useTeachers } from "@/lib/teachers"
import { useTermExamMarks } from "@/lib/term-exam-marks"
import { useTermExams } from "@/lib/term-exams"

// Legacy RptResult/PerformanceReport: pick a class, year and roll and see
// that student's results across the exams of the class and the one before
// it. The filters live in the URL (?class=&year=&roll=).
export function PerformanceReportPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const students = useStudents()
  const exams = useTermExams()
  const meritLists = useMeritLists()
  const marks = useTermExamMarks()
  const teachers = useTeachers()
  const name = useStudentLookups()

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute =
    institutes.length === 1 ? institutes[0] : institutes.find((i) => String(i.id) === param("institute"))
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const branches = branchStore.useList(iid)
  const subjects = subjectStore.useList(iid)
  const classYearSubjects = classYearSubjectStore.useList(iid)

  const academicClass = classes.find((c) => String(c.id) === param("class"))
  const year = years.find((y) => String(y.id) === param("year")) ?? years.find((y) => y.isCurrent)
  const roll = param("roll")

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

  const rank = new Map(subjects.map((s) => [s.id, s.rank]))
  const rollProblem = performanceProblem(roll)
  const report =
    institute && academicClass && year && !rollProblem
      ? performanceReport(institute, academicClass, year.id, roll, {
          students,
          exams,
          meritLists,
          marks,
          classYearSubjects,
          subjectRank: (id) => rank.get(id) ?? Infinity,
        })
      : undefined
  const problem = !institute
    ? "Select a Institute"
    : !academicClass
      ? "Select a Class"
      : !year
        ? "Select a Year"
        : (rollProblem ?? (!report ? "Invalid Roll" : !report.exams.length ? "Data not found or Invalid Roll" : null))

  const byId = new Map(subjects.map((s) => [s.id, s]))
  const sheet = institute && academicClass && year && report && report.exams.length > 0 && (
    <PerformanceReportSheet
      institute={institute}
      branch={
        institute.enableBranch && report.enrolment.branchId != null
          ? branches.find((b) => b.id === report.enrolment.branchId)
          : undefined
      }
      academicClass={academicClass}
      report={report}
      sectionName={name("section", report.enrolment.sectionId)}
      teacher={
        report.enrolment.sectionId != null
          ? sectionTeachers(teachers, report.enrolment.sectionId, year.id)[0]
          : undefined
      }
      subjectLabel={(id) => byId.get(id)?.code.trim() || byId.get(id)?.name || name("subject", id)}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Performance Report</CardTitle>
          <CardDescription>
            One student&apos;s results across the exams of their class and the class before it, with
            a GPA line from their board exams on.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {institutes.length > 1 && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, class: "", year: "", roll: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
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
          <Field>
            <FieldLabel htmlFor="performance-roll">
              {classRollLabel(institute)}
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </FieldLabel>
            <Input
              id="performance-roll"
              inputMode="numeric"
              placeholder="Enter roll"
              value={roll}
              onChange={(e) => setParam({ roll: e.target.value.trim() })}
              disabled={!institute}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Performance Report</CardTitle>
            <CardDescription>
              {sheet
                ? `${report.student.name} · roll ${report.enrolment.classRoll} · ${report.exams.length} exam${report.exams.length === 1 ? "" : "s"}`
                : "Counts exams shown in the year book, published online, with a generated merit list."}
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
              <div className="mx-auto max-w-[56rem] min-w-[44rem]">{sheet}</div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleAlertIcon className="size-4 shrink-0" />
              {problem}
            </p>
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="210mm 297mm">{sheet}</PrintArea>}
    </div>
  )
}
