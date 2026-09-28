"use client"

import * as React from "react"
import { RotateCcwIcon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { InstitutePicker, NoInstitute, useInstitutePicker } from "@/components/configurations/institute-picker"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { publicExams, type Institute } from "@/lib/institutes"
import {
  defaultMenuViewSetting,
  printTemplateFor,
  printTemplates,
  saveMenuViewSetting,
  useMenuViewSetting,
  type MenuViewSetting,
  type PrintDocument,
} from "@/lib/menu-views"
import type { PublicExam } from "@/lib/students"

// Legacy "Menu View Configurations" (MenuViewConfiguration/Index, under
// Configurations): pick an institute, then the print template of its ID
// card, admit card, testimonial of each public exam and transfer
// certificate.
export function MenuViewConfiguration() {
  const picker = useInstitutePicker()
  const { institute } = picker

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Menu View Configurations</h2>
        <p className="text-sm text-muted-foreground">
          The print template each institute uses for ID cards, admit cards, testimonials and transfer certificates.
        </p>
      </div>

      <InstitutePicker picker={picker} />

      {institute ? (
        <MenuViewForm key={institute.id} institute={institute} />
      ) : (
        <NoInstitute picker={picker} what="print templates" />
      )}
    </div>
  )
}

function MenuViewForm({ institute }: { institute: Institute }) {
  const saved = useMenuViewSetting(institute.id)
  const [values, setValues] = React.useState<MenuViewSetting>(saved)
  const changed = JSON.stringify(values) !== JSON.stringify(saved)

  function setExam(exam: PublicExam, id: string) {
    setValues((current) => ({ ...current, testimonial: { ...current.testimonial, [exam]: id } }))
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    saveMenuViewSetting(institute.id, values)
    toast.success(`${institute.name} print templates saved`)
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4 md:gap-6">
      <div className="grid gap-4 @4xl/main:grid-cols-3">
        <DocumentCard title="ID Card" description="Printed from Reports → ID Card">
          <TemplateField
            label="Template"
            document="idCard"
            value={printTemplateFor(values, "idCard").id}
            onChange={(id) => setValues((current) => ({ ...current, idCard: id }))}
          />
        </DocumentCard>
        <DocumentCard title="Admit Card" description="Printed from Reports → Admit Card">
          <TemplateField
            label="Template"
            document="admitCard"
            value={printTemplateFor(values, "admitCard").id}
            onChange={(id) => setValues((current) => ({ ...current, admitCard: id }))}
          />
        </DocumentCard>
        <DocumentCard title="Transfer Certificate" description="Issued to students who leave">
          <TemplateField
            label="Template"
            document="transferCertificate"
            value={printTemplateFor(values, "transferCertificate").id}
            onChange={(id) => setValues((current) => ({ ...current, transferCertificate: id }))}
          />
        </DocumentCard>
        <DocumentCard
          title="Testimonial"
          description="Printed from Reports → Testimonial, one template per public exam"
          className="@4xl/main:col-span-3"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {publicExams.map((exam) => (
              <TemplateField
                key={exam}
                label={exam}
                document="testimonial"
                value={printTemplateFor(values, "testimonial", exam).id}
                onChange={(id) => setExam(exam, id)}
              />
            ))}
          </div>
        </DocumentCard>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!changed}>
          <SaveIcon data-icon="inline-start" />
          Save
        </Button>
        <Button type="button" variant="outline" onClick={() => setValues(defaultMenuViewSetting)}>
          <RotateCcwIcon data-icon="inline-start" />
          Reset to defaults
        </Button>
      </div>
    </form>
  )
}

function DocumentCard({
  title,
  description,
  className,
  children,
}: {
  title: string
  description: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={className}>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function TemplateField({
  label,
  document,
  value,
  onChange,
}: {
  label: string
  document: PrintDocument
  value: string
  onChange: (id: string) => void
}) {
  const templates = printTemplates[document]
  const selected = templates.find((t) => t.id === value)
  return (
    <div className="flex flex-col gap-1.5">
      <FilterField
        label={label}
        value={value}
        onChange={onChange}
        options={templates.map((t) => ({ value: t.id, label: t.name }))}
      />
      {selected && <p className="text-xs text-muted-foreground">{selected.description}</p>}
    </div>
  )
}
