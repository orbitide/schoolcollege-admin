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
import { removeInstituteBillingProfile } from "@/lib/billing-profiles"
import { removeInstituteInvoices } from "@/lib/saas-invoices"
import { addSubscription, removeInstituteSubscription } from "@/lib/subscriptions"
import { removeInstituteMenuView } from "@/lib/menu-views"
import { removeInstituteSmsTemplates } from "@/lib/sms-templates"
import { removeInstituteStudents } from "@/lib/students"
import { removeInstituteTeachers } from "@/lib/teachers"
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
  logChanges("Institute", institutes, next)
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
  addSubscription(institute, getCurrentUser().name)
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
