import type { AcademicClass } from "@/lib/institutes"
import type { BoardResult, Enrolment, PublicExam, Student } from "@/lib/students"

// Legacy Manage Testimonial / RptResult Testimonial (StudentRepository
// .LoadAllTestimonial): the students of a class who passed a public exam in
// a given year, with the enrolment in that class and their board result.

export type TestimonialFilter = {
  instituteId: number
  classId: number
  exam: PublicExam
  // The passing year ("Examinee" in the legacy form).
  examinee: string
  branchId?: number | null
  medium?: string
  groupId?: number | null
  version?: string
}

export type TestimonialRow = {
  student: Student
  enrolment: Enrolment
  result: BoardResult
}

// The student's latest enrolment in the class that fits the filters.
function enrolmentIn(student: Student, filter: Omit<TestimonialFilter, "exam" | "examinee">) {
  return [...student.enrolments]
    .reverse()
    .find(
      (e) =>
        e.classId === filter.classId &&
        (filter.branchId == null || e.branchId === filter.branchId) &&
        (!filter.medium || e.medium === filter.medium) &&
        (filter.groupId == null || e.groupId === filter.groupId) &&
        (!filter.version || e.version === filter.version)
    )
}

export function testimonialRows(students: Student[], filter: TestimonialFilter) {
  const rows: TestimonialRow[] = []
  for (const student of students) {
    if (student.instituteId !== filter.instituteId || student.status !== "Active") continue
    const result = student.board[filter.exam]
    if (!result || result.passingYear.trim() !== filter.examinee) continue
    const enrolment = enrolmentIn(student, filter)
    if (enrolment) rows.push({ student, enrolment, result })
  }
  return rows.sort((a, b) =>
    a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true })
  )
}

// Passing years on record for the exam among the class's students, newest
// first (legacy LoadExamineeYear).
export function examineeYears(
  students: Student[],
  filter: Omit<TestimonialFilter, "examinee">
) {
  const years = new Set<string>()
  for (const student of students) {
    if (student.instituteId !== filter.instituteId || student.status !== "Active") continue
    const year = student.board[filter.exam]?.passingYear.trim()
    if (year && enrolmentIn(student, filter)) years.add(year)
  }
  return [...years].sort((a, b) => b.localeCompare(a))
}

// Exams a class issues testimonials for (legacy LoadTestimonialType).
export function testimonialTypes(academicClass?: AcademicClass) {
  return (academicClass?.testimonialExams ?? []) as PublicExam[]
}

// Legacy perSlotStudentCount: testimonials printed per batch.
export const TESTIMONIAL_BATCH = 100

// The batches a list of `count` examinees prints in (legacy
// LoadPassedStudentPaginatedCount): "1 - 100", "101 - 150", …
export function testimonialBatches(count: number) {
  const batches: { from: number; label: string }[] = []
  for (let from = 1; from <= count; from += TESTIMONIAL_BATCH)
    batches.push({ from, label: `${from} - ${Math.min(from + TESTIMONIAL_BATCH - 1, count)}` })
  return batches
}
