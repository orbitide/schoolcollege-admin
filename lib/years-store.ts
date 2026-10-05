import type { AcademicYear } from "@/lib/institutes"
import { createLookupStore, type LookupRow } from "@/lib/lookup-store"

// Academic years, kept by the API (api/v1/academicyears, legacy Academic Year Manage Admin / Manage / View).
export type YearRow = LookupRow & { code: string; isCurrentYear: boolean }

export type YearInput = { instituteId: number; name: string; code: string; isCurrentYear: boolean }

export const yearApi = createLookupStore<YearRow, YearInput, AcademicYear>(
  "academicyears",
  ({ recordStatus, isCurrentYear, ...row }) => ({ ...row, status: recordStatus, isCurrent: isCurrentYear })
)

// Read-only picker lookup for the modules still in memory.
export const yearStore = yearApi.lookup
