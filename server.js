import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Stripe from 'stripe'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const ADMIN_EMAIL = 'admin@gmail.com'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(cors())

async function savePayment(payload) {
  return fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

async function getSupabaseUser(accessToken) {
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) return null
  return await response.json()
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
        email: pi.receipt_email || null,
        customer_name: pi.shipping?.name || null,
        customer_phone: pi.shipping?.phone || null,
        address_line1: pi.shipping?.address?.line1 || null,
        address_line2: pi.shipping?.address?.line2 || null,
        address_city: pi.shipping?.address?.city || null,
        address_state: pi.shipping?.address?.state || null,
        address_postal_code: pi.shipping?.address?.postal_code || null,
        address_country: pi.shipping?.address?.country || null,
        amount: pi.amount,
        currency: pi.currency,
        status: 'succeeded'
      })
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object

      await updatePaymentByIntentId(pi.id, {
        email: pi.receipt_email || null,
        customer_name: pi.shipping?.name || null,
        customer_phone: pi.shipping?.phone || null,
        address_line1: pi.shipping?.address?.line1 || null,
        address_line2: pi.shipping?.address?.line2 || null,
        address_city: pi.shipping?.address?.city || null,
        address_state: pi.shipping?.address?.state || null,
        address_postal_code: pi.shipping?.address?.postal_code || null,
        address_country: pi.shipping?.address?.country || null,
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

// CHECKOUT
app.post('/create-payment-intent', async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 9790,
      currency: 'eur',
      automatic_payment_methods: { enabled: true }
    })

    await savePayment({
      stripe_session_id: paymentIntent.id,
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

// ADMIN SEGURO
app.get('/admin/payments', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return res.status(401).json({ error: 'Sem token' })
    }

    const user = await getSupabaseUser(token)

    if (!user || !user.email) {
      return res.status(401).json({ error: 'Usuário inválido' })
    }

    if (user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Não autorizado' })
    }

    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments?select=*&order=created_at.desc`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`
      }
    })

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('Admin payments error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log('Servidor rodando...')
})
