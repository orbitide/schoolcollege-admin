"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

// Legacy Settings menu items, in AdminMenuItem order.
const pages = [
  { title: "General", href: "/settings" },
  { title: "Email & SMS", href: "/settings/email-sms" },
  { title: "Maintenance Mode", href: "/settings/maintenance" },
  // Not in legacy (single site): who bills the institutes.
  { title: "Billing", href: "/settings/billing" },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Settings"
      className="inline-flex h-8 w-fit max-w-full items-center overflow-x-auto rounded-lg bg-muted p-[3px] text-muted-foreground"
    >
      {pages.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          aria-current={pathname === page.href ? "page" : undefined}
          className={cn(
            "flex h-full shrink-0 items-center rounded-md px-3 text-sm font-medium transition-colors",
            pathname === page.href ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"
          )}
        >
          {page.title}
        </Link>
      ))}
    </nav>
  )
}
