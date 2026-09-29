"use client"

import * as React from "react"

import { blogLanguages, type BlogLanguage } from "@/lib/blog-posts"
import { logChanges } from "@/lib/common-log"

// Legacy NetCoreCMS "Settings" menu (Core.Admin AdminController): General
// (NccWebSite), Email & SMS (the SmtpSettings and SmsSender NccSettings
// rows) and Maintenance Mode (the setup config). Platform wide: one set for
// the whole SaaS. Startup, External Login and Logging aren't ported; they
// need the public CMS or the backend. In-memory like the rest of admin;
// replace with API calls once the backend endpoints exist.

export const siteLanguages = blogLanguages
export type SiteLanguage = BlogLanguage

// Legacy's TimeZone options.
export const siteTimeZones = [
  { value: "UTC_6", label: "UTC +6" },
  { value: "UTC_1", label: "UTC +1" },
] as const

// A store holding one record, like lib/billing.ts.
function singleton<T>(seed: T) {
  let value = seed
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  return {
    get: () => value,
    use: () => React.useSyncExternalStore(subscribe, () => value, () => seed),
    set(next: T) {
      value = next
      listeners.forEach((listener) => listener())
    },
  }
}

const stamp = (user: string) => ({ modifiedBy: user, modifiedAt: new Date().toISOString() })

// ---- General (legacy Admin/Settings) ----

// Legacy NccWebSiteInfo: the site's texts in one language.
export type WebSiteInfo = {
  language: SiteLanguage
  name: string
  siteTitle: string
  tagline: string
  faviconUrl: string
  siteLogoUrl: string
  copyrights: string
  privacyPolicyUrl: string
  termsAndConditionsUrl: string
}

export type GeneralSettings = {
  id: number
  infos: WebSiteInfo[]
  domainName: string
  redirectToHttps: boolean
  emailAddress: string
  allowRegistration: boolean
  // The role a self-registered user gets (lib/user-roles.ts).
  newUserRole: string
  timeZone: string
  // The default language; its texts are required.
  language: SiteLanguage
  isMultiLingual: boolean
  dateFormat: string
  timeFormat: string
  enableCache: boolean
  modifiedBy: string
  modifiedAt: string
}

export type GeneralSettingsInput = Omit<GeneralSettings, "id" | "modifiedBy" | "modifiedAt">

export const emptyWebSiteInfo = (language: SiteLanguage): WebSiteInfo => ({
  language,
  name: "",
  siteTitle: "",
  tagline: "",
  faviconUrl: "",
  siteLogoUrl: "",
  copyrights: "",
  privacyPolicyUrl: "",
  termsAndConditionsUrl: "",
})

const general = singleton<GeneralSettings>({
  id: 1,
  infos: [
    {
      ...emptyWebSiteInfo("en"),
      name: "School Management System",
      siteTitle: "SMS",
      tagline: "School and college management in one place",
      copyrights: "© 2026 SMS. All rights reserved.",
    },
  ],
  domainName: "http://localhost:3000",
  redirectToHttps: false,
  emailAddress: "support@sms.example.com",
  allowRegistration: false,
  newUserRole: "Institute Viewer",
  timeZone: "UTC_6",
  language: "en",
  isMultiLingual: true,
  dateFormat: "dd/MM/yyyy",
  timeFormat: "hh:mm tt",
  enableCache: true,
  modifiedBy: "Super Admin",
  modifiedAt: "2026-01-01T00:00:00.000Z",
})

export const useGeneralSettings = general.use
export const getGeneralSettings = general.get

// A language's texts are left out when every field is blank.
const isBlankInfo = (info: WebSiteInfo) =>
  Object.entries(info).every(([key, value]) => key === "language" || !String(value).trim())

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isUrl = (value: string) => /^https?:\/\/\S+$/i.test(value)

