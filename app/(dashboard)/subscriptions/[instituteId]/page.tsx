import type { Metadata } from "next"

import { RequirePlatform } from "@/components/require-platform"
import { SubscriptionDetail } from "@/components/subscriptions/subscription-detail"

export const metadata: Metadata = {
  title: "Subscription · SMS Admin",
}

export default async function Page({ params }: PageProps<"/subscriptions/[instituteId]">) {
  const { instituteId } = await params
  return (
    <RequirePlatform>
      <SubscriptionDetail instituteId={Number(instituteId)} />
    </RequirePlatform>
  )
}
