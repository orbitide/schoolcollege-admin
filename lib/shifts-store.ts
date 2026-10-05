"use client"

import * as React from "react"

import type { AccessSurface } from "@/lib/access"
import { ApiError, httpClient, type PagedList } from "@/lib/http-client"
import type { RecordStatus, Shift } from "@/lib/institutes"

// Shifts, kept by the API (api/v1/shifts, legacy Shift Manage Admin / Manage / View).
export type ShiftRow = {
  id: number
  instituteId: number
  name: string
  rank: number
  recordStatus: RecordStatus | "Deleted"
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type ShiftInput = { instituteId: number; name: string }

const SURFACE_ROUTE: Record<AccessSurface, string> = { Admin: "manage-admin", Manage: "manage", View: "manage-view" }

// Bumped on every change, so open lists and the picker cache fetch again.
let version = 0
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function changed() {
  version++
  reloadLookup()
  listeners.forEach((listener) => listener())
}

export type ShiftSurfaceQuery = {
  instituteId?: number
  withDeleted?: boolean
  search?: string
  sortBy?: string
  sortDirection?: "asc" | "desc"
  page: number
  pageSize: number
}

// A surface's list, one page, filtered and paged by the API; deleted shifts
// only on Admin with `withDeleted`. `rows` is undefined while loading and
// `denied` is a 403 (the user doesn't hold the page).
export function useShiftSurface(surface: AccessSurface, query: ShiftSurfaceQuery) {
  const changes = React.useSyncExternalStore(subscribe, () => version, () => 0)
  const [state, setState] = React.useState<{
    key: string
    rows?: ShiftRow[]
    totalItems?: number
    error?: string
    denied?: boolean
  }>({ key: "" })
  const { instituteId, withDeleted = false, search = "", sortBy, sortDirection, page, pageSize } = query
  const key = [surface, instituteId, withDeleted, search, sortBy, sortDirection, page, pageSize, changes].join("|")

  React.useEffect(() => {
    let active = true
    httpClient
      .get<PagedList<ShiftRow>>(`/shifts/${SURFACE_ROUTE[surface]}`, {
        params: {
          instituteId,
          withDeleted: surface === "Admin" && withDeleted,
          search: search || undefined,
          sortBy,
          sortDirection: sortBy ? sortDirection : undefined,
          pageNumber: page,
          pageSize,
        },
      })
      .then(
        (result) => active && setState({ key, rows: result.items, totalItems: result.totalItems }),
        (error: Error) =>
          active && setState({ key, error: error.message, denied: error instanceof ApiError && error.status === 403 })
      )
    return () => {
      active = false
    }
  }, [key, surface, instituteId, withDeleted, search, sortBy, sortDirection, page, pageSize])

  return state
}

// Legacy Details (deleted shifts too). `shift` is undefined while loading,
// null when the API refused or has no such shift.
export function useShiftDetails(id: number) {
  const changes = React.useSyncExternalStore(subscribe, () => version, () => 0)
  const [state, setState] = React.useState<{ key: string; shift?: ShiftRow | null; error?: string; denied?: boolean }>({
    key: "",
  })
  const key = `${id}|${changes}`

  React.useEffect(() => {
    let active = true
    httpClient.get<ShiftRow>(`/shifts/details/${id}`).then(
      (shift) => active && setState({ key, shift }),
      (error: Error) =>
        active &&
        setState({ key, shift: null, error: error.message, denied: error instanceof ApiError && error.status === 403 })
    )
    return () => {
      active = false
    }
  }, [key, id])

  return state.key === key ? state : { key, shift: undefined }
}

// Rejects with an ApiError (fieldErrors per input) when the API refuses.
export async function addShift(input: ShiftInput) {
  const shift = await httpClient.post<ShiftRow>("/shifts/create-edit", input)
  changed()
  return shift
}

export async function updateShift(id: number, input: ShiftInput) {
  const shift = await httpClient.put<ShiftRow>(`/shifts/create-edit/${id}`, input)
  changed()
  return shift
}

// Legacy StatusUpdate: Active <-> Inactive.
export async function toggleShiftStatus(id: number) {
  const shift = await httpClient.post<ShiftRow>(`/shifts/status-update/${id}`)
  changed()
  return shift
}

// Legacy GetMaxRank: the highest rank in the shift's institute.
export function getShiftMaxRank(id: number) {
  return httpClient.get<number>(`/shifts/get-max-rank/${id}`)
}

// Legacy UpdateRank: `currentRank` is the rank shown, so the API refuses if someone moved it meanwhile.
export async function setShiftRank(id: number, newRank: number, currentRank: number) {
  const shift = await httpClient.post<ShiftRow>(`/shifts/update-rank/${id}`, { newRank, currentRank })
  changed()
  return shift
}

// Legacy Delete: marked Deleted; Admin can retrieve it.
export async function deleteShift(id: number) {
  await httpClient.post(`/shifts/delete/${id}`)
  changed()
}

// Legacy Retrieve: back to Active, at the end if its rank was taken.
export async function retrieveShift(id: number) {
  const shift = await httpClient.post<ShiftRow>(`/shifts/retrieve/${id}`)
  changed()
  return shift
}

// Legacy PermanentDelete: only a deleted shift.
export async function deleteShiftPermanently(id: number) {
  await httpClient.post(`/shifts/permanent-delete/${id}`)
  changed()
}

// ---- Picker lookup for the modules still in memory ----
// Every institute's non-deleted shifts (GET shifts/load-all), loaded once and
// again after each change, in the AcademicRecord shape those modules use.
let lookup: Shift[] = []
let lookupLoading: Promise<void> | undefined
const noShifts: Shift[] = []

function loadLookup() {
  lookupLoading ??= httpClient.get<ShiftRow[]>("/shifts/load-all").then(
    (list) => {
      lookup = list.map(({ recordStatus, ...shift }) => ({ ...shift, status: recordStatus }))
      listeners.forEach((listener) => listener())
    },
    () => {
      lookupLoading = undefined
    }
  )
}

function reloadLookup() {
  if (!lookupLoading) return
  lookupLoading = undefined
  loadLookup()
}

function useLookup() {
  React.useEffect(loadLookup, [])
  return React.useSyncExternalStore(subscribe, () => lookup, () => noShifts)
}

const forInstitute = (all: Shift[], instituteId: number) => all.filter((shift) => shift.instituteId === instituteId)

// Read-only stand-in for the in-memory store's accessors (useList / useAll / useOne / getList).
export const shiftStore = {
  useAll: useLookup,
  useList(instituteId: number) {
    const all = useLookup()
    return React.useMemo(() => forInstitute(all, instituteId), [all, instituteId])
  },
  useOne(id: number) {
    return useLookup().find((shift) => shift.id === id)
  },
  getList(instituteId: number) {
    loadLookup()
    return forInstitute(lookup, instituteId)
  },
}
