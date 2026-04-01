import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://lrgboocfomodbxottfbn.supabase.co',
  'sb_publishable_SbhOPr5cYcCoaS_iy4KkGg_LSoD5CJF'
)

const tbody = document.getElementById('tbody')
const statusMsg = document.getElementById('statusMsg')
const logoutBtn = document.getElementById('logoutBtn')

function setStatus(text, isError = false) {
  statusMsg.textContent = text
  statusMsg.className = isError
    ? 'mb-4 text-sm text-red-600'
    : 'mb-4 text-sm text-gray-500'
}

function formatStatus(status) {
  if (status === 'succeeded') return '<span class="text-green-600 font-semibold">Comprou</span>'
  if (status === 'failed') return '<span class="text-red-600 font-semibold">Falhou</span>'
  if (status === 'started') return '<span class="text-yellow-600 font-semibold">Tentou</span>'
  return `<span class="text-gray-600 font-semibold">${status || '-'}</span>`
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR')
}

async function forceLogout() {
  await supabase.auth.signOut()
  localStorage.clear()
  sessionStorage.clear()
  window.location.replace('/login.html')
}

async function loadOrders() {
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return forceLogout()
    }

    const res = await fetch('/admin/payments', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

    if (!res.ok) {
      return forceLogout()
    }

    const data = await res.json()

    document.body.style.display = 'block'
    tbody.innerHTML = ''

    if (!Array.isArray(data) || data.length === 0) {
      setStatus('Nenhum pedido encontrado.')
      tbody.innerHTML = `<tr><td class="p-3 text-gray-500" colspan="10">Nenhum pedido encontrado.</td></tr>`
      return
    }

    setStatus(`${data.length} pedido(s) encontrado(s).`)

    data.forEach((p) => {
      const tr = document.createElement('tr')
      tr.className = 'border-b align-top'

      const endereco = [p.address_line1, p.address_line2].filter(Boolean).join(' ')

      tr.innerHTML = `
        <td class="p-3">${formatStatus(p.status)}</td>
        <td class="p-3">${p.customer_name || '-'}</td>
        <td class="p-3">${p.email || '-'}</td>
        <td class="p-3">${p.customer_phone || '-'}</td>
        <td class="p-3">€ ${((p.amount || 0) / 100).toFixed(2)}</td>
        <td class="p-3">${p.address_country || '-'}</td>
        <td class="p-3">${p.address_city || '-'}</td>
        <td class="p-3">${p.address_postal_code || '-'}</td>
        <td class="p-3">${endereco || '-'}</td>
        <td class="p-3">${formatDate(p.created_at)}</td>
      `

      tbody.appendChild(tr)
    })
  } catch (error) {
    setStatus(error.message || 'Erro ao carregar pedidos.', true)
    document.body.style.display = 'block'
  }
}

logoutBtn.addEventListener('click', async () => {
  await forceLogout()
})

loadOrders()
