import type { ClassYearSubject, Institute } from "@/lib/institutes"
import { classSubjects, takenSubjects } from "@/lib/student-information"
import type { Student } from "@/lib/students"

// Legacy RptStudent/SubjectWiseStudentList (StudentRepository.LoadStudentBySubject):
// the rolls of a section's students who take a subject, printed in columns
// of 25 (legacy _subjectWiseStudentList).

export const ROLLS_PER_COLUMN = 25

export type SubjectListFilter = {
  classId: number
  yearId: number
  sectionId: number
  branchId: number | null
  medium: string
  groupId: number | null
  version: string
}

// The subjects the class takes in the year (legacy LoadSubjects): those in
// its class-year subject sets, a group's own only for that group.
export function classYearSubjectIds(sets: ClassYearSubject[], filter: Omit<SubjectListFilter, "sectionId">) {
  return [...classSubjects(sets, filter).keys()]
}

export function subjectStudents(
  institute: Institute,
  students: Student[],
  sets: ClassYearSubject[],
  filter: SubjectListFilter,
  subjectId: number
) {
  const rows = students.flatMap((student) => {
    if (student.instituteId !== institute.id || student.status !== "Active") return []
    const e = student.enrolments.find(
      (en) =>
        en.classId === filter.classId &&
        en.yearId === filter.yearId &&
        en.sectionId === filter.sectionId &&
        (filter.branchId == null || en.branchId === filter.branchId) &&
        (!filter.medium || en.medium === filter.medium) &&
        (filter.groupId == null || en.groupId === filter.groupId) &&
        (!filter.version || en.version === filter.version)
    )
    if (!e || !takenSubjects(classSubjects(sets, e), e).includes(subjectId)) return []
    return [{ student, enrolment: e }]
  })
  return rows.sort((a, b) => a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true }))
}

// The rolls laid out down columns of `ROLLS_PER_COLUMN`, the last column
// padded with "-" (legacy rowList).
export function rollGrid(rolls: string[]) {
  const columns = Math.max(1, Math.ceil(rolls.length / ROLLS_PER_COLUMN))
  return Array.from({ length: Math.min(ROLLS_PER_COLUMN, Math.max(rolls.length, 1)) }, (_, r) =>
    Array.from({ length: columns }, (_, c) => rolls[c * ROLLS_PER_COLUMN + r] ?? "-")
  )
}

