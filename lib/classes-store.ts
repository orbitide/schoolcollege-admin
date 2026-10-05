import { mediumLabels, type AcademicMedium } from "@/lib/houses-store"
import { groupId, type LegacyGroup } from "@/lib/groups-store"
import type { AcademicClass } from "@/lib/institutes"
import { createLookupStore, type LookupRow } from "@/lib/lookup-store"

// Legacy public exam flags, by the names the admin shows.
export const publicExamFlags = [
  { exam: "JSC", is: "isJSC", testimonial: "enableTestimonialForJSC" },
  { exam: "SSC", is: "isSSC", testimonial: "enableTestimonialForSSC" },
  { exam: "HSC", is: "isHSC", testimonial: "enableTestimonialForHSC" },
  { exam: "O Level", is: "isOLevel", testimonial: "enableTestimonialForOLevel" },
  { exam: "A Level", is: "isALevel", testimonial: "enableTestimonialForALevel" },
] as const

type ExamFlags = {
  [K in (typeof publicExamFlags)[number]["is"] | (typeof publicExamFlags)[number]["testimonial"]]: boolean
}

// Academic classes, kept by the API (api/v1/academicclasses, legacy Academic Class Manage Admin / Manage / View).
export type ClassRow = LookupRow &
  ExamFlags & {
    nameBn: string
    academicMedium: AcademicMedium | null
    rollStartFrom: string
    previousAcademicClassId: number | null
    hasSession: boolean
    hasSubjectGroup: boolean
    academicGroups: LegacyGroup[]
    enableBoardAdmission: boolean
  }

export type ClassInput = Omit<ClassRow, keyof LookupRow> & { instituteId: number; name: string }

export const classApi = createLookupStore<ClassRow, ClassInput, AcademicClass>("academicclasses", (row) => ({
  id: row.id,
  instituteId: row.instituteId,
  name: row.name,
  nameBn: row.nameBn,
  medium: row.academicMedium ? mediumLabels[row.academicMedium] : "",
  rollStartFrom: row.rollStartFrom,
  previousClassId: row.previousAcademicClassId,
  hasSession: row.hasSession,
  hasSubjectGroup: row.hasSubjectGroup,
  groupIds: row.academicGroups.map(groupId),
  publicExams: publicExamFlags.filter((flag) => row[flag.is]).map((flag) => flag.exam),
  testimonialExams: publicExamFlags.filter((flag) => row[flag.testimonial]).map((flag) => flag.exam),
  enableBoardAdmission: row.enableBoardAdmission,
  rank: row.rank,
  status: row.recordStatus,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  modifiedBy: row.modifiedBy,
  modifiedAt: row.modifiedAt,
}))

// Read-only picker lookup for the modules still in memory.
export const classStore = classApi.lookup
