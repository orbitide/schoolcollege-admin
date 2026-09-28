"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"

// Legacy SchoolCollege District: one ranked list shared by every institute.
// Deleting only marks the district "Deleted" (it can be retrieved); a
// permanent delete removes it. In-memory like the rest of admin; replace
// with API calls once the backend endpoints exist.

export const districtStatuses = ["Active", "Inactive", "Deleted"] as const
export type DistrictStatus = (typeof districtStatuses)[number]

export type District = {
  id: number
  name: string
  nameBn: string
  rank: number
  status: DistrictStatus
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type DistrictInput = Pick<District, "name" | "nameBn">

const now = () => new Date().toISOString()
const seedUser = "Super Admin"
const seedStamp = "2026-01-10T09:30:00.000Z"

let districts: District[] = [
  ["Dhaka", "ঢাকা"],
  ["Chattogram", "চট্টগ্রাম"],
  ["Rajshahi", "রাজশাহী"],
  ["Khulna", "খুলনা"],
  ["Barishal", "বরিশাল"],
  ["Sylhet", "সিলেট"],
  ["Rangpur", "রংপুর"],
  ["Mymensingh", "ময়মনসিংহ"],
].map(([name, nameBn], index) => ({
  id: index + 1,
  name,
  nameBn,
  rank: index + 1,
  status: "Active",
  createdBy: seedUser,
  createdAt: seedStamp,
  modifiedBy: seedUser,
  modifiedAt: seedStamp,
}))
const seed = districts
const listeners = new Set<() => void>()

function emit(next: District[]) {
  logChanges("District", districts, next)
  districts = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Every district, deleted ones included.
export function useAllDistricts() {
  return React.useSyncExternalStore(
    subscribe,
    () => districts,
    () => seed
  )
}

const notDeleted = (all: District[]) =>
  all.filter((d) => d.status !== "Deleted").sort((a, b) => a.rank - b.rank)

// The districts pickers offer (not deleted), in rank order.
export function useDistricts() {
  const all = useAllDistricts()
  return React.useMemo(() => notDeleted(all), [all])
}

export function useDistrict(id: number) {
  return useAllDistricts().find((d) => d.id === id)
}

export function maxDistrictRank() {
  return Math.max(0, ...notDeleted(districts).map((d) => d.rank))
}

// The legacy duplicate checks: names are unique among districts not deleted.
function isDuplicate(key: "name" | "nameBn", value: string, exceptId?: number) {
  const needle = value.trim().toLowerCase()
  return notDeleted(districts).some(
    (d) => d.id !== exceptId && d[key].trim().toLowerCase() === needle
  )
}

export function isDuplicateDistrictName(name: string, exceptId?: number) {
  return isDuplicate("name", name, exceptId)
}

export function isDuplicateDistrictBanglaName(nameBn: string, exceptId?: number) {
  return isDuplicate("nameBn", nameBn, exceptId)
}

export function addDistrict(input: DistrictInput, user: string) {
  const stamp = now()
  const district: District = {
    name: input.name.trim(),
    nameBn: input.nameBn.trim(),
    id: Math.max(0, ...districts.map((d) => d.id)) + 1,
    rank: maxDistrictRank() + 1,
    status: "Active",
    createdBy: user,
    createdAt: stamp,
    modifiedBy: user,
    modifiedAt: stamp,
  }
  emit([...districts, district])
  return district
}

function patch(id: number, changes: Partial<District>, user: string) {
  emit(
    districts.map((d) =>
      d.id === id ? { ...d, ...changes, modifiedBy: user, modifiedAt: now() } : d
    )
  )
}

export function updateDistrict(id: number, input: DistrictInput, user: string) {
  patch(id, { name: input.name.trim(), nameBn: input.nameBn.trim() }, user)
}

// Active ⇄ Inactive.
export function toggleDistrictStatus(id: number, user: string) {
  const district = districts.find((d) => d.id === id)
  if (!district || district.status === "Deleted") return
  patch(id, { status: district.status === "Active" ? "Inactive" : "Active" }, user)
}

// Close the gap a district leaves in the ranks.
function withoutRank(all: District[], district: District) {
  return all.map((d) =>
    d.status !== "Deleted" && d.rank > district.rank ? { ...d, rank: d.rank - 1 } : d
  )
}

// Soft delete; the legacy "Retrive" brings it back as active, last in rank.
export function deleteDistrict(id: number, user: string) {
  const district = districts.find((d) => d.id === id)
  if (!district || district.status === "Deleted") return
  emit(withoutRank(districts, district))
  patch(id, { status: "Deleted" }, user)
}

export function retrieveDistrict(id: number, user: string) {
  const district = districts.find((d) => d.id === id)
  if (!district || district.status !== "Deleted") return
  patch(id, { status: "Active", rank: maxDistrictRank() + 1 }, user)
}

export function deleteDistrictPermanently(id: number) {
  const district = districts.find((d) => d.id === id)
  if (!district) return
  const rest = districts.filter((d) => d.id !== id)
  emit(district.status === "Deleted" ? rest : withoutRank(rest, district))
}

// Legacy UpdateRank: move the district to `newRank` (1..max), shifting the
// districts in between by one.
export function setDistrictRank(id: number, newRank: number, user: string) {
  const district = districts.find((d) => d.id === id)
  if (!district || district.status === "Deleted") return
  const old = district.rank
  if (newRank === old) return
  const [low, high, step] = newRank < old ? [newRank, old - 1, 1] : [old + 1, newRank, -1]
  const stamp = now()
  emit(
    districts.map((d) => {
      if (d.id === id) return { ...d, rank: newRank, modifiedBy: user, modifiedAt: stamp }
      if (d.status !== "Deleted" && d.rank >= low && d.rank <= high) {
        return { ...d, rank: d.rank + step }
      }
      return d
    })
  )
}
