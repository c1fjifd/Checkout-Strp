import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://lrgboocfomodbxottfbn.supabase.co',
  'sb_publishable_SbhOPr5cYcCoaS_iy4KkGg_LSoD5CJF'
)

const ADMIN_EMAIL = 'eadmin@gmail.com'

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

async function protectPage() {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user || data.user.email !== ADMIN_EMAIL) {
    await supabase.auth.signOut()
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/login.html'
    return null
  }

  return data.user
}

async function loadOrders() {
  const user = await protectPage()
  if (!user) return

  setStatus(`Logado como ${user.email}`)

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })

  tbody.innerHTML = ''

  if (error) {
    setStatus(error.message, true)
    return
  }

  if (!data || data.length === 0) {
    setStatus('Nenhum pedido encontrado.')
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
}

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut()
  localStorage.clear()
  sessionStorage.clear()
  window.location.href = '/login.html'
})

loadOrders()
