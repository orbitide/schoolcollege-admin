import type { AcademicGroup } from "@/lib/institutes"
import { createLookupStore, type LookupRow } from "@/lib/lookup-store"

// Legacy AcademicGroup enum as the API names it, its value (what classes, sections and students store as
// `groupId`), and its default name.
export type LegacyGroup = "Science" | "BusinessStudies" | "Humanities"

export const legacyGroups: { group: LegacyGroup; id: number; label: string }[] = [
  { group: "Science", id: 1, label: "Science" },
  { group: "BusinessStudies", id: 2, label: "Business Studies" },
  { group: "Humanities", id: 3, label: "Humanities" },
]

export const groupId = (group: LegacyGroup) => legacyGroups.find((g) => g.group === group)?.id ?? 0
export const groupOf = (id: number) => legacyGroups.find((g) => g.id === id)?.group

// Academic groups, kept by the API (api/v1/academicgroups): an institute's name, code and Bangla name for
// each legacy group it uses.
export type GroupRow = LookupRow & { group: LegacyGroup; code: string; nameBn: string }

export type GroupInput = { instituteId: number; group: LegacyGroup; name: string; code: string; nameBn: string }

// The lookup's records carry the legacy group's value as their id, as `groupId` everywhere else does.
export const groupApi = createLookupStore<GroupRow, GroupInput, AcademicGroup>("academicgroups", (row) => ({
  id: groupId(row.group),
  instituteId: row.instituteId,
  name: row.name,
  code: row.code,
  nameBn: row.nameBn,
  rank: row.rank,
  status: row.recordStatus,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  modifiedBy: row.modifiedBy,
  modifiedAt: row.modifiedAt,
}))

// Read-only picker lookup for the modules still in memory.
export const groupStore = groupApi.lookup
