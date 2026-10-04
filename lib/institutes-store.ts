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
import { httpClient, type PagedList } from "@/lib/http-client"
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

const SURFACE_LIST_PAGE_SIZE = 100

const SURFACE_ROUTE: Record<AccessSurface, string> = { Admin: "admin", Manage: "manage", View: "view" }

// Every institute the user works with, once per page load. Rejects when the API can't be reached.
export function loadInstitutes() {
  loading ??= httpClient.get<Institute[]>("/institutes/accessible").then(
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

// A legacy surface's list (Institute Manage Admin / Manage / View), in rank
// order; deleted institutes only on Admin with `withDeleted`. Refetches after
// every change made through this store. `rows` is undefined while loading.
export function useInstituteSurface(surface: AccessSurface, withDeleted: boolean) {
  const changes = React.useSyncExternalStore(subscribe, () => version, () => 0)
  const [state, setState] = React.useState<{ key: string; rows?: Institute[]; error?: string }>({ key: "" })
  const key = `${surface}|${withDeleted}|${changes}`

  React.useEffect(() => {
    let active = true
    httpClient
      .get<PagedList<Institute>>(`/institutes/${SURFACE_ROUTE[surface]}`, {
        params: { withDeleted: surface === "Admin" && withDeleted, pageSize: SURFACE_LIST_PAGE_SIZE },
      })
      .then(
        (page) => active && setState({ key, rows: page.items }),
        (error: Error) => active && setState({ key, error: error.message })
      )
    return () => {
      active = false
    }
  }, [key, surface, withDeleted])

  // Keeps showing the previous rows while a refetch is on its way.
  return state
}

function replace(institute: Institute) {
  emit(institutes.map((i) => (i.id === institute.id ? institute : i)))
  return institute
}

// Super admin. Rejects with an ApiError (fieldErrors per input) when the API refuses.
export async function addInstitute(input: InstituteInput) {
  const institute = await httpClient.post<Institute>("/institutes", input)
  emit([institute, ...institutes])
  addSubscription(institute, getCurrentUser().name)
  return institute
}

// Super admin: the institute form's fields (the configuration has its own save).
export async function updateInstitute(id: number, input: InstituteInput) {
  return replace(await httpClient.put<Institute>(`/institutes/${id}`, input))
}

// Institute Configurations (institute-configuration.manage).
export async function updateInstituteConfiguration(id: number, configuration: InstituteConfiguration) {
  return replace(await httpClient.put<Institute>(`/institutes/${id}/configuration`, configuration))
}

// Absent Fine Date Configuration (attendance.fine-configuration.manage):
// only the fine period's days.
export async function updateInstituteFinePeriod(id: number, period: { dayFrom: number; dayTo: number }) {
  return replace(await httpClient.put<Institute>(`/institutes/${id}/fine-period`, period))
}

// Super admin: the SaaS lifecycle (Active / Trial / Suspended).
export async function setInstituteStatus(id: number, status: InstituteStatus) {
  return replace(await httpClient.put<Institute>(`/institutes/${id}/status`, { status }))
}

// Legacy Status Update: Active <-> Inactive (Admin / Manage surface).
export async function toggleInstituteRecordStatus(id: number) {
  return replace(await httpClient.put<Institute>(`/institutes/${id}/record-status`))
}

// Legacy GetMaxRank, for the rank form.
export function getInstituteMaxRank(id: number) {
  return httpClient.get<number>(`/institutes/${id}/max-rank`)
}

// Legacy UpdateRank: `currentRank` is the rank shown, so the API refuses if
// someone moved it meanwhile. Institutes in between shift, so the list reloads.
export async function setInstituteRank(id: number, newRank: number, currentRank: number) {
  const institute = await httpClient.put<Institute>(`/institutes/${id}/rank`, { newRank, currentRank })
  await reloadInstitutes()
  return institute
}

// Super admin, legacy Delete: the institute is marked Deleted and leaves the
// app's lists; Admin can retrieve it, so nothing else is cleared yet.
export async function deleteInstitute(id: number) {
  await httpClient.delete(`/institutes/${id}`)
  emit(institutes.filter((i) => i.id !== id))
}

// Super admin, legacy Retrieve: back to Active.
export async function retrieveInstitute(id: number) {
  const institute = await httpClient.put<Institute>(`/institutes/${id}/retrieve`)
  await reloadInstitutes()
  return institute
}

// Super admin, legacy Permanent Delete (only a deleted institute). The API
// removes it and its User Institutes links; the modules still held in memory
// drop their rows for it here.
export async function deleteInstitutePermanently(id: number) {
  await httpClient.delete(`/institutes/${id}/permanent`)
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
