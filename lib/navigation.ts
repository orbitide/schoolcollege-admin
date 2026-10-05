import { httpClient } from "@/lib/http-client"
import { registerMenuKey, type MenuPage } from "@/lib/menu-keys"

// The sidebar menus the API declares on its controllers (legacy AdminMenu /
// AdminMenuItem; Framework/Navigation/NavigationCatalog.cs). Each item is a
// permission, keyed "Controller/Action". The admin keeps no menu of its own.
export type NavigationItem = {
  title: string
  route: string
  order: number
  key: string
  // What a role's "*.admin" / "*.manage" / "*.view" wildcard sees it as.
  page: MenuPage
  // A platform page, from its menu or on its own.
  platform: boolean
}

export type NavigationMenu = {
  name: string
  // The sidebar section (group label) the menu sits in.
  section: string
  // A lucide icon name (lib/menu-icons.tsx).
  icon: string
  order: number
  // Platform pages: a role's wildcard never grants them.
  platform: boolean
  items: NavigationItem[]
}

export function registerMenus(menus: readonly NavigationMenu[]) {
  for (const menu of menus) {
    for (const item of menu.items) registerMenuKey(item.key, { page: item.page, platform: menu.platform || item.platform })
  }
}

let menus: NavigationMenu[] = []
let loading: Promise<void> | undefined

// The signed-in user's menus (the API filters them), loaded once before the
// panel renders (RequireLogin).
export function loadNavigation() {
  loading ??= httpClient.get<NavigationMenu[]>("/navigation").then(
    (list) => {
      menus = list
      registerMenus(list)
    },
    (error) => {
      loading = undefined
      throw error
    }
  )
  return loading
}

export function getNavigation(): readonly NavigationMenu[] {
  return menus
}
