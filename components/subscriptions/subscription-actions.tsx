"use client"

import * as React from "react"
import Link from "next/link"
import {
  BanIcon,
  CircleCheckIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  HourglassIcon,
  PercentIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  CustomRatesDialog,
  ExtendTrialDialog,
} from "@/components/subscriptions/subscription-dialogs"
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
import type { Institute } from "@/lib/institutes"
import { setInstituteStatus } from "@/lib/institutes-store"
import { endTrial, type Subscription } from "@/lib/subscriptions"

type Confirm = "activate" | "suspend"

// A subscription's menu: open it, set its rates, extend a trial, and
// activate or suspend the institute.
export function SubscriptionActions({
  institute,
  subscription,
  showOpen = true,
}: {
  institute: Institute
  subscription: Subscription
  showOpen?: boolean
}) {
  const user = useCurrentUser()
  const [dialog, setDialog] = React.useState<"rates" | "trial" | null>(null)
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)

  const confirms: Record<Confirm, { title: string; description: string; action: string; destructive?: boolean; run: () => void; done: string }> = {
    activate: {
      title: `Activate ${institute.name}?`,
      description:
        institute.status === "Trial"
          ? "The trial ends now and the institute is billed from this month's invoice."
          : "The institute gets its access back and is billed from this month's invoice.",
      action: "Activate",
      run: () => {
        setInstituteStatus(institute.id, "Active")
        if (subscription.trialEndsAt) endTrial(institute.id, user.name)
      },
      done: `${institute.name} activated`,
    },
    suspend: {
      title: `Suspend ${institute.name}?`,
      description:
        "Its users lose access until it's activated again. Nothing is deleted, and suspended institutes aren't invoiced.",
      action: "Suspend",
      destructive: true,
      run: () => setInstituteStatus(institute.id, "Suspended"),
      done: `${institute.name} suspended`,
    },
  }
  const current = confirm ? confirms[confirm] : null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
            <EllipsisVerticalIcon />
            <span className="sr-only">Actions for {institute.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {showOpen && (
            <DropdownMenuItem asChild>
              <Link href={`/subscriptions/${institute.id}`}>
                <EyeIcon />
                Open
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setDialog("rates")}>
            <PercentIcon />
            Custom rates
          </DropdownMenuItem>
          {institute.status === "Trial" && (
            <DropdownMenuItem onSelect={() => setDialog("trial")}>
              <HourglassIcon />
              Extend trial
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {institute.status === "Active" ? (
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("suspend")}>
              <BanIcon />
              Suspend
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setConfirm("activate")}>
              <CircleCheckIcon />
              Activate
            </DropdownMenuItem>
          )}
          {institute.status === "Trial" && (
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("suspend")}>
              <BanIcon />
              Suspend
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomRatesDialog
        institute={institute}
        subscription={subscription}
        open={dialog === "rates"}
        onOpenChange={(open) => setDialog(open ? "rates" : null)}
      />
      <ExtendTrialDialog
        institute={institute}
        subscription={subscription}
        open={dialog === "trial"}
        onOpenChange={(open) => setDialog(open ? "trial" : null)}
      />
      <AlertDialog open={!!current} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{current?.title}</AlertDialogTitle>
            <AlertDialogDescription>{current?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={current?.destructive ? "destructive" : "default"}
              onClick={() => {
                if (!current) return
                current.run()
                toast.success(current.done)
              }}
            >
              {current?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
