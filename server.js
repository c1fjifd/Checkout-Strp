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
  throw new Error('Faltou STRIPE_SECRET_KEY no .env')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(cors())
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
        origem: 'site-proprio'
      }
    })

    return res.json({
      url: session.url
    })
  } catch (error) {
    console.error('Erro ao criar checkout:', error)
    return res.status(500).json({
      error: error?.message || 'Erro interno ao criar checkout.'
    })
  }
})

app.listen(PORT, () => {
  console.log(`Servidor rodando em ${BASE_URL}`)
})
