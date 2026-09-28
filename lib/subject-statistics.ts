import { academicVersions, type ClassYearSubject, type Institute } from "@/lib/institutes"
import { classSubjects, takenSubjects } from "@/lib/student-information"
import type { Student } from "@/lib/students"

// Legacy RptStudent/SubjectStatistics ("Subject Statistics (Section wise)",
// StudentRepository.LoadStudentSubject): a class's students in a year, per
// group, version and section, with how many take each subject — with or
// without each student's optional subject. Students without a section or
// without subjects are left out, as the legacy joins on them.

export type SubjectStatisticsRow = {
  sectionId: number
  version: string
  students: number
  // Students taking each subject, keyed by subject id.
  subjects: Map<number, number>
  // Legacy Total: the subject enrolments added up.
  enrolments: number
}

export type SubjectStatisticsTable = {
  groupId: number | null
  subjectIds: number[]
  rows: SubjectStatisticsRow[]
  students: number
  subjects: Map<number, number>
  enrolments: number
}

export type SubjectStatistics = {
  tables: SubjectStatisticsTable[]
  // The grand totals across the tables.
  subjectIds: number[]
  students: number
  subjects: Map<number, number>
  enrolments: number
}

const add = (map: Map<number, number>, id: number, n = 1) => map.set(id, (map.get(id) ?? 0) + n)

export function subjectStatistics(
  institute: Institute,
  students: Student[],
  sets: ClassYearSubject[],
  filter: {
    classId: number
    yearId: number
    branchId: number | null
    medium: string
    withoutOptional: boolean
    // A table per group (the institute uses groups and the class has them).
    byGroup: boolean
  },
  ranks: { group: Map<number, number>; section: Map<number, number>; subject: Map<number, number> }
): SubjectStatistics {
  type Row = SubjectStatisticsRow & { groupId: number | null }
  // Keyed by group and section: legacy groups by the student's own group,
  // so a section of mixed groups shows in each group's table.
  const rows = new Map<string, Row>()
  for (const student of students) {
    if (student.instituteId !== institute.id || student.status !== "Active") continue
    const e = student.enrolments.find(
      (en) =>
        en.classId === filter.classId &&
        en.yearId === filter.yearId &&
        (filter.branchId == null || en.branchId === filter.branchId) &&
        (!filter.medium || en.medium === filter.medium)
    )
    if (!e || e.sectionId == null) continue
    const taken = [...new Set(takenSubjects(classSubjects(sets, e), e))].filter(
      (id) => !filter.withoutOptional || id !== e.optionalSubjectId
    )
    if (!taken.length) continue
    const groupId = filter.byGroup ? e.groupId : null
    const key = `${groupId}|${e.sectionId}`
    let row = rows.get(key)
    if (!row) {
      row = {
        sectionId: e.sectionId,
        groupId,
        version: e.version,
        students: 0,
        subjects: new Map(),
        enrolments: 0,
      }
      rows.set(key, row)
    }
    row.students++
    row.enrolments += taken.length
    for (const id of taken) add(row.subjects, id)
  }

  // Finite, so two unknowns compare equal.
  const rank = (map: Map<number, number>, id: number | null) => (id == null ? 1e9 : (map.get(id) ?? 1e9 - 1))
  const versionRank = (v: string) => {
    const i = academicVersions.indexOf(v as never)
    return i < 0 ? 1e9 : i
  }
  const bySubjectRank = (a: number, b: number) => rank(ranks.subject, a) - rank(ranks.subject, b)
  const ordered = [...rows.values()].sort(
    (a, b) =>
      rank(ranks.group, a.groupId) - rank(ranks.group, b.groupId) ||
      versionRank(a.version) - versionRank(b.version) ||
      rank(ranks.section, a.sectionId) - rank(ranks.section, b.sectionId)
  )

  const tables: SubjectStatisticsTable[] = []
  for (const { groupId, ...row } of ordered) {
    let table = tables.at(-1)
    if (!table || table.groupId !== groupId) {
      table = { groupId, subjectIds: [], rows: [], students: 0, subjects: new Map(), enrolments: 0 }
      tables.push(table)
    }
    table.rows.push(row)
    table.students += row.students
    table.enrolments += row.enrolments
    for (const [id, n] of row.subjects) add(table.subjects, id, n)
  }
  const subjects = new Map<number, number>()
  for (const table of tables) {
    table.subjectIds = [...table.subjects.keys()].sort(bySubjectRank)
    for (const [id, n] of table.subjects) add(subjects, id, n)
  }
  return {
    tables,
    subjectIds: [...subjects.keys()].sort(bySubjectRank),
    students: tables.reduce((sum, t) => sum + t.students, 0),
    subjects,
    enrolments: tables.reduce((sum, t) => sum + t.enrolments, 0),
  }
}
