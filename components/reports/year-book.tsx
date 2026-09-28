"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CircleAlertIcon, PrinterIcon } from "lucide-react"

import { YearBookSheet } from "@/components/reports/performance-report-sheet"
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
import { branchStore, classStore, classYearSubjectStore, sectionStore, subjectStore, yearStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { useMeritLists } from "@/lib/merit-lists"
import { performanceProblem, yearBook } from "@/lib/performance-report"
import { useStudents } from "@/lib/students"
import { useTermExamMarks } from "@/lib/term-exam-marks"
import { useTermExams } from "@/lib/term-exams"

// Legacy RptResult/YearBook: pick a class, year and section — and a roll,
// for one student — and print a page per student of their results across
// the exams of the class and the one before it. The filters live in the URL.
export function YearBook() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const students = useStudents()
  const exams = useTermExams()
  const meritLists = useMeritLists()
  const marks = useTermExamMarks()
  const name = useStudentLookups()

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute =
    institutes.length === 1 ? institutes[0] : institutes.find((i) => String(i.id) === param("institute"))
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const branches = branchStore.useList(iid)
  const subjects = subjectStore.useList(iid)
  const classYearSubjects = classYearSubjectStore.useList(iid)

  const academicClass = classes.find((c) => String(c.id) === param("class"))
  const year = years.find((y) => String(y.id) === param("year")) ?? years.find((y) => y.isCurrent)
  const sectionOptions = academicClass ? sections.filter((s) => s.classId === academicClass.id) : []
  const section = sectionOptions.find((s) => String(s.id) === param("section"))
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
  // The roll is optional here; only a given one must be digits.
  const rollProblem = roll ? performanceProblem(roll) : null
  const reports =
    institute && academicClass && year && section && !rollProblem
      ? yearBook(institute, academicClass, year.id, section.id, roll, {
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
        : !section
          ? "Select a Section"
          : (rollProblem ?? "No data found")

  const byId = new Map(subjects.map((s) => [s.id, s]))
  const sheet = institute && academicClass && section && reports && reports.length > 0 && (
    <YearBookSheet
      institute={institute}
      branch={institute.enableBranch && section.branchId != null ? branches.find((b) => b.id === section.branchId) : undefined}
      academicClass={academicClass}
      reports={reports}
      sectionName={section.name}
      subjectLabel={(id) => byId.get(id)?.code.trim() || byId.get(id)?.name || name("subject", id)}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Year Book</CardTitle>
          <CardDescription>
            A page per student of a section with their results across the exams of their class and
            the class before it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {institutes.length > 1 && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, class: "", year: "", section: "", roll: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
            />
          )}
          <FilterField
            label="Class"
            required
            value={academicClass ? String(academicClass.id) : ""}
            onChange={(v) => setParam({ class: v, section: "" })}
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
          <FilterField
            label="Section"
            required
            value={section ? String(section.id) : ""}
            onChange={(v) => setParam({ section: v })}
            options={sectionOptions.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Select section"
            disabled={!sectionOptions.length}
          />
          <Field>
            <FieldLabel htmlFor="year-book-roll">{classRollLabel(institute)}</FieldLabel>
            <Input
              id="year-book-roll"
              inputMode="numeric"
              placeholder="All students, or one roll"
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
            <CardTitle>Year Book</CardTitle>
            <CardDescription>
              {sheet
                ? `${academicClass.name} · ${section.name} · ${reports.length} student${reports.length === 1 ? "" : "s"}, a page each`
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
              <div className="mx-auto max-w-[56rem] min-w-[48rem]">{sheet}</div>
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
