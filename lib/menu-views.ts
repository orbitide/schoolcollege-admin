"use client"

import * as React from "react"

import { publicExams } from "@/lib/institutes"
import type { PublicExam } from "@/lib/students"

// Legacy MenuViewConfiguration (MenuViewSetting): the print template each
// document uses, per institute. Legacy stored the name of a Razor partial
// typed in by hand (_BafsdIdCard, _BafsdAdmitCard, _testimonialSscBAFSC, …)
// and failed at print time when it was blank or wrong; here it is picked
// from the templates the admin ships, and a missing choice falls back to
// the first. In-memory dummy store for the browser session; replace with
// API calls once the backend endpoints exist.

export const printDocuments = ["idCard", "admitCard", "testimonial", "transferCertificate"] as const
export type PrintDocument = (typeof printDocuments)[number]

export type PrintTemplate = { id: string; name: string; description: string }

// Only one layout of each exists so far, ported from the legacy partial.
// Add a template here (and its render in the report) to offer a choice.
export const printTemplates: Record<PrintDocument, PrintTemplate[]> = {
  idCard: [
    { id: "standard", name: "Standard", description: "The layout on the ID Card report (legacy _BafsdIdCard)." },
  ],
  admitCard: [
    {
      id: "standard",
      name: "Standard",
      description: "The layout on the Admit Card report (legacy _BafsdAdmitCard).",
    },
  ],
  testimonial: [
    {
      id: "standard",
      name: "Standard",
      description: "The certificate the Testimonial report prints (legacy _testimonial…BAFSC).",
    },
  ],
  transferCertificate: [
    { id: "standard", name: "Standard", description: "There is no transfer certificate report yet." },
  ],
}

export type MenuViewSetting = {
  idCard: string
  admitCard: string
  // One per public exam (legacy TestimonialJsc…ALevelPartialName).
  testimonial: Record<PublicExam, string>
  transferCertificate: string
}

const first = (document: PrintDocument) => printTemplates[document][0].id

export const defaultMenuViewSetting: MenuViewSetting = {
  idCard: first("idCard"),
  admitCard: first("admitCard"),
  testimonial: Object.fromEntries(publicExams.map((exam) => [exam, first("testimonial")])) as Record<
    PublicExam,
    string
  >,
  transferCertificate: first("transferCertificate"),
}

// The template to print a document with: the saved one while it still
// exists, else the first.
export function printTemplateFor(
  setting: MenuViewSetting,
  document: PrintDocument,
  exam?: PublicExam
): PrintTemplate {
  const id = document === "testimonial" ? (exam ? setting.testimonial[exam] : undefined) : setting[document]
  const templates = printTemplates[document]
  return templates.find((t) => t.id === id) ?? templates[0]
}

let settings = new Map<number, MenuViewSetting>()
const listeners = new Set<() => void>()

function emit(next: Map<number, MenuViewSetting>) {
  settings = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useMenuViewSetting(instituteId: number) {
  const setting = React.useSyncExternalStore(
    subscribe,
    () => settings.get(instituteId),
    () => undefined
  )
  return setting ?? defaultMenuViewSetting
}

export function saveMenuViewSetting(instituteId: number, setting: MenuViewSetting) {
  emit(new Map(settings).set(instituteId, setting))
}

export function removeInstituteMenuView(instituteId: number) {
  const next = new Map(settings)
  next.delete(instituteId)
  emit(next)
}
