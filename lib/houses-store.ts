import type { StudentHouse } from "@/lib/institutes"
import { createLookupStore, type LookupRow } from "@/lib/lookup-store"

// Legacy AcademicMedium as the API names it, and as the admin shows it.
export type AcademicMedium = "BanglaMedium" | "EnglishMedium"

export const mediumLabels: Record<AcademicMedium, string> = {
  BanglaMedium: "Bangla Medium",
  EnglishMedium: "English Medium",
}

// Student houses, kept by the API (api/v1/studenthouses, legacy Student House Admin / Manage / View):
// for the whole institute, or one medium and/or class.
export type HouseRow = LookupRow & {
  capacity: number
  academicMedium: AcademicMedium | null
  academicClassId: number | null
}

export type HouseInput = {
  instituteId: number
  name: string
  capacity: number
  academicMedium: AcademicMedium | null
  academicClassId: number | null
}

export const houseApi = createLookupStore<HouseRow, HouseInput, StudentHouse>(
  "studenthouses",
  ({ recordStatus, academicMedium, academicClassId, ...row }) => ({
    ...row,
    status: recordStatus,
    medium: academicMedium ? mediumLabels[academicMedium] : "",
    classId: academicClassId,
  })
)

// Read-only picker lookup for the modules still in memory.
export const houseStore = houseApi.lookup
