"use client"

import * as React from "react"
import { SendIcon } from "lucide-react"
import { toast } from "sonner"

import { SmsLengthSummary } from "@/components/sms/sms-message"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCurrentUser } from "@/lib/current-user"
import { formatAmount, roundMoney } from "@/lib/fee-heads"
import { useInstitute } from "@/lib/institutes-store"
import { noticeSmsDrafts, sendNoticeSms } from "@/lib/notice-sms"
import { addNoticeSms, type Notice } from "@/lib/notices"
import { smsReceivers, useSmsBalance, type SmsReceiver } from "@/lib/sms-messages"

// Sends a notice as an SMS to its audience: the chosen numbers of its
// students (none ticked: each one's primary contact) and, when it is for
// them, the teachers. The text starts as the title; edit it to fit.
export function NoticeSmsDialog({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  const user = useCurrentUser()
  const institute = useInstitute(notice?.instituteId ?? -1)
  const balance = useSmsBalance(notice?.instituteId ?? -1)
  const [receivers, setReceivers] = React.useState<SmsReceiver[]>([])
  const [message, setMessage] = React.useState("")
  const [shownFor, setShownFor] = React.useState<number | null>(null)
  if (notice && shownFor !== notice.id) {
    setShownFor(notice.id)
    setReceivers([])
    setMessage(`Notice: ${notice.title}. - ${institute?.shortName || institute?.name || ""}`.trim())
  }
  if (!notice && shownFor !== null) setShownFor(null)

  const drafts = React.useMemo(
    () => (notice && message.trim() ? noticeSmsDrafts(notice, message.trim(), receivers) : []),
    [notice, message, receivers]
  )
  const parts = drafts.reduce((s, d) => s + d.parts, 0)
  const cost = roundMoney(parts * (institute?.configuration.smsRate ?? 0))

  function send() {
    if (!notice || !institute || !drafts.length) return
    try {
      const result = sendNoticeSms(drafts, institute, user.id, user.name)
      addNoticeSms(notice.id, drafts.length, user.name)
      toast.success(`${result.sent} SMS sent`, {
        description: result.failed ? `${result.failed} left pending: not enough SMS balance.` : undefined,
      })
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The SMS could not be sent.")
    }
  }

  return (
    <Dialog open={!!notice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send notice as SMS</DialogTitle>
          <DialogDescription>
            To {notice?.audience.toLowerCase()}
            {notice && notice.audience !== "Teachers" && notice.classIds.length > 0 && " of the notice's classes"}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {notice?.audience !== "Teachers" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Student receivers</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {smsReceivers.map((r) => (
                  <Label key={r} className="flex items-center gap-2 font-normal">
                    <Checkbox
                      checked={receivers.includes(r)}
                      onCheckedChange={(on) => setReceivers((list) => (on ? [...list, r] : list.filter((x) => x !== r)))}
                    />
                    {r}
                  </Label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">None ticked: each student&apos;s primary contact.</p>
            </fieldset>
          )}
          <Field>
            <FieldLabel htmlFor="notice-sms-text">Message</FieldLabel>
            <Textarea id="notice-sms-text" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            <SmsLengthSummary text={message} className="text-xs text-muted-foreground" />
          </Field>
          <p className="text-sm">
            {drafts.length} number{drafts.length === 1 ? "" : "s"} · {parts} SMS · about {formatAmount(cost)} of the{" "}
            {formatAmount(balance)} balance
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send} disabled={!drafts.length}>
            <SendIcon data-icon="inline-start" />
            Send {drafts.length || ""} SMS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
