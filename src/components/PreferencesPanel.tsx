'use client'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { getCsrfToken, useSession } from 'next-auth/react'
import { normalizePreferences, type InterfacePreferences } from '@users-au/client'

export function PreferencesPanel({ initial }: { initial: InterfacePreferences | null }) {
  const [confirmed, setConfirmed] = useState(initial)
  const current = useRef(initial)
  const [savingRun, setSavingRun] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const epoch = useRef(0)
  const { data: session, status } = useSession()
  const subject = session?.user.usersauId ?? (status === 'loading' ? initial?.sub : undefined)
  const saving = savingRun !== null
  const visible = confirmed?.sub === subject ? confirmed : null

  const apply = useCallback((value: InterfacePreferences) => {
    if (current.current && (value.sub !== current.current.sub || value.version < current.current.version)) return
    current.current = value
    setConfirmed(value)
    const root = document.documentElement
    root.dataset.theme = value.theme
    root.classList.toggle('dark', value.theme === 'dark' || (value.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
    root.lang = value.locale || 'en'
  }, [])

  useEffect(() => {
    if (!subject) { current.current = null; return }
    const run = ++epoch.current
    current.current = initial?.sub === subject ? initial : null
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const system = () => { if (current.current) apply(current.current) }
    let reading = false
    const refresh = async () => {
      if (reading) return
      reading = true
      try {
        const response = await fetch('/api/account/preferences', { cache: 'no-store' })
        const value = await response.json()
        if (response.ok && run === epoch.current && value.sub === subject) apply(normalizePreferences(value, subject))
      } catch { /* Retain confirmed values during background failures. */ }
      finally { reading = false }
    }
    void refresh()
    window.addEventListener('focus', refresh)
    media.addEventListener('change', system)
    return () => { epoch.current = run + 1; window.removeEventListener('focus', refresh); media.removeEventListener('change', system) }
  }, [subject, initial, apply])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!current.current || !subject || saving) return
    const run = epoch.current
    const values = new FormData(event.currentTarget)
    const changes: Record<string, string | number> = { expected_version: current.current.version }
    for (const key of ['locale', 'timezone', 'theme'] as const) {
      const value = String(values.get(key) ?? '')
      if (value !== current.current[key]) changes[key] = value
    }
    setSavingRun(run); setMessage('')
    try {
      const csrf = await getCsrfToken()
      const response = await fetch('/api/account/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf ?? '' }, body: JSON.stringify(changes) })
      const value = await response.json()
      if (run !== epoch.current) return
      if (response.ok && value.sub === subject) { apply(normalizePreferences(value, subject)); setMessage('Preferences saved.') }
      else {
        if (response.status === 409 && value.preferences?.sub === subject) apply(normalizePreferences(value.preferences, subject))
        setMessage([401, 403].includes(response.status) ? 'Sign in again to save account preferences.' : response.status === 409 ? 'Your settings changed elsewhere. Review them and try again.' : 'Unable to save preferences. Try again.')
      }
    } catch { if (run === epoch.current) setMessage('Unable to save preferences. Try again.') }
    finally { setSavingRun(current => current === run ? null : current) }
  }

  return <section className="mt-6 rounded-xl bg-white p-8 shadow-sm dark:bg-gray-900" aria-labelledby="preferences-heading">
    <h2 id="preferences-heading" className="mb-4 text-lg font-semibold">Account preferences</h2>
    {message ? <p role="status" className="mb-3">{message}</p> : null}
    {visible ? <form key={`${visible.sub}:${visible.version}`} onSubmit={save} className="grid gap-4">
      <label>Language tag<input name="locale" required defaultValue={visible.locale || 'en'} className="block w-full rounded border p-2 dark:bg-gray-800" /></label>
      <label>Timezone<input name="timezone" required defaultValue={visible.timezone || 'UTC'} className="block w-full rounded border p-2 dark:bg-gray-800" /></label>
      <label>Theme<select name="theme" defaultValue={visible.theme} className="block w-full rounded border p-2 dark:bg-gray-800"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <button disabled={saving} className="w-fit rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save preferences'}</button>
    </form> : <p>Account preferences are unavailable. Sign in again or try later.</p>}
  </section>
}
