import type { AcademicSession } from "@/lib/institutes"
import { createLookupStore, type LookupRow } from "@/lib/lookup-store"

// Academic sessions, kept by the API (api/v1/academicsessions, legacy Academic Session Manage Admin / Manage / View).
export type SessionRow = LookupRow

export type SessionInput = { instituteId: number; name: string }

export const sessionApi = createLookupStore<SessionRow, SessionInput, AcademicSession>("academicsessions")

// Read-only picker lookup for the modules still in memory.
export const sessionStore = sessionApi.lookup
