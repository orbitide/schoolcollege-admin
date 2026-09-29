import type { Metadata } from "next"

import { PricingPage } from "@/components/pricing/pricing-page"
import { RequirePlatform } from "@/components/require-platform"

export const metadata: Metadata = {
  title: "Pricing · SMS Admin",
}

export default function Page() {
  return (
    <RequirePlatform>
      <PricingPage />
    </RequirePlatform>
  )
}
