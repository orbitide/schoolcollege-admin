"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { surfaceHref, useSurfaces, type AccessSurface } from "@/lib/access"
import { cn } from "@/lib/utils"

// Switches between a resource's Admin / Manage / View pages, offering only
// the surfaces the user holds (nothing when that is just one). The filters
// in the URL come along.
export function SurfaceTabs({
  resource,
  baseUrl,
  current,
}: {
  resource: string
  baseUrl: string
  current: AccessSurface
}) {
  const surfaces = useSurfaces(resource)
  const searchParams = useSearchParams()
  if (surfaces.length < 2) return null
  const search = searchParams.toString()

  return (
    <nav
      aria-label="Access level"
      className="inline-flex h-8 w-fit items-center rounded-lg bg-muted p-[3px] text-muted-foreground"
    >
      {surfaces.map((surface) => (
        <Link
          key={surface}
          href={`${surfaceHref(baseUrl, surface)}${search ? `?${search}` : ""}`}
          aria-current={surface === current ? "page" : undefined}
          className={cn(
            "flex h-full items-center rounded-md px-3 text-sm font-medium transition-colors",
            surface === current
              ? "bg-background text-foreground shadow-sm"
              : "hover:text-foreground"
          )}
        >
          {surface}
        </Link>
      ))}
    </nav>
  )
}
