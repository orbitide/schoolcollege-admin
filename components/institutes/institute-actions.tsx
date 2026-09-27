"use client"

import * as React from "react"
import Link from "next/link"
import {
  BanIcon,
  CircleCheckIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  LogInIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { InstituteFormDialog } from "@/components/institutes/institute-form-dialog"
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
import type { Institute } from "@/lib/institutes"
import { deleteInstitute, setInstituteStatus } from "@/lib/institutes-store"

type Dialog = "edit" | "status" | "delete" | null

export function InstituteActions({
  institute,
  onDeleted,
  showView = true,
}: {
  institute: Institute
  onDeleted?: () => void
  showView?: boolean
}) {
  const [dialog, setDialog] = React.useState<Dialog>(null)
  const isSuspended = institute.status === "Suspended"

  function toggleStatus() {
    setInstituteStatus(institute.id, isSuspended ? "Active" : "Suspended")
    toast.success(
      `${institute.name} ${isSuspended ? "activated" : "suspended"}`
    )
  }

  function remove() {
    deleteInstitute(institute.id)
    toast.success(`${institute.name} deleted`)
    onDeleted?.()
  }

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
        <DropdownMenuContent align="end" className="w-44">
          {showView && (
            <DropdownMenuItem asChild>
              <Link href={`/institutes/${institute.id}`}>
                <EyeIcon />
                View details
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setDialog("edit")}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              toast.info(`Opening ${institute.subdomain}.sms.app as admin`)
            }
          >
            <LogInIcon />
            Login as admin
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog("status")}>
            {isSuspended ? <CircleCheckIcon /> : <BanIcon />}
            {isSuspended ? "Activate" : "Suspend"}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDialog("delete")}
          >
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InstituteFormDialog
        institute={institute}
        open={dialog === "edit"}
        onOpenChange={(open) => setDialog(open ? "edit" : null)}
      />

      <AlertDialog
        open={dialog === "status" || dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog === "delete"
                ? `Delete ${institute.name}?`
                : `${isSuspended ? "Activate" : "Suspend"} ${institute.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === "delete"
                ? "This permanently removes the institute and all of its data. This cannot be undone."
                : isSuspended
                  ? "Students, teachers and staff will regain access to the institute portal."
                  : "Students, teachers and staff will lose access to the institute portal until it is activated again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={
                dialog === "delete" || !isSuspended ? "destructive" : "default"
              }
              onClick={dialog === "delete" ? remove : toggleStatus}
            >
              {dialog === "delete"
                ? "Delete"
                : isSuspended
                  ? "Activate"
                  : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