// Keys are field names, or `<language>.<field>` for a language's texts.
export function generalSettingsErrors(input: GeneralSettingsInput) {
  const errors: Record<string, string> = {}
  for (const info of input.infos) {
    const isDefault = info.language === input.language
    if (!isDefault && isBlankInfo(info)) continue
    if (!info.siteTitle.trim()) errors[`${info.language}.siteTitle`] = "Site title is required."
    for (const key of ["privacyPolicyUrl", "termsAndConditionsUrl"] as const) {
      const value = info[key].trim()
      if (value && !isUrl(value) && !value.startsWith("/"))
        errors[`${info.language}.${key}`] = "Enter a link starting with http(s):// or /."
    }
  }
  if (!input.infos.some((info) => info.language === input.language))
    errors[`${input.language}.siteTitle`] = "Site title is required."
  if (input.domainName.trim() && !isUrl(input.domainName.trim()))
    errors.domainName = "Enter a URL starting with http:// or https://."
  if (input.emailAddress.trim() && !EMAIL.test(input.emailAddress.trim()))
    errors.emailAddress = "Enter a valid email address."
  if (!input.dateFormat.trim()) errors.dateFormat = "Date format is required."
  if (!input.timeFormat.trim()) errors.timeFormat = "Time format is required."
  return errors
}

export function updateGeneralSettings(input: GeneralSettingsInput, user: string) {
  const before = general.get()
  const trim = (info: WebSiteInfo): WebSiteInfo => ({
    ...info,
    name: info.name.trim(),
    siteTitle: info.siteTitle.trim(),
    tagline: info.tagline.trim(),
    copyrights: info.copyrights.trim(),
    privacyPolicyUrl: info.privacyPolicyUrl.trim(),
    termsAndConditionsUrl: info.termsAndConditionsUrl.trim(),
  })
  const next: GeneralSettings = {
    ...before,
    ...input,
    // As legacy: a language other than the default is dropped when blank.
    infos: input.infos.map(trim).filter((info) => info.language === input.language || !isBlankInfo(info)),
    domainName: input.domainName.trim(),
    emailAddress: input.emailAddress.trim(),
    dateFormat: input.dateFormat.trim(),
    timeFormat: input.timeFormat.trim(),
    ...stamp(user),
  }
  logChanges("NccWebSite", [before], [next])
  general.set(next)
}

// ---- Email & SMS (legacy Admin/EmailSettings) ----

// The password and API key live off the rows, so Common Log never records
// them; the rows only say whether one is set.
let smtpPassword = ""
let smsApiKey = ""

export type SmtpSettings = {
  id: number
  host: string
  port: number
  useSsl: boolean
  userName: string
  passwordSet: boolean
  fromEmail: string
  fromName: string
  modifiedBy: string
  modifiedAt: string
}

// Left blank, the password stays as it is.
export type SmtpSettingsInput = Pick<SmtpSettings, "host" | "port" | "useSsl" | "userName" | "fromEmail" | "fromName"> & {
  password: string
}

export type SmsSettings = {
  id: number
  // Legacy SmsSender.Name: fixed, the gateway the code speaks to.
  provider: string
  url: string
  senderId: string
  apiKeySet: boolean
  modifiedBy: string
  modifiedAt: string
}

// Left blank, the API key stays as it is.
export type SmsSettingsInput = Pick<SmsSettings, "url" | "senderId"> & { apiKey: string }

const smtp = singleton<SmtpSettings>({
  id: 1,
  host: "",
  port: 587,
  useSsl: true,
  userName: "",
  passwordSet: false,
  fromEmail: "",
  fromName: "",
  modifiedBy: "Super Admin",
  modifiedAt: "2026-01-01T00:00:00.000Z",
})

const sms = singleton<SmsSettings>({
  id: 2,
  provider: "OnnoRokomSMS",
  url: "https://api2.onnorokomsms.com/HttpSendSms.ashx",
  senderId: "",
  apiKeySet: false,
  modifiedBy: "Super Admin",
  modifiedAt: "2026-01-01T00:00:00.000Z",
})

