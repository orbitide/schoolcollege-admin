"use client"

import * as React from "react"

import type { AccessSurface } from "@/lib/access"
import { ApiError, httpClient, type PagedList } from "@/lib/http-client"
import type { AcademicRecord, RecordStatus } from "@/lib/institutes"

// A Basic Settings lookup kept by the API (legacy ManageAdmin / Manage /
// ManageView of a per-institute ranked record: shifts, branches, years, …).
export type LookupRow = {
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

export type LookupSurfaceQuery = {
  instituteId?: number
  withDeleted?: boolean
  search?: string
  sortBy?: string
  sortDirection?: "asc" | "desc"
  page: number
  pageSize: number
}

const SURFACE_ROUTE: Record<AccessSurface, string> = { Admin: "manage-admin", Manage: "manage", View: "manage-view" }

function defaultRecord<R extends LookupRow>({ recordStatus, ...row }: R) {
  return { ...row, status: recordStatus } as unknown as AcademicRecord
}

// `resource` is the controller route (`shifts`); `toRecord` turns a row into
// the AcademicRecord shape the in-memory modules' pickers use.
export function createLookupStore<R extends LookupRow, I extends { instituteId: number }, T extends AcademicRecord>(
  resource: string,
  toRecord: (row: R) => T = defaultRecord as (row: R) => T
) {
  // Bumped on every change, so open lists, details and the lookup fetch again.
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

  const useVersion = () => React.useSyncExternalStore(subscribe, () => version, () => 0)

  // A surface's list, one page, filtered and paged by the API; deleted rows
  // only on Admin with `withDeleted`. `rows` is undefined while loading and
  // `denied` is a 403 (the user doesn't hold the page).
  function useSurface(surface: AccessSurface, query: LookupSurfaceQuery) {
    const changes = useVersion()
    const [state, setState] = React.useState<{
      key: string
      rows?: R[]
      totalItems?: number
      error?: string
      denied?: boolean
    }>({ key: "" })
    const { instituteId, withDeleted = false, search = "", sortBy, sortDirection, page, pageSize } = query
    const key = [surface, instituteId, withDeleted, search, sortBy, sortDirection, page, pageSize, changes].join("|")

    React.useEffect(() => {
      let active = true
      httpClient
        .get<PagedList<R>>(`/${resource}/${SURFACE_ROUTE[surface]}`, {
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

  // Legacy Details (deleted rows too). `row` is undefined while loading, null
  // when the API refused or has no such row.
  function useDetails(id: number) {
    const changes = useVersion()
    const [state, setState] = React.useState<{ key: string; row?: R | null; denied?: boolean }>({ key: "" })
    const key = `${id}|${changes}`

    React.useEffect(() => {
      let active = true
      httpClient.get<R>(`/${resource}/details/${id}`).then(
        (row) => active && setState({ key, row }),
        (error: Error) => active && setState({ key, row: null, denied: error instanceof ApiError && error.status === 403 })
      )
      return () => {
        active = false
      }
    }, [key, id])

    return state.key === key ? state : { key, row: undefined }
  }

  async function mutate<Out>(call: Promise<Out>) {
    const result = await call
    changed()
    return result
  }

  // ---- Picker lookup for the modules still in memory ----
  // Every institute's non-deleted rows (GET <resource>/load-all), loaded once
  // and again after each change.
  let lookup: T[] = []
  let lookupLoading: Promise<void> | undefined
  const none: T[] = []

  function loadLookup() {
    lookupLoading ??= httpClient.get<R[]>(`/${resource}/load-all`).then(
      (list) => {
        lookup = list.map(toRecord)
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
    return React.useSyncExternalStore(subscribe, () => lookup, () => none)
  }

  const forInstitute = (all: T[], instituteId: number) => all.filter((record) => record.instituteId === instituteId)

  return {
    useSurface,
    useDetails,
    // Reject with an ApiError (fieldErrors per input) when the API refuses.
    add: (input: I) => mutate(httpClient.post<R>(`/${resource}/create-edit`, input)),
    update: (id: number, input: I) => mutate(httpClient.put<R>(`/${resource}/create-edit/${id}`, input)),
    // Legacy StatusUpdate: Active <-> Inactive.
    toggleStatus: (id: number) => mutate(httpClient.post<R>(`/${resource}/status-update/${id}`)),
    // Legacy GetMaxRank: the highest rank in the row's institute.
    getMaxRank: (id: number) => httpClient.get<number>(`/${resource}/get-max-rank/${id}`),
    // Legacy UpdateRank: `currentRank` is the rank shown, so the API refuses if someone moved it meanwhile.
    setRank: (id: number, newRank: number, currentRank: number) =>
      mutate(httpClient.post<R>(`/${resource}/update-rank/${id}`, { newRank, currentRank })),
    // Legacy Delete: marked Deleted; Admin can retrieve it.
    remove: (id: number) => mutate(httpClient.post<void>(`/${resource}/delete/${id}`)),
    // Legacy Retrieve: back to Active, at the end if its rank was taken.
    retrieve: (id: number) => mutate(httpClient.post<R>(`/${resource}/retrieve/${id}`)),
    // Legacy PermanentDelete: only a deleted row.
    removePermanently: (id: number) => mutate(httpClient.post<void>(`/${resource}/permanent-delete/${id}`)),
    // Read-only stand-in for the in-memory store's accessors.
    lookup: {
      useAll: useLookup,
      useList(instituteId: number) {
        const all = useLookup()
        return React.useMemo(() => forInstitute(all, instituteId), [all, instituteId])
      },
      useOne(id: number) {
        return useLookup().find((record) => record.id === id)
      },
      getList(instituteId: number) {
        loadLookup()
        return forInstitute(lookup, instituteId)
      },
    },
  }
}

export type LookupStore<R extends LookupRow = LookupRow> = {
  useSurface: (surface: AccessSurface, query: LookupSurfaceQuery) => {
    rows?: R[]
    totalItems?: number
    error?: string
    denied?: boolean
  }
  useDetails: (id: number) => { row?: R | null; denied?: boolean }
  toggleStatus: (id: number) => Promise<unknown>
  getMaxRank: (id: number) => Promise<number>
  setRank: (id: number, newRank: number, currentRank: number) => Promise<unknown>
  remove: (id: number) => Promise<unknown>
  retrieve: (id: number) => Promise<unknown>
  removePermanently: (id: number) => Promise<unknown>
}
