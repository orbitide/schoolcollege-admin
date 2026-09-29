import { feeHeadStore } from "@/lib/fee-heads"
import { removeInstituteFeeInvoices } from "@/lib/fee-invoices"
import { removeInstituteFeePayments } from "@/lib/fee-payments"
import { removeInstituteClassFees } from "@/lib/fee-setup"
import { removeInstituteWaivers } from "@/lib/fee-waivers"
import { removeInstituteNotices } from "@/lib/notices"
import { removeInstituteOnlinePayments } from "@/lib/online-payments"
import { periodStore, removeInstituteRoutine } from "@/lib/routine"

// A deleted institute's fees, routine and notices. lib/institutes-store.ts
// loads this lazily: these stores seed from lib/academic-store.ts when they
// load, and academic-store (through common-log and current-user) imports
// institutes-store, so a static import would seed them before it is ready.
export function removeInstituteModuleData(instituteId: number) {
  removeInstituteOnlinePayments(instituteId)
  removeInstituteFeePayments(instituteId)
  removeInstituteFeeInvoices(instituteId)
  removeInstituteWaivers(instituteId)
  removeInstituteClassFees(instituteId)
  feeHeadStore.removeForInstitute(instituteId)
  removeInstituteRoutine(instituteId)
  periodStore.removeForInstitute(instituteId)
  removeInstituteNotices(instituteId)
}
