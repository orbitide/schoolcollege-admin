"use client"

import * as React from "react"

import type { AccessSurface } from "@/lib/access"
import { ApiError, httpClient, type PagedList } from "@/lib/http-client"
import type { RecordStatus, Branch } from "@/lib/institutes"

// Branches, kept by the API (api/v1/branches, legacy Branch Manage Admin / Manage / View).
export type BranchRow = {
  id: number
  instituteId: number
  name: string
  code: string
  address: string
  rank: number
  recordStatus: RecordStatus | "Deleted"
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type BranchInput = { instituteId: number; name: string; code: string; address: string }

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

export type BranchSurfaceQuery = {
  instituteId?: number
  withDeleted?: boolean
  search?: string
  sortBy?: string
  sortDirection?: "asc" | "desc"
  page: number
  pageSize: number
}

// A surface's list, one page, filtered and paged by the API; deleted branches
// only on Admin with `withDeleted`. `rows` is undefined while loading and
// `denied` is a 403 (the user doesn't hold the page).
export function useBranchSurface(surface: AccessSurface, query: BranchSurfaceQuery) {
  const changes = React.useSyncExternalStore(subscribe, () => version, () => 0)
  const [state, setState] = React.useState<{
    key: string
    rows?: BranchRow[]
    totalItems?: number
    error?: string
    denied?: boolean
  }>({ key: "" })
  const { instituteId, withDeleted = false, search = "", sortBy, sortDirection, page, pageSize } = query
  const key = [surface, instituteId, withDeleted, search, sortBy, sortDirection, page, pageSize, changes].join("|")

  React.useEffect(() => {
    let active = true
    httpClient
      .get<PagedList<BranchRow>>(`/branches/${SURFACE_ROUTE[surface]}`, {
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

// Legacy Details (deleted branches too). `branch` is undefined while loading,
// null when the API refused or has no such branch.
export function useBranchDetails(id: number) {
  const changes = React.useSyncExternalStore(subscribe, () => version, () => 0)
  const [state, setState] = React.useState<{ key: string; branch?: BranchRow | null; error?: string; denied?: boolean }>({
    key: "",
  })
  const key = `${id}|${changes}`

  React.useEffect(() => {
    let active = true
    httpClient.get<BranchRow>(`/branches/details/${id}`).then(
      (branch) => active && setState({ key, branch }),
      (error: Error) =>
        active &&
        setState({ key, branch: null, error: error.message, denied: error instanceof ApiError && error.status === 403 })
    )
    return () => {
      active = false
    }
  }, [key, id])

  return state.key === key ? state : { key, branch: undefined }
}

// Rejects with an ApiError (fieldErrors per input) when the API refuses.
export async function addBranch(input: BranchInput) {
  const branch = await httpClient.post<BranchRow>("/branches/create-edit", input)
  changed()
  return branch
}

export async function updateBranch(id: number, input: BranchInput) {
  const branch = await httpClient.put<BranchRow>(`/branches/create-edit/${id}`, input)
  changed()
  return branch
}

// Legacy StatusUpdate: Active <-> Inactive.
export async function toggleBranchStatus(id: number) {
  const branch = await httpClient.post<BranchRow>(`/branches/status-update/${id}`)
  changed()
  return branch
}

// Legacy GetMaxRank: the highest rank in the branch's institute.
export function getBranchMaxRank(id: number) {
  return httpClient.get<number>(`/branches/get-max-rank/${id}`)
}

// Legacy UpdateRank: `currentRank` is the rank shown, so the API refuses if someone moved it meanwhile.
export async function setBranchRank(id: number, newRank: number, currentRank: number) {
  const branch = await httpClient.post<BranchRow>(`/branches/update-rank/${id}`, { newRank, currentRank })
  changed()
  return branch
}

// Legacy Delete: marked Deleted; Admin can retrieve it.
export async function deleteBranch(id: number) {
  await httpClient.post(`/branches/delete/${id}`)
  changed()
}

// Legacy Retrieve: back to Active, at the end if its rank was taken.
export async function retrieveBranch(id: number) {
  const branch = await httpClient.post<BranchRow>(`/branches/retrieve/${id}`)
  changed()
  return branch
}

// Legacy PermanentDelete: only a deleted branch.
export async function deleteBranchPermanently(id: number) {
  await httpClient.post(`/branches/permanent-delete/${id}`)
  changed()
}

// ---- Picker lookup for the modules still in memory ----
// Every institute's non-deleted branches (GET branches/load-all), loaded once and
// again after each change, in the AcademicRecord shape those modules use.
let lookup: Branch[] = []
let lookupLoading: Promise<void> | undefined
const noBranches: Branch[] = []

function loadLookup() {
  lookupLoading ??= httpClient.get<BranchRow[]>("/branches/load-all").then(
    (list) => {
      lookup = list.map(({ recordStatus, ...branch }) => ({ ...branch, status: recordStatus }))
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
  return React.useSyncExternalStore(subscribe, () => lookup, () => noBranches)
}

const forInstitute = (all: Branch[], instituteId: number) => all.filter((branch) => branch.instituteId === instituteId)

// Read-only stand-in for the in-memory store's accessors (useList / useAll / useOne / getList).
export const branchStore = {
  useAll: useLookup,
  useList(instituteId: number) {
    const all = useLookup()
    return React.useMemo(() => forInstitute(all, instituteId), [all, instituteId])
  },
  useOne(id: number) {
    return useLookup().find((branch) => branch.id === id)
  },
  getList(instituteId: number) {
    loadLookup()
    return forInstitute(lookup, instituteId)
  },
}
