// What the API's menu says about each permission key ("Controller/Action",
// legacy NccPermissionDetails), so a role's wildcards read the same here as on
// the API (PermissionRules). Filled by lib/navigation.ts; no imports, so the
// role rules can read it without a cycle.

export type MenuPage = "Admin" | "Manage" | "View"

export type MenuKeyInfo = { page: MenuPage; platform: boolean }

const keys = new Map<string, MenuKeyInfo>()

export function registerMenuKey(key: string, info: MenuKeyInfo) {
  keys.set(key, info)
}

// Undefined for a code the API doesn't declare (a module still in the admin).
export function menuKeyInfo(key: string) {
  return keys.get(key)
}