export const useSmtpSettings = smtp.use
export const useSmsSettings = sms.use

// Legacy NccSettings rows are keyed by the settings class.
const settingsKey = (row: { id: number }) => (row.id === smtp.get().id ? "SmtpSettings" : "SmsSender")

// Legacy SmtpSettings: everything but Use SSL is required.
export function smtpSettingsErrors(input: SmtpSettingsInput) {
  const errors: Partial<Record<keyof SmtpSettingsInput, string>> = {}
  if (!input.host.trim()) errors.host = "Host address is required."
  if (!(Number.isInteger(input.port) && input.port > 0 && input.port <= 65535))
    errors.port = "Enter a port from 1 to 65535."
  if (!input.userName.trim()) errors.userName = "User name is required."
  if (!input.password && !smtp.get().passwordSet) errors.password = "Password is required."
  if (!input.fromName.trim()) errors.fromName = "From name is required."
  if (!EMAIL.test(input.fromEmail.trim())) errors.fromEmail = "Enter a valid email address."
  return errors
}

export function updateSmtpSettings(input: SmtpSettingsInput, user: string) {
  const before = smtp.get()
  if (input.password) smtpPassword = input.password
  const next: SmtpSettings = {
    ...before,
    host: input.host.trim(),
    port: input.port,
    useSsl: input.useSsl,
    userName: input.userName.trim(),
    passwordSet: !!smtpPassword,
    fromEmail: input.fromEmail.trim(),
    fromName: input.fromName.trim(),
    ...stamp(user),
  }
  logChanges("NccSettings", [before], [next], settingsKey)
  smtp.set(next)
}

// Legacy saves the SMS settings only with an API key.
export function smsSettingsErrors(input: SmsSettingsInput) {
  const errors: Partial<Record<keyof SmsSettingsInput, string>> = {}
  if (!isUrl(input.url.trim())) errors.url = "Enter a URL starting with http:// or https://."
  if (!input.apiKey && !sms.get().apiKeySet) errors.apiKey = "API key is required."
  return errors
}

export function updateSmsSettings(input: SmsSettingsInput, user: string) {
  const before = sms.get()
  if (input.apiKey) smsApiKey = input.apiKey
  const next: SmsSettings = {
    ...before,
    url: input.url.trim(),
    senderId: input.senderId.trim(),
    apiKeySet: !!smsApiKey,
    ...stamp(user),
  }
  logChanges("NccSettings", [before], [next], settingsKey)
  sms.set(next)
}

// ---- Maintenance Mode (legacy Admin/MaintenanceMode) ----

// Legacy keeps this in the setup file, not the database, so it isn't in
// Common Log.
export type MaintenanceSettings = {
  enabled: boolean
  // Expected downtime in minutes (legacy MaintenanceDownTime).
  downTime: number
  message: string
  modifiedBy: string
  modifiedAt: string
}

export type MaintenanceSettingsInput = Pick<MaintenanceSettings, "enabled" | "downTime" | "message">

const maintenance = singleton<MaintenanceSettings>({
  enabled: false,
  downTime: 30,
  message: "The site is down for maintenance. Please check back soon.",
  modifiedBy: "Super Admin",
  modifiedAt: "2026-01-01T00:00:00.000Z",
})

export const useMaintenanceSettings = maintenance.use

export function maintenanceSettingsErrors(input: MaintenanceSettingsInput) {
  const errors: Partial<Record<keyof MaintenanceSettingsInput, string>> = {}
  if (!(Number.isInteger(input.downTime) && input.downTime >= 0))
    errors.downTime = "Enter a whole number of minutes, 0 or more."
  if (input.enabled && !input.message.trim()) errors.message = "Tell visitors why the site is down."
  return errors
}

export function updateMaintenanceSettings(input: MaintenanceSettingsInput, user: string) {
  maintenance.set({ ...input, message: input.message.trim(), ...stamp(user) })
}
