"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArchiveRestoreIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  GlobeIcon,
  GlobeLockIcon,
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
import { capabilitiesFor, type AccessSurface } from "@/lib/access"
import { useCurrentUser } from "@/lib/current-user"
import {
  canEditExam,
  deleteTermExam,
  deleteTermExamPermanently,
  retrieveTermExam,
  toggleOnlinePublished,
  toggleTermExamStatus,
  type TermExam,
} from "@/lib/term-exams"

type Confirm = "publish" | "delete" | "retrieve" | "permanent"

// Row menu of the legacy ManageAdmin / Manage / ManageView grids. What it
// offers depends on the surface and the status: deleted exams can only be
// viewed, retrieved or deleted for good.
export function TermExamActions({
  exam,
  returnTo,
  surface,
}: {
  exam: TermExam
  returnTo: string
  surface: AccessSurface
}) {
  const can = capabilitiesFor(surface, { resource: "term-exam", softDelete: true })
  const user = useCurrentUser()
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const back = `returnTo=${encodeURIComponent(returnTo)}`
  const deleted = exam.status === "Deleted"

  function toggleStatus() {
    toggleTermExamStatus(exam.id, user.name)
    toast.success(`${exam.name} ${exam.status === "Active" ? "inactivated" : "activated"}`)
  }

  const dialogs: Record<
    Confirm,
    { title: string; description: string; action: string; destructive?: boolean; run: () => void; done: string }
  > = {
    publish: exam.onlinePublished
      ? {
          title: `Unpublish ${exam.name}?`,
          description: "Its results will no longer be shown online.",
          action: "Unpublish",
          destructive: true,
          run: () => toggleOnlinePublished(exam.id, user.name),
          done: `Online publish disabled for ${exam.name}`,
        }
      : {
          title: `Publish ${exam.name} online?`,
          description: "Students and guardians will be able to see its results online.",
          action: "Publish",
          run: () => toggleOnlinePublished(exam.id, user.name),
          done: `Online publish enabled for ${exam.name}`,
        },
    delete: {
      title: `Delete ${exam.name}?`,
      description:
        "The exam is hidden from the lists and unpublished. You can retrieve it later from “With deleted”.",
      action: "Delete",
      destructive: true,
      run: () => deleteTermExam(exam.id, user.name),
      done: `${exam.name} deleted`,
    },
    retrieve: {
      title: `Retrieve ${exam.name}?`,
      description: "The exam comes back as active.",
      action: "Retrieve",
      run: () => retrieveTermExam(exam.id, user.name),
      done: `${exam.name} retrieved`,
    },
    permanent: {
      title: `Permanently delete ${exam.name}?`,
      description:
        "The exam and its subject settings are removed for good, and other exams stop using it as a parent or dependent exam. This cannot be undone.",
      action: "Delete permanently",
      destructive: true,
      run: () => deleteTermExamPermanently(exam.id),
      done: `${exam.name} permanently deleted`,
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
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/term-exam/${exam.id}?${back}`}>
              <EyeIcon />
              Details
            </Link>
          </DropdownMenuItem>
          {!deleted && can.create && (
            <DropdownMenuItem asChild>
              <Link href={`/term-exam/new?copy=${exam.id}&${back}`}>
                <CopyIcon />
                Copy
              </Link>
            </DropdownMenuItem>
          )}
          {!deleted && canEditExam(exam, surface) && (
            <DropdownMenuItem asChild>
              <Link href={`/term-exam/${exam.id}/edit?${back}`}>
                <PencilIcon />
                Edit
              </Link>
            </DropdownMenuItem>
          )}
          {exam.status === "Active" && can.status && (
            <DropdownMenuItem onSelect={() => setConfirm("publish")}>
              {exam.onlinePublished ? <GlobeLockIcon /> : <GlobeIcon />}
              {exam.onlinePublished ? "Disable online publish" : "Enable online publish"}
            </DropdownMenuItem>
          )}
          {!deleted && can.status && (
            <DropdownMenuItem onSelect={toggleStatus}>
              {exam.status === "Active" ? <CircleMinusIcon /> : <CircleCheckIcon />}
              {exam.status === "Active" ? "Inactivate" : "Activate"}
            </DropdownMenuItem>
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
                onSelect={() => setConfirm(deleted ? "permanent" : "delete")}
              >
                <Trash2Icon />
                {deleted ? "Delete permanently" : "Delete"}
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
    </>
  )
}
