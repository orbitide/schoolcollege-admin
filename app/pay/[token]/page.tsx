import type { Metadata } from "next"

import { SandboxCheckout } from "@/components/fees/sandbox-checkout"

export const metadata: Metadata = {
  title: "Pay school fees",
}

// The guardian's checkout for an online payment request, outside the admin
// layout and without an admin login (lib/online-payments.ts).
export default async function PayPage({ params }: PageProps<"/pay/[token]">) {
  const { token } = await params

  return <SandboxCheckout token={token} />
}
