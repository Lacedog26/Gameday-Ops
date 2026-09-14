import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseConfig'
import { useOrg } from '../../context/OrgProvider'
import { siteUrl } from '../../product'
import { Section, TextInput, Button, IconButton } from './ui'

interface DisplayRow {
  id: string
  name: string
  location: string | null
  token: string
}

/**
 * Manage the org's TV displays (C7). Each display has a long, non-guessable
 * token; its kiosk URL is `<site>/#/display/<token>`. Opening that URL on a TV
 * shows THIS org's live board read-only, with no login — and the token grants
 * access to nothing else. Deleting a display permanently revokes its URL.
 *
 * Backed by the org-scoped `displays` table (RLS: members only), so tokens are
 * never exposed to other organizations.
 */
export default function DisplaysSection() {
  const { org } = useOrg()
  const [rows, setRows] = useState<DisplayRow[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase || !org) return
    setLoading(true)
    const { data, error } = await supabase
      .from('displays')
      .select('id,name,location,token')
      .eq('org_id', org.id)
      .order('created_at', { ascending: true })
    if (error) setMsg(error.message)
    else setRows((data as DisplayRow[]) ?? [])
    setLoading(false)
  }, [org])

  useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    if (!supabase || !org) return
    setMsg(null)
    const { error } = await supabase
      .from('displays')
      .insert({ org_id: org.id, name: name.trim() || `Display ${rows.length + 1}` })
    if (error) setMsg(error.message)
    else {
      setName('')
      await load()
    }
  }

  const remove = async (id: string, label: string) => {
    if (!supabase) return
    if (!confirm(`Revoke "${label}"? Its TV link will stop working.`)) return
    const { error } = await supabase.from('displays').delete().eq('id', id)
    if (error) setMsg(error.message)
    else await load()
  }

  const urlFor = (token: string) => `${siteUrl()}/#/display/${token}`
  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(urlFor(token))
      setCopied(token)
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 2000)
    } catch {
      setMsg('Copy failed — select the URL and copy manually.')
    }
  }

  if (!supabase || !org) {
    return (
      <Section title="TV Displays" subtitle="Secure per-TV kiosk links" accent="blue">
        <p className="text-sm text-slate-400">Sign in to manage your TV displays.</p>
      </Section>
    )
  }

  return (
    <Section title="TV Displays" subtitle="One secure, no-login kiosk link per TV" accent="blue">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name (e.g. Weight Room TV)"
          className="w-64 py-1.5"
        />
        <Button onClick={add}>+ Add Display</Button>
        {loading && <span className="text-xs text-slate-500">Loading…</span>}
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((d) => (
          <div key={d.id} className="grid items-center gap-2 rounded-xl border border-white/10 bg-navy-950/50 p-2 sm:grid-cols-[1fr_2fr_auto]">
            <div className="font-semibold">{d.name}</div>
            <code className="truncate rounded bg-black/30 px-2 py-1 text-xs text-sky-300" title={urlFor(d.token)}>
              {urlFor(d.token)}
            </code>
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" onClick={() => copy(d.token)}>
                {copied === d.token ? 'Copied ✓' : 'Copy URL'}
              </Button>
              <IconButton title="Revoke display" onClick={() => remove(d.id, d.name)}>🗑</IconButton>
            </div>
          </div>
        ))}
        {rows.length === 0 && !loading && (
          <p className="py-4 text-center text-sm text-slate-500">
            No displays yet. Add one, then open its URL on the TV and press <b>F</b> for fullscreen.
          </p>
        )}
      </div>

      {msg && (
        <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">{msg}</p>
      )}
    </Section>
  )
}
