import { subjectTypes, type ClassYearSubject, type Institute } from "@/lib/institutes"
import type { Enrolment, Student } from "@/lib/students"
import { examStudents } from "@/lib/term-exam-marks"
import type { TermExam } from "@/lib/term-exams"

// Legacy RptStudent/StudentInformation (StudentRepository.LoadAllRaw): a
// printable card per student of a section — their class details, parents
// and the subjects they take, two cards to a page. A roll (or student ID,
// when the institute doesn't show class rolls) narrows it to one student.

export type SubjectKind = "compulsory" | "elective" | "optional"

export const subjectKindLabels: Record<SubjectKind, string> = {
  compulsory: "Compulsory",
  elective: "Elective",
  optional: "Optional",
}

export type StudentInformation = {
  student: Student
  enrolment: Enrolment
  // In the legacy order: compulsory, elective, then the optional subject.
  subjects: { subjectId: number; kind: SubjectKind }[]
}

// The class's subjects in the year, with the latest type each is listed
// with (legacy MAX(SubjectType)); a group's own subjects only for that group.
export function classSubjects(
  sets: ClassYearSubject[],
  e: Pick<Enrolment, "classId" | "yearId" | "medium" | "groupId">
) {
  const types = new Map<number, number>()
  for (const set of sets) {
    if (set.status !== "Active" || set.classId !== e.classId || set.yearId !== e.yearId) continue
    if (e.medium && set.medium && set.medium !== e.medium) continue
    for (const d of set.details) {
      if (e.groupId != null && d.groupId != null && d.groupId !== e.groupId) continue
      types.set(d.subjectId, Math.max(types.get(d.subjectId) ?? 0, subjectTypes.indexOf(d.subjectType)))
    }
  }
  return types
}

// A student without a subject list takes all of the class's subjects.
export const takenSubjects = (types: Map<number, number>, e: Enrolment) =>
  e.subjectIds.length ? e.subjectIds : [...types.keys()]

export function studentInformation(
  institute: Institute,
  students: Student[],
  options: {
    classYearSubjects: ClassYearSubject[]
    // The subject order within a kind (legacy SubjectCode).
    subjectRank: (id: number) => number
    branchId: number | null
    medium: string
    classId: number
    yearId: number
    groupId: number | null
    version: string
    sectionId: number
    rollOrId: string
  }
): StudentInformation[] {
  const rollOrId = options.rollOrId.trim()
  const rows = students.flatMap((student): StudentInformation[] => {
    if (student.instituteId !== institute.id || student.status !== "Active") return []
    const enrolment = student.enrolments.find(
      (e) =>
        e.classId === options.classId &&
        e.yearId === options.yearId &&
        e.sectionId === options.sectionId &&
        (options.branchId == null || e.branchId === options.branchId) &&
        (!options.medium || e.medium === options.medium) &&
        (options.groupId == null || e.groupId === options.groupId) &&
        (!options.version || e.version === options.version)
    )
    if (!enrolment) return []
    if (rollOrId) {
      const key = institute.showClassRoll ? enrolment.classRoll.trim() : String(student.studentIdentificationNo)
      if (key !== rollOrId) return []
    }
    const subjects = enrolmentSubjects(options.classYearSubjects, enrolment, options.subjectRank)
    return [{ student, enrolment, subjects }]
  })
  return rows.sort(byRoll)
}

const byRoll = (a: StudentInformation, b: StudentInformation) =>
  a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true })

// The subjects the enrolment takes, each in its block, in the legacy order:
// compulsory, elective, then the optional subject. `only` keeps just those
// (an exam's subjects).
function enrolmentSubjects(
  sets: ClassYearSubject[],
  enrolment: Enrolment,
  subjectRank: (id: number) => number,
  only?: Set<number>
) {
  const types = classSubjects(sets, enrolment)
  const kindOf = (id: number): SubjectKind =>
    id === enrolment.optionalSubjectId ? "optional" : (types.get(id) ?? 0) === 0 ? "compulsory" : "elective"
  const kindOrder: SubjectKind[] = ["compulsory", "elective", "optional"]
  return takenSubjects(types, enrolment)
    .filter((id) => !only || only.has(id))
    .map((subjectId) => ({ subjectId, kind: kindOf(subjectId) }))
    .sort(
      (a, b) =>
        kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind) || subjectRank(a.subjectId) - subjectRank(b.subjectId)
    )
}

// Legacy RptStudent/AdmitCard (StudentRepository.LoadAdmitCard): an admit
// card per student of a section sitting the exam (or the one with `roll`),
// with the subjects they take in it — those who take none are left out,
// as the legacy joins on the exam's subjects.
export function admitCards(
  exam: TermExam,
  students: Student[],
  options: {
    classYearSubjects: ClassYearSubject[]
    subjectRank: (id: number) => number
    sectionId: number
    roll: string
  }
): StudentInformation[] {
  const examSubjects = new Set(exam.subjects.map((s) => s.subjectId))
  return examStudents(exam, students)
    .flatMap(({ student, enrolment }): StudentInformation[] => {
      if (enrolment.sectionId !== options.sectionId) return []
      if (options.roll && enrolment.classRoll.trim() !== options.roll) return []
      const subjects = enrolmentSubjects(options.classYearSubjects, enrolment, options.subjectRank, examSubjects)
      return subjects.length ? [{ student, enrolment, subjects }] : []
    })
    .sort(byRoll)
}
