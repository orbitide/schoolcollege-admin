import { isActiveMark, type TermExamStudentMark } from "@/lib/term-exam-marks"
import type { TermExam } from "@/lib/term-exams"

// Legacy RptResult/MarksUploadReport (TermExamStudentMarksRepository.
// LoadMarksUploadReport): per subject of an exam that has marks, how many
// marks were entered in each part, to see what is still to be uploaded.

// Legacy maxRow: subjects on each printed page.
export const SUBJECTS_PER_PAGE = 32

export type UploadCounts = {
  theory: number
  cq: number
  mcq: number
  practical: number
  // Legacy Total: the part counts added up.
  total: number
  // The students with a mark row in the subject (legacy TotalStudentCount).
  students: number
}

export type UploadRow = UploadCounts & { subjectId: number }

const empty = (): UploadCounts => ({ theory: 0, cq: 0, mcq: 0, practical: 0, total: 0, students: 0 })

export function marksUploadReport(exam: TermExam, marks: TermExamStudentMark[]) {
  const bySubject = new Map<number, UploadCounts>()
  for (const m of marks) {
    if (m.termExamId !== exam.id || !isActiveMark(m)) continue
    const c = bySubject.get(m.subjectId) ?? empty()
    c.students++
    if (m.theoryMarks != null) c.theory++
    if (m.cqMarks != null) c.cq++
    if (m.mcqMarks != null) c.mcq++
    if (m.practicalMarks != null) c.practical++
    c.total = c.theory + c.cq + c.mcq + c.practical
    bySubject.set(m.subjectId, c)
  }
  // The exam's subject order, then any other subject with marks.
  const order = [...exam.subjects.map((s) => s.subjectId), ...bySubject.keys()]
  const rows: UploadRow[] = [...new Set(order)]
    .filter((id) => bySubject.has(id))
    .map((subjectId) => ({ subjectId, ...bySubject.get(subjectId)! }))
  return rows
}

export function sumCounts(rows: UploadCounts[]): UploadCounts {
  return rows.reduce(
    (t, r) => ({
      theory: t.theory + r.theory,
      cq: t.cq + r.cq,
      mcq: t.mcq + r.mcq,
      practical: t.practical + r.practical,
      total: t.total + r.total,
      students: t.students + r.students,
    }),
    empty()
  )
}
