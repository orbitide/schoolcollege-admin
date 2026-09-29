"use client"

import * as React from "react"
import { toast } from "sonner"

import { CheckField, SaveFooter, TextField } from "@/components/settings/settings-fields"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCurrentUser } from "@/lib/current-user"
import {
  smsSettingsErrors,
  smtpSettingsErrors,
  updateSmsSettings,
  updateSmtpSettings,
  useSmsSettings,
  useSmtpSettings,
  type SmsSettings,
  type SmtpSettings,
} from "@/lib/site-settings"

// Legacy Admin/EmailSettings ("Email and SMS Settings"): the SMTP account
// the platform sends email with and the default SMS gateway. An institute
// may use its own gateway (Configurations › Institute).
export function EmailSmsSettings() {
  const smtp = useSmtpSettings()
  const sms = useSmsSettings()

  return (
    <div className="grid items-start gap-4 md:gap-6 @4xl/main:grid-cols-2">
      <SmtpForm key={smtp.modifiedAt} settings={smtp} />
      <SmsForm key={sms.modifiedAt} settings={sms} />
    </div>
  )
}

const secretBadge = (set: boolean) => (
  <Badge variant={set ? "secondary" : "outline"}>{set ? "Saved" : "Not set"}</Badge>
)

function SmtpForm({ settings }: { settings: SmtpSettings }) {
  const user = useCurrentUser()
  const saved = React.useMemo(
    () => ({
      host: settings.host,
      port: String(settings.port),
      useSsl: settings.useSsl,
      userName: settings.userName,
      password: "",
      fromName: settings.fromName,
      fromEmail: settings.fromEmail,
    }),
    [settings]
  )
  const [draft, setDraft] = React.useState(saved)
  const [errors, setErrors] = React.useState<ReturnType<typeof smtpSettingsErrors>>({})
  const changed = JSON.stringify(draft) !== JSON.stringify(saved)
  const set = <K extends keyof typeof draft>(key: K) => (value: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  function save(event: React.FormEvent) {
    event.preventDefault()
    const input = { ...draft, port: Number(draft.port) }
    const found = smtpSettingsErrors(input)
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error("Check the highlighted fields.")
      return
    }
    updateSmtpSettings(input, user.name)
    toast.success("Email settings saved.")
  }

  return (
    <form onSubmit={save}>
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>SMTP account for platform email: sign-in, password reset and notifications.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Host Address"
            required
            placeholder="smtp.example.com"
            value={draft.host}
            onChange={set("host")}
            error={errors.host}
          />
          <TextField
            label="Port"
            required
            type="number"
            min={1}
            max={65535}
            value={draft.port}
            onChange={set("port")}
            error={errors.port}
          />
          <TextField
            label="User Name"
            required
            autoComplete="off"
            value={draft.userName}
            onChange={set("userName")}
            error={errors.userName}
          />
          <div className="flex flex-col gap-1.5">
            <TextField
              label="Password"
              required={!settings.passwordSet}
              type="password"
              autoComplete="new-password"
              placeholder={settings.passwordSet ? "Leave blank to keep" : undefined}
              value={draft.password}
              onChange={set("password")}
              error={errors.password}
            />
            <div>{secretBadge(settings.passwordSet)}</div>
          </div>
          <TextField
            label="From Name"
            required
            value={draft.fromName}
            onChange={set("fromName")}
            error={errors.fromName}
          />
          <TextField
            label="From Email"
            required
            type="email"
            value={draft.fromEmail}
            onChange={set("fromEmail")}
            error={errors.fromEmail}
          />
          <CheckField label="Use SSL" checked={draft.useSsl} onChange={set("useSsl")} />
        </CardContent>
        <SaveFooter
          modifiedBy={settings.modifiedBy}
          modifiedAt={settings.modifiedAt}
          changed={changed}
          onReset={() => {
            setDraft(saved)
            setErrors({})
          }}
          saveLabel="Update"
        />
      </Card>
    </form>
  )
}

function SmsForm({ settings }: { settings: SmsSettings }) {
  const user = useCurrentUser()
  const saved = React.useMemo(
    () => ({ url: settings.url, senderId: settings.senderId, apiKey: "" }),
    [settings]
  )
  const [draft, setDraft] = React.useState(saved)
  const [errors, setErrors] = React.useState<ReturnType<typeof smsSettingsErrors>>({})
  const changed = JSON.stringify(draft) !== JSON.stringify(saved)
  const set = (key: keyof typeof draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }))

  function save(event: React.FormEvent) {
    event.preventDefault()
    const found = smsSettingsErrors(draft)
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error("Check the highlighted fields.")
      return
    }
    updateSmsSettings(draft, user.name)
    toast.success("SMS settings saved.")
  }

  return (
    <form onSubmit={save}>
      <Card>
        <CardHeader>
          <CardTitle>SMS</CardTitle>
          <CardDescription>
            Default gateway for institutes that don&apos;t set their own in Configurations › Institute.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField label="Provider Name" value={settings.provider} onChange={() => {}} readOnly />
          <TextField
            label="Balance"
            value="—"
            onChange={() => {}}
            disabled
            description="Checked with the provider once the backend exists."
          />
          <TextField
            label="URL"
            required
            type="url"
            className="sm:col-span-2"
            value={draft.url}
            onChange={set("url")}
            error={errors.url}
          />
          <TextField label="Sender ID" value={draft.senderId} onChange={set("senderId")} />
          <div className="flex flex-col gap-1.5">
            <TextField
              label="Api Key"
              required={!settings.apiKeySet}
              type="password"
              autoComplete="off"
              placeholder={settings.apiKeySet ? "Leave blank to keep" : undefined}
              value={draft.apiKey}
              onChange={set("apiKey")}
              error={errors.apiKey}
            />
            <div>{secretBadge(settings.apiKeySet)}</div>
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
          saveLabel="Update"
        />
      </Card>
    </form>
  )
}
