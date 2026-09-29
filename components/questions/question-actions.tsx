"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CircleCheckIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  RotateCcwIcon,
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
import type { Capabilities } from "@/lib/access"
import { useCurrentUser } from "@/lib/current-user"
import {
  addQuestion,
  deleteQuestion,
  deleteQuestionPermanently,
  retrieveQuestion,
  setQuestionStatus,
  type Question,
} from "@/lib/question-bank"

type Confirm = "delete" | "retrieve" | "permanent"

export const questionHref = (id: number, returnTo: string, edit = false) =>
  `/questions/${id}${edit ? "/edit" : ""}?returnTo=${encodeURIComponent(returnTo)}`

// Row menu of the question list, as the surface (`can`) and the status
// allow: approve a draft, send an approved one back to draft, retire one no
// longer wanted, copy it as a new draft; a deleted one can only be viewed,
// retrieved (as a draft) or removed for good.
export function QuestionActions({
  question,
  returnTo,
  can,
  label,
}: {
  question: Question
  returnTo: string
  can: Capabilities
  label: string
}) {
  const user = useCurrentUser()
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const deleted = question.status === "Deleted"

  const dialogs: Record<
    Confirm,
    { title: string; description: string; action: string; destructive?: boolean; run: () => void; done: string }
  > = {
    delete: {
      title: `Delete question “${label}”?`,
      description: "It leaves the bank and won't be picked for papers. An admin can retrieve it from “With Deleted”.",
      action: "Delete",
      destructive: true,
      run: () => deleteQuestion(question.id, user.name),
      done: "Question deleted successfully",
    },
    retrieve: {
      title: `Retrieve question “${label}”?`,
      description: "It comes back as a draft, to be approved again.",
      action: "Retrieve",
      run: () => retrieveQuestion(question.id, user.name),
      done: "Question retrieved successfully",
    },
    permanent: {
      title: `Permanently delete question “${label}”?`,
      description: "It is removed for good. Papers already generated keep their copy. This cannot be undone.",
      action: "Permanent Delete",
      destructive: true,
      run: () => deleteQuestionPermanently(question.id),
      done: "Question deleted successfully",
    },
  }
  const dialog = confirm ? dialogs[confirm] : null

  function status(next: "Draft" | "Approved" | "Retired", done: string) {
    setQuestionStatus(question.id, next, user.name)
    toast.success(done)
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted">
            <EllipsisVerticalIcon />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={questionHref(question.id, returnTo)}>
              <EyeIcon />
              Details
            </Link>
          </DropdownMenuItem>
          {!deleted && can.edit && (
            <>
              <DropdownMenuItem asChild>
                <Link href={questionHref(question.id, returnTo, true)}>
                  <PencilIcon />
                  Edit
                </Link>
              </DropdownMenuItem>
              {can.create && (
                <DropdownMenuItem
                  onSelect={() => {
                    const { id: _id, status: _s, createdBy: _cb, createdAt: _ca, modifiedBy: _mb, modifiedAt: _ma, ...input } = question
                    void [_id, _s, _cb, _ca, _mb, _ma]
                    addQuestion(structuredClone(input), user.name)
                    toast.success("Copied as a new draft")
                  }}
                >
                  <CopyIcon />
                  Copy as draft
                </DropdownMenuItem>
              )}
            </>
          )}
          {!deleted && can.status && (
            <>
              {question.status !== "Approved" && (
                <DropdownMenuItem onSelect={() => status("Approved", "Question approved")}>
                  <CircleCheckIcon />
                  Approve
                </DropdownMenuItem>
              )}
              {question.status !== "Draft" && (
                <DropdownMenuItem onSelect={() => status("Draft", "Question sent back to draft")}>
                  <RotateCcwIcon />
                  Back to draft
                </DropdownMenuItem>
              )}
              {question.status !== "Retired" && (
                <DropdownMenuItem onSelect={() => status("Retired", "Question retired")}>
                  <ArchiveIcon />
                  Retire
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
              {!deleted ? (
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("delete")}>
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              ) : (
                can.restore && (
                  <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("permanent")}>
                    <Trash2Icon />
                    Permanent Delete
                  </DropdownMenuItem>
                )
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={!!dialog} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog?.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialog?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={dialog?.destructive ? "destructive" : "default"}
              onClick={() => {
                if (!dialog) return
                dialog.run()
                toast.success(dialog.done)
                setConfirm(null)
              }}
            >
              {dialog?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
