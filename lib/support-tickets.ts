"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"

// Help requests between institutes and the platform team. Institute users
// raise tickets and reply; the platform team assigns, replies, adds
// internal notes the institute never sees, and resolves them.

export const ticketCategories = ["Billing", "Technical", "Account", "Feature request", "Other"] as const
export type TicketCategory = (typeof ticketCategories)[number]

export const ticketPriorities = ["Low", "Normal", "High", "Urgent"] as const
export type TicketPriority = (typeof ticketPriorities)[number]

export const ticketStatuses = ["Open", "In progress", "Waiting on institute", "Resolved", "Closed"] as const
export type TicketStatus = (typeof ticketStatuses)[number]

// Tickets still needing someone.
export const openTicketStatuses: readonly TicketStatus[] = ["Open", "In progress", "Waiting on institute"]

export type TicketMessage = {
  id: number
  // Admin user who wrote it.
  authorId: number
  authorName: string
  // Written by the platform team (shown as "Support").
  fromPlatform: boolean
  body: string
  // An internal note: only the platform team sees it.
  internal: boolean
  at: string
}

export type SupportTicket = {
  id: number
  ticketNo: string
  instituteId: number
  subject: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  // Platform admin working on it; null when unassigned.
  assigneeId: number | null
  raisedById: number
  raisedByName: string
  messages: TicketMessage[]
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type TicketInput = Pick<SupportTicket, "instituteId" | "subject" | "category" | "priority"> & { body: string }

const ticketNo = (id: number) => `TKT-${String(id).padStart(5, "0")}`

// ---- Seed ----

type SeedMessage = [authorId: number, name: string, platform: boolean, body: string, internal: boolean, at: string]

function seedTicket(
  id: number,
  instituteId: number,
  subject: string,
  category: TicketCategory,
  priority: TicketPriority,
  status: TicketStatus,
  assigneeId: number | null,
  messages: SeedMessage[]
): SupportTicket {
  const list = messages.map(([authorId, authorName, fromPlatform, body, internal, at], i) => ({
    id: id * 100 + i,
    authorId,
    authorName,
    fromPlatform,
    body,
    internal,
    at,
  }))
  const last = list[list.length - 1]
  return {
    id,
    ticketNo: ticketNo(id),
    instituteId,
    subject,
    category,
    priority,
    status,
    assigneeId,
    raisedById: list[0].authorId,
    raisedByName: list[0].authorName,
    messages: list,
    createdAt: list[0].at,
    modifiedBy: last.authorName,
    modifiedAt: last.at,
  }
}

const SA: [number, string, boolean] = [1, "Super Admin", true]

const seed: SupportTicket[] = [
  seedTicket(1, 1, "Attendance SMS not reaching guardians", "Technical", "High", "In progress", 1, [
    [2, "Rafiq Hasan", false, "Since Monday, absent SMS for Class Nine aren't reaching some guardians. The history shows them as sent.", false, "2026-09-22T09:14:00"],
    [...SA, "Thanks, we're checking with the SMS gateway. Could you share two numbers that didn't get it?", false, "2026-09-22T11:02:00"],
    [...SA, "Gateway reports DLR failures on one operator. Raised with the provider.", true, "2026-09-22T11:30:00"],
    [2, "Rafiq Hasan", false, "01711223344 and 01819556677.", false, "2026-09-22T12:10:00"],
  ]),
  seedTicket(2, 1, "Invoice for August shows old student count", "Billing", "Normal", "Waiting on institute", 1, [
    [5, "Farhana Akter", false, "Our August invoice bills 1,550 students but we moved 30 out in July.", false, "2026-09-18T10:00:00"],
    [...SA, "The invoice uses active students on 31 August. Were those 30 marked inactive before then? Please send the transfer list.", false, "2026-09-18T15:20:00"],
  ]),
  seedTicket(3, 3, "Add a second institute admin", "Account", "Low", "Resolved", 1, [
    [3, "Nusrat Jahan", false, "Please add our vice principal as an institute admin.", false, "2026-09-10T08:45:00"],
    [...SA, "Done. They'll get a sign-in email.", false, "2026-09-10T13:00:00"],
  ]),
  seedTicket(4, 2, "Tabulation sheet cuts off the last subject", "Technical", "Urgent", "Open", null, [
    [2, "Rafiq Hasan", false, "When printing the tabulation for HSC 1st year, the last subject column is cut off. Results are due Thursday.", false, "2026-09-28T16:40:00"],
  ]),
  seedTicket(5, 1, "Can we export the merit list to Excel?", "Feature request", "Low", "Open", null, [
    [6, "Imran Hossain", false, "Teachers want the merit list in Excel as well as PDF.", false, "2026-09-26T12:00:00"],
  ]),
  seedTicket(6, 3, "Trial extension request", "Billing", "Normal", "Closed", 1, [
    [3, "Nusrat Jahan", false, "Could we get two more weeks of trial while the board approves the budget?", false, "2026-08-02T09:30:00"],
    [...SA, "Extended by 14 days. Good luck with the board.", false, "2026-08-02T10:10:00"],
  ]),
  seedTicket(7, 2, "Student import rejects valid mobile numbers", "Technical", "Normal", "Resolved", 1, [
    [2, "Rafiq Hasan", false, "Import says 8801XXXXXXXXX numbers are invalid.", false, "2026-09-05T14:00:00"],
    [...SA, "Fixed: numbers with the 88 prefix are accepted now. Please try again.", false, "2026-09-06T09:00:00"],
  ]),
  seedTicket(8, 1, "Wrong principal name on testimonials", "Other", "Normal", "Open", 1, [
    [2, "Rafiq Hasan", false, "Testimonials still print the previous principal's name.", false, "2026-09-27T10:25:00"],
    [...SA, "The name comes from the institute profile. Checking whether a cached copy is used.", true, "2026-09-27T11:00:00"],
  ]),
]

let tickets = seed
const listeners = new Set<() => void>()

function emit(next: SupportTicket[]) {
  logChanges("SupportTicket", tickets, next, (t) => t.ticketNo)
  tickets = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSupportTickets() {
  return React.useSyncExternalStore(subscribe, () => tickets, () => seed)
}

type Author = { id: number; name: string; platform: boolean }

export function ticketErrors(input: TicketInput) {
  const errors: Partial<Record<keyof TicketInput, string>> = {}
  if (!input.instituteId) errors.instituteId = "Pick the institute this is about."
  if (!input.subject.trim()) errors.subject = "Enter a short subject."
  else if (input.subject.trim().length > 120) errors.subject = "Keep the subject under 120 characters."
  if (!input.body.trim()) errors.body = "Describe the problem or request."
  return errors
}

export function addTicket(input: TicketInput, author: Author) {
  const at = new Date().toISOString()
  const id = Math.max(0, ...tickets.map((t) => t.id)) + 1
  const ticket: SupportTicket = {
    id,
    ticketNo: ticketNo(id),
    instituteId: input.instituteId,
    subject: input.subject.trim(),
    category: input.category,
    priority: input.priority,
    status: "Open",
    assigneeId: null,
    raisedById: author.id,
    raisedByName: author.name,
    messages: [
      { id: id * 100, authorId: author.id, authorName: author.name, fromPlatform: author.platform, body: input.body.trim(), internal: false, at },
    ],
    createdAt: at,
    modifiedBy: author.name,
    modifiedAt: at,
  }
  emit([ticket, ...tickets])
  return ticket
}

function patch(id: number, changes: (t: SupportTicket) => Partial<SupportTicket>, by: string) {
  const at = new Date().toISOString()
  emit(tickets.map((t) => (t.id === id ? { ...t, ...changes(t), modifiedBy: by, modifiedAt: at } : t)))
}

// A reply (or, from the platform team, an internal note). An institute's
// reply reopens a ticket waiting on it or resolved; a platform reply to an
// open ticket marks it in progress.
export function addTicketMessage(id: number, body: string, internal: boolean, author: Author) {
  const at = new Date().toISOString()
  patch(
    id,
    (t) => {
      const message: TicketMessage = {
        id: Math.max(t.id * 100, ...t.messages.map((m) => m.id)) + 1,
        authorId: author.id,
        authorName: author.name,
        fromPlatform: author.platform,
        body: body.trim(),
        internal: author.platform && internal,
        at,
      }
      const status: TicketStatus =
        !author.platform && (t.status === "Waiting on institute" || t.status === "Resolved")
          ? "Open"
          : author.platform && !internal && t.status === "Open"
            ? "In progress"
            : t.status
      return { messages: [...t.messages, message], status }
    },
    author.name
  )
}

export function updateTicket(
  id: number,
  changes: Partial<Pick<SupportTicket, "status" | "priority" | "assigneeId">>,
  by: string
) {
  patch(id, () => changes, by)
}

// What the institute side sees: no internal notes.
export function visibleMessages(ticket: SupportTicket, platform: boolean) {
  return platform ? ticket.messages : ticket.messages.filter((m) => !m.internal)
}
