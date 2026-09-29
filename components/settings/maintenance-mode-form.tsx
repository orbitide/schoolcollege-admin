"use client"

import * as React from "react"
import { toast } from "sonner"

import { CheckField, SaveFooter, TextField } from "@/components/settings/settings-fields"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { useCurrentUser } from "@/lib/current-user"
import {
  maintenanceSettingsErrors,
  updateMaintenanceSettings,
  useMaintenanceSettings,
  type MaintenanceSettings,
} from "@/lib/site-settings"

// Legacy Admin/MaintenanceMode ("Maintenance Mode Settings").
export function MaintenanceModeForm() {
  const settings = useMaintenanceSettings()
  return <FormBody key={settings.modifiedAt} settings={settings} />
}

function FormBody({ settings }: { settings: MaintenanceSettings }) {
  const user = useCurrentUser()
  const saved = React.useMemo(
    () => ({ enabled: settings.enabled, downTime: String(settings.downTime), message: settings.message }),
    [settings]
  )
  const [draft, setDraft] = React.useState(saved)
  const [errors, setErrors] = React.useState<ReturnType<typeof maintenanceSettingsErrors>>({})
  const changed = JSON.stringify(draft) !== JSON.stringify(saved)
  const messageId = React.useId()

  function save(event: React.FormEvent) {
    event.preventDefault()
    const input = { ...draft, downTime: Number(draft.downTime) }
    const found = maintenanceSettingsErrors(input)
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error("Check the highlighted fields.")
      return
    }
    updateMaintenanceSettings(input, user.name)
    toast.success(input.enabled ? "Maintenance mode is on." : "Maintenance mode is off.")
  }

  return (
    <form onSubmit={save} className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Maintenance Mode
            <Badge variant={settings.enabled ? "destructive" : "secondary"}>{settings.enabled ? "On" : "Off"}</Badge>
          </CardTitle>
          <CardDescription>
            While it is on, visitors to the public site see the message below instead of the site.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <CheckField
            label="Enable Maintenance"
            checked={draft.enabled}
            onChange={(enabled) => setDraft((d) => ({ ...d, enabled }))}
          />
          <TextField
            label="Maintenance Duration (minutes)"
            type="number"
            min={0}
            className="sm:max-w-60"
            value={draft.downTime}
            onChange={(downTime) => setDraft((d) => ({ ...d, downTime }))}
            error={errors.downTime}
            description="How long visitors are told the site will be down."
          />
          <Field data-invalid={!!errors.message || undefined}>
            <FieldLabel htmlFor={messageId}>Maintenance Message</FieldLabel>
            <Textarea
              id={messageId}
              rows={4}
              value={draft.message}
              aria-invalid={!!errors.message || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
            />
            <FieldError>{errors.message}</FieldError>
          </Field>
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
