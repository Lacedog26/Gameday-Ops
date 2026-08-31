import { useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import type { Quote } from '../../types'
import { Section, TextInput, Select, Button, IconButton } from './ui'

/**
 * Add / edit / enable / reorder text motivational quotes. Quotes rotate in the
 * Bills Culture panel alongside the uploaded graphics.
 */
export default function QuotesSection() {
  const { state, actions } = useDashboard()
  const quotes = [...state.quotes].sort((a, b) => a.order - b.order)
  const [draft, setDraft] = useState('')

  const add = () => {
    const text = draft.trim()
    if (!text) return
    actions.addQuote({ text: text.toUpperCase(), enabled: true, order: state.quotes.length, accent: 'royal' })
    setDraft('')
  }

  return (
    <Section
      title="Motivational Quotes"
      subtitle="Type your own quotes — they rotate in the culture panel with the graphics"
      accent="red"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <TextInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder='e.g. "PUT THE BALL DOWN."'
          className="flex-1"
        />
        <Button onClick={add}>+ Add Quote</Button>
      </div>

      <div className="flex flex-col gap-2">
        {quotes.map((q, i) => (
          <QuoteRow
            key={q.id}
            quote={q}
            isFirst={i === 0}
            isLast={i === quotes.length - 1}
            onChange={(patch) => actions.updateQuote(q.id, patch)}
            onDelete={() => actions.deleteQuote(q.id)}
            onUp={() => actions.reorderQuotes(i, i - 1)}
            onDown={() => actions.reorderQuotes(i, i + 1)}
          />
        ))}
        {quotes.length === 0 && (
          <p className="py-4 text-center text-slate-500">No quotes yet — add one above.</p>
        )}
      </div>
    </Section>
  )
}

function QuoteRow({
  quote,
  isFirst,
  isLast,
  onChange,
  onDelete,
  onUp,
  onDown,
}: {
  quote: Quote
  isFirst: boolean
  isLast: boolean
  onChange: (patch: Partial<Quote>) => void
  onDelete: () => void
  onUp: () => void
  onDown: () => void
}) {
  return (
    <div
      className={`grid items-center gap-2 rounded-xl border p-2 sm:grid-cols-[1fr_130px_120px_auto] ${
        quote.enabled ? 'border-white/10 bg-navy-950/50' : 'border-white/5 bg-navy-950/30 opacity-60'
      }`}
    >
      <TextInput
        value={quote.text}
        onChange={(e) => onChange({ text: e.target.value })}
        className="py-1.5 font-semibold uppercase"
      />

      <TextInput
        value={quote.author ?? ''}
        onChange={(e) => onChange({ author: e.target.value })}
        placeholder="attribution"
        className="py-1.5 text-sm"
      />

      <Select
        value={quote.accent ?? 'white'}
        onChange={(e) => onChange({ accent: e.target.value as Quote['accent'] })}
        className="py-1.5 text-sm"
      >
        <option value="royal">Blue</option>
        <option value="red">Red</option>
        <option value="white">White</option>
      </Select>

      <div className="flex items-center justify-end gap-1">
        <IconButton title="Move up" disabled={isFirst} onClick={onUp}>
          ↑
        </IconButton>
        <IconButton title="Move down" disabled={isLast} onClick={onDown}>
          ↓
        </IconButton>
        <button
          onClick={() => onChange({ enabled: !quote.enabled })}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            quote.enabled ? 'bg-emerald-600 text-white' : 'bg-white/10 text-slate-300'
          }`}
        >
          {quote.enabled ? 'ON' : 'OFF'}
        </button>
        <IconButton
          title="Delete quote"
          onClick={() => {
            if (confirm('Delete this quote?')) onDelete()
          }}
        >
          🗑
        </IconButton>
      </div>
    </div>
  )
}
