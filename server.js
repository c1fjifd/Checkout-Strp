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

// 🔥 WEBHOOK
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature']
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object

      await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`
        },
        body: JSON.stringify({
          stripe_session_id: paymentIntent.id,
          email: paymentIntent.receipt_email,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        })
      })
    }

    res.json({ received: true })
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
})

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// 🔐 PROTEÇÃO SIMPLES ADMIN
const ADMIN_TOKEN = "admin123"

// 🔥 LISTAR PAGAMENTOS (PROTEGIDO + ORDENADO)
app.get('/payments', async (req, res) => {
  try {
    const token = req.headers['authorization']

    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Não autorizado' })
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
    res.status(500).json({ error: error.message })
  }
})

// 🔥 PAYMENT INTENT
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amountInCents, customerEmail } = req.body

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'brl',
      receipt_email: customerEmail || undefined,
      automatic_payment_methods: { enabled: true }
    })

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log('Servidor rodando...')
})
