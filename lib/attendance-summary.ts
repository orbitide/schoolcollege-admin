import { academicVersions } from "@/lib/institutes"
import type { DailyAttendanceRow } from "@/lib/daily-attendance-report"

// Legacy RptAttendance/AttendanceSummary (StudentAttendanceRepository.
// LoadAttendanceSummaryReportByDate, Partial/_attendanceSummaryReport): a
// day's attendance counted per section — a table per class, its sections
// under their group and version — with the class and grand totals. Built
// on the Daily Attendance Report's rows, so the two always agree.

export type AttendanceCounts = { students: number; present: number; absent: number; notTaken: number }

export type SummarySection = AttendanceCounts & {
  sectionId: number
  groupId: number | null
  version: string
}

export type SummaryClass = AttendanceCounts & { classId: number; sections: SummarySection[] }

export type AttendanceSummary = { classes: SummaryClass[]; total: AttendanceCounts }

const empty = (): AttendanceCounts => ({ students: 0, present: 0, absent: 0, notTaken: 0 })

function add(c: AttendanceCounts, isPresent: boolean | null) {
  c.students++
  if (isPresent === true) c.present++
  else if (isPresent === false) c.absent++
  else c.notTaken++
}

export const presentPercent = (c: AttendanceCounts) => (c.students ? (c.present * 100) / c.students : 0)

export function attendanceSummary(
  rows: DailyAttendanceRow[],
  ranks: { class: Map<number, number>; group: Map<number, number>; section: Map<number, number> }
): AttendanceSummary {
  const classes = new Map<number, SummaryClass>()
  const total = empty()
  for (const { enrolment: e, isPresent } of rows) {
    let cls = classes.get(e.classId)
    if (!cls) {
      cls = { classId: e.classId, ...empty(), sections: [] }
      classes.set(e.classId, cls)
    }
    // A section's students of one group and version share a row.
    let section = cls.sections.find(
      (s) => s.sectionId === e.sectionId && s.groupId === e.groupId && s.version === e.version
    )
    if (!section) {
      section = { sectionId: e.sectionId!, groupId: e.groupId, version: e.version, ...empty() }
      cls.sections.push(section)
    }
    add(section, isPresent)
    add(cls, isPresent)
    add(total, isPresent)
  }

  const rank = (map: Map<number, number>, id: number | null) => (id == null ? 1e9 : (map.get(id) ?? 1e9 - 1))
  const versionRank = (v: string) => {
    const i = academicVersions.indexOf(v as never)
    return i < 0 ? 1e9 : i
  }
  const ordered = [...classes.values()].sort((a, b) => rank(ranks.class, a.classId) - rank(ranks.class, b.classId))
  for (const cls of ordered)
    cls.sections.sort(
      (a, b) =>
        rank(ranks.group, a.groupId) - rank(ranks.group, b.groupId) ||
        versionRank(a.version) - versionRank(b.version) ||
        rank(ranks.section, a.sectionId) - rank(ranks.section, b.sectionId)
    )
  return { classes: ordered, total }
}
