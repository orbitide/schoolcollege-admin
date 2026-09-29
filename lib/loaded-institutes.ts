import type { Institute } from "@/lib/institutes"

// The institutes the API returned for the signed-in user, kept by
// lib/institutes-store.ts. Stores that are still in memory read institutes
// here (their demo data, an exam's grading configuration) outside React.
// Deliberately imports nothing but types, so any store can use it without
// joining the institutes-store import cycle.
let loaded: Institute[] = []

export function getLoadedInstitutes() {
  return loaded
}

export function setLoadedInstitutes(institutes: Institute[]) {
  loaded = institutes
}
