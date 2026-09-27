import {
  branchStore,
  shiftStore,
  type RecordStore,
} from "@/lib/academic-store"
import type { AcademicRecord, InstituteSettings } from "@/lib/institutes"

// Branch has code and address; shift only has a name.
export type EditableRecord = AcademicRecord & {
  code?: string
  address?: string
}

type KindConfig = {
  segment: string
  singular: string
  plural: string
  description: string
  toggle: keyof InstituteSettings
  hasCodeAndAddress: boolean
  store: RecordStore<EditableRecord>
}

export const academicKinds = {
  branches: {
    segment: "branches",
    singular: "Branch",
    plural: "Branches",
    description: "Campuses of this institute. Students and classes belong to a branch.",
    toggle: "enableBranch",
    hasCodeAndAddress: true,
    store: branchStore as unknown as RecordStore<EditableRecord>,
  },
  shifts: {
    segment: "shifts",
    singular: "Shift",
    plural: "Shifts",
    description: "Daily sessions such as Morning and Day, used by classes and routines.",
    toggle: "enableShift",
    hasCodeAndAddress: false,
    store: shiftStore as unknown as RecordStore<EditableRecord>,
  },
} satisfies Record<string, KindConfig>

export type AcademicKind = keyof typeof academicKinds
