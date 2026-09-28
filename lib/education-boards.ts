"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"

// Legacy SchoolCollege EducationBoard (Online Admission menu): the boards a
// board student passed SSC under, shared by every institute. The legacy
// board-student import matches a sheet's board column against these names in
// upper case, so boards are kept in upper case. Deleting only marks the board
// "Deleted" (it can be retrieved). In-memory like the rest of admin; replace
// with API calls once the backend endpoints exist.

export const educationBoardStatuses = ["Active", "Inactive", "Deleted"] as const
export type EducationBoardStatus = (typeof educationBoardStatuses)[number]

export type EducationBoard = {
  id: number
  name: string
  status: EducationBoardStatus
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

const now = () => new Date().toISOString()
const seedUser = "Super Admin"
const seedStamp = "2026-01-10T09:30:00.000Z"

let boards: EducationBoard[] = [
  "DHAKA",
  "RAJSHAHI",
  "COMILLA",
  "JESSORE",
  "CHITTAGONG",
  "BARISAL",
  "SYLHET",
  "DINAJPUR",
  "MYMENSINGH",
  "MADRASAH",
  "TECHNICAL",
].map((name, index) => ({
  id: index + 1,
  name,
  status: "Active",
  createdBy: seedUser,
  createdAt: seedStamp,
  modifiedBy: seedUser,
  modifiedAt: seedStamp,
}))
const seed = boards
const listeners = new Set<() => void>()

function emit(next: EducationBoard[]) {
  logChanges("EducationBoard", boards, next)
  boards = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Every board, deleted ones included, in legacy order (by id).
export function useAllEducationBoards() {
  return React.useSyncExternalStore(
    subscribe,
    () => boards,
    () => seed
  )
}

const notDeleted = (all: EducationBoard[]) => all.filter((b) => b.status !== "Deleted")

// The boards pickers offer (not deleted).
export function useEducationBoards() {
  const all = useAllEducationBoards()
  return React.useMemo(() => notDeleted(all), [all])
}

export function useEducationBoard(id: number) {
  return useAllEducationBoards().find((b) => b.id === id)
}

const normalize = (name: string) => name.trim().toUpperCase()

// Names are unique among boards not deleted, so the import can match them.
export function isDuplicateEducationBoardName(name: string, exceptId?: number) {
  const needle = normalize(name)
  return notDeleted(boards).some((b) => b.id !== exceptId && b.name === needle)
}

export function addEducationBoard(name: string, user: string) {
  const stamp = now()
  const board: EducationBoard = {
    id: Math.max(0, ...boards.map((b) => b.id)) + 1,
    name: normalize(name),
    status: "Active",
    createdBy: user,
    createdAt: stamp,
    modifiedBy: user,
    modifiedAt: stamp,
  }
  emit([...boards, board])
  return board
}

function patch(id: number, changes: Partial<EducationBoard>, user: string) {
  emit(
    boards.map((b) =>
      b.id === id ? { ...b, ...changes, modifiedBy: user, modifiedAt: now() } : b
    )
  )
}

export function updateEducationBoard(id: number, name: string, user: string) {
  patch(id, { name: normalize(name) }, user)
}

// Active ⇄ Inactive.
export function toggleEducationBoardStatus(id: number, user: string) {
  const board = boards.find((b) => b.id === id)
  if (!board || board.status === "Deleted") return
  patch(id, { status: board.status === "Active" ? "Inactive" : "Active" }, user)
}

// Soft delete; the legacy "Retrive" brings it back as active.
export function deleteEducationBoard(id: number, user: string) {
  const board = boards.find((b) => b.id === id)
  if (!board || board.status === "Deleted") return
  patch(id, { status: "Deleted" }, user)
}

export function retrieveEducationBoard(id: number, user: string) {
  const board = boards.find((b) => b.id === id)
  if (!board || board.status !== "Deleted") return
  patch(id, { status: "Active" }, user)
}
