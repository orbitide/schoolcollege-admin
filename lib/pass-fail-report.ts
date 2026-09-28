import type { Section } from "@/lib/institutes"
import type { MeritList, MeritResult, StudentSubjectMark } from "@/lib/merit-lists"
import type { Student } from "@/lib/students"
import type { TermExam } from "@/lib/term-exams"

// Legacy RptResult/PassFailReport (TermExamStudentRepository.LoadPassFailResult,
// Partial/_allStudentResultReport): the exam's merit list as a printable
// student list — everyone, only those who passed, those who failed with a
// table per failed subject, or those who failed with the marks of every
// subject they failed. Needs the merit list generated.

export const passFailReportTypes = [
  { value: "all", label: "All", title: "All Student Result Report" },
  { value: "passed", label: "Passed List", title: "Passed Report" },
  { value: "failed", label: "Failed List", title: "Failed Report" },
  { value: "failed-details", label: "Failed Details", title: "Failed Details Report" },
] as const
export type PassFailReportType = (typeof passFailReportTypes)[number]["value"]

export const passFailReportOrders = [
  { value: "merit", label: "Merit Position" },
  { value: "roll", label: "Roll" },
  { value: "section-merit", label: "Section Then Merit Position" },
  { value: "section-roll", label: "Section Then Roll" },
] as const
export type PassFailReportOrder = (typeof passFailReportOrders)[number]["value"]

// Legacy TotalDisplay: rows on each printed page.
export const DEFAULT_ROWS_PER_PAGE = 32

export type PassFailRow = {
  result: MeritResult
  student: Student
  // Failed List: the failed subject's mark.
  mark?: StudentSubjectMark
  // Failed Details: each failed subject with its marks, e.g. "ENG(CQ:20,MCQ:A)".
  details?: string
}

export type PassFailTable = {
  // Failed List: the subject this table lists failures in.
  subjectId: number | null
  rows: PassFailRow[]
}

const byRoll = (a: PassFailRow, b: PassFailRow) =>
  a.result.roll.localeCompare(b.result.roll, undefined, { numeric: true })

// Legacy ORDER BY: merit is fewest failed subjects, then group and section
// position (0 for those without one). Ties, such as the toppers of two
// groups, go by GPA and total marks, then roll.
function rowOrder(order: PassFailReportOrder, sections: Section[]) {
  const rank = new Map(sections.map((s) => [s.id, s.rank]))
  const section = (r: PassFailRow) => rank.get(r.result.sectionId) ?? Infinity
  const merit = (a: PassFailRow, b: PassFailRow) =>
    a.result.failedSubjectCount - b.result.failedSubjectCount ||
    a.result.groupPosition - b.result.groupPosition ||
    a.result.sectionPosition - b.result.sectionPosition ||
    b.result.gpa - a.result.gpa ||
    b.result.totalMarks - a.result.totalMarks ||
    byRoll(a, b)
  switch (order) {
    case "merit":
      return merit
    case "roll":
      return byRoll
    case "section-merit":
      return (a: PassFailRow, b: PassFailRow) => section(a) - section(b) || merit(a, b)
    case "section-roll":
      return (a: PassFailRow, b: PassFailRow) => section(a) - section(b) || byRoll(a, b)
  }
}

// Legacy ResultDetails: a part the subject is marked in, with "A" where the
// student has nothing (the merit list keeps a missing part as 0).
function failedDetails(exam: TermExam, marks: StudentSubjectMark[], label: (id: number) => string) {
  const failed = new Map(marks.filter((m) => !m.isPass).map((m) => [m.subjectId, m]))
  return exam.subjects
    .flatMap((s) => {
      const m = failed.get(s.subjectId)
      if (!m) return []
      const parts = (
        [
          ["Th", s.theoryMarks, m.theory],
          ["CQ", s.cqMarks, m.cq],
          ["MCQ", s.mcqMarks, m.mcq],
          ["Prac", s.practicalMarks, m.practical],
        ] as const
      )
        .filter(([, full]) => full > 0)
        .map(([name, , obtained]) => `${name}:${obtained > 0 ? obtained : "A"}`)
      return parts.length ? [`${label(s.subjectId)}(${parts.join(",")})`] : []
    })
    .join(" ")
}

export function passFailReport(
  exam: TermExam,
  list: MeritList,
  students: Student[],
  sections: Section[],
  options: {
    type: PassFailReportType
    order: PassFailReportOrder
    sectionId?: number
    subjectId?: number
    subjectLabel: (id: number) => string
  }
): PassFailTable[] {
  const studentOf = new Map(students.map((s) => [s.id, s]))
  const failedOnly = options.type === "failed" || options.type === "failed-details"
  const rows = list.results.flatMap((result): PassFailRow[] => {
    const student = studentOf.get(result.studentId)
    if (!student || student.status !== "Active") return []
    if (options.sectionId != null && result.sectionId !== options.sectionId) return []
    if (options.type === "passed" && (!result.isPresent || result.failedSubjectCount > 0)) return []
    if (failedOnly && result.failedSubjectCount === 0) return []
    return [{ result, student }]
  })
  const order = rowOrder(options.order, sections)

  if (options.type === "failed") {
    // A table per subject, in the exam's order, of the students who failed it.
    return exam.subjects
      .filter((s) => options.subjectId == null || s.subjectId === options.subjectId)
      .map((s) => ({
        subjectId: s.subjectId,
        rows: rows
          .flatMap((row) => {
            const mark = row.result.marks.find((m) => m.subjectId === s.subjectId && !m.isPass)
            return mark ? [{ ...row, mark }] : []
          })
          .sort(order),
      }))
      .filter((t) => t.rows.length)
  }

  const listed =
    options.type === "failed-details"
      ? rows.flatMap((row) => {
          const details = failedDetails(exam, row.result.marks, options.subjectLabel)
          return details ? [{ ...row, details }] : []
        })
      : rows
  return listed.length ? [{ subjectId: null, rows: listed.sort(order) }] : []
}

// Each table cut into printed pages of `size` rows (legacy TotalDisplay).
export function paginate(tables: PassFailTable[], size: number) {
  return tables.flatMap((table) => {
    const pages: { subjectId: number | null; rows: PassFailRow[]; first: number }[] = []
    for (let i = 0; i < table.rows.length; i += size) {
      pages.push({ subjectId: table.subjectId, rows: table.rows.slice(i, i + size), first: i })
    }
    return pages
  })
}
