import type { ClassYearSubject, Institute } from "@/lib/institutes"
import type { MeritList, MeritResult } from "@/lib/merit-lists"
import type { Enrolment, Student } from "@/lib/students"
import { examStudents, isActiveMark, takesSubject, type TermExamStudentMark } from "@/lib/term-exam-marks"
import type { TermExam, TermExamSubject } from "@/lib/term-exams"

// Legacy RptResult/Tabulation (TermExamStudentService.LoadStudentsTabulationSheet,
// Partial/_tabulation): one section's students of an exam, each with every
// part of every subject they take — theory, CQ, MCQ and practical, with the
// grace marks the exam gives — their subject totals, result and position in
// the section. Needs the merit list generated. The marks come from the saved
// marks, the result and position from the merit list, as the legacy does.

// Legacy perTableStudent: students on each printed page.
export const DEFAULT_STUDENTS_PER_PAGE = 10

export const tabulationParts = [
  { key: "theory", label: "Theory", marks: "theoryMarks", pass: "theoryPassMarks", grace: "theoryGraceMarks" },
  { key: "cq", label: "CQ", marks: "cqMarks", pass: "cqPassMarks", grace: "cqGraceMarks" },
  { key: "mcq", label: "MCQ", marks: "mcqMarks", pass: "mcqPassMarks", grace: "mcqGraceMarks" },
  { key: "practical", label: "Practical", marks: "practicalMarks", pass: "practicalPassMarks", grace: null },
] as const
export type TabulationPart = (typeof tabulationParts)[number]["key"]

// The legacy's three blocks of subject columns: compulsory, elective, and
// the student's 4th (optional) subject.
export const subjectKinds = [
  { key: "compulsory", label: "Compulsory Subject" },
  { key: "elective", label: "Elective Subject" },
  { key: "optional", label: "4th Sub" },
] as const
export type SubjectKind = (typeof subjectKinds)[number]["key"]

// `failed` marks what the legacy prints red and underlined: a part or total
// short of its pass marks, on a student who failed.
export type TabulationCell = { text: string; failed: boolean }

export type TabulationSubject = {
  subjectId: number
  kind: SubjectKind
  // Null where the exam doesn't mark the subject in that part ("-").
  parts: Record<TabulationPart, TabulationCell | null>
  total: TabulationCell
  // The parts' marks with grace added up (0 when absent).
  marks: number
}

export type TabulationStudent = {
  result: MeritResult
  student: Student
  enrolment: Enrolment
  passed: boolean
  // GPA when the exam calculates it (the legacy shows nothing for a failed
  // student, who has no letter grade), otherwise the total marks.
  resultText: string
  // The latest board exam GPA, e.g. "SSC GPA-5.00"; "" when there is none.
  previousGpa: string
  subjects: TabulationSubject[]
  // The parts any of the student's subjects is marked in: a row each.
  parts: TabulationPart[]
}

export type Tabulation = {
  students: TabulationStudent[]
  passed: number
}

const byRoll = (a: TabulationStudent, b: TabulationStudent) =>
  a.result.roll.localeCompare(b.result.roll, undefined, { numeric: true })

// The subject's type in the class's year (legacy MAX(SubjectType) over the
// class-year subject sets): the later of the types it's listed with.
const typeRank = ["Compulsory", "Elective", "Elective/Optional", "Optional"]
function subjectTypes(exam: TermExam, sets: ClassYearSubject[]) {
  const types = new Map<number, number>()
  for (const set of sets) {
    if (set.status !== "Active" || set.classId !== exam.classId || set.yearId !== exam.yearId) continue
    for (const d of set.details)
      types.set(d.subjectId, Math.max(types.get(d.subjectId) ?? 0, typeRank.indexOf(d.subjectType)))
  }
  return types
}

// Legacy: an English-medium student's A/O Level GPA, anyone else's HSC,
// SSC or JSC — the latest they have.
function previousGpa(student: Student, englishMedium: boolean) {
  const exams = englishMedium
    ? ([["A Level", "A-Level"], ["O Level", "O-Level"]] as const)
    : ([["HSC", "HSC"], ["SSC", "SSC"], ["JSC", "JSC"]] as const)
  for (const [exam, label] of exams) {
    const gpa = student.board[exam]?.gpa.trim()
    if (gpa) return `${label} GPA-${gpa}`
  }
  return ""
}

