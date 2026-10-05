import type { AcademicMedium } from "@/lib/houses-store"
import { mediumLabels } from "@/lib/houses-store"
import type { ResultRemark } from "@/lib/institutes"
import { createLookupStore, type LookupRow } from "@/lib/lookup-store"

// Result remarks, kept by the API (api/v1/resultremarks, legacy Result Remarks Manage Admin / Manage / View):
// per institute, medium and class (set on create, then fixed). Name is the remark.
export type RemarkRow = LookupRow & {
  academicMedium: AcademicMedium | null
  academicClassId: number | null
  minimumGpa: number
  maximumGpa: number
  minimumMarks: number
  maximumMarks: number
  isBasedOnGrading: boolean
  isGolden: boolean
  minimumFailCount: number
  maximumFailCount: number
}

export type RemarkInput = Omit<RemarkRow, keyof LookupRow> & { instituteId: number; name: string }

export const remarkApi = createLookupStore<RemarkRow, RemarkInput, ResultRemark>("resultremarks", (row) => ({
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
  classId: row.academicClassId,
  minGpa: row.minimumGpa,
  maxGpa: row.maximumGpa,
  minMarks: row.minimumMarks,
  maxMarks: row.maximumMarks,
  basedOnGrading: row.isBasedOnGrading,
  isGolden: row.isGolden,
  minFailCount: row.minimumFailCount,
  maxFailCount: row.maximumFailCount,
}))

// Read-only lookup for the modules still in memory (merit lists).
export const resultRemarkStore = remarkApi.lookup
