import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Stripe from 'stripe'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(cors())

async function savePayment(payload) {
  return fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
      'apikey': process.env.SUPABASE_SERVICE_ROLE,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`
    },
    body: JSON.stringify(payload)
  })
}

async function updatePaymentByIntentId(intentId, payload) {
  return fetch(`${process.env.SUPABASE_URL}/rest/v1/payments?stripe_session_id=eq.${intentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`
    },
    body: JSON.stringify(payload)
  })
}

// WEBHOOK
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature']
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object

      await updatePaymentByIntentId(pi.id, {
        email: pi.receipt_email || pi.metadata.customer_email || null,
        customer_name: pi.metadata.customer_name || null,
        customer_phone: pi.metadata.customer_phone || null,
        address_line1: pi.metadata.address_line1 || null,
        address_line2: pi.metadata.address_line2 || null,
        address_city: pi.metadata.address_city || null,
        address_state: pi.metadata.address_state || null,
        address_postal_code: pi.metadata.address_postal_code || null,
        address_country: pi.metadata.address_country || null,
        amount: pi.amount,
        currency: pi.currency,
        status: 'succeeded'
      })
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object

      await updatePaymentByIntentId(pi.id, {
        email: pi.receipt_email || pi.metadata.customer_email || null,
        customer_name: pi.metadata.customer_name || null,
        customer_phone: pi.metadata.customer_phone || null,
        address_line1: pi.metadata.address_line1 || null,
        address_line2: pi.metadata.address_line2 || null,
        address_city: pi.metadata.address_city || null,
        address_state: pi.metadata.address_state || null,
        address_postal_code: pi.metadata.address_postal_code || null,
        address_country: pi.metadata.address_country || null,
        amount: pi.amount,
        currency: pi.currency,
        status: 'failed'
      })
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook Error:', err.message)
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
})

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// CRIAR PAYMENT INTENT + SALVAR TENTATIVA
app.post('/create-payment-intent', async (req, res) => {
  try {
    const {
      customerEmail,
      customerName,
      customerPhone,
      addressLine1,
      addressLine2,
      addressCity,
      addressState,
      addressPostalCode,
      addressCountry
    } = req.body

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 9790,
      currency: 'eur',
      receipt_email: customerEmail || undefined,
      automatic_payment_methods: { enabled: true },
      metadata: {
        customer_email: customerEmail || '',
        customer_name: customerName || '',
        customer_phone: customerPhone || '',
        address_line1: addressLine1 || '',
        address_line2: addressLine2 || '',
        address_city: addressCity || '',
        address_state: addressState || '',
        address_postal_code: addressPostalCode || '',
        address_country: addressCountry || ''
      }
    })

    await savePayment({
      stripe_session_id: paymentIntent.id,
      email: customerEmail || null,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      address_line1: addressLine1 || null,
      address_line2: addressLine2 || null,
      address_city: addressCity || null,
      address_state: addressState || null,
      address_postal_code: addressPostalCode || null,
      address_country: addressCountry || null,
      amount: 9790,
      currency: 'eur',
      status: 'started'
    })

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (error) {
    console.error('Create PaymentIntent Error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log('Servidor rodando...')
})
