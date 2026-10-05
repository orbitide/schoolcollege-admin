import type { StudentCategory } from "@/lib/institutes"
import { createLookupStore, type LookupRow } from "@/lib/lookup-store"

// Student categories, kept by the API (api/v1/studentcategories, legacy Student Category Manage Admin / Manage / View).
export type CategoryRow = LookupRow

export type CategoryInput = { instituteId: number; name: string }

export const categoryApi = createLookupStore<CategoryRow, CategoryInput, StudentCategory>("studentcategories")

// Read-only picker lookup for the modules still in memory.
export const categoryStore = categoryApi.lookup
