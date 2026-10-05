import type { Branch } from "@/lib/institutes"
import { createLookupStore, type LookupRow } from "@/lib/lookup-store"

// Branches, kept by the API (api/v1/branches, legacy Branch Manage Admin / Manage / View).
export type BranchRow = LookupRow & { code: string; address: string }

export type BranchInput = { instituteId: number; name: string; code: string; address: string }

export const branchApi = createLookupStore<BranchRow, BranchInput, Branch>("branches")

// Read-only picker lookup for the modules still in memory.
export const branchStore = branchApi.lookup
