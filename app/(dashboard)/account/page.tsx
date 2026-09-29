import type { Metadata } from "next"

import { AccountPage } from "@/components/account/account-page"

export const metadata: Metadata = {
  title: "Account · SMS Admin",
}

export default function Page() {
  return <AccountPage />
}
