"use client"

import * as React from "react"

import { httpClient } from "@/lib/http-client"
import { registerMenus, type NavigationMenu } from "@/lib/navigation"

export type PermissionMenu = {
  title: string
  items: { title: string; codes: { code: string; label: string }[] }[]
}

let menus: PermissionMenu[] = []
let loading: Promise<void> | undefined
const listeners = new Set<() => void>()

// Every menu item the API declares, grouped by menu (legacy module › admin
// menu › menu item): what Manage User Roles and Extra Permission tick. Each
// item's code is its key ("Institutes/Manage").
function load() {
  loading ??= httpClient.get<NavigationMenu[]>("/roles/permission-menus").then(
    (list) => {
      registerMenus(list)
      menus = list.map((menu) => ({
        title: menu.name,
        items: menu.items.map((item) => ({ title: item.title, codes: [{ code: item.key, label: item.page }] })),
      }))
      listeners.forEach((listener) => listener())
    },
    () => {
      loading = undefined
    }
  )
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  load()
  return () => listeners.delete(listener)
}

const none: PermissionMenu[] = []

export function usePermissionMenus() {
  return React.useSyncExternalStore(subscribe, () => menus, () => none)
}
