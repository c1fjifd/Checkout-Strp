import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  "https://lrgboocfomodbxottfbn.supabase.co",
  "sb_publishable_SbhOPr5cYcCoaS_iy4KkGg_LSoD5CJF"
)

const { data: { session } } = await supabase.auth.getSession()

if (!session) {
  window.location.href = "/login.html"
}

window.logout = async () => {
  await supabase.auth.signOut()
  window.location.href = "/login.html"
}

function formatStatus(status) {
  if (status === 'succeeded') return '<span class="text-green-600 font-semibold">Comprou</span>'
  if (status === 'failed') return '<span class="text-red-600 font-semibold">Recusou/Falhou</span>'
  if (status === 'started') return '<span class="text-yellow-600 font-semibold">Tentou</span>'
  return `<span class="text-gray-600 font-semibold">${status || '-'}</span>`
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR')
}

async function load() {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })

  const tbody = document.getElementById('tbody')
  tbody.innerHTML = ''

  if (error) {
    tbody.innerHTML = `<tr><td class="p-3 text-red-600" colspan="10">${error.message}</td></tr>`
    return
  }

  data.forEach(p => {
    const tr = document.createElement('tr')
    tr.className = 'border-b align-top'

    const endereco = [
      p.address_line1,
      p.address_line2
    ].filter(Boolean).join(' ')

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

load()
