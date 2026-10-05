import type * as React from "react"

import type { DataTableColumn } from "@/components/data-table/data-table"
import type { AccessSurface, Capabilities } from "@/lib/access"
import type { Institute } from "@/lib/institutes"
import type { LookupRow, LookupStore } from "@/lib/lookup-store"

export type LookupErrors = Record<string, string | undefined>

// One Basic Settings lookup on the API: its store, its words and what it adds
// to the shared list, details and form.
export type LookupPage<R extends LookupRow = LookupRow> = {
  // Method syntax: the form builds each lookup's own input from its fields.
  store: LookupStore<R> & {
    add(input: { instituteId: number; name: string }): Promise<R>
    update(id: number, input: { instituteId: number; name: string }): Promise<R>
  }
  // URL segment under /basic-settings (`shifts`).
  segment: string
  // As legacy says it in titles and messages ("Shift", "Academic Year").
  singular: string
  plural: string
  description: string
  searchPlaceholder: string
  // Where a page offers less than the surface rules (legacy SubActions), e.g. no rank on Manage.
  capabilities?: Partial<Record<AccessSurface, Partial<Capabilities>>>
  // The legacy grid's own columns, shown after Name.
  columns?: DataTableColumn<R>[]
  // Details rows after Name.
  details?: (row: R) => [string, React.ReactNode][]
  // The form's own fields (after Institute and Name); `useFields` keeps their state.
  form: {
    // Required-field message for Name (legacy wording).
    nameRequired: string
    useFields: (row?: R) => LookupFields
  }
}

export type LookupFields = {
  // Client checks with legacy messages; the API repeats them.
  validate: (institute?: Institute) => LookupErrors
  // The fields' part of the input.
  values: () => Record<string, unknown>
  reset: () => void
  // `institute` is the one picked on the form (undefined until it is).
  render: (errors: LookupErrors, institute?: Institute) => React.ReactNode
}
