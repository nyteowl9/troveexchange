'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  return <Suspense><Onboarding /></Suspense>
}

function Onboarding() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'

  const [username, setUsername]   = useState('')
  const [fullName, setFullName]   = useState('')
  const [street1, setStreet1]     = useState('')
  const [street2, setStreet2]     = useState('')
  const [city, setCity]           = useState('')
  const [state, setState]         = useState('')
  const [zip, setZip]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [checking, setChecking]   = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
    // If user already has a username, they don't need onboarding
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/sign-in'); return }
      const { data: profile } = await supabase
        .from('users')
        .select('username, full_name')
        .eq('id', user.id)
        .single()
      if (profile?.username) {
        router.replace(next)
        return
      }
      // Pre-fill name from Google metadata if available
      if (user.user_metadata?.full_name) setFullName(user.user_metadata.full_name)
      setChecking(false)
    })
  }, [router, next])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/sign-in'); return }

    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username:  username.toLowerCase().trim(),
        full_name: fullName.trim(),
        street1:   street1.trim(),
        street2:   street2.trim() || null,
        city:      city.trim(),
        state:     state.trim().toUpperCase(),
        zip:       zip.trim(),
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      setError(result.error || 'Setup failed. Please try again.')
      setLoading(false)
      return
    }

    router.replace(next)
  }

  const inputStyle = { width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '11px', fontFamily: 'DM Mono, monospace', color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: '6px', textTransform: 'uppercase' }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-1)' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-1)', padding: '2rem' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '24px', height: '24px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
            CHASE HOLLOW
          </Link>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)', marginTop: '1.5rem', marginBottom: '6px' }}>
            Complete your <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>profile</em>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Just a few details and you're in.
          </p>
        </div>

        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div>
              <label style={labelStyle}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                required
                placeholder="yourhandle"
                minLength={3}
                maxLength={20}
                style={inputStyle}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Letters, numbers, underscores only · 3–20 characters</p>
            </div>

            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder="Jane Smith"
                style={inputStyle}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <p style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>Shipping Address</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Street Address</label>
                  <input type="text" value={street1} onChange={e => setStreet1(e.target.value)} required placeholder="123 Main St" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Apt, Suite, Unit <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input type="text" value={street2} onChange={e => setStreet2(e.target.value)} placeholder="Apt 4B" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>City</label>
                  <input type="text" value={city} onChange={e => setCity(e.target.value)} required placeholder="New York" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>State</label>
                    <input type="text" value={state} onChange={e => setState(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2))} required placeholder="NY" maxLength={2} style={{ ...inputStyle, textTransform: 'uppercase' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>ZIP Code</label>
                    <input type="text" value={zip} onChange={e => setZip(e.target.value.replace(/[^0-9-]/g, '').slice(0, 10))} required placeholder="10001" style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--accent-red)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ background: 'var(--gold)', color: '#0A0A0B', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '0.25rem' }}
            >
              {loading ? '...' : 'Finish Setup →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
