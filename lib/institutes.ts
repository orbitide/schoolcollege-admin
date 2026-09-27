import seed from "@/lib/data/institutes.json"

export const instituteTypes = [
  "School",
  "College",
  "School & College",
  "Madrasa",
  "Kindergarten",
] as const
export const plans = ["Basic", "Standard", "Premium"] as const
export const statuses = ["Active", "Trial", "Suspended"] as const
export const billingCycles = ["Monthly", "Yearly"] as const
export const managers = ["Rafiq Hasan", "Nusrat Jahan", "Tanvir Ahmed"] as const

export type InstituteType = (typeof instituteTypes)[number]
export type Plan = (typeof plans)[number]
export type InstituteStatus = (typeof statuses)[number]
export type BillingCycle = (typeof billingCycles)[number]

export type Institute = {
  id: number
  name: string
  type: InstituteType
  subdomain: string
  plan: Plan
  status: InstituteStatus
  billingCycle: BillingCycle
  students: number
  teachers: number
  manager: string
  principal: string
  email: string
  phone: string
  city: string
  address: string
  joinedAt: string
}

export type InstituteInput = Omit<Institute, "id" | "joinedAt">

// Monthly price per plan in USD (dummy pricing until the billing API exists).
export const planPrices: Record<Plan, number> = {
  Basic: 49,
  Standard: 99,
  Premium: 199,
}

export const planLimits: Record<Plan, { students: number; teachers: number }> =
  {
    Basic: { students: 1000, teachers: 50 },
    Standard: { students: 3000, teachers: 150 },
    Premium: { students: 10000, teachers: 500 },
  }

export const seedInstitutes = seed as Institute[]

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
