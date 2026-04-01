import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  "https://lrgboocfomodbxottfbn.supabase.co",
  "sb_publishable_SbhOPr5cYcCoaS_iy4KkGg_LSoD5CJF"
)

// 🔐 PROTEÇÃO REAL
const { data: { session } } = await supabase.auth.getSession()

if (!session) {
  window.location.href = "/login.html"
  throw new Error("Not authenticated")
}

// 🚪 LOGOUT
window.logout = async () => {
  await supabase.auth.signOut()
  window.location.href = "/login.html"
}

// 📊 LOAD DATA
async function load() {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })

  const tbody = document.getElementById('tbody')
  tbody.innerHTML = ''

  if (error) {
    tbody.innerHTML = `<tr><td>${error.message}</td></tr>`
    return
  }

  data.forEach(p => {
    const tr = document.createElement('tr')

    tr.innerHTML = `
      <td class="p-3">${p.status}</td>
      <td class="p-3">${p.customer_name || '-'}</td>
      <td class="p-3">${p.email || '-'}</td>
      <td class="p-3">€ ${(p.amount / 100).toFixed(2)}</td>
    `

    tbody.appendChild(tr)
  })
}

load()
