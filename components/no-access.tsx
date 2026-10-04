import Link from "next/link"
import { LockIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

// What a page shows when its role doesn't allow it (the API answered 403).
export function NoAccess() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <LockIcon className="size-5" />
      </span>
      <h2 className="text-xl font-semibold">No access</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your role doesn&apos;t allow this page. Ask an administrator if you need it.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  )
}
