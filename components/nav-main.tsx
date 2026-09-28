"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Collapsible } from "radix-ui"

import { Highlight, matchScore, rankByQuery } from "@/components/nav-search"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ChevronRightIcon } from "lucide-react"

export type NavTone =
  | "blue"
  | "violet"
  | "amber"
  | "emerald"
  | "rose"
  | "sky"
  | "orange"
  | "slate"

export type NavItem = {
  title: string
  // Where the item lives; it stays highlighted on every page below it.
  url: string
  // Where the link goes, when not to `url` itself (a resource's highest
  // surface the user holds, e.g. /teachers/admin).
  href?: string
  // Access resource (lib/access.ts): the item shows only to users holding
  // one of its surfaces.
  resource?: string
  icon?: React.ReactNode
  tone?: NavTone
}

// A top-level entry is either a link or a collapsible menu of links.
export type NavMainItem = NavItem | (Omit<NavItem, "url"> & { items: NavItem[] })

// Spelled out in full so Tailwind can see every class.
const toneClasses: Record<NavTone, string> = {
  blue: "bg-blue-500/12 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300",
  violet: "bg-violet-500/12 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
  amber: "bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
  emerald: "bg-emerald-500/12 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
  rose: "bg-rose-500/12 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300",
  sky: "bg-sky-500/12 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300",
  orange: "bg-orange-500/12 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300",
  slate: "bg-slate-500/12 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
}

// A menu icon on a small tinted tile; each section has its own colour so the
// menu is quick to scan.
export function NavIcon({
  icon,
  tone = "slate",
  className,
}: {
  icon: React.ReactNode
  tone?: NavTone
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/menu-button:scale-110",
        toneClasses[tone],
        className
      )}
    >
      {icon}
    </span>
  )
}

// Shared look for top-level entries: taller rows, and a primary tint on the
// current page.
export const navButtonClass =
  "relative h-10 gap-3 overflow-visible rounded-lg px-2 font-medium text-sidebar-foreground/80 transition-colors hover:text-sidebar-foreground data-active:bg-sidebar-primary/10 data-active:font-semibold data-active:text-sidebar-primary data-active:hover:bg-sidebar-primary/15 data-active:hover:text-sidebar-primary"

// The coloured bar at the sidebar's edge beside the current page.
export function ActiveBar() {
  return (
    <span className="absolute inset-y-2 -left-2 hidden w-1 rounded-r-full bg-sidebar-primary group-data-[active=true]/menu-button:block" />
  )
}

// The entries left after a menu search, best match first: a link stays when
// its title matches; a menu keeps just its matching links, or all of them
// when only its own title matches. A menu ranks by its best match.
export function filterNavItems(items: NavMainItem[], query: string) {
  if (!query.trim()) return items
  return items
    .flatMap<{ item: NavMainItem; index: number; score: number }>((item, index) => {
      const own = matchScore(item.title, query)
      if (!("items" in item)) return own > -Infinity ? [{ item, index, score: own }] : []
      const subs = rankByQuery(item.items, (sub) => sub.title, query)
      if (subs.length) {
        const score = Math.max(own, ...subs.map((sub) => matchScore(sub.title, query)))
        return [{ item: { ...item, items: subs }, index, score }]
      }
      return own > -Infinity ? [{ item, index, score: own }] : []
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item)
}

// The one collapsible menu that is open (by title, "" when all are closed),
// kept in localStorage so the sidebar looks the same after a refresh.
// undefined until the user opens or closes a menu.
const MENU_STORAGE_KEY = "sms-admin:sidebar-open-menu"
let savedMenu: string | undefined | null = null
const menuListeners = new Set<() => void>()

function readSavedMenu() {
  if (savedMenu === null) {
    try {
      const parsed = JSON.parse(localStorage.getItem(MENU_STORAGE_KEY) ?? "null")
      savedMenu = typeof parsed === "string" ? parsed : undefined
    } catch {
      savedMenu = undefined
    }
  }
  return savedMenu
}

function saveOpenMenu(title: string) {
  if (readSavedMenu() === title) return
  savedMenu = title
  try {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(title))
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts
    // until the page reloads.
  }
  menuListeners.forEach((listener) => listener())
}

