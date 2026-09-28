(() => {
  const form = document.querySelector('[data-library-entry-form]')
  const input = document.querySelector('#server-address')
  const status = document.querySelector('[data-library-entry-status]')
  if (!form || !input || !status) return

  const saved = localStorage.getItem('beebo-server-address')
  if (saved) input.value = saved

  const fail = (message) => {
    status.textContent = message
    status.dataset.state = 'error'
    input.setAttribute('aria-invalid', 'true')
    input.focus()
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const raw = input.value.trim()
    if (!raw) return fail('Enter the address shown by your Beebo server.')
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    let target
    try { target = new URL(candidate) } catch { return fail('Use a complete server address, such as familyname.beebo.tv or http://192.168.1.50:47811.') }
    if (!['http:', 'https:'].includes(target.protocol) || !target.hostname || target.username || target.password) return fail('Use a normal http or https server address without a username or password.')
    // This is an address picker, not a way to retain invitation/reset links.
    // Keep saved browser state free of query tokens and fragments.
    target.search = ''
    target.hash = ''
    localStorage.setItem('beebo-server-address', target.href)
    status.textContent = 'Opening your server…'
    status.dataset.state = 'ready'
    input.removeAttribute('aria-invalid')
    window.location.assign(target.href)
  })
})()
