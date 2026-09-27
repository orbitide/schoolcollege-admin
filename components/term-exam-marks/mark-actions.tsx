"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArchiveRestoreIcon,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCurrentUser } from "@/lib/current-user"
import {
  deleteMark,
  deleteMarkPermanently,
  retrieveMark,
  toggleMarkStatus,
  type TermExamStudentMark,
} from "@/lib/term-exam-marks"
import type { TermExam } from "@/lib/term-exams"

type Confirm = "delete" | "retrieve" | "permanent"

// Where Edit Student Marks opens this mark's student (legacy "Edit" link).
export function markEditHref(mark: TermExamStudentMark, exam: TermExam, returnTo: string) {
  const params = new URLSearchParams({
    institute: String(exam.instituteId),
    class: String(exam.classId),
    year: String(exam.yearId),
    exam: String(exam.id),
    roll: mark.roll,
    returnTo,
  })
  return `/term-exam-marks/edit?${params}`
}

// Row menu of the legacy Student Marks ManageAdmin grid. Deleted marks can
// only be viewed, retrieved or deleted for good.
export function MarkActions({
  mark,
  exam,
  label,
  returnTo,
}: {
  mark: TermExamStudentMark
  exam: TermExam | undefined
  // "Roll 12 · Bangla", for the dialogs and messages.
  label: string
  returnTo: string
}) {
  const user = useCurrentUser()
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const deleted = mark.status === "Deleted"
  const back = `returnTo=${encodeURIComponent(returnTo)}`

  function toggleStatus() {
    toggleMarkStatus(mark.id, user.name)
    toast.success(`${label} marks ${mark.status === "Active" ? "inactivated" : "activated"}`, {
      description: "Run Pass Fail ReGenerate and the merit list again to update results.",
    })
  }

  const dialogs: Record<
    Confirm,
    { title: string; description: string; action: string; destructive?: boolean; run: () => void; done: string }
  > = {
    delete: {
      title: `Delete ${label} marks?`,
      description:
        "The marks stop counting in results and merit lists. You can retrieve them later from the “Deleted” status filter.",
      action: "Delete",
      destructive: true,
      run: () => deleteMark(mark.id, user.name),
      done: `${label} marks deleted`,
    },
    retrieve: {
      title: `Retrieve ${label} marks?`,
      description: "The marks come back as active and count in results again.",
      action: "Retrieve",
      run: () => retrieveMark(mark.id, user.name),
      done: `${label} marks retrieved`,
    },
    permanent: {
      title: `Permanently delete ${label} marks?`,
      description: "The marks are removed for good. This cannot be undone.",
      action: "Delete permanently",
      destructive: true,
      run: () => deleteMarkPermanently(mark.id),
      done: `${label} marks permanently deleted`,
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
            <Link href={`/term-exam-marks/${mark.id}?${back}`}>
              <EyeIcon />
              Details
            </Link>
          </DropdownMenuItem>
          {!deleted && (
            <>
              {exam && (
                <DropdownMenuItem asChild>
                  <Link href={markEditHref(mark, exam, returnTo)}>
                    <PencilIcon />
                    Edit
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={toggleStatus}>
                {mark.status === "Active" ? <CircleMinusIcon /> : <CircleCheckIcon />}
                {mark.status === "Active" ? "Inactivate" : "Activate"}
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
    </>
  )
}
