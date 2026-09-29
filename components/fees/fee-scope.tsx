"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { classStore, sectionStore, yearStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"

// The institute / academic year / class / section a fee page works on, kept
// in the URL (?institute=&year=&class=&section=). The year defaults to the
// institute's current one; a single accessible institute is picked for the
// user.
export function useFeeScope() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const canPick = institutes.length > 1
  const param = React.useCallback((key: string) => searchParams.get(key) ?? "", [searchParams])

  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const iid = institute?.id ?? -1
  const years = yearStore.useList(iid)
  const classes = classStore.useList(iid)
  const allSections = sectionStore.useList(iid)
  const year =
    years.find((y) => String(y.id) === param("year")) ??
    (param("year") ? undefined : (years.find((y) => y.isCurrent) ?? years[years.length - 1]))
  const academicClass = classes.find((c) => String(c.id) === param("class"))
  const sections = allSections.filter(
    (s) => s.classId === academicClass?.id && (!year || s.yearId == null || s.yearId === year.id)
  )
  const section = sections.find((s) => String(s.id) === param("section"))

  const setParam = React.useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams)
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      const search = params.toString()
      router.replace(search ? `${pathname}?${search}` : pathname)
    },
    [router, pathname, searchParams]
  )

  return { institutes, canPick, institute, years, year, classes, academicClass, sections, section, param, setParam }
}

export type FeeScope = ReturnType<typeof useFeeScope>

// Institute, year, class and section pickers. `need` marks which are
// required on the page (shown with a star, no "All" option).
export function FeeScopeFields({
  scope,
  show = ["year", "class", "section"],
  need = [],
}: {
  scope: FeeScope
  show?: ("year" | "class" | "section")[]
  need?: ("year" | "class" | "section")[]
}) {
  const { institutes, canPick, institute, years, year, classes, academicClass, sections, section, setParam } = scope
  return (
    <>
      {canPick && (
        <FilterField
          label="Institute"
          required
          value={institute ? String(institute.id) : ""}
          onChange={(v) => setParam({ institute: v, year: "", class: "", section: "", student: "" })}
          options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
          placeholder="Select an institute"
        />
      )}
      {show.includes("year") && (
        <FilterField
          label="Academic Year"
          required
          value={year ? String(year.id) : ""}
          onChange={(v) => setParam({ year: v, section: "" })}
          options={years.map((y) => ({ value: String(y.id), label: y.name }))}
          placeholder="Select a year"
          disabled={!institute}
        />
      )}
      {show.includes("class") && (
        <FilterField
          label="Class"
          required={need.includes("class")}
          value={academicClass ? String(academicClass.id) : ""}
          onChange={(v) => setParam({ class: v, section: "" })}
          options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
          allLabel={need.includes("class") ? undefined : "All classes"}
          placeholder="Select a class"
          disabled={!institute}
        />
      )}
      {show.includes("section") && (
        <FilterField
          label="Section"
          required={need.includes("section")}
          value={section ? String(section.id) : ""}
          onChange={(v) => setParam({ section: v })}
          options={sections.map((s) => ({ value: String(s.id), label: s.name }))}
          allLabel={need.includes("section") ? undefined : "All sections"}
          placeholder="Select a section"
          disabled={!academicClass}
        />
      )}
    </>
  )
}

// Due-status badge colours, shared by the fee lists.
export const dueStatusClass: Record<string, string> = {
  Paid: "border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-400",
  Partial: "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Unpaid: "border-sky-600/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  Overdue: "border-red-600/30 bg-red-500/10 text-red-700 dark:text-red-400",
  Cancelled: "text-muted-foreground line-through",
}

export const fmtDate = (iso: string) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—"
