"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, PencilIcon } from "lucide-react"

import { InstituteActions } from "@/components/institutes/institute-actions"
import { StatusBadge } from "@/components/institutes/status-badge"
import { Button } from "@/components/ui/button"
import { useInstitute } from "@/lib/institutes-store"

// Shared header for every /institutes/[id]/* page.
// Unknown ids render nothing so the page's own not-found state shows alone.
export function InstituteHeader({ id }: { id: number }) {
  const router = useRouter()
  const institute = useInstitute(id)

  if (!institute) return null

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/institutes">
          <ArrowLeftIcon data-icon="inline-start" />
          Institutes
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {institute.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={institute.logoUrl}
              alt={`${institute.name} logo`}
              className="size-14 shrink-0 rounded-md border object-contain"
            />
          )}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {institute.name}
              </h2>
              <StatusBadge status={institute.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {institute.shortName} · EIIN {institute.eiin} · {institute.type}{" "}
              · {institute.city} · {institute.subdomain}.sms.app
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/institutes/${institute.id}/edit`}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Link>
          </Button>
          <InstituteActions
            institute={institute}
            showView={false}
            onDeleted={() => router.push("/institutes")}
          />
        </div>
      </div>
    </div>
  )
}
