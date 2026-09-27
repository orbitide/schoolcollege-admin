"use client"

import * as React from "react"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Radix Select can't use "" as a value; "" here means "All …" / none.
const ALL = "__all"

// A select whose "" value is offered as `allLabel` (e.g. "All branches").
export function FilterField({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  allLabel,
  error,
  disabled,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  allLabel?: string
  error?: string
  disabled?: boolean
}) {
  const id = React.useId()
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </FieldLabel>
      <Select
        value={value === "" && allLabel ? ALL : value}
        onValueChange={(next) => onChange(next === ALL ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

// "Jun 01, 2026", as the legacy exam dates read.
export function examDate(iso: string) {
  if (!iso) return "—"
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  })
}

// "05/01/2026, 10:00", the created / modified stamps of the admin lists.
export function stamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
