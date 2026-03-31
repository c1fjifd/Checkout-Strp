import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Stripe from 'stripe'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const BASE_URL = process.env.BASE_URL

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(cors())

// 🔥 WEBHOOK (ANTES DO JSON)
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature']
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      console.log('💰 PAGAMENTO CONFIRMADO')

      // 🔥 SALVAR NO SUPABASE
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`
        },
        body: JSON.stringify({
          stripe_session_id: session.id,
          email: session.customer_details?.email,
          amount: session.amount_total,
          currency: session.currency,
          status: session.payment_status
        })
      })

      console.log('✅ SALVO NO SUPABASE')
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Erro webhook:', err.message)
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
})

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// CHECKOUT
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { productName, amountInCents, customerEmail } = req.body

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${BASE_URL}/sucesso.html`,
      cancel_url: `${BASE_URL}/cancelado.html`,
      customer_email: customerEmail || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: amountInCents,
            product_data: { name: productName }
          }
        }
      ]
    })

    res.json({ url: session.url })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log('Servidor rodando...')
})
