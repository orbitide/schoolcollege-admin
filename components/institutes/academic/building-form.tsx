"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowDownIcon, ArrowLeftIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { PickField } from "@/components/institutes/academic/class-year-subject-form"
import type { EditableRecord, Errors } from "@/components/institutes/academic/kinds"
import { SelectField } from "@/components/institutes/institute-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { branchStore, buildingStore } from "@/lib/academic-store"
import { plansUsingRoom } from "@/lib/exam-seat-plans"
import {
  recordStatuses,
  roomCapacity,
  type Building,
  type BuildingRoom,
  type Institute,
  type RecordStatus,
} from "@/lib/institutes"

type Row = { key: number; id: number | null; name: string; totalColumns: string; benchesPerColumn: string; studentsPerBench: string }

let nextKey = 1
const toRow = (room?: BuildingRoom): Row => ({
  key: nextKey++,
  id: room?.id ?? null,
  name: room?.name ?? "",
  totalColumns: room ? String(room.totalColumns) : "",
  benchesPerColumn: room ? String(room.benchesPerColumn) : "",
  studentsPerBench: room ? String(room.studentsPerBench) : "",
})

const count = (value: string) => {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : 0
}
const numberKeys = ["totalColumns", "benchesPerColumn", "studentsPerBench"] as const

