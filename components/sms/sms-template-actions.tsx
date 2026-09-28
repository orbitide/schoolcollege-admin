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

import { HighlightedMessage, SmsLengthSummary } from "@/components/sms/sms-message"
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
import type { Capabilities } from "@/lib/access"
import { useCurrentUser } from "@/lib/current-user"
import {
  deleteSmsTemplate,
  deleteSmsTemplatePermanently,
  fillTemplate,
  retrieveSmsTemplate,
  toggleSmsTemplateStatus,
  unknownKeywords,
  type SmsTemplate,
} from "@/lib/sms-templates"

type Confirm = "delete" | "retrieve" | "permanent"

// Row menu of the legacy ManageSmsTemplate grid. What it offers depends on
// the surface (`can`) and the status: deleted templates can only be
// previewed, retrieved or deleted for good.
export function SmsTemplateActions({
  template,
  returnTo,
  can,
}: {
  template: SmsTemplate
  returnTo: string
  can: Capabilities
}) {
  const user = useCurrentUser()
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const [previewing, setPreviewing] = React.useState(false)
  const deleted = template.status === "Deleted"

  function toggleStatus() {
    toggleSmsTemplateStatus(template.id, user.name)
    toast.success(`${template.name} ${template.status === "Active" ? "inactivated" : "activated"}`)
  }

  const dialogs: Record<
    Confirm,
    { title: string; description: string; action: string; destructive?: boolean; run: () => boolean | void; done: string; failed?: string }
  > = {
    delete: {
      title: `Delete ${template.name}?`,
      description:
        "The template is hidden from the lists and from Send SMS. You can retrieve it later from “With deleted”.",
      action: "Delete",
      destructive: true,
      run: () => deleteSmsTemplate(template.id, user.name),
      done: `${template.name} deleted`,
    },
    retrieve: {
      title: `Retrieve ${template.name}?`,
      description: "The template comes back as active.",
      action: "Retrieve",
      run: () => retrieveSmsTemplate(template.id, user.name),
      done: `${template.name} retrieved`,
      failed: "Another template of this institute now has this name. Rename that one first.",
    },
    permanent: {
      title: `Permanently delete ${template.name}?`,
      description: "The template is removed for good. This cannot be undone.",
      action: "Delete permanently",
      destructive: true,
      run: () => deleteSmsTemplatePermanently(template.id),
      done: `${template.name} permanently deleted`,
    },
  }
  const dialog = confirm ? dialogs[confirm] : null
  const filled = fillTemplate(template.message)

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
          <DropdownMenuItem onSelect={() => setPreviewing(true)}>
            <EyeIcon />
            Preview
          </DropdownMenuItem>
          {!deleted && (
            <>
              {can.edit && (
                <DropdownMenuItem asChild>
                  <Link href={`/sms/templates/${template.id}/edit?returnTo=${encodeURIComponent(returnTo)}`}>
                    <PencilIcon />
                    Edit
                  </Link>
                </DropdownMenuItem>
              )}
              {can.status && (
                <DropdownMenuItem onSelect={toggleStatus}>
                  {template.status === "Active" ? <CircleMinusIcon /> : <CircleCheckIcon />}
                  {template.status === "Active" ? "Inactivate" : "Activate"}
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
                  if (dialog.run() === false) toast.error(dialog.failed ?? "That didn't work.")
                  else toast.success(dialog.done)
                  setConfirm(null)
                }}
              >
                {dialog.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <Dialog open={previewing} onOpenChange={setPreviewing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{template.name}</DialogTitle>
            <DialogDescription>
              {template.smsType}
              {template.resultType && ` · ${template.resultType}`}
              {template.attendanceType && ` · ${template.attendanceType}`} · filled with sample values
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3 leading-relaxed">
              <span className="whitespace-pre-wrap break-words">{filled}</span>
            </div>
            <SmsLengthSummary text={filled} className="text-xs text-muted-foreground" />
            <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Template</p>
              <HighlightedMessage
                message={template.message}
                unknown={unknownKeywords(template.smsType, template.message)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
