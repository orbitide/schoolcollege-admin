import { RequirePlatform } from "@/components/require-platform"
import { SettingsNav } from "@/components/settings/settings-nav"

// Legacy NetCoreCMS "Settings" menu. Platform wide, so platform admins only.
export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <RequirePlatform>
      <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
            <p className="text-sm text-muted-foreground">Platform-wide settings for every institute.</p>
          </div>
          <SettingsNav />
        </div>
        {children}
      </div>
    </RequirePlatform>
  )
}
