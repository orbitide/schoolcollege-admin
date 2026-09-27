"use client"

import * as React from "react"

import {
  branchStore,
  categoryStore,
  classStore,
  groupStore,
  houseStore,
  sectionStore,
  sessionStore,
  shiftStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { districtStore, GLOBAL } from "@/lib/global-settings"
import type { Institute } from "@/lib/institutes"

// Id → name maps for everything a student record points at, across all
// institutes (ids are unique per store), so lists and profiles can show names.
export function useStudentLookups() {
  const classes = classStore.useAll()
  const sections = sectionStore.useAll()
  const years = yearStore.useAll()
  const branches = branchStore.useAll()
  const shifts = shiftStore.useAll()
  const groups = groupStore.useAll()
  const houses = houseStore.useAll()
  const categories = categoryStore.useAll()
  const sessions = sessionStore.useAll()
  const subjects = subjectStore.useAll()
  const districts = districtStore.useList(GLOBAL)

  return React.useMemo(() => {
    const names = (list: { id: number; name: string }[]) =>
      new Map(list.map((item) => [item.id, item.name]))
    const maps = {
      class: names(classes),
      section: names(sections),
      year: names(years),
      branch: names(branches),
      shift: names(shifts),
      group: names(groups),
      house: names(houses),
      category: names(categories),
      session: names(sessions),
      subject: names(subjects),
      district: names(districts),
    }
    // Name for an id, or "—" when unset or since deleted.
    return (kind: keyof typeof maps, id: number | null | undefined) =>
      (id != null && maps[kind].get(id)) || "—"
  }, [classes, sections, years, branches, shifts, groups, houses, categories, sessions, subjects, districts])
}

// The institute's own label for the student ID / class roll, if it set one.
export function studentIdLabel(institute?: Institute) {
  return institute?.studentIdLabel.trim() || "Student ID"
}

export function classRollLabel(institute?: Institute) {
  return institute?.classRollLabel.trim() || "Class roll"
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

// Lookups for the dynamic report: names, plus subject codes by id.
export function useReportLookups() {
  const name = useStudentLookups()
  const subjects = subjectStore.useAll()
  return React.useMemo(() => {
    const codes = new Map(subjects.map((s) => [s.id, s.code]))
    return { name, subjectCode: (id: number) => codes.get(id) ?? "?" }
  }, [name, subjects])
}
