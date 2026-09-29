import type { Metadata } from "next"

import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: "Sign in · SMS Admin",
}

// Outside the dashboard layout: no sidebar, and no RequireLogin.
export default function LoginPage() {
  return <LoginForm />
}
