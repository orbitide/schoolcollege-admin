import { mediumLabels, type AcademicMedium } from "@/lib/houses-store"
import type { LetterGrade } from "@/lib/institutes"
import { createLookupStore, type LookupRow } from "@/lib/lookup-store"

// Letter grades, kept by the API (api/v1/lettergrades, legacy Letter Grade Manage Admin / Manage / View):
// per institute and medium; marks ranges don't overlap.
export type GradeRow = LookupRow & {
  academicMedium: AcademicMedium | null
  minimumMarks: number
  maximumMarks: number
  gradePoint: number
  maxGradePoint: number
}

export type GradeInput = Omit<GradeRow, keyof LookupRow> & { instituteId: number; name: string }

export const gradeApi = createLookupStore<GradeRow, GradeInput, LetterGrade>("lettergrades", (row) => ({
  id: row.id,
  instituteId: row.instituteId,
  name: row.name,
  rank: row.rank,
  status: row.recordStatus,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  modifiedBy: row.modifiedBy,
  modifiedAt: row.modifiedAt,
  medium: row.academicMedium ? mediumLabels[row.academicMedium] : "",
  minMarks: row.minimumMarks,
  maxMarks: row.maximumMarks,
  gradePoint: row.gradePoint,
  maxGradePoint: row.maxGradePoint,
}))

// Read-only lookup for the modules still in memory (term exam marks).
export const letterGradeStore = gradeApi.lookup
