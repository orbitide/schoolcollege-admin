import { RequireLogin } from "@/components/require-login"

// Print views sit outside the dashboard layout but need a signed-in user
// just the same.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <RequireLogin>{children}</RequireLogin>
}
