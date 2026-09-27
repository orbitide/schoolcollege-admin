"use client"

import * as React from "react"

import { removeInstituteRecords } from "@/lib/academic-store"
import { removeInstituteUsers } from "@/lib/global-settings"
import { removeInstituteStudents } from "@/lib/students"
import { removeInstituteTermExams } from "@/lib/term-exams"
import {
  seedInstitutes,
  type Institute,
  type InstituteConfiguration,
  type InstituteInput,
  type InstituteStatus,
} from "@/lib/institutes"

// In-memory dummy store shared by all institute pages for the browser session.
// Replace with API calls once the backend endpoints exist.
let institutes: Institute[] = seedInstitutes
const listeners = new Set<() => void>()

function emit(next: Institute[]) {
  institutes = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useInstitutes() {
  return React.useSyncExternalStore(
    subscribe,
    () => institutes,
    () => seedInstitutes
  )
}

export function useInstitute(id: number) {
  return useInstitutes().find((institute) => institute.id === id)
}

export function addInstitute(input: InstituteInput) {
  const institute: Institute = {
    ...input,
    id: Math.max(0, ...institutes.map((i) => i.id)) + 1,
    joinedAt: new Date().toISOString().slice(0, 10),
  }
  emit([institute, ...institutes])
  return institute
}

export function updateInstitute(id: number, input: InstituteInput) {
  emit(institutes.map((i) => (i.id === id ? { ...i, ...input } : i)))
}

export function updateInstituteConfiguration(
  id: number,
  configuration: InstituteConfiguration
) {
  emit(institutes.map((i) => (i.id === id ? { ...i, configuration } : i)))
}

export function setInstituteStatus(id: number, status: InstituteStatus) {
  emit(institutes.map((i) => (i.id === id ? { ...i, status } : i)))
}

export function deleteInstitute(id: number) {
  emit(institutes.filter((i) => i.id !== id))
  removeInstituteRecords(id)
  removeInstituteUsers(id)
  removeInstituteStudents(id)
  removeInstituteTermExams(id)
}
