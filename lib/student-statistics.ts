import { academicVersions, type ClassYearSubject, type Institute } from "@/lib/institutes"
import { classSubjects, takenSubjects } from "@/lib/student-information"
import type { Enrolment, Student } from "@/lib/students"

// Legacy RptStudent/StudentStatistics (StudentRepository.LoadAllRaw): the
// students of a year — narrowed by branch, medium, class, group, version
// and section — counted male, female and in all, per group, section,
// version and house, and how many take each subject.

export type GenderCounts = { male: number; female: number; total: number }

export type StatisticsFilter = {
  yearId: number
  branchId: number | null
  medium: string
  classId: number | null
  groupId: number | null
  version: string
  sectionId: number | null
}

export type StudentStatistics = {
  total: GenderCounts
  // Keyed by id (null: not set), in rank order.
  groups: { groupId: number | null; counts: GenderCounts }[]
  sections: { classId: number; sectionId: number | null; counts: GenderCounts }[]
  versions: { version: string; counts: GenderCounts }[]
  houses: { houseId: number | null; counts: GenderCounts }[]
  subjects: { subjectId: number; students: number }[]
}

const empty = (): GenderCounts => ({ male: 0, female: 0, total: 0 })

function add(counts: GenderCounts, student: Student) {
  counts.total++
  if (student.gender === "Male") counts.male++
  if (student.gender === "Female") counts.female++
}

// Buckets keyed by `key`, sorted by `rank`.
function tally<K>(
  rows: { student: Student; enrolment: Enrolment }[],
  key: (e: Enrolment) => K,
  rank: (key: K) => number
) {
  const buckets = new Map<K, GenderCounts>()
  for (const { student, enrolment } of rows) {
    const k = key(enrolment)
    if (!buckets.has(k)) buckets.set(k, empty())
    add(buckets.get(k)!, student)
  }
  return [...buckets].sort(([a], [b]) => rank(a) - rank(b))
}

export function studentStatistics(
  institute: Institute,
  students: Student[],
  filter: StatisticsFilter,
  ranks: {
    class: Map<number, number>
    section: Map<number, number>
    group: Map<number, number>
    house: Map<number, number>
    subject: Map<number, number>
  },
  classYearSubjects: ClassYearSubject[]
): StudentStatistics {
  // Active students with an enrolment in the year that fits the filter.
  const rows = students.flatMap((student) => {
    if (student.instituteId !== institute.id || student.status !== "Active") return []
    const enrolment = student.enrolments.find(
      (e) =>
        e.yearId === filter.yearId &&
        (filter.branchId == null || e.branchId === filter.branchId) &&
        (!filter.medium || e.medium === filter.medium) &&
        (filter.classId == null || e.classId === filter.classId) &&
        (filter.groupId == null || e.groupId === filter.groupId) &&
        (!filter.version || e.version === filter.version) &&
        (filter.sectionId == null || e.sectionId === filter.sectionId)
    )
    return enrolment ? [{ student, enrolment }] : []
  })

  // Finite, so two unknowns compare equal (Infinity - Infinity is NaN).
  const LAST = 1e9
  const byRank = (map: Map<number, number>) => (id: number | null) =>
    id == null ? LAST : (map.get(id) ?? LAST - 1)
  const total = empty()
  rows.forEach((r) => add(total, r.student))

  // How many students take each subject.
  const takers = new Map<number, number>()
  for (const { enrolment } of rows)
    for (const id of new Set(takenSubjects(classSubjects(classYearSubjects, enrolment), enrolment)))
      takers.set(id, (takers.get(id) ?? 0) + 1)

  return {
    total,
    groups: tally(rows, (e) => e.groupId, byRank(ranks.group)).map(([groupId, counts]) => ({ groupId, counts })),
    sections: tally(rows, (e) => `${e.classId}|${e.sectionId ?? ""}`, (key) => {
      const [classId, sectionId] = key.split("|").map((v) => (v ? Number(v) : null))
      return (ranks.class.get(classId!) ?? 9_999) * 10_000 + Math.min(byRank(ranks.section)(sectionId), 9_999)
    }).map(([key, counts]) => {
      const [classId, sectionId] = key.split("|")
      return { classId: Number(classId), sectionId: sectionId ? Number(sectionId) : null, counts }
    }),
    versions: tally(rows, (e) => e.version, (v) => {
      const i = academicVersions.indexOf(v as never)
      return i < 0 ? LAST : i
    }).map(([version, counts]) => ({ version, counts })),
    houses: tally(rows, (e) => e.houseId, byRank(ranks.house)).map(([houseId, counts]) => ({ houseId, counts })),
    subjects: [...takers]
      .sort(([a], [b]) => byRank(ranks.subject)(a) - byRank(ranks.subject)(b))
      .map(([subjectId, students]) => ({ subjectId, students })),
  }
}