// One subject's cells. A student with no mark in it was absent ("A"). A
// part never entered is "A" too, unless the exam gave grace marks for it:
// then it counts as 0 plus the grace. With `displayGrace`, a part with
// grace reads "obtained+grace" (legacy "A+grace" when nothing was entered).
function subjectCells(
  exam: TermExam,
  s: TermExamSubject,
  mark: TermExamStudentMark | undefined,
  studentPassed: boolean,
  optional: boolean,
  displayGrace: boolean
) {
  let total = 0
  let partFailed = false
  const parts = {} as Record<TabulationPart, TabulationCell | null>
  for (const part of tabulationParts) {
    if (!s[part.marks]) {
      parts[part.key] = null
      continue
    }
    const obtained = mark ? mark[part.marks] : null
    const grace = mark && exam.hasGraceMarks && part.grace ? mark[part.grace] : 0
    const value = obtained == null && grace <= 0 ? null : (obtained ?? 0) + grace
    const pass = value != null && value >= s[part.pass]
    if (!pass) partFailed = true
    total += value ?? 0
    parts[part.key] = {
      text:
        displayGrace && grace > 0 ? `${obtained ?? "A"}+${grace}` : value != null ? String(value) : "A",
      failed: !studentPassed && !pass,
    }
  }
  return {
    parts,
    marks: total,
    total: mark
      ? { text: String(total), failed: !studentPassed && !optional && (partFailed || total < s.totalPassMarks) }
      : { text: "A", failed: !studentPassed && !optional },
  }
}

export function tabulation(
  exam: TermExam,
  list: MeritList,
  options: {
    institute: Institute
    students: Student[]
    marks: TermExamStudentMark[]
    classYearSubjects: ClassYearSubject[]
    sectionId: number
    // Legacy isExeptAllAbsent: leave out students absent in every subject.
    exceptAllAbsent: boolean
    displayGrace: boolean
  }
): Tabulation {
  const enrolled = new Map(examStudents(exam, options.students).map((e) => [e.student.id, e]))
  const types = subjectTypes(exam, options.classYearSubjects)
  const markOf = new Map(
    options.marks
      .filter((m) => m.termExamId === exam.id && isActiveMark(m))
      .map((m) => [`${m.studentId}-${m.subjectId}`, m])
  )

  const students = list.results.flatMap((result): TabulationStudent[] => {
    const entry = enrolled.get(result.studentId)
    if (!entry || result.sectionId !== options.sectionId) return []
    if (options.exceptAllAbsent && !result.isPresent) return []
    const { student, enrolment } = entry
    const passed = result.failedSubjectCount === 0
    const subjects = exam.subjects
      .filter((s) => takesSubject(enrolment, s.subjectId))
      .map((s): TabulationSubject => {
        // The legacy leaves out a subject whose type doesn't fit its
        // block (an optional-type subject taken as a main one); it's
        // shown as elective here so no marks go missing.
        const optional = enrolment.optionalSubjectId === s.subjectId
        const kind: SubjectKind = optional ? "optional" : (types.get(s.subjectId) ?? 0) === 0 ? "compulsory" : "elective"
        const mark = markOf.get(`${student.id}-${s.subjectId}`)
        return { subjectId: s.subjectId, kind, ...subjectCells(exam, s, mark, passed, optional, options.displayGrace) }
      })
    const takenParts = new Set(subjects.flatMap((s) => tabulationParts.filter((p) => s.parts[p.key]).map((p) => p.key)))
    return [
      {
        result,
        student,
        enrolment,
        passed,
        resultText: exam.calculateGpa ? (passed ? result.gpa.toFixed(2) : "-") : String(result.totalMarks),
        previousGpa: previousGpa(
          student,
          options.institute.enableMedium && enrolment.medium === "English Medium"
        ),
        subjects,
        parts: tabulationParts.filter((p) => takenParts.has(p.key)).map((p) => p.key),
      },
    ]
  })

  return { students: students.sort(byRoll), passed: students.filter((s) => s.passed).length }
}

// The students cut into printed pages of `size`, each with as many columns
// per subject block as the most any of its students takes.
export function paginateTabulation(students: TabulationStudent[], size: number) {
  const pages: { students: TabulationStudent[]; first: number; spans: Record<SubjectKind, number> }[] = []
  for (let i = 0; i < students.length; i += size) {
    const page = students.slice(i, i + size)
    const span = (kind: SubjectKind) =>
      Math.max(0, ...page.map((s) => s.subjects.filter((sub) => sub.kind === kind).length))
    pages.push({
      students: page,
      first: i,
      spans: { compulsory: span("compulsory"), elective: span("elective"), optional: span("optional") },
    })
  }
  return pages
}
