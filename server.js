import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Stripe from 'stripe'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Faltou STRIPE_SECRET_KEY')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(cors())

app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('Faltou STRIPE_WEBHOOK_SECRET')
      return res.status(500).send('Webhook não configurado.')
    }

    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      console.log('✅ PAGAMENTO CONFIRMADO')
      console.log('Session ID:', session.id)
      console.log('Customer Email:', session.customer_details?.email || session.customer_email || '')
      console.log('Amount Total:', session.amount_total)
      console.log('Currency:', session.currency)
      console.log('Payment Status:', session.payment_status)
      console.log('Metadata:', session.metadata || {})
    }

    if (event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object
      console.log('✅ PAGAMENTO ASSÍNCRONO CONFIRMADO:', session.id)
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object
      console.log('⌛ CHECKOUT EXPIRADO:', session.id)
    }

    return res.json({ received: true })
  } catch (error) {
    console.error('❌ Erro no webhook:', error.message)
    return res.status(400).send(`Webhook Error: ${error.message}`)
  }
})

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { productName, amountInCents, customerEmail } = req.body

    if (!productName || !amountInCents) {
      return res.status(400).json({
        error: 'productName e amountInCents são obrigatórios.'
      })
    }

    const unitAmount = Number(amountInCents)

    if (!Number.isInteger(unitAmount) || unitAmount < 50) {
      return res.status(400).json({
        error: 'amountInCents inválido. Ex.: 1990 = R$ 19,90'
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${BASE_URL}/sucesso.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cancelado.html`,
      customer_email: customerEmail || undefined,
      billing_address_collection: 'auto',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: unitAmount,
            product_data: {
              name: productName
            }
          }
        }
      ],
      metadata: {
        origem: 'site-proprio',
        produto: productName
      }
    })

    return res.json({
      url: session.url,
      sessionId: session.id
    })
  } catch (error) {
    console.error('Erro ao criar checkout:', error)
    return res.status(500).json({
      error: error?.message || 'Erro interno ao criar checkout.'
    })
  }
})

app.get('/checkout-session/:id', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id)
    return res.json(session)
  } catch (error) {
    console.error('Erro ao buscar sessão:', error)
    return res.status(500).json({
      error: error?.message || 'Erro ao buscar sessão.'
    })
  }
})

app.get('/health', (req, res) => {
  return res.json({
    ok: true,
    service: 'stripe-checkout',
    baseUrl: BASE_URL
  })
})

app.listen(PORT, () => {
  console.log(`Servidor rodando em ${BASE_URL}`)
})
