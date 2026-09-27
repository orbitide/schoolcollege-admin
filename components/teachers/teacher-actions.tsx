"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArchiveRestoreIcon,
  ArrowUpDownIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

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
import { useCurrentUser } from "@/lib/current-user"
import {
  deleteTeacher,
  deleteTeacherPermanently,
  maxTeacherRank,
  retrieveTeacher,
  setTeacherRank,
  toggleTeacherStatus,
  type Teacher,
} from "@/lib/teachers"

type Confirm = "delete" | "retrieve" | "permanent"

// Row menu of the legacy ManageAdmin grid. What it offers depends on the
// status: deleted teachers can only be viewed, retrieved or deleted for good.
export function TeacherActions({
  teacher,
  returnTo,
}: {
  teacher: Teacher
  returnTo: string
}) {
  const user = useCurrentUser()
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const [ranking, setRanking] = React.useState(false)
  const back = `returnTo=${encodeURIComponent(returnTo)}`
  const deleted = teacher.status === "Deleted"

  function toggleStatus() {
    toggleTeacherStatus(teacher.id, user.name)
    toast.success(`${teacher.name} ${teacher.status === "Active" ? "inactivated" : "activated"}`)
  }

  const dialogs: Record<
    Confirm,
    { title: string; description: string; action: string; destructive?: boolean; run: () => void; done: string }
  > = {
    delete: {
      title: `Delete ${teacher.name}?`,
      description:
        "The teacher is hidden from the lists and gives up their rank. You can retrieve them later from “With deleted”.",
      action: "Delete",
      destructive: true,
      run: () => deleteTeacher(teacher.id, user.name),
      done: `${teacher.name} deleted`,
    },
    retrieve: {
      title: `Retrieve ${teacher.name}?`,
      description: "The teacher comes back as active, last in rank.",
      action: "Retrieve",
      run: () => retrieveTeacher(teacher.id, user.name),
      done: `${teacher.name} retrieved`,
    },
    permanent: {
      title: `Permanently delete ${teacher.name}?`,
      description:
        "The teacher and their section and subject assignments are removed for good. This cannot be undone.",
      action: "Delete permanently",
      destructive: true,
      run: () => deleteTeacherPermanently(teacher.id),
      done: `${teacher.name} permanently deleted`,
    },
  }
  const dialog = confirm ? dialogs[confirm] : null

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
          <DropdownMenuItem asChild>
            <Link href={`/teachers/${teacher.id}?${back}`}>
              <EyeIcon />
              Details
            </Link>
          </DropdownMenuItem>
          {!deleted && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/teachers/${teacher.id}/edit?${back}`}>
                  <PencilIcon />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={toggleStatus}>
                {teacher.status === "Active" ? <CircleMinusIcon /> : <CircleCheckIcon />}
                {teacher.status === "Active" ? "Inactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRanking(true)}>
                <ArrowUpDownIcon />
                Change rank
              </DropdownMenuItem>
            </>
          )}
          {deleted && (
            <DropdownMenuItem onSelect={() => setConfirm("retrieve")}>
              <ArchiveRestoreIcon />
              Retrieve
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirm(deleted ? "permanent" : "delete")}
          >
            <Trash2Icon />
            {deleted ? "Delete permanently" : "Delete"}
          </DropdownMenuItem>
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

      <Dialog open={ranking} onOpenChange={setRanking}>
        <DialogContent className="sm:max-w-sm">
          {ranking && <RankForm teacher={teacher} onDone={() => setRanking(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

// The legacy rank modal: current / maximum rank and the new rank to move to.
function RankForm({ teacher, onDone }: { teacher: Teacher; onDone: () => void }) {
  const user = useCurrentUser()
  const id = React.useId()
  const max = maxTeacherRank(teacher.instituteId)
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState<string>()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const rank = Number(value)
    if (!value || !Number.isInteger(rank) || rank <= 0) {
      setError("Rank field can't be empty or zero.")
    } else if (rank > max) {
      setError("New rank can't be greater than max rank.")
    } else if (rank === teacher.rank) {
      setError("Same rank found.")
    } else {
      setTeacherRank(teacher.id, rank, user.name)
      toast.success(`${teacher.name} moved to rank ${rank}`)
      onDone()
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Change rank</DialogTitle>
        <DialogDescription>
          {teacher.name} is at rank {teacher.rank} of {max}. Teachers in between move by one.
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
        <Button type="submit">Update rank</Button>
      </DialogFooter>
    </form>
  )
}
