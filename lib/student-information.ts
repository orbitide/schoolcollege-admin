import { subjectTypes, type ClassYearSubject, type Institute } from "@/lib/institutes"
import type { Enrolment, Student } from "@/lib/students"

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
function classSubjects(sets: ClassYearSubject[], e: Enrolment) {
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
    const types = classSubjects(options.classYearSubjects, enrolment)
    // A student without a subject list takes all of the class's subjects.
    const taken = enrolment.subjectIds.length ? enrolment.subjectIds : [...types.keys()]
    const kindOf = (id: number): SubjectKind =>
      id === enrolment.optionalSubjectId ? "optional" : (types.get(id) ?? 0) === 0 ? "compulsory" : "elective"
    const kindOrder: SubjectKind[] = ["compulsory", "elective", "optional"]
    const subjects = taken
      .map((subjectId) => ({ subjectId, kind: kindOf(subjectId) }))
      .sort(
        (a, b) =>
          kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind) ||
          options.subjectRank(a.subjectId) - options.subjectRank(b.subjectId)
      )
    return [{ student, enrolment, subjects }]
  })
  return rows.sort((a, b) => a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true }))
}
