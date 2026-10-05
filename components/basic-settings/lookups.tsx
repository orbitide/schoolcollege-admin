"use client"

import * as React from "react"

import type { LookupErrors, LookupFields, LookupPage } from "@/components/basic-settings/lookup/lookup-page"
import { createDataTableColumns } from "@/components/data-table/data-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { branchApi, type BranchRow } from "@/lib/branches-store"
import type { LookupRow } from "@/lib/lookup-store"
import { sessionApi } from "@/lib/sessions-store"
import { shiftApi } from "@/lib/shifts-store"
import { yearApi, type YearRow } from "@/lib/years-store"

// The Basic Settings lookups on the API; the shared list, details and form
// pages under /basic-settings/<segment> take one of these keys.

function define<R extends LookupRow>(page: LookupPage<R>) {
  return page as unknown as LookupPage
}

// A text input the form keeps in state, with its error under it.
function useText(initial: string) {
  const [value, setValue] = React.useState(initial)
  return { value, setValue }
}

function TextField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} value={value} aria-invalid={!!error} onChange={(event) => onChange(event.target.value)} />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

const noFields: LookupFields = { validate: () => ({}), values: () => ({}), reset: () => {}, render: () => null }

const branchColumn = createDataTableColumns<BranchRow>()
const yearColumn = createDataTableColumns<YearRow>()

export const lookupPages = {
  sessions: define({
    store: sessionApi,
    segment: "sessions",
    singular: "Academic Session",
    plural: "Academic Sessions",
    description: "Admission sessions for classes that run across years, such as 2025-26.",
    searchPlaceholder: "Search session name",
    form: { nameRequired: "Enter Academic Session Name", useFields: () => noFields },
  }),

  shifts: define({
    store: shiftApi,
    segment: "shifts",
    singular: "Shift",
    plural: "Shifts",
    description: "Daily sessions such as Morning and Day, in rank order within each institute.",
    searchPlaceholder: "Search shift name",
    form: { nameRequired: "Insert Shift Name.", useFields: () => noFields },
  }),

  branches: define<BranchRow>({
    store: branchApi,
    segment: "branches",
    singular: "Branch",
    plural: "Branches",
    description: "Campuses of each institute. Students, classes and buildings belong to a branch.",
    searchPlaceholder: "Search name or code",
    columns: [branchColumn.accessor("code", { header: "Code", enableSorting: true, meta: { className: "whitespace-nowrap" } })],
    details: (row) => [
      ["Code", row.code],
      ["Address", row.address || "—"],
    ],
    form: {
      nameRequired: "Enter Branch Name",
      useFields: function useBranchFields(row) {
        const code = useText(row?.code ?? "")
        const address = useText(row?.address ?? "")
        return {
          validate: () => ({ code: code.value.trim() ? undefined : "Enter Branch Code" }),
          values: () => ({ code: code.value.trim(), address: address.value.trim() }),
          reset: () => {
            code.setValue("")
            address.setValue("")
          },
          render: (errors: LookupErrors) => (
            <>
              <TextField id="code" label="Code" value={code.value} error={errors.code} onChange={code.setValue} />
              <Field data-invalid={!!errors.address} className="sm:col-span-2">
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Textarea
                  id="address"
                  value={address.value}
                  aria-invalid={!!errors.address}
                  onChange={(event) => address.setValue(event.target.value)}
                />
                <FieldError>{errors.address}</FieldError>
              </Field>
            </>
          ),
        }
      },
    },
  }),

  years: define<YearRow>({
    store: yearApi,
    segment: "years",
    singular: "Academic Year",
    plural: "Academic Years",
    description: "Years that classes, sections and results are recorded against.",
    searchPlaceholder: "Search name or code",
    columns: [
      yearColumn.accessor("code", { header: "Code", enableSorting: true, meta: { className: "whitespace-nowrap" } }),
      yearColumn.accessor("isCurrentYear", {
        header: "Current Year",
        enableSorting: true,
        cell: ({ row }) => (row.original.isCurrentYear ? "Yes" : "No"),
      }),
    ],
    details: (row) => [
      ["Code", row.code],
      ["Current year", row.isCurrentYear ? "Yes" : "No"],
    ],
    form: {
      nameRequired: "Enter Academic Year Name",
      useFields: function useYearFields(row) {
        const code = useText(row?.code ?? "")
        const [current, setCurrent] = React.useState(row?.isCurrentYear ?? false)
        return {
          validate: () => ({ code: code.value.trim() ? undefined : "Enter Academic Year Code" }),
          values: () => ({ code: code.value.trim(), isCurrentYear: current }),
          reset: () => {
            code.setValue("")
            setCurrent(false)
          },
          render: (errors: LookupErrors) => (
            <>
              <TextField id="code" label="Code" value={code.value} error={errors.code} onChange={code.setValue} />
              <Field orientation="horizontal" className="sm:col-span-2">
                <Checkbox id="isCurrentYear" checked={current} onCheckedChange={(checked) => setCurrent(checked === true)} />
                <FieldLabel htmlFor="isCurrentYear">Current academic year</FieldLabel>
              </Field>
            </>
          ),
        }
      },
    },
  }),
}

export type LookupKey = keyof typeof lookupPages
