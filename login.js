import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  "SUA_SUPABASE_URL",
  "SUA_SUPABASE_ANON_KEY"
)

window.login = async () => {
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    document.getElementById('msg').textContent = error.message
    return
  }

  window.location.href = "/admin.html"
}
