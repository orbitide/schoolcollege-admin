"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArchiveRestoreIcon,
  ArrowUpDownIcon,
  CalendarCheckIcon,
  CopyIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  kindConfig,
  type AcademicKind,
  type EditableRecord,
} from "@/components/institutes/academic/kinds"
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
import { capabilitiesFor, type Capabilities } from "@/lib/access"
import { useCurrentUser } from "@/lib/current-user"
import { studentsUsing } from "@/lib/students"

type Confirm = "delete" | "retrieve" | "permanent"

// Row menu shared by the per-institute lists and the all-institutes admin
// lists: edit, set current, (in)activate and delete with its confirmation,
// as far as the surface allows (`can`, everything by default). Kinds with
// `softDelete` get the legacy grid's menu instead: Details, Rank, a Delete
// that can be retrieved, and Permanent Delete for deleted records.
export function RecordActions({
  kind,
  record,
  singular,
  instituteName,
  editHref,
  detailHref,
  copyHref,
  can = capabilitiesFor("Admin"),
}: {
  kind: AcademicKind
  record: EditableRecord
  singular: string
  instituteName: string
  editHref: string
  detailHref?: string
  // Legacy Copy: the new form started from this record.
  copyHref?: string
  can?: Capabilities
}) {
  const config = kindConfig(kind)
  const user = useCurrentUser()
  const hasCurrent = config.fields.some((field) => field.current)
  const soft = Boolean(config.softDelete)
  const deleted = record.status === "Deleted"
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const [ranking, setRanking] = React.useState(false)
  const lower = singular.toLowerCase()

  function toggleStatus() {
    const next = record.status === "Active" ? "Inactive" : "Active"
    config.store.setStatus(record.id, next, user.name)
    toast.success(`${record.name} ${next === "Active" ? "activated" : "inactivated"}`)
  }

  function makeCurrent() {
    config.store.setCurrent(record.id)
    toast.success(`${record.name} is now the current ${lower}`)
  }

  // Records other records still point at can't be removed for good yet.
  function requestRemove() {
    const { studentMatch } = config
    const reason =
      config.inUse?.(record) ??
      (studentMatch &&
        studentsUsing(record.instituteId, (student, enrolment) =>
          studentMatch(record, student, enrolment)
        ))
    if (reason) {
      toast.error(`${record.name} can't be ${soft ? "permanently " : ""}deleted`, {
        description: soft
          ? `${reason} Move those first.`
          : `${reason} Move or delete those first, or inactivate it instead.`,
      })
      return
    }
    setConfirm("permanent")
  }

  const dialogs: Record<
    Confirm,
    { title: string; description: string; action: string; destructive?: boolean; run: () => void; done: string }
  > = {
    delete: {
      title: `Delete "${record.name}"?`,
      description: `The ${lower} is hidden from ${instituteName}'s lists and gives up its rank. An admin can retrieve it later from “With Deleted”.`,
      action: "Delete",
      destructive: true,
      run: () => config.store.softDelete(record.id, user.name),
      done: `${record.name} deleted`,
    },
    retrieve: {
      title: `Retrieve "${record.name}"?`,
      description: `The ${lower} comes back as active, last in rank.`,
      action: "Retrieve",
      run: () => config.store.retrieve(record.id, user.name),
      done: `${record.name} retrieved`,
    },
    permanent: {
      title: soft ? `Permanently delete "${record.name}"?` : `Delete ${record.name}?`,
      description: `This removes the ${lower} from ${instituteName} for good. This cannot be undone.`,
      action: soft ? "Permanent Delete" : "Delete",
      destructive: true,
      run: () => config.store.remove(record.id),
      done: `${record.name} ${soft ? "permanently " : ""}deleted`,
    },
  }
  const dialog = confirm ? dialogs[confirm] : null

  if (!soft && !can.edit && !can.status && !can.delete) return null

  return (
    <>
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
        <DropdownMenuContent align="end" className="w-48">
          {soft && detailHref && (
            <DropdownMenuItem asChild>
              <Link href={detailHref}>
                <EyeIcon />
                Details
              </Link>
            </DropdownMenuItem>
          )}
          {!deleted && (
            <>
              {can.edit && (
                <DropdownMenuItem asChild>
                  <Link href={editHref}>
                    <PencilIcon />
                    Edit
                  </Link>
                </DropdownMenuItem>
              )}
              {can.status && hasCurrent && !record.isCurrent && (
                <DropdownMenuItem onSelect={makeCurrent}>
                  <CalendarCheckIcon />
                  Set as current
                </DropdownMenuItem>
              )}
              {can.status && (
                <DropdownMenuItem onSelect={toggleStatus}>
                  {record.status === "Active" ? <CircleMinusIcon /> : <CircleCheckIcon />}
                  {record.status === "Active" ? "Inactivate" : "Activate"}
                </DropdownMenuItem>
              )}
              {soft && can.reorder && (
                <DropdownMenuItem onSelect={() => setRanking(true)}>
                  <ArrowUpDownIcon />
                  Rank
                </DropdownMenuItem>
              )}
              {config.copyable && copyHref && can.create && (
                <DropdownMenuItem asChild>
                  <Link href={copyHref}>
                    <CopyIcon />
                    Copy
                  </Link>
                </DropdownMenuItem>
              )}
            </>
          )}
          {deleted && can.restore && (
            <DropdownMenuItem onSelect={() => setConfirm("retrieve")}>
              <ArchiveRestoreIcon />
              Retrieve
            </DropdownMenuItem>
          )}
          {can.delete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={soft && !deleted ? () => setConfirm("delete") : requestRemove}
              >
                <Trash2Icon />
                {soft && deleted ? "Permanent Delete" : "Delete"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!dialog} onOpenChange={(open) => !open && setConfirm(null)}>
        {dialog && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{dialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant={dialog.destructive ? "destructive" : "default"}
                onClick={() => {
                  dialog.run()
                  toast.success(dialog.done)
                  setConfirm(null)
                }}
              >
                {dialog.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      {soft && (
        <Dialog open={ranking} onOpenChange={setRanking}>
          <DialogContent className="sm:max-w-sm">
            {ranking && (
              <RankForm kind={kind} record={record} onDone={() => setRanking(false)} />
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

// The legacy rank box: current / maximum rank and the new rank to move to.
function RankForm({
  kind,
  record,
  onDone,
}: {
  kind: AcademicKind
  record: EditableRecord
  onDone: () => void
}) {
  const { store } = kindConfig(kind)
  const user = useCurrentUser()
  const id = React.useId()
  const max = store.maxRank(record)
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState<string>()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const rank = Number(value)
    if (!value || !Number.isInteger(rank) || rank <= 0) {
      setError("Rank field can't be empty or zero.")
    } else if (rank > max) {
      setError("New rank cannot be greater than current maximum order.")
    } else if (rank === record.rank) {
      setError("New and old rank cannot be same.")
    } else {
      store.setRank(record.id, rank, user.name)
      toast.success("Rank updated successfully")
      onDone()
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Update rank</DialogTitle>
        <DialogDescription>
          Current rank / maximum rank: {record.rank} / {max}. Those in between move by one.
        </DialogDescription>
      </DialogHeader>
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={id}>New rank</FieldLabel>
        <Input
          id={id}
          inputMode="numeric"
          autoFocus
          value={value}
          placeholder={`1 – ${max}`}
          aria-invalid={!!error}
          onChange={(event) => {
            setValue(event.target.value.replace(/\D/g, ""))
            setError(undefined)
          }}
        />
        <FieldError>{error}</FieldError>
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">Update</Button>
      </DialogFooter>
    </form>
  )
}
