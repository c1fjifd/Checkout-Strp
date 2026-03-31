import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  "https://lrgboocfomodbxottfbn.supabase.co",
  "sb_publishable_SbhOPr5cYcCoaS_iy4KkGg_LSoD5CJF"
)

// 🔐 PROTEÇÃO
const { data: { session } } = await supabase.auth.getSession()

if (!session) {
  window.location.href = "/login.html"
}

// 🚪 LOGOUT
window.logout = async () => {
  await supabase.auth.signOut()
  window.location.href = "/login.html"
}

// 📊 CARREGAR VENDAS
async function load() {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })

  const tbody = document.getElementById('tbody')
  tbody.innerHTML = ''

  data.forEach(p => {
    const tr = document.createElement('tr')
    tr.className = 'border-b'

    tr.innerHTML = `
      <td class="p-3">${p.email || '-'}</td>
      <td class="p-3">R$ ${(p.amount / 100).toFixed(2)}</td>
      <td class="p-3">${p.status}</td>
    `

    tbody.appendChild(tr)
  })
}

load()