// Legacy Buildings/CreateEdit ("Manage Building Room"): a building — its
// location, and branch when the institute has branches — and its rooms in
// order, each laid out as columns of benches with so many students to a
// bench; the capacity is worked out from those.
export function BuildingForm({
  institute,
  record,
  singular,
  plural,
  listHref,
}: {
  institute: Institute
  record?: EditableRecord
  singular: string
  plural: string
  listHref: string
}) {
  const existing = record as Building | undefined
  const router = useRouter()
  const branches = branchStore.useList(institute.id)

  const [name, setName] = React.useState(existing?.name ?? "")
  const [branchId, setBranchId] = React.useState(existing?.branchId != null ? String(existing.branchId) : "")
  const [status, setStatus] = React.useState<RecordStatus>(existing?.status ?? "Active")
  const [rows, setRows] = React.useState<Row[]>(() => (existing?.rooms.length ? existing.rooms.map(toRow) : [toRow()]))
  const [errors, setErrors] = React.useState<Errors>({})

  const lower = singular.toLowerCase()
  const capacityOf = (row: Row) =>
    roomCapacity({
      totalColumns: count(row.totalColumns),
      benchesPerColumn: count(row.benchesPerColumn),
      studentsPerBench: count(row.studentsPerBench),
    })
  const totalCapacity = rows.reduce((sum, row) => sum + capacityOf(row), 0)

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }
  function moveRow(index: number, by: -1 | 1) {
    setRows((current) => {
      const next = [...current]
      const [row] = next.splice(index, 1)
      next.splice(index + by, 0, row)
      return next
    })
  }

  function validate() {
    const next: Errors = {}
    const trimmed = name.trim()
    if (!trimmed) next.name = "Location is required."
    else if (buildingStore.isTaken(institute.id, "name", trimmed, existing?.id, { branchId: branchId ? Number(branchId) : null }))
      next.name = institute.enableBranch
        ? "This branch already has a building with this name."
        : "A building with this name already exists."
    if (institute.enableBranch && !branchId) next.branchId = "Branch is required."
    if (!rows.length) next.rows = "Add at least one room."
    // A room an exam is seated in can't be taken away.
    const kept = new Set(rows.map((row) => row.id))
    const removedInUse = (existing?.rooms ?? []).filter(
      (room) => !kept.has(room.id) && plansUsingRoom(existing!.id, room.id).length > 0
    )
    if (removedInUse.length)
      next.rows = `${removedInUse.map((room) => room.name).join(", ")} ${removedInUse.length === 1 ? "is" : "are"} used by an exam seat plan and can't be removed.`
    const seen = new Set<string>()
    rows.forEach((row, index) => {
      const at = (field: string) => `rows.${index}.${field}`
      const roomName = row.name.trim().toLowerCase()
      if (!roomName) next[at("name")] = "Room number is required."
      else if (seen.has(roomName)) next[at("name")] = "This room is already listed."
      seen.add(roomName)
      for (const key of numberKeys) if (!count(row[key])) next[at(key)] = "Enter a whole number above 0."
    })
    return next
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.values(next).some(Boolean)) {
      toast.error("Check the highlighted fields.")
      return
    }
    // Rooms keep their ids so seat plans that use them stay attached.
    let nextId = Math.max(0, ...buildingStore.getList(institute.id).flatMap((b) => b.rooms.map((r) => r.id)))
    const input = {
      name: name.trim(),
      status,
      branchId: institute.enableBranch && branchId ? Number(branchId) : null,
      rooms: rows.map(
        (row): BuildingRoom => ({
          id: row.id ?? ++nextId,
          name: row.name.trim(),
          totalColumns: count(row.totalColumns),
          benchesPerColumn: count(row.benchesPerColumn),
          studentsPerBench: count(row.studentsPerBench),
        })
      ),
    }
    if (existing) buildingStore.update(existing.id, input)
    else buildingStore.add({ ...input, instituteId: institute.id })
    toast.success(`${input.name} ${existing ? "updated" : "added"}`)
    router.push(listHref)
  }

  const numberField = (row: Row, index: number, key: (typeof numberKeys)[number], label: string) => {
    const error = errors[`rows.${index}.${key}`]
    const id = `${key}-${row.key}`
    return (
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={row[key]}
          aria-invalid={!!error}
          onChange={(e) => updateRow(row.key, { [key]: e.target.value.replace(/\D/g, "") })}
        />
        <FieldError>{error}</FieldError>
      </Field>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={listHref}>
          <ArrowLeftIcon data-icon="inline-start" />
          {plural}
        </Link>
      </Button>

      <h3 className="text-xl font-semibold tracking-tight">{existing ? `Edit ${lower}` : `Add ${lower}`}</h3>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Building</CardTitle>
          <CardDescription>Where the rooms are. Exams are seated in its rooms.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {institute.enableBranch && (
            <PickField
              id="branchId"
              label="Branch"
              value={branchId}
              onChange={setBranchId}
              options={branches
                .filter((b) => b.status === "Active" || String(b.id) === branchId)
                .map((b) => ({ value: String(b.id), label: b.name }))}
              placeholder="Select branch"
              error={errors.branchId}
            />
          )}
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Location</FieldLabel>
            <Input
              id="name"
              value={name}
              placeholder="e.g. Main Building"
              aria-invalid={!!errors.name}
              onChange={(e) => setName(e.target.value)}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <SelectField name="status" label="Status" options={recordStatuses} value={status} onChange={setStatus} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h4 className="font-semibold">Rooms</h4>
          <p className="text-sm text-muted-foreground">
            {rows.length} room{rows.length === 1 ? "" : "s"} · {totalCapacity} seats. Capacity is columns × benches per
            column × students per bench.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setRows((current) => [...current, toRow()])}>
          <PlusIcon data-icon="inline-start" />
          Add room
        </Button>
      </div>
      {errors.rows && <p className="text-sm text-destructive">{errors.rows}</p>}

      {rows.map((row, index) => {
        const nameError = errors[`rows.${index}.name`]
        return (
          <Card key={row.key}>
            <CardContent className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto_auto]">
              <Field data-invalid={!!nameError}>
                <FieldLabel htmlFor={`room-${row.key}`}>Room {index + 1}</FieldLabel>
                <Input
                  id={`room-${row.key}`}
                  value={row.name}
                  placeholder="Room number"
                  aria-invalid={!!nameError}
                  onChange={(e) => updateRow(row.key, { name: e.target.value })}
                />
                <FieldError>{nameError}</FieldError>
              </Field>
              {numberField(row, index, "totalColumns", "Total columns")}
              {numberField(row, index, "benchesPerColumn", "Benches per column")}
              {numberField(row, index, "studentsPerBench", "Students per bench")}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Capacity</span>
                <span className="flex h-9 items-center text-lg font-semibold tabular-nums">{capacityOf(row)}</span>
              </div>
              <div className="flex gap-1 self-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  disabled={index === 0}
                  onClick={() => moveRow(index, -1)}
                >
                  <ArrowUpIcon />
                  <span className="sr-only">Move room up</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  disabled={index === rows.length - 1}
                  onClick={() => moveRow(index, 1)}
                >
                  <ArrowDownIcon />
                  <span className="sr-only">Move room down</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  disabled={rows.length === 1}
                  onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                >
                  <Trash2Icon />
                  <span className="sr-only">Remove room</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <div className="flex gap-2">
        <Button type="submit">{existing ? "Save changes" : `Add ${lower}`}</Button>
        <Button asChild type="button" variant="outline">
          <Link href={listHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
