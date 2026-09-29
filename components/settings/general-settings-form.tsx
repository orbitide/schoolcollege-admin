"use client"

import * as React from "react"
import { toast } from "sonner"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { IMAGE_TYPES, ImageField } from "@/components/institutes/institute-form"
import { CheckField, SaveFooter, TextField } from "@/components/settings/settings-fields"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCurrentUser } from "@/lib/current-user"
import {
  emptyWebSiteInfo,
  generalSettingsErrors,
  siteLanguages,
  siteTimeZones,
  updateGeneralSettings,
  useGeneralSettings,
  type GeneralSettings,
  type GeneralSettingsInput,
  type SiteLanguage,
  type WebSiteInfo,
} from "@/lib/site-settings"
import { SUPER_ADMIN_ROLE, useUserRoleNames } from "@/lib/user-roles"
import { cn } from "@/lib/utils"

// Every language gets a draft, blank when the site has no texts in it yet.
const toDraft = (settings: GeneralSettings): GeneralSettingsInput => ({
  domainName: settings.domainName,
  redirectToHttps: settings.redirectToHttps,
  emailAddress: settings.emailAddress,
  allowRegistration: settings.allowRegistration,
  newUserRole: settings.newUserRole,
  timeZone: settings.timeZone,
  language: settings.language,
  isMultiLingual: settings.isMultiLingual,
  dateFormat: settings.dateFormat,
  timeFormat: settings.timeFormat,
  enableCache: settings.enableCache,
  infos: siteLanguages.map(
    ({ code }) => settings.infos.find((info) => info.language === code) ?? emptyWebSiteInfo(code)
  ),
})

// Legacy Admin/Settings ("General Settings").
export function GeneralSettingsForm() {
  const settings = useGeneralSettings()
  return <FormBody key={settings.modifiedAt} settings={settings} />
}

