import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://lrgboocfomodbxottfbn.supabase.co',
  'sb_publishable_SbhOPr5cYcCoaS_iy4KkGg_LSoD5CJF'
)

const tbody = document.getElementById('tbody')

// 🔐 pega sessão
const { data: { session } } = await supabase.auth.getSession()

if (!session) {
  window.location.href = '/login.html'
}

// 🔥 chama backend protegido
const res = await fetch('/admin/payments', {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
})

if (!res.ok) {
  window.location.href = '/login.html'
}

const data = await res.json()

tbody.innerHTML = ''

data.forEach(p => {
  const tr = document.createElement('tr')

  tr.innerHTML = `
    <td class="p-3">${p.status}</td>
    <td class="p-3">${p.email || '-'}</td>
    <td class="p-3">€ ${(p.amount / 100).toFixed(2)}</td>
  `

  tbody.appendChild(tr)
})
