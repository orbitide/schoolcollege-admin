"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Collapsible } from "radix-ui"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon, CirclePlusIcon, MailIcon } from "lucide-react"

export type NavItem = {
  title: string
  url: string
  icon?: React.ReactNode
}

// A top-level entry is either a link or a collapsible menu of links.
export type NavMainItem = NavItem | (Omit<NavItem, "url"> & { items: NavItem[] })

// Which collapsible menus the user opened or closed, kept in localStorage so
// the sidebar looks the same after a refresh. Keyed by menu title.
const MENU_STORAGE_KEY = "sms-admin:sidebar-menus"
let savedMenus: Record<string, boolean> | undefined
const menuListeners = new Set<() => void>()

function readSavedMenus() {
  if (savedMenus === undefined) {
    try {
      const parsed = JSON.parse(localStorage.getItem(MENU_STORAGE_KEY) ?? "{}")
      savedMenus = parsed && typeof parsed === "object" ? parsed : {}
    } catch {
      savedMenus = {}
    }
  }
  return savedMenus!
}

function saveMenuOpen(title: string, open: boolean) {
  savedMenus = { ...readSavedMenus(), [title]: open }
  try {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(savedMenus))
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
    savedMenus = undefined
    listener()
  }
  menuListeners.add(listener)
  window.addEventListener("storage", onStorage)
  return () => {
    menuListeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

// null on the server and during hydration, so the first render matches the
// server's HTML; the saved state applies right after.
function useSavedMenus() {
  return React.useSyncExternalStore(subscribeMenus, readSavedMenus, () => null)
}

export function NavMain({ items }: { items: NavMainItem[] }) {
  const pathname = usePathname()
  const savedOpen = useSavedMenus()
  // The most specific matching link, so /students/new marks "Add Student"
  // rather than also "Manage Students".
  const activeSub = (subs: NavItem[]) =>
    subs
      .filter((sub) => isActive(sub.url))
      .sort((a, b) => b.url.length - a.url.length)[0]
  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(`${url}/`)

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              asChild
              tooltip="Add Institute"
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
            >
              <Link href="/institutes/new">
                <CirclePlusIcon />
                <span>Add Institute</span>
              </Link>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <MailIcon
              />
              <span className="sr-only">Messages</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) =>
            "items" in item ? (
              <Collapsible.Root
                key={item.title}
                asChild
                // The user's last choice wins; until they make one, a menu is
                // open when it holds the current page.
                open={savedOpen?.[item.title] ?? item.items.some((sub) => isActive(sub.url))}
                onOpenChange={(open) => saveMenuOpen(item.title, open)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <Collapsible.Trigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      {item.icon}
                      <span>{item.title}</span>
                      <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <SidebarMenuSub>
                      {item.items.map((sub) => (
                        <SidebarMenuSubItem key={sub.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={activeSub(item.items)?.url === sub.url}
                          >
                            <Link href={sub.url}>
                              {sub.icon}
                              <span>{sub.title}</span>
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
                >
                  <Link href={item.url}>
                    {item.icon}
                    <span>{item.title}</span>
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
