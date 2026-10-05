import Link from "next/link"
import { FileQuestionIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function NotFoundView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <FileQuestionIcon className="size-10 text-muted-foreground" />
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  )
}
