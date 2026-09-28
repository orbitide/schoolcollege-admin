"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CircleAlertIcon } from "lucide-react"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { branchStore, classStore, groupStore, sectionStore, yearStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums } from "@/lib/institutes"
import { useMeritLists } from "@/lib/merit-lists"
import { resultSummaryProblem } from "@/lib/result-summary"
import { useTermExams } from "@/lib/term-exams"

// The exam picker the RptSummary reports share: institute, branch, medium,
// class, year, then an exam whose merit list is generated (legacy
// MeritListGeneratedExam) — or any exam, for a report that works on the marks
// alone (`meritList: false`). The filters live in the URL (?exam= opens an
// exam directly, as the legacy TermExamId does); other params, such as a
// report's own options, are kept as the filters change.
export function useExamReportFilter({ meritList = true }: { meritList?: boolean } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const exams = useTermExams()
  const meritLists = useMeritLists()

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

  const examOptions =
    institute && filter.class && filter.year
      ? exams
          .filter(
            (e) =>
              e.instituteId === institute.id &&
              e.status !== "Deleted" &&
              (!meritList || listFor.has(e.id)) &&
              String(e.classId) === filter.class &&
              String(e.yearId) === filter.year &&
              (!filter.branch || String(e.branchId) === filter.branch) &&
              (!filter.medium || e.medium === filter.medium)
          )
          .sort((a, b) => a.rank - b.rank)
      : []
  const chosen = exam && examOptions.some((e) => e.id === exam.id) ? exam : undefined
  // The chosen exam's sections: of its class, and of its branch and group when it sets them.
  const examSections = chosen
    ? sections.filter(
        (s) =>
          s.classId === chosen.classId &&
          (chosen.branchId == null || s.branchId == null || s.branchId === chosen.branchId) &&
          (chosen.groupId == null || s.groupId == null || s.groupId === chosen.groupId)
      )
    : []

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams()
    const next = {
      ...Object.fromEntries(searchParams),
      institute: institute ? String(institute.id) : "",
      ...filter,
      exam: exam ? String(exam.id) : "",
      ...updates,
    }
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value)
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  return {
    institutes,
    institute,
    filter,
    examOptions,
    // The exam in the URL, even when the filters no longer offer it.
    exam,
    // The exam to report on: the URL's, when it fits the filters (and has a
    // merit list, unless `meritList` is off).
    chosen,
    list: chosen && listFor.get(chosen.id),
    meritList,
    // Legacy's checks, in its words; null when the report can be shown.
    problem: meritList
      ? resultSummaryProblem(exam, exam && listFor.get(exam.id))
      : exam
        ? null
        : "Select an Exam",
    academicClass: classes.find((c) => String(c.id) === filter.class),
    branch: chosen?.branchId != null ? branches.find((b) => b.id === chosen.branchId) : undefined,
    branches,
    classes,
    years,
    sections,
    examSections,
    groups,
    param,
    setParam,
  }
}

export type ExamReportFilter = ReturnType<typeof useExamReportFilter>

export function ExamReportFilterFields({ filter: f }: { filter: ExamReportFilter }) {
  const { institutes, institute, filter, examOptions, chosen, setParam } = f
  return (
    <>
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
          options={f.branches.map((b) => ({ value: String(b.id), label: b.name }))}
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
        options={f.classes.map((c) => ({ value: String(c.id), label: c.name }))}
        placeholder="Select class"
        disabled={!institute}
      />
      <FilterField
        label="Academic year"
        required
        value={filter.year}
        onChange={(v) => setParam({ year: v, exam: "" })}
        options={f.years.map((y) => ({ value: String(y.id), label: y.name }))}
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
          filter.class && filter.year && !examOptions.length
            ? f.meritList
              ? "No exam with a merit list"
              : "No exam"
            : "Select exam"
        }
        disabled={!examOptions.length}
      />
    </>
  )
}

// What the report card shows in place of the report: why there is none.
export function ExamReportEmpty({
  filter: f,
  empty,
  emptyMessage = "No Student result found",
}: {
  filter: ExamReportFilter
  empty: boolean
  emptyMessage?: string
}) {
  const noExam = f.filter.class && f.filter.year && !f.examOptions.length
  return (
    <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
      <p className="flex items-center gap-2">
        <CircleAlertIcon className="size-4 shrink-0" />
        {empty ? emptyMessage : (f.problem ?? "Select an Exam")}
      </p>
      {noExam && !f.meritList && <p>No exam of this class and year yet.</p>}
      {noExam && f.meritList && (
        <p>
          No exam of this class and year has a merit list yet.{" "}
          <Link href="/term-exam/merit-list" className="font-medium text-foreground underline underline-offset-4">
            Generate merit list
          </Link>
        </p>
      )}
    </div>
  )
}
