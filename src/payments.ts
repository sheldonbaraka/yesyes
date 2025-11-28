// Simple payments integration layer with demo-mode fallback.
// In production, wire these to your backend endpoints for MPesa STK Push
// and card payments (e.g., Stripe/Flutterwave/Paystack).

export type PaymentResult = {
  status: 'succeeded' | 'failed' | 'pending'
  reference?: string
  message?: string
}

export const paymentsDemo = (import.meta as any).env?.VITE_PAYMENTS_DEMO === 'true'

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)) }

export async function initiateMpesaDeposit(params: { amount: number; phone: string; kidId: string; description?: string }) : Promise<PaymentResult> {
  if (paymentsDemo) {
    await sleep(1200)
    return { status: 'succeeded', reference: `MPESA-${Math.random().toString(36).slice(2)}` }
  }
  try {
    const r = await fetch('/api/payments/mpesa/deposit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params)
    })
    if (!r.ok) throw new Error('MPesa deposit failed')
    const json = await r.json()
    // Backend now returns pending + CheckoutRequestID reference for STK
    return { status: (json.status as PaymentResult['status']) ?? 'pending', reference: json.reference }
  } catch (e) {
    return { status: 'failed', message: (e as Error).message }
  }
}

export async function initiateMpesaWithdraw(params: { amount: number; phone: string; kidId: string; description?: string }) : Promise<PaymentResult> {
  if (paymentsDemo) {
    await sleep(1200)
    return { status: 'succeeded', reference: `MPESA-WD-${Math.random().toString(36).slice(2)}` }
  }
  try {
    const r = await fetch('/api/payments/mpesa/withdraw', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params)
    })
    if (!r.ok) throw new Error('MPesa withdraw failed')
    const json = await r.json()
    return { status: (json.status as PaymentResult['status']) ?? 'succeeded', reference: json.reference }
  } catch (e) {
    return { status: 'failed', message: (e as Error).message }
  }
}

export async function initiateCardDeposit(params: { amount: number; kidId: string; name: string; cardNumber?: string; expiry?: string; cvc?: string; description?: string }) : Promise<PaymentResult> {
  if (paymentsDemo) {
    await sleep(1200)
    return { status: 'succeeded', reference: `CARD-${Math.random().toString(36).slice(2)}` }
  }
  try {
    const r = await fetch('/api/payments/card/deposit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params)
    })
    if (!r.ok) throw new Error('Card deposit failed')
    const json = await r.json()
    return { status: (json.status as PaymentResult['status']) ?? 'succeeded', reference: json.reference }
  } catch (e) {
    return { status: 'failed', message: (e as Error).message }
  }
}

// Query MPesa payment status (polling helper)
export async function checkMpesaStatus(reference: string) : Promise<PaymentResult> {
  try {
    const r = await fetch(`/api/payments/mpesa/status/${encodeURIComponent(reference)}`)
    if (!r.ok) throw new Error('Status check failed')
    const json = await r.json()
    return { status: (json.status as PaymentResult['status']), reference, message: json.error }
  } catch (e) {
    return { status: 'failed', reference, message: (e as Error).message }
  }
}

export async function waitForPayment(reference: string, opts: { timeoutMs?: number; intervalMs?: number } = {}) : Promise<PaymentResult> {
  const timeoutMs = opts.timeoutMs ?? 30000
  const intervalMs = opts.intervalMs ?? 2000
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const status = await checkMpesaStatus(reference)
    if (status.status === 'succeeded' || status.status === 'failed') return status
    await sleep(intervalMs)
  }
  return { status: 'pending', reference, message: 'Timed out waiting for confirmation' }
}