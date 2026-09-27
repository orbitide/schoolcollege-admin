"use client"

import * as React from "react"

import {
  seedInstitutes,
  type Institute,
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

export function setInstituteStatus(id: number, status: InstituteStatus) {
  emit(institutes.map((i) => (i.id === id ? { ...i, status } : i)))
}

export function deleteInstitute(id: number) {
  emit(institutes.filter((i) => i.id !== id))
}
