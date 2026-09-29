"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArchiveRestoreIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  MessageSquareTextIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { NoticeSmsDialog } from "@/components/notices/notice-sms-dialog"
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
  deleteNotice,
  deleteNoticePermanently,
  retrieveNotice,
  toggleNoticePin,
  toggleNoticeStatus,
  type Notice,
} from "@/lib/notices"

type Confirm = "delete" | "retrieve" | "permanent"

// Row menu of the notice list; what it offers follows the surface (`can`)
// and the status: a deleted notice can only be viewed, retrieved or
// removed for good.
export function NoticeActions({
  notice,
  returnTo,
  can,
}: {
  notice: Notice
  returnTo: string
  can: Capabilities
}) {
  const user = useCurrentUser()
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const [sms, setSms] = React.useState(false)
  const deleted = notice.status === "Deleted"
  const back = encodeURIComponent(returnTo)

  const dialogs: Record<
    Confirm,
    { title: string; description: string; action: string; destructive?: boolean; run: () => void; done: string }
  > = {
    delete: {
      title: `Delete "${notice.title}"?`,
      description: "It leaves the notice board. An admin can retrieve it later from “With Deleted”.",
      action: "Delete",
      destructive: true,
      run: () => deleteNotice(notice.id, user.name),
      done: "Notice deleted successfully",
    },
    retrieve: {
      title: `Retrieve "${notice.title}"?`,
      description: "It comes back as active.",
      action: "Retrieve",
      run: () => retrieveNotice(notice.id, user.name),
      done: "Notice retrieved successfully",
    },
    permanent: {
      title: `Permanently delete "${notice.title}"?`,
      description: "It is removed for good. This cannot be undone.",
      action: "Permanent Delete",
      destructive: true,
      run: () => deleteNoticePermanently(notice.id),
      done: "Notice deleted successfully",
    },
  }
  const dialog = confirm ? dialogs[confirm] : null

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
            <Link href={`/notices/${notice.id}?returnTo=${back}`}>
              <EyeIcon />
              Details
            </Link>
          </DropdownMenuItem>
          {!deleted && can.edit && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/notices/${notice.id}/edit?returnTo=${back}`}>
                  <PencilIcon />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  toggleNoticePin(notice.id, user.name)
                  toast.success(notice.isPinned ? "Unpinned" : "Pinned to the top of the board")
                }}
              >
                {notice.isPinned ? <PinOffIcon /> : <PinIcon />}
                {notice.isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSms(true)}>
                <MessageSquareTextIcon />
                Send as SMS
              </DropdownMenuItem>
            </>
          )}
          {!deleted && can.status && (
            <DropdownMenuItem
              onSelect={() => {
                toggleNoticeStatus(notice.id, user.name)
                toast.success(notice.status === "Active" ? "In-activated successfully" : "Activated successfully")
              }}
            >
              {notice.status === "Active" ? <CircleMinusIcon /> : <CircleCheckIcon />}
              {notice.status === "Active" ? "Inactive" : "Active"}
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
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(deleted ? "permanent" : "delete")}>
                <Trash2Icon />
                {deleted ? "Permanent Delete" : "Delete"}
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

      <NoticeSmsDialog notice={sms ? notice : null} onClose={() => setSms(false)} />
    </>
  )
}