function subscribeMenus(listener: () => void) {
  // Keep other tabs in step too.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== MENU_STORAGE_KEY) return
    savedMenu = null
    listener()
  }
  menuListeners.add(listener)
  window.addEventListener("storage", onStorage)
  return () => {
    menuListeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

// undefined on the server and during hydration, so the first render matches
// the server's HTML; the saved state applies right after.
function useSavedMenu() {
  return React.useSyncExternalStore(subscribeMenus, readSavedMenu, () => undefined)
}

export function NavMain({
  items,
  query = "",
}: {
  items: NavMainItem[]
  query?: string
}) {
  const pathname = usePathname()
  const savedOpen = useSavedMenu()
  const searching = query.trim() !== ""
  const visible = filterNavItems(items, query)
  // The most specific matching link, so /students/new marks "Add Student"
  // rather than also "Manage Students".
  const activeSub = (subs: NavItem[]) =>
    subs
      .filter((sub) => isActive(sub.url))
      .sort((a, b) => b.url.length - a.url.length)[0]
  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(`${url}/`)
  // The menu holding the current page, if any.
  const currentMenu = items.find(
    (item) => "items" in item && item.items.some((sub) => isActive(sub.url))
  )?.title

  // Only one menu is open at a time. Arriving on a page from another menu
  // (e.g. through a link in the page) switches to that menu.
  // Not on first load, so a menu closed before a refresh stays closed.
  const lastMenu = React.useRef(currentMenu)
  React.useEffect(() => {
    if (currentMenu && currentMenu !== lastMenu.current) saveOpenMenu(currentMenu)
    lastMenu.current = currentMenu
  }, [currentMenu])
  const openMenu = savedOpen ?? currentMenu

  if (visible.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-sidebar-foreground/50 uppercase">
        Main Menu
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {visible.map((item) =>
            "items" in item ? (
              <Collapsible.Root
                key={item.title}
                asChild
                // While searching, every matching menu is open. Otherwise only
                // one is: opening a menu closes the one that was open.
                open={searching || openMenu === item.title}
                onOpenChange={(open) => {
                  if (!searching) saveOpenMenu(open ? item.title : "")
                }}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <Collapsible.Trigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={item.items.some((sub) => isActive(sub.url))}
                      className={navButtonClass}
                    >
                      <ActiveBar />
                      {item.icon && <NavIcon icon={item.icon} tone={item.tone} />}
                      <span className="truncate">
                        <Highlight text={item.title} query={query} />
                      </span>
                      <span className="ml-auto rounded-full bg-sidebar-accent px-1.5 py-px text-[10px] font-semibold text-sidebar-foreground/60 tabular-nums">
                        {item.items.length}
                      </span>
                      <ChevronRightIcon className="text-sidebar-foreground/50 transition-transform duration-250 ease-in-out group-data-[state=open]/collapsible:rotate-90 motion-reduce:transition-none" />
                    </SidebarMenuButton>
                  </Collapsible.Trigger>
                  {/* Slides open and shut (Radix measures the height), with
                      the links fading alongside. */}
                  <Collapsible.Content className="overflow-hidden duration-250 ease-in-out data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:animate-none">
                    <SidebarMenuSub className="mt-1 mr-0 ml-5.5 gap-0.5 pl-3 transition-opacity duration-250 ease-in-out group-data-[state=closed]/collapsible:opacity-0 motion-reduce:transition-none">
                      {item.items.map((sub) => (
                        <SidebarMenuSubItem key={sub.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={activeSub(item.items)?.url === sub.url}
                            className="h-8 text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground data-active:bg-sidebar-primary/10 data-active:font-medium data-active:text-sidebar-primary"
                          >
                            <Link href={sub.href ?? sub.url}>
                              {sub.icon}
                              <span>
                                <Highlight text={sub.title} query={query} />
                              </span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </Collapsible.Content>
                </SidebarMenuItem>
              </Collapsible.Root>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive(item.url)}
                  className={navButtonClass}
                >
                  <Link href={item.href ?? item.url}>
                    <ActiveBar />
                    {item.icon && <NavIcon icon={item.icon} tone={item.tone} />}
                    <span>
                      <Highlight text={item.title} query={query} />
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
