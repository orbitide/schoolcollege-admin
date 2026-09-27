import Link from "next/link"
import { ConstructionIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

// Placeholder for sidebar modules that haven't been built yet.
export default async function ComingSoonPage({
  params,
}: PageProps<"/[...slug]">) {
  const { slug } = await params
  const title = slug[0].replace(/-/g, " ")

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <ConstructionIcon className="size-10 text-muted-foreground" />
      <h2 className="text-xl font-semibold capitalize">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        This module is coming soon.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  )
}
