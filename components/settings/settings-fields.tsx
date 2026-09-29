"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function TextField({
  label,
  value,
  onChange,
  error,
  description,
  required,
  className,
  ...input
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  description?: string
  required?: boolean
  className?: string
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "className">) {
  const id = React.useId()
  return (
    <Field data-invalid={!!error || undefined} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </FieldLabel>
      <Input
        id={id}
        value={value}
        aria-invalid={!!error || undefined}
        onChange={(e) => onChange(e.target.value)}
        {...input}
      />
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  )
}

export function CheckField({
  label,
  checked,
  onChange,
  description,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  description?: string
}) {
  const id = React.useId()
  return (
    <Field orientation="horizontal">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </FieldContent>
    </Field>
  )
}

// Who saved last, with Reset and Save enabled once something changed.
export function SaveFooter({
  modifiedBy,
  modifiedAt,
  changed,
  onReset,
  saveLabel = "Save",
}: {
  modifiedBy: string
  modifiedAt: string
  changed: boolean
  onReset: () => void
  saveLabel?: string
}) {
  return (
    <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t">
      <p className="text-xs text-muted-foreground">
        Last changed by {modifiedBy} on {new Date(modifiedAt).toLocaleString()}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={!changed} onClick={onReset}>
          Reset
        </Button>
        <Button type="submit" disabled={!changed}>
          {saveLabel}
        </Button>
      </div>
    </CardFooter>
  )
}
