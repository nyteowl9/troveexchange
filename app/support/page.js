'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'order',    label: 'Order Issue' },
  { value: 'payment',  label: 'Payment / Escrow' },
  { value: 'shipping', label: 'Shipping / Tracking' },
  { value: 'auth',     label: 'Authentication' },
  { value: 'dispute',  label: 'Dispute' },
  { value: 'account',  label: 'Account / Suspension' },
  { value: 'wallet',   label: 'Wallet / USDC' },
  { value: 'other',    label: 'Other' },
]

export default function SupportPage() {
  const [theme, setTheme] = useState('dark')
  const [form, setForm] = useState({ name: '', email: '', orderId: '', category: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.category || !form.subject.trim() || !form.message.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const input = (extra = {}) => ({
    width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)',
    borderRadius: '8px', padding: '11px 14px', fontFamily: 'DM Sans, sans-serif',
    fontSize: '14px', color: 'var(--text-primary)', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s', ...extra,
  })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <Link href="/" style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '20px', height: '20px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
          CHASE HOLLOW
        </Link>
        <button onClick={() => { const n = theme === 'dark' ? 'light' : 'dark'; setTheme(n); document.documentElement.setAttribute('data-theme', n); localStorage.setItem('ch-theme', n) }} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '96px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '38px', fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1.15, marginBottom: '10px' }}>
            Contact <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Support</em>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.65 }}>
            Our team typically responds within a few hours. For urgent order issues, include your order number.
          </div>
        </div>

        {submitted ? (
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid rgba(76,175,124,0.4)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>✓</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', color: 'var(--accent-green)', marginBottom: '8px' }}>Message Received</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '24px' }}>
              We'll reply to <strong style={{ color: 'var(--text-primary)' }}>{form.email}</strong> as soon as possible.
            </div>
            <Link href="/" style={{ display: 'inline-block', padding: '10px 28px', background: 'var(--teal)', color: theme === 'dark' ? '#0A0A0B' : '#fff', borderRadius: '8px', fontWeight: 600, fontSize: '13px', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif' }}>
              Back to Marketplace
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px' }}>Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" style={input()} />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px' }}>Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" style={input()} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px' }}>Category *</label>
                <select value={form.category} onChange={e => set('category', e.target.value)} style={{ ...input(), cursor: 'pointer' }}>
                  <option value="">Select a category...</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px' }}>Order # <span style={{ color: 'var(--border)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input value={form.orderId} onChange={e => set('orderId', e.target.value)} placeholder="Paste order ID if relevant" style={input()} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px' }}>Subject *</label>
              <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Brief summary of your issue" style={input()} maxLength={200} />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px' }}>Message *</label>
              <textarea value={form.message} onChange={e => set('message', e.target.value)} placeholder="Describe your issue in detail. Include any relevant order numbers, tracking numbers, or screenshots." style={{ ...input(), minHeight: '140px', resize: 'vertical', lineHeight: 1.65 }} maxLength={4000} />
              <div style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>{form.message.length}/4000</div>
            </div>

            {error && (
              <div style={{ background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--accent-red)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ background: loading ? 'var(--bg-4)' : 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '13px 28px', fontSize: '14px', fontWeight: 600, borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: loading ? 0.6 : 1, alignSelf: 'flex-start' }}>
              {loading ? 'Sending...' : 'Send Message →'}
            </button>
          </form>
        )}

        {/* Quick answers */}
        {!submitted && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Common Questions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { q: 'How do I get USDC on Base?', a: 'Withdraw USDC from Coinbase directly to Base, or bridge from Ethereum at bridge.base.org.' },
                { q: 'When does my bond return?', a: 'Bonds return within 5–7 business days after a transaction completes.' },
                { q: 'How do I dispute a card?', a: 'Use the Dispute button in your Buyer Dashboard within 72 hours of delivery.' },
                { q: 'How do I appeal a strike?', a: 'Use the Appeal button in your Seller Dashboard within 7 days of the strike.' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{item.q}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.55 }}>{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
