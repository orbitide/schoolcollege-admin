"use client"

import * as React from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { SelectField } from "@/components/institutes/institute-form"
import { StatusBadge } from "@/components/institutes/status-badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { districtStore, GLOBAL, type District } from "@/lib/global-settings"
import { recordStatuses, type RecordStatus } from "@/lib/institutes"
import { studentsUsing } from "@/lib/students"

// Legacy "Manage District (Admin)": one district list shared by all institutes.
export function DistrictList() {
  const districts = districtStore.useList(GLOBAL)
  // null: closed, "new": adding, otherwise the district being edited.
  const [editing, setEditing] = React.useState<District | "new" | null>(null)
  const [deleting, setDeleting] = React.useState<District | null>(null)

  function toggleStatus(district: District) {
    const next = district.status === "Active" ? "Inactive" : "Active"
    districtStore.setStatus(district.id, next)
    toast.success(`${district.name} ${next === "Active" ? "activated" : "inactivated"}`)
  }

  // A district students live in can't be deleted.
  function requestDelete(district: District) {
    const reason = studentsUsing(null, (student) => student.districtId === district.id)
    if (reason) {
      toast.error(`${district.name} can't be deleted`, {
        description: `${reason} Inactivate it instead.`,
      })
      return
    }
    setDeleting(district)
  }

  function remove() {
    if (!deleting) return
    districtStore.remove(deleting.id)
    toast.success(`${deleting.name} deleted`)
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Manage Districts (Admin)</h2>
          <p className="text-sm text-muted-foreground">
            Districts institutes and students are located in.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <PlusIcon data-icon="inline-start" />
          Add district
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-28">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Bangla name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {districts.length ? (
              districts.map((district, index) => (
                <TableRow key={district.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="w-6 tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={index === 0}
                        onClick={() => districtStore.move(district.id, "up")}
                      >
                        <ArrowUpIcon />
                        <span className="sr-only">Move up</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={index === districts.length - 1}
                        onClick={() => districtStore.move(district.id, "down")}
                      >
                        <ArrowDownIcon />
                        <span className="sr-only">Move down</span>
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{district.name}</TableCell>
                  <TableCell>{district.nameBn || "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={district.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground data-[state=open]:bg-muted"
                        >
                          <EllipsisVerticalIcon />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => setEditing(district)}>
                          <PencilIcon />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => toggleStatus(district)}>
                          {district.status === "Active" ? (
                            <CircleMinusIcon />
                          ) : (
                            <CircleCheckIcon />
                          )}
                          {district.status === "Active" ? "Inactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => requestDelete(district)}
                        >
                          <Trash2Icon />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No districts yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          {editing !== null && (
            <DistrictForm
              key={editing === "new" ? "new" : editing.id}
              district={editing === "new" ? undefined : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the district for every institute. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DistrictForm({ district, onDone }: { district?: District; onDone: () => void }) {
  const [name, setName] = React.useState(district?.name ?? "")
  const [nameBn, setNameBn] = React.useState(district?.nameBn ?? "")
  const [status, setStatus] = React.useState<RecordStatus>(district?.status ?? "Active")
  const [error, setError] = React.useState<string>()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError("Name is required.")
    if (districtStore.isTaken(GLOBAL, "name", trimmed, district?.id)) {
      return setError("Another district already uses this name.")
    }
    const input = { name: trimmed, nameBn: nameBn.trim(), status }
    if (district) districtStore.update(district.id, input)
    else districtStore.add({ ...input, instituteId: GLOBAL })
    toast.success(`${trimmed} ${district ? "updated" : "added"}`)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{district ? "Edit district" : "Add district"}</DialogTitle>
        <DialogDescription>Shared by every institute.</DialogDescription>
      </DialogHeader>
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor="district-name">Name</FieldLabel>
        <Input
          id="district-name"
          value={name}
          aria-invalid={!!error}
          onChange={(event) => setName(event.target.value)}
        />
        <FieldError>{error}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="district-name-bn">Bangla name</FieldLabel>
        <Input
          id="district-name-bn"
          value={nameBn}
          onChange={(event) => setNameBn(event.target.value)}
        />
      </Field>
      <SelectField
        name="district-status"
        label="Status"
        options={recordStatuses}
        value={status}
        onChange={setStatus}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">{district ? "Save changes" : "Add district"}</Button>
      </DialogFooter>
    </form>
  )
}
