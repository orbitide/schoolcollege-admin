"use client"

import * as React from "react"

import { removeInstituteRecords } from "@/lib/academic-store"
import { removeInstituteCategories } from "@/lib/blog-categories"
import { removeInstituteComments } from "@/lib/blog-comments"
import { removeInstitutePosts } from "@/lib/blog-posts"
import { removeInstituteTags } from "@/lib/blog-tags"
import { logChanges } from "@/lib/common-log"
import { getCurrentUser } from "@/lib/current-user"
import { removeInstituteUsers } from "@/lib/global-settings"
import { removeInstituteHolidays } from "@/lib/holidays"
import { ApiError, httpClient, type PagedList } from "@/lib/http-client"
import { removeInstituteBillingProfile } from "@/lib/billing-profiles"
import { removeInstituteInvoices } from "@/lib/saas-invoices"
import { addSubscription, removeInstituteSubscription } from "@/lib/subscriptions"
import { removeInstituteMenuView } from "@/lib/menu-views"
import { removeInstituteSmsTemplates } from "@/lib/sms-templates"
import { removeInstituteStudents } from "@/lib/students"
import { removeInstituteTeachers } from "@/lib/teachers"
import { removeInstituteTermExams } from "@/lib/term-exams"
import type { AccessSurface } from "@/lib/access"
import { setLoadedInstitutes } from "@/lib/loaded-institutes"
import type { Institute, InstituteConfiguration, InstituteInput, InstituteStatus } from "@/lib/institutes"

// Institutes, kept by the API (api/v1/institutes). The list holds the
// institutes the signed-in user may work with (every one for a super admin),
// loaded by RequireLogin before any page renders; the functions below save
// through the API and update the list with what it returns.
let institutes: Institute[] = []
let loading: Promise<void> | undefined
const listeners = new Set<() => void>()
const noInstitutes: Institute[] = []

// Bumped on every change, so open surface lists fetch again.
let version = 0

function notify() {
  version++
  // For the stores still in memory, which read institutes outside React.
  setLoadedInstitutes(institutes)
  listeners.forEach((listener) => listener())
}

