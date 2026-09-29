"use client"

import * as React from "react"
import Link from "next/link"
import { CircleCheckIcon, CircleXIcon, CreditCardIcon, LoaderIcon, ShieldCheckIcon, SmartphoneIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatAmount } from "@/lib/fee-heads"
import { onlineGateways, type OnlineGateway } from "@/lib/fee-payments"
import { sendPaymentSms } from "@/lib/fee-sms"
import { useInstitute } from "@/lib/institutes-store"
import {
  cancelCheckout,
  effectiveStatus,
  SANDBOX_PIN,
  submitCheckout,
  useOnlinePaymentByToken,
  verifyOnlinePayment,
} from "@/lib/online-payments"
import { useStudent } from "@/lib/students"
import { cn } from "@/lib/utils"

const gatewayStyle: Record<OnlineGateway, string> = {
  bKash: "border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  Nagad: "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  SSLCommerz: "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300",
}

// Who the receipt of an online payment is stamped with.
const ONLINE_USER = "Online Payment"

// The guardian's side of an online payment request: pick bKash, Nagad or a
// card (SSLCommerz), confirm with the account and PIN, then wait while the
// payment is verified. SANDBOX: it imitates a gateway's hosted page; no
// money moves and it only knows requests made in this browser tab.
export function SandboxCheckout({ token }: { token: string }) {
  const request = useOnlinePaymentByToken(token)
  const institute = useInstitute(request?.instituteId ?? -1)
  const student = useStudent(request?.studentId ?? -1)
  const [gateway, setGateway] = React.useState<OnlineGateway>("bKash")
  const [account, setAccount] = React.useState("")
  const [pin, setPin] = React.useState("")
  const [error, setError] = React.useState("")
  const [receiptNo, setReceiptNo] = React.useState("")
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const status = request ? effectiveStatus(request, now) : null

  // The server-side step: verify with the gateway, then record once.
  React.useEffect(() => {
    if (!request || request.status !== "Processing" || !institute) return
    const timer = setTimeout(() => {
      try {
        const payment = verifyOnlinePayment(request.id, ONLINE_USER)
        if (payment) {
          setReceiptNo(payment.receiptNo)
          sendPaymentSms(payment, institute, ONLINE_USER)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "The payment could not be verified.")
      }
    }, 1800)
    return () => clearTimeout(timer)
  }, [request, institute])

  if (!request || !institute) {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle>Payment request not found</CardTitle>
            <CardDescription>
              The link may be wrong. In this sandbox, a checkout only works in the browser tab where the school made
              the request.
            </CardDescription>
          </CardHeader>
        </Card>
      </Shell>
    )
  }

  const left = Math.max(0, Math.floor((Date.parse(request.expiresAt) - now) / 1000))

  function pay(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const result = submitCheckout(token, gateway, account, pin)
      if (result === "Failed") setError("The payment was declined at the gateway.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "The payment could not be made.")
    }
  }

  return (
    <Shell>
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <CardDescription>{institute.name}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{formatAmount(request.amount)}</CardTitle>
              <CardDescription>
                School fees of <strong>{student?.name ?? "—"}</strong> (ID {student?.studentIdentificationNo ?? "—"})
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono">
              {request.token}
            </Badge>
          </div>
        </CardHeader>

        {status === "Initiated" && (
          <form onSubmit={pay}>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Pay with">
                {onlineGateways.map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={gateway === g}
                    onClick={() => setGateway(g)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-3 text-sm font-semibold transition-colors",
                      gateway === g ? gatewayStyle[g] : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {g === "SSLCommerz" ? <CreditCardIcon className="size-5" /> : <SmartphoneIcon className="size-5" />}
                    {g === "SSLCommerz" ? "Card" : g}
                  </button>
                ))}
              </div>
              {gateway === "SSLCommerz" ? (
                <Field>
                  <FieldLabel htmlFor="pay-card">Card number</FieldLabel>
                  <Input
                    id="pay-card"
                    inputMode="numeric"
                    placeholder="4242 4242 4242 4242"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                  />
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="pay-account">{gateway} account number</FieldLabel>
                  <Input
                    id="pay-account"
                    inputMode="tel"
                    placeholder="01XXXXXXXXX"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                  />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="pay-pin">{gateway === "SSLCommerz" ? "OTP" : "PIN"}</FieldLabel>
                <Input
                  id="pay-pin"
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
                <FieldDescription>
                  Sandbox: {SANDBOX_PIN} succeeds, anything else is declined.
                </FieldDescription>
              </Field>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter className="flex items-center justify-between gap-2 border-t">
              <span className="text-xs text-muted-foreground tabular-nums">
                Expires in {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => cancelCheckout(token)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!pin}>
                  Pay {formatAmount(request.amount)}
                </Button>
              </div>
            </CardFooter>
          </form>
        )}

        {status === "Processing" && (
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <LoaderIcon className="size-8 animate-spin text-muted-foreground" />
            <p className="font-medium">Verifying the payment with {request.gateway}…</p>
            <p className="text-sm text-muted-foreground">Please don&apos;t close this page.</p>
          </CardContent>
        )}

        {status === "Success" && (
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CircleCheckIcon className="size-10 text-green-600" />
            <p className="text-lg font-semibold">Payment successful</p>
            <p className="text-sm text-muted-foreground">
              {request.gateway} transaction {request.trxId}
              {receiptNo && (
                <>
                  <br />
                  School receipt <strong>{receiptNo}</strong>
                </>
              )}
            </p>
          </CardContent>
        )}

        {(status === "Failed" || status === "Cancelled" || status === "Expired") && (
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CircleXIcon className="size-10 text-destructive" />
            <p className="text-lg font-semibold">Payment {status.toLowerCase()}</p>
            <p className="text-sm text-muted-foreground">
              {error || request.failureReason || "No money was taken."} Ask the school for a new link to try again.
            </p>
          </CardContent>
        )}
      </Card>
      <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <ShieldCheckIcon className="size-3.5" />
        Sandbox checkout · no real payment is made ·{" "}
        <Link href="/fees/online-payments" className="underline">
          School view
        </Link>
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/40 px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-4">{children}</div>
    </main>
  )
}
