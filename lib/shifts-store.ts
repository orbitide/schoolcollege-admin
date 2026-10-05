import type { Shift } from "@/lib/institutes"
import { createLookupStore, type LookupRow } from "@/lib/lookup-store"

// Shifts, kept by the API (api/v1/shifts, legacy Shift Manage Admin / Manage / View).
export type ShiftRow = LookupRow

export type ShiftInput = { instituteId: number; name: string }

export const shiftApi = createLookupStore<ShiftRow, ShiftInput, Shift>("shifts")

// Read-only picker lookup for the modules still in memory.
export const shiftStore = shiftApi.lookup
