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
import { httpClient } from "@/lib/http-client"
import { removeInstituteBillingProfile } from "@/lib/billing-profiles"
import { removeInstituteInvoices } from "@/lib/saas-invoices"
import { addSubscription, removeInstituteSubscription } from "@/lib/subscriptions"
import { removeInstituteMenuView } from "@/lib/menu-views"
import { removeInstituteSmsTemplates } from "@/lib/sms-templates"
import { removeInstituteStudents } from "@/lib/students"
import { removeInstituteTeachers } from "@/lib/teachers"
import { removeInstituteTermExams } from "@/lib/term-exams"
import type { Institute, InstituteConfiguration, InstituteInput, InstituteStatus } from "@/lib/institutes"

// Institutes, kept by the API (api/v1/institutes). The list holds the
// institutes the signed-in user may work with (every one for a super admin),
// loaded by RequireLogin before any page renders; the functions below save
// through the API and update the list with what it returns.
let institutes: Institute[] = []
let loading: Promise<void> | undefined
const listeners = new Set<() => void>()
const noInstitutes: Institute[] = []

function notify() {
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

// Loads the list once per page load. Rejects when the API can't be reached.
export function loadInstitutes() {
  loading ??= httpClient.get<Institute[]>("/institutes").then(
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

// Super admin.
export async function setInstituteStatus(id: number, status: InstituteStatus) {
  return replace(await httpClient.put<Institute>(`/institutes/${id}/status`, { status }))
}

// Super admin. The API removes the institute and its User Institutes links;
// the modules still held in memory drop their rows for it here.
export async function deleteInstitute(id: number) {
  await httpClient.delete(`/institutes/${id}`)
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
