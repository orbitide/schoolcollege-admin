"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Card, CardContent } from "@/components/ui/card"
import { isPlatformAdmin, useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { cn } from "@/lib/utils"

// Who Billing is for: a platform admin sees every institute's billing;
// anyone else sees one of their institutes at a time, picked by
// ?institute= so the tabs keep it.
export function useBillingScope() {
  const user = useCurrentUser()
  const platform = isPlatformAdmin(user)
  const institutes = useAccessibleInstitutes()
  const picked = useSearchParams().get("institute")
  const institute = platform ? undefined : (institutes.find((i) => String(i.id) === picked) ?? institutes[0])
  return { platform, institutes, institute }
}

const pages = [
  { title: "Overview", href: "/billing" },
  { title: "Invoices", href: "/billing/invoices" },
  { title: "Payments", href: "/billing/payments" },
]

export function BillingHeader() {
  const { platform, institutes, institute } = useBillingScope()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const search = searchParams.toString()

  function pick(id: string) {
    const params = new URLSearchParams(searchParams)
    params.set("institute", id)
    router.replace(`${pathname}?${params}`)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Billing</h2>
          <p className="text-sm text-muted-foreground">
            {platform
              ? "The platform's invoices to institutes, and the payments received."
              : "Your institute's subscription, invoices and payment history."}
          </p>
        </div>
        {!platform && institutes.length > 1 && institute && (
          <div className="w-full sm:w-72">
            <FilterField
              label="Institute"
              value={String(institute.id)}
              onChange={pick}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
            />
          </div>
        )}
      </div>
      <nav
        aria-label="Billing"
        className="inline-flex h-8 w-fit items-center rounded-lg bg-muted p-[3px] text-muted-foreground"
      >
        {pages.map((page) => (
          <Link
            key={page.href}
            href={search ? `${page.href}?${search}` : page.href}
            aria-current={pathname === page.href ? "page" : undefined}
            className={cn(
              "flex h-full items-center rounded-md px-3 text-sm font-medium transition-colors",
              pathname === page.href ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"
            )}
          >
            {page.title}
          </Link>
        ))}
      </nav>
    </div>
  )
}

// For an institute user linked to no institute yet.
export function NoBillingInstitute() {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        You aren&apos;t linked to an institute yet. Ask an administrator to add you in User Institutes.
      </CardContent>
    </Card>
  )
}