function emit(next: Institute[]) {
  logChanges("Institute", institutes, next)
  institutes = next
  notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const SURFACE_ROUTE: Record<AccessSurface, string> = { Admin: "manage-admin", Manage: "manage", View: "manage-view" }

// Every institute the user works with, once per page load. Rejects when the API can't be reached.
export function loadInstitutes() {
  loading ??= httpClient.get<Institute[]>("/institutes/load-all").then(
    (list) => {
      institutes = list
      notify()
    },
    (error) => {
      loading = undefined
      throw error
    }
  )
  return loading
}

export function useInstitutes() {
  return React.useSyncExternalStore(subscribe, () => institutes, () => noInstitutes)
}

export function useInstitute(id: number) {
  return useInstitutes().find((institute) => institute.id === id)
}

// Fetches the app list again (after a change that moves other rows, e.g. rank).
function reloadInstitutes() {
  loading = undefined
  return loadInstitutes()
}

export type InstituteSurfaceQuery = {
  withDeleted?: boolean
  search?: string
  status?: InstituteStatus
  type?: string
  sortBy?: string
  sortDirection?: "asc" | "desc"
  page: number
  pageSize: number
}

// A legacy surface's list (Institute Manage Admin / Manage / View), one page
// in rank order, filtered and paged by the API; deleted institutes only on
// Admin with `withDeleted`. Refetches after every change made through this
// store. `rows` is undefined while loading.
export function useInstituteSurface(surface: AccessSurface, query: InstituteSurfaceQuery) {
  const changes = React.useSyncExternalStore(subscribe, () => version, () => 0)
  // `denied`: the API refused the page (403), so the user doesn't hold it.
  const [state, setState] = React.useState<{
    key: string
    rows?: Institute[]
    totalItems?: number
    error?: string
    denied?: boolean
  }>({ key: "" })
  const { withDeleted = false, search = "", status, type, sortBy, sortDirection, page, pageSize } = query
  const key = [surface, withDeleted, search, status, type, sortBy, sortDirection, page, pageSize, changes].join("|")

  React.useEffect(() => {
    let active = true
    httpClient
      .get<PagedList<Institute>>(`/institutes/${SURFACE_ROUTE[surface]}`, {
        params: {
          withDeleted: surface === "Admin" && withDeleted,
          search: search || undefined,
          status,
          type,
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
  }, [key, surface, withDeleted, search, status, type, sortBy, sortDirection, page, pageSize])

  // Keeps showing the previous rows while a refetch is on its way.
  return state
}

function replace(institute: Institute) {
  emit(institutes.map((i) => (i.id === institute.id ? institute : i)))
  return institute
}

// Institute Manage Admin. Rejects with an ApiError (fieldErrors per input) when the API refuses.
export async function addInstitute(input: InstituteInput) {
  const institute = await httpClient.post<Institute>("/institutes/create-edit", input)
  emit([institute, ...institutes])
  addSubscription(institute, getCurrentUser().name)
  return institute
}

// Institute Manage: the platform's fields keep
// their values (the configuration has its own save).
export async function updateInstitute(id: number, input: InstituteInput) {
  return replace(await httpClient.put<Institute>(`/institutes/create-edit/${id}`, input))
}

// Institute Manage Admin: any institute, the platform's fields too.
export async function updateAdminInstitute(id: number, input: InstituteInput) {
  return replace(await httpClient.put<Institute>(`/institutes/create-edit-admin/${id}`, input))
}

// Institute Configurations: the whole configuration, the SMS gateway key included
// (institute responses never carry it).
export function getInstituteConfiguration(id: number) {
  return httpClient.get<InstituteConfiguration>(`/instituteconfiguration/configuration-ajax/${id}`)
}

// Institute Configurations: saves the whole document.
export async function updateInstituteConfiguration(id: number, configuration: InstituteConfiguration) {
  return replace(await httpClient.post<Institute>(`/instituteconfiguration/general-configuration/${id}`, configuration))
}

// Absent Fine Date Configuration: the fine period's days, saved with the rest of the configuration.
export async function updateInstituteFinePeriod(id: number, period: { dayFrom: number; dayTo: number }) {
  const configuration = await getInstituteConfiguration(id)
  return updateInstituteConfiguration(id, { ...configuration, ...period })
}

// Institute Manage Admin: the SaaS lifecycle (Active / Trial / Suspended).
export async function setInstituteStatus(id: number, status: InstituteStatus) {
  return replace(await httpClient.post<Institute>(`/institutes/saas-status-update/${id}`, { status }))
}

// Legacy Status Update: Active <-> Inactive (Admin / Manage surface).
export async function toggleInstituteRecordStatus(id: number) {
  return replace(await httpClient.post<Institute>(`/institutes/status-update/${id}`))
}

// Legacy GetMaxRank, for the rank form.
export function getInstituteMaxRank(id: number) {
  return httpClient.get<number>(`/institutes/get-max-rank/${id}`)
}

// Legacy UpdateRank: `currentRank` is the rank shown, so the API refuses if
// someone moved it meanwhile. Institutes in between shift, so the list reloads.
export async function setInstituteRank(id: number, newRank: number, currentRank: number) {
  const institute = await httpClient.post<Institute>(`/institutes/update-rank/${id}`, { newRank, currentRank })
  await reloadInstitutes()
  return institute
}

// Institute Manage Admin, legacy Delete: the institute is marked Deleted and leaves the
// app's lists; Admin can retrieve it, so nothing else is cleared yet.
export async function deleteInstitute(id: number) {
  await httpClient.post(`/institutes/delete/${id}`)
  emit(institutes.filter((i) => i.id !== id))
}

// Institute Manage Admin, legacy Retrieve: back to Active.
export async function retrieveInstitute(id: number) {
  const institute = await httpClient.post<Institute>(`/institutes/retrieve/${id}`)
  await reloadInstitutes()
  return institute
}

// Institute Manage Admin, legacy Permanent Delete (only a deleted institute). The API
// removes it and its User Institutes links; the modules still held in memory
// drop their rows for it here.
export async function deleteInstitutePermanently(id: number) {
  await httpClient.post(`/institutes/permanent-delete/${id}`)
  emit(institutes.filter((i) => i.id !== id))
  removeInstituteRecords(id)
  removeInstituteUsers(id)
  removeInstituteHolidays(id)
  removeInstituteStudents(id)
  removeInstituteTermExams(id)
  removeInstituteTeachers(id)
  removeInstituteSmsTemplates(id)
  removeInstituteMenuView(id)
  removeInstituteSubscription(id)
  removeInstituteInvoices(id)
  removeInstituteBillingProfile(id)
  removeInstitutePosts(id)
  removeInstituteCategories(id)
  removeInstituteTags(id)
  removeInstituteComments(id)
  void import("@/lib/institute-module-cleanup").then((m) => m.removeInstituteModuleData(id))
}