function FormBody({ settings }: { settings: GeneralSettings }) {
  const user = useCurrentUser()
  const roles = useUserRoleNames()
  const saved = React.useMemo(() => toDraft(settings), [settings])
  const [draft, setDraft] = React.useState(saved)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [tab, setTab] = React.useState<SiteLanguage>(settings.language)
  const changed = JSON.stringify(draft) !== JSON.stringify(saved)

  const set = <K extends keyof GeneralSettingsInput>(key: K, value: GeneralSettingsInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))
  const setInfo = (language: SiteLanguage, key: keyof Omit<WebSiteInfo, "language">, value: string) =>
    setDraft((d) => ({
      ...d,
      infos: d.infos.map((info) => (info.language === language ? { ...info, [key]: value } : info)),
    }))

  // Only the default language is edited while the site is single-language;
  // texts saved in other languages are kept.
  const languages = draft.isMultiLingual
    ? siteLanguages
    : siteLanguages.filter(({ code }) => code === draft.language)
  const shownTab = languages.some(({ code }) => code === tab) ? tab : draft.language

  function save(event: React.FormEvent) {
    event.preventDefault()
    const input = draft.isMultiLingual
      ? draft
      : {
          ...draft,
          // Unedited languages go back as saved, so they aren't dropped or checked.
          infos: draft.infos.map((info) =>
            info.language === draft.language
              ? info
              : (settings.infos.find((s) => s.language === info.language) ?? emptyWebSiteInfo(info.language))
          ),
        }
    const found = generalSettingsErrors(input)
    setErrors(found)
    const invalidLanguage = siteLanguages.find(({ code }) =>
      Object.keys(found).some((key) => key.startsWith(`${code}.`))
    )
    if (invalidLanguage) setTab(invalidLanguage.code)
    if (Object.keys(found).length) {
      toast.error("Check the highlighted fields.")
      return
    }
    updateGeneralSettings(input, user.name)
    toast.success("Settings updated.")
  }

  function pickImage(language: SiteLanguage, key: "faviconUrl" | "siteLogoUrl", event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const errorKey = `${language}.${key}`
    if (!IMAGE_TYPES.includes(file.type)) {
      setErrors((e) => ({ ...e, [errorKey]: "Only .jpg, .jpeg and .png images are accepted." }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setInfo(language, key, String(reader.result))
      setErrors((e) => {
        const rest = { ...e }
        delete rest[errorKey]
        return rest
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <form onSubmit={save}>
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            The platform&apos;s name, links and defaults. The site title is required in the default language.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Tabs value={shownTab} onValueChange={(v) => setTab(v as SiteLanguage)}>
            {draft.isMultiLingual && (
              <TabsList>
                {languages.map(({ code, label }) => {
                  const invalid = Object.keys(errors).some((key) => key.startsWith(`${code}.`))
                  return (
                    <TabsTrigger key={code} value={code} className={cn(invalid && "text-destructive")}>
                      {code === draft.language && "(D) "}
                      {label}
                      {invalid && <span className="size-1.5 rounded-full bg-destructive" aria-label="has errors" />}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            )}
            {languages.map(({ code, label }) => {
              const info = draft.infos.find((i) => i.language === code)!
              const error = (key: string) => errors[`${code}.${key}`]
              const text = (key: keyof Omit<WebSiteInfo, "language" | "faviconUrl" | "siteLogoUrl">) => ({
                value: info[key],
                onChange: (value: string) => setInfo(code, key, value),
                error: error(key),
              })
              return (
                <TabsContent key={code} value={code} className="grid gap-4 pt-2 sm:grid-cols-2">
                  <TextField label="Site Name" placeholder={`Site name in ${label}`} {...text("name")} />
                  <TextField
                    label="Site Title"
                    required={code === draft.language}
                    placeholder={`Site title in ${label}`}
                    {...text("siteTitle")}
                  />
                  <TextField
                    label="Tagline"
                    className="sm:col-span-2"
                    placeholder={`Tagline in ${label}`}
                    {...text("tagline")}
                  />
                  <ImageField
                    name={`${code}-favicon`}
                    label="Favicon"
                    value={info.faviconUrl}
                    error={error("faviconUrl")}
                    onChange={(event) => pickImage(code, "faviconUrl", event)}
                    onClear={() => setInfo(code, "faviconUrl", "")}
                  />
                  <ImageField
                    name={`${code}-logo`}
                    label="Site Logo"
                    value={info.siteLogoUrl}
                    error={error("siteLogoUrl")}
                    onChange={(event) => pickImage(code, "siteLogoUrl", event)}
                    onClear={() => setInfo(code, "siteLogoUrl", "")}
                  />
                  <TextField
                    label="Copyrights"
                    className="sm:col-span-2"
                    placeholder={`Copyright in ${label}`}
                    {...text("copyrights")}
                  />
                  <TextField label="Privacy Policy URL" placeholder="https://" {...text("privacyPolicyUrl")} />
                  <TextField
                    label="Terms and Conditions URL"
                    placeholder="https://"
                    {...text("termsAndConditionsUrl")}
                  />
                </TabsContent>
              )
            })}
          </Tabs>

          <div className="grid gap-4 border-t pt-6 sm:grid-cols-2">
            <TextField
              label="Website URL"
              type="url"
              placeholder="https://"
              value={draft.domainName}
              onChange={(v) => set("domainName", v)}
              error={errors.domainName}
            />
            <TextField
              label="Email"
              type="email"
              value={draft.emailAddress}
              onChange={(v) => set("emailAddress", v)}
              error={errors.emailAddress}
            />
            <FilterField
              label="Default Language"
              value={draft.language}
              onChange={(v) => set("language", v as SiteLanguage)}
              options={siteLanguages.map(({ code, label }) => ({ value: code, label }))}
            />
            <FilterField
              label="TimeZone"
              value={draft.timeZone}
              onChange={(v) => set("timeZone", v)}
              placeholder="Select TimeZone"
              options={siteTimeZones.map((z) => ({ value: z.value, label: z.label }))}
            />
            <TextField
              label="Date Format"
              required
              value={draft.dateFormat}
              onChange={(v) => set("dateFormat", v)}
              error={errors.dateFormat}
              description="For example dd/MM/yyyy"
            />
            <TextField
              label="Time Format"
              required
              value={draft.timeFormat}
              onChange={(v) => set("timeFormat", v)}
              error={errors.timeFormat}
              description="For example hh:mm tt"
            />
            <FilterField
              label="New User Role"
              value={draft.newUserRole}
              onChange={(v) => set("newUserRole", v)}
              placeholder="Select new user role"
              options={roles.filter((r) => r !== SUPER_ADMIN_ROLE).map((r) => ({ value: r, label: r }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CheckField
              label="Enable Multi Language"
              checked={draft.isMultiLingual}
              onChange={(v) => set("isMultiLingual", v)}
              description="Edit the site texts in every language."
            />
            <CheckField
              label="Allow User Registration"
              checked={draft.allowRegistration}
              onChange={(v) => set("allowRegistration", v)}
              description="Visitors can sign up and get the new user role."
            />
            <CheckField
              label="Redirect to Https"
              checked={draft.redirectToHttps}
              onChange={(v) => set("redirectToHttps", v)}
            />
            <CheckField label="Enable Cache" checked={draft.enableCache} onChange={(v) => set("enableCache", v)} />
          </div>
        </CardContent>
        <SaveFooter
          modifiedBy={settings.modifiedBy}
          modifiedAt={settings.modifiedAt}
          changed={changed}
          onReset={() => {
            setDraft(saved)
            setErrors({})
          }}
        />
      </Card>
    </form>
  )
}
