// The sandbox payment gateway's one rule, shared by fee payments
// (lib/online-payments.ts) and platform invoices (lib/saas-invoices.ts):
// this PIN / OTP pays, anything else is declined. A module of its own so
// lib/saas-invoices.ts, which lib/institutes-store.ts imports, needn't pull
// in the fee stores (see lib/institute-module-cleanup.ts).
export const SANDBOX_PIN = "12345"
