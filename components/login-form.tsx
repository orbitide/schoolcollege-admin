"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  BellRingIcon,
  CalendarCheckIcon,
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  GraduationCapIcon,
  LockIcon,
  MailIcon,
  ReceiptTextIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DEMO_PASSWORD, signIn, useSessionUserId } from "@/lib/current-user"
import { useAdminUsers, type AdminUser } from "@/lib/global-settings"
import { cn } from "@/lib/utils"

// Where to go after signing in: the page that sent the user here, when it
// is one of ours, else the dashboard.
function returnUrl() {
  const back = new URLSearchParams(window.location.search).get("returnUrl") ?? ""
  return back.startsWith("/") && !back.startsWith("//") ? back : "/dashboard"
}

// "Rafiq Hasan" -> "RH".
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")

// A colour per role for the quick sign-in badges.
const roleBadge: Record<AdminUser["role"], string> = {
  "Super Admin": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  "Institute Admin": "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  "Institute Manager": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  "Institute Viewer": "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  Teacher: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
}

const highlights = [
  { icon: CalendarCheckIcon, title: "Attendance & results", text: "Daily attendance, term exams, marks and merit lists." },
  { icon: BellRingIcon, title: "SMS to guardians", text: "Absence alerts, notices and results in one click." },
  { icon: ReceiptTextIcon, title: "Plans & billing", text: "Subscriptions and invoices for every institute." },
]

function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/30",
        className
      )}
    >
      <GraduationCapIcon className="size-5" />
    </span>
  )
}

// The platform's pitch beside the form on wide screens.
function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-linear-to-br from-indigo-950 via-indigo-900 to-violet-900 p-10 text-white lg:flex lg:flex-col">
      {/* Soft glows and a faint grid for depth. */}
      <div className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full bg-violet-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-40 size-[28rem] rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative flex items-center gap-3">
        <Logo />
        <span className="grid leading-tight">
          <span className="text-lg font-bold tracking-tight">SMS Admin</span>
          <span className="text-xs text-white/60">School Management Platform</span>
        </span>
      </div>

      <div className="relative my-auto max-w-md py-12">
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          Run every institute from one place.
        </h1>
        <p className="mt-4 text-base text-white/70">
          Students, teachers, exams, attendance and SMS — for schools, colleges and madrasas.
        </p>
        <ul className="mt-10 grid gap-5">
          {highlights.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <Icon className="size-5" />
              </span>
              <span className="grid gap-0.5">
                <span className="font-medium">{title}</span>
                <span className="text-sm text-white/60">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/50">© {new Date().getFullYear()} SMS Admin</p>
    </div>
  )
}

// The dummy login: an active user's email and the shared demo password, or
// one click on a user to try the panel in that role.
export function LoginForm() {
  const router = useRouter()
  const users = useAdminUsers()
  const signedIn = useSessionUserId() != null
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Already signed in (another tab, or the back button): skip the form.
  React.useEffect(() => {
    if (signedIn) router.replace(returnUrl())
  }, [signedIn, router])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    try {
      signIn(email, password)
    } catch (reason) {
      setError((reason as Error).message)
    }
  }

  const submitRef = React.useRef<HTMLButtonElement>(null)

  // Fills the form with a demo user's email and the demo password; Sign in
  // (or Enter) then signs in as them.
  function fillDemoUser(userEmail: string) {
    setError(null)
    setEmail(userEmail)
    setPassword(DEMO_PASSWORD)
    submitRef.current?.focus()
  }

  return (
    <div className="grid min-h-svh flex-1 lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      <div className="flex flex-col items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo />
            <span className="text-lg font-bold tracking-tight">SMS Admin</span>
          </div>

          <div className="mb-8 grid gap-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your admin account to continue.</p>
          </div>

          <form onSubmit={submit} noValidate>
            <FieldGroup className="gap-5">
              {error && (
                <p
                  role="alert"
                  className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  <CircleAlertIcon className="size-4 shrink-0" />
                  {error}
                </p>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="you@example.com"
                    className="h-10 pl-9"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={!!error || undefined}
                    required
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••"
                    className="h-10 pr-10 pl-9"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={!!error || undefined}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Demo password:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{DEMO_PASSWORD}</code>
                </p>
              </Field>
              <Button ref={submitRef} type="submit" size="lg" className="h-10 w-full">
                Sign in
              </Button>
            </FieldGroup>
          </form>

          <FieldSeparator className="my-8">Or pick a demo user</FieldSeparator>

          <div className="grid gap-2 sm:grid-cols-2">
            {users
              .filter((u) => u.status === "Active")
              .map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => fillDemoUser(u.email)}
                  aria-pressed={email.trim().toLowerCase() === u.email.toLowerCase()}
                  className="group flex items-center gap-3 rounded-lg border bg-card p-2.5 text-left transition-colors hover:border-foreground/20 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:ring-1 aria-pressed:ring-primary"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      roleBadge[u.role]
                    )}
                  >
                    {initials(u.name)}
                  </span>
                  <span className="grid min-w-0 leading-tight">
                    <span className="truncate text-sm font-medium">{u.role}</span>
                    <span className="truncate text-xs text-muted-foreground">{u.name}</span>
                  </span>
                </button>
              ))}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Demo mode — the session stays in this browser.
          </p>
        </div>
      </div>
    </div>
  )
}
