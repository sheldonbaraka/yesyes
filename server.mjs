import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { WebSocketServer } from 'ws'

dotenv.config()

const app = express()
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5050

app.use(cors())
app.use(express.json())

// Safaricom Daraja env
const {
  DARAJA_CONSUMER_KEY,
  DARAJA_CONSUMER_SECRET,
  DARAJA_SHORTCODE,
  DARAJA_PASSKEY,
  DARAJA_CALLBACK_URL,
} = process.env

const DEFAULT_CALLBACK_URL = DARAJA_CALLBACK_URL || `http://localhost:${PORT}/api/payments/mpesa/callback`

// In-memory status store keyed by CheckoutRequestID
const mpesaStatuses = {}

const pad2 = n => (n < 10 ? `0${n}` : `${n}`)
const formatTimestamp = (d = new Date()) => {
  const YYYY = d.getFullYear()
  const MM = pad2(d.getMonth() + 1)
  const DD = pad2(d.getDate())
  const HH = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  const ss = pad2(d.getSeconds())
  return `${YYYY}${MM}${DD}${HH}${mm}${ss}`
}

async function getDarajaToken() {
  if (!DARAJA_CONSUMER_KEY || !DARAJA_CONSUMER_SECRET) {
    throw new Error('Missing Daraja consumer key/secret in env')
  }
  const url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
  const auth = Buffer.from(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`).toString('base64')
  const resp = await fetch(url, { headers: { Authorization: `Basic ${auth}` } })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Daraja token request failed: ${resp.status} ${text}`)
  }
  const data = await resp.json()
  return data.access_token
}

app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

// MPesa STK Push deposit (Daraja C2B)
app.post('/api/payments/mpesa/deposit', async (req, res) => {
  try {
    const { amount, phone } = req.body || {}
    if (!amount || !phone) return res.status(400).json({ error: 'amount and phone required' })
    if (!DARAJA_SHORTCODE || !DARAJA_PASSKEY) return res.status(400).json({ error: 'Missing Daraja SHORTCODE/PASSKEY in env' })

    const token = await getDarajaToken()
    const timestamp = formatTimestamp()
    const password = Buffer.from(`${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`).toString('base64')

    const payload = {
      BusinessShortCode: DARAJA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Number(amount),
      PartyA: phone,
      PartyB: DARAJA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: DEFAULT_CALLBACK_URL,
      AccountReference: 'PocketMoney',
      TransactionDesc: 'PocketMoney Deposit',
    }

    const resp = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    const data = await resp.json()

    if (data.ResponseCode === '0') {
      const reference = data.CheckoutRequestID
      mpesaStatuses[reference] = { status: 'pending', amount: Number(amount), phone }
      return res.json({ status: 'pending', reference })
    }

    return res.status(400).json({ status: 'failed', error: data.ResponseDescription || 'STK push failed' })
  } catch (err) {
    return res.status(500).json({ status: 'failed', error: err?.message || 'Server error' })
  }
})

// MPesa withdraw
app.post('/api/payments/mpesa/withdraw', async (req, res) => {
  const { amount, phone, kidId, description } = req.body || {}
  if (!amount || !phone) return res.status(400).json({ error: 'amount and phone required' })
  // TODO: integrate real MPesa payout
  const reference = `MPESA-WD-${Math.random().toString(36).slice(2)}`
  res.json({ status: 'succeeded', reference })
})

// Card deposit
app.post('/api/payments/card/deposit', async (req, res) => {
  const { amount, kidId, name } = req.body || {}
  if (!amount) return res.status(400).json({ error: 'amount required' })
  // TODO: integrate Stripe/Flutterwave/Paystack
  const reference = `CARD-${Math.random().toString(36).slice(2)}`
  res.json({ status: 'succeeded', reference })
})

// MPesa callback: Safaricom posts STK result here
app.post('/api/payments/mpesa/callback', (req, res) => {
  try {
    const cb = req.body?.Body?.stkCallback
    if (!cb) return res.status(400).json({ error: 'Invalid callback payload' })

    const reference = cb.CheckoutRequestID
    const resultCode = cb.ResultCode
    const resultDesc = cb.ResultDesc

    if (!reference) return res.status(400).json({ error: 'Missing CheckoutRequestID' })

    if (resultCode === 0) {
      let receipt
      const items = cb?.CallbackMetadata?.Item || []
      for (const it of items) {
        if (it?.Name === 'MpesaReceiptNumber') {
          receipt = it.Value
          break
        }
      }
      mpesaStatuses[reference] = { ...(mpesaStatuses[reference] || {}), status: 'succeeded', reference, receipt }
    } else {
      mpesaStatuses[reference] = { ...(mpesaStatuses[reference] || {}), status: 'failed', error: resultDesc, reference }
    }
    // Acknowledge to Safaricom
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Callback error' })
  }
})

// Poll M-Pesa status
app.get('/api/payments/mpesa/status/:reference', (req, res) => {
  const { reference } = req.params
  const status = mpesaStatuses[reference]
  if (!status) return res.json({ status: 'pending' })
  return res.json(status)
})

const server = app.listen(PORT, () => {
  console.log(`Payments server listening on http://localhost:${PORT}`)
})

// WebSocket broadcast server for realtime across devices
const wss = new WebSocketServer({ server, path: '/ws' })
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg = null
    try { msg = JSON.parse(data.toString()) } catch {}
    const payload = msg ?? data.toString()
    // Broadcast to all connected clients
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        try {
          client.send(typeof payload === 'string' ? payload : JSON.stringify(payload))
        } catch {}
      }
    }
  })
})
console.log(`WebSocket server listening at ws://localhost:${PORT}/ws`)