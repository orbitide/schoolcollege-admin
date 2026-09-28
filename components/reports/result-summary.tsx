"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CircleAlertIcon, DownloadIcon, PrinterIcon } from "lucide-react"

import { PrintArea } from "@/components/reports/print-area"
import { ResultSummarySheet } from "@/components/reports/result-summary-sheet"
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
import { branchStore, classStore, groupStore, sectionStore, yearStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums } from "@/lib/institutes"
import { useMeritLists } from "@/lib/merit-lists"
import { passPercent, resultSummary, resultSummaryProblem, type ResultCounts } from "@/lib/result-summary"
import { downloadCsv } from "@/lib/sms-messages"
import { useStudents } from "@/lib/students"
import { useTermExams } from "@/lib/term-exams"

// Legacy RptSummary/ResultSummary ("Result at a glance"): pick an exam whose
// merit list is generated and see its results per section. The filters live
// in the URL (?exam= opens an exam directly, as the legacy TermExamId does)
// and the report follows them as they change.
export function ResultSummary() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const exams = useTermExams()
  const meritLists = useMeritLists()
  const students = useStudents()
  const name = useStudentLookups()

  const param = (key: string) => searchParams.get(key) ?? ""
  const allowed = new Map(institutes.map((i) => [i.id, i]))
  const listFor = new Map(meritLists.map((l) => [l.termExamId, l]))
  const exam = exams.find(
    (e) => String(e.id) === param("exam") && e.status !== "Deleted" && allowed.has(e.instituteId)
  )
  // An exam in the URL fills in the filters it belongs to.
  const institute =
    institutes.length === 1
      ? institutes[0]
      : (institutes.find((i) => String(i.id) === param("institute")) ??
        (exam && allowed.get(exam.instituteId)))
  const iid = institute?.id ?? -1
  const filter = {
    branch: param("branch") || (exam?.branchId != null ? String(exam.branchId) : ""),
    medium: param("medium") || exam?.medium || "",
    class: param("class") || (exam ? String(exam.classId) : ""),
    year: param("year") || (exam ? String(exam.yearId) : ""),
  }

  const branches = branchStore.useList(iid)
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const groups = groupStore.useList(iid)

  // Only exams with a merit list, as the legacy MeritListGeneratedExam.
  const examOptions =
    institute && filter.class && filter.year
      ? exams
          .filter(
            (e) =>
              e.instituteId === institute.id &&
              e.status !== "Deleted" &&
              listFor.has(e.id) &&
              String(e.classId) === filter.class &&
              String(e.yearId) === filter.year &&
              (!filter.branch || String(e.branchId) === filter.branch) &&
              (!filter.medium || e.medium === filter.medium)
          )
          .sort((a, b) => a.rank - b.rank)
      : []
  const chosen = exam && examOptions.some((e) => e.id === exam.id) ? exam : undefined
  const list = chosen && listFor.get(chosen.id)
  const problem = resultSummaryProblem(exam, exam && listFor.get(exam.id))
  const summary = chosen && list ? resultSummary(chosen, list, students, sections, groups) : undefined
  const academicClass = classes.find((c) => String(c.id) === filter.class)
  const branch = chosen?.branchId != null ? branches.find((b) => b.id === chosen.branchId) : undefined

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams()
    const next = { institute: institute ? String(institute.id) : "", ...filter, exam: exam ? String(exam.id) : "", ...updates }
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value)
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  function exportCsv() {
    if (!chosen || !summary) return
    const counts = (c: ResultCounts) => [
      c.total,
      c.appeared,
      ...(chosen.calculateGpa ? c.grades : []),
      c.passed,
      c.failed,
      c.absent,
      passPercent(c).toFixed(2),
    ]
    const grouped = institute?.enableGroup && academicClass?.hasSubjectGroup
    downloadCsv(
      `result-at-a-glance-${chosen.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
      [
        ...(grouped ? ["Group"] : []),
        ...(institute?.enableVersion ? ["Version"] : []),
        "Section",
        "Total Student",
        "Total Appeared",
        ...(chosen.calculateGpa ? summary.grades.map((g) => `GPA ${g.name}`) : []),
        "Total Passed",
        "Total Failed",
        "Total Absent",
        "Passed Percentage",
      ],
      [
        ...summary.rows.map((r) => [
          ...(grouped ? [name("group", r.groupId)] : []),
          ...(institute?.enableVersion ? [r.version] : []),
          name("section", r.sectionId),
          ...counts(r),
        ]),
        [...(grouped ? [""] : []), ...(institute?.enableVersion ? [""] : []), "Total", ...counts(summary.total)],
      ]
    )
  }

  const empty = summary && !summary.rows.length
  const sheet = chosen && summary && institute && !empty && (
    <ResultSummarySheet
      institute={institute}
      branch={branch}
      academicClass={academicClass}
      exam={chosen}
      summary={summary}
      name={name}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Result at a glance</CardTitle>
          <CardDescription>
            How many students of each section sat the exam, passed, failed or were absent, and how
            many passed with each grade.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {institutes.length > 1 && (
            <FilterField
              label="Institute"
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, branch: "", medium: "", class: "", year: "", exam: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={filter.branch}
              onChange={(v) => setParam({ branch: v, exam: "" })}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          {institute?.enableMedium && (
            <FilterField
              label="Medium"
              value={filter.medium}
              onChange={(v) => setParam({ medium: v, exam: "" })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          <FilterField
            label="Class"
            required
            value={filter.class}
            onChange={(v) => setParam({ class: v, exam: "" })}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="Select class"
            disabled={!institute}
          />
          <FilterField
            label="Academic year"
            required
            value={filter.year}
            onChange={(v) => setParam({ year: v, exam: "" })}
            options={years.map((y) => ({ value: String(y.id), label: y.name }))}
            placeholder="Select year"
            disabled={!institute}
          />
          <FilterField
            label="Term exam"
            required
            value={chosen ? String(chosen.id) : ""}
            onChange={(v) => setParam({ exam: v })}
            options={examOptions.map((e) => ({ value: String(e.id), label: e.fullName }))}
            placeholder={
              filter.class && filter.year && !examOptions.length ? "No exam with a merit list" : "Select exam"
            }
            disabled={!examOptions.length}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Result Summary Report</CardTitle>
            <CardDescription>
              {summary && chosen
                ? `${chosen.fullName} · ${summary.rows.length} section${summary.rows.length === 1 ? "" : "s"} · ${summary.total.total} students`
                : "Only exams with a generated merit list can be reported."}
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
              <div className="min-w-[48rem]">{sheet}</div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <CircleAlertIcon className="size-4 shrink-0" />
                {empty ? "No Student result found" : (problem ?? "Select an Exam")}
              </p>
              {filter.class && filter.year && !examOptions.length && (
                <p>
                  No exam of this class and year has a merit list yet.{" "}
                  <Link href="/term-exam/merit-list" className="font-medium text-foreground underline underline-offset-4">
                    Generate merit list
                  </Link>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="356mm 216mm">{sheet}</PrintArea>}
    </div>
  )
}
