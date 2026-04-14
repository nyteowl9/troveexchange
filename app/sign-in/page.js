'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/context/AuthContext'

export default function SignInPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'confirm'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [street1, setStreet1] = useState('')
  const [street2, setStreet2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, refreshProfile } = useAuth()

  useEffect(() => {
    if (user) router.replace('/')
  }, [user, router])

  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') {
      setError('Email confirmation failed. Please try again.')
    }
  }, [searchParams])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      // Check username isn't taken before signing up
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase().trim())
        .single()

      if (existing) {
        setError('That username is already taken.')
        setLoading(false)
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
      } else if (data.user) {
        // Save username, full name, and address to profile
        await supabase
          .from('users')
          .update({
            username: username.toLowerCase().trim(),
            full_name: fullName.trim(),
            street1: street1.trim(),
            street2: street2.trim() || null,
            city: city.trim(),
            state: state.trim().toUpperCase(),
            zip: zip.trim(),
            country: 'US',
          })
          .eq('id', data.user.id)

        await refreshProfile()
        setMode('confirm')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.replace('/')
      }
    }

    setLoading(false)
  }

  if (mode === 'confirm') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-1)', padding: '2rem' }}>
        <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', background: 'rgba(76,175,124,0.15)', border: '1px solid rgba(76,175,124,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '24px' }}>✓</div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Check your email</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '2rem' }}>
            We sent a confirmation link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Click it to activate your account.
          </p>
          <button onClick={() => setMode('signin')} style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  const inputStyle = { width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '11px', fontFamily: 'DM Mono, monospace', color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: '6px', textTransform: 'uppercase' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-1)', padding: '2rem' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Link href="/" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '24px', height: '24px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
            CHASE HOLLOW
          </Link>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem' }}>

          {/* Tab toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-3)', borderRadius: '10px', padding: '3px', marginBottom: '1.75rem' }}>
            {[['signin', 'Sign In'], ['signup', 'Create Account']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setMode(val); setError('') }}
                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', background: mode === val ? 'var(--bg-2)' : 'transparent', color: mode === val ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: mode === val ? '0 1px 4px rgba(0,0,0,0.3)' : 'none', transition: 'all 0.15s' }}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {mode === 'signup' && (
              <>
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
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Letters, numbers, underscores only</p>
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

                {/* Address section */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                  <p style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>Shipping Address</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={labelStyle}>Street Address</label>
                      <input
                        type="text"
                        value={street1}
                        onChange={e => setStreet1(e.target.value)}
                        required
                        placeholder="123 Main St"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Apt, Suite, Unit <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                      <input
                        type="text"
                        value={street2}
                        onChange={e => setStreet2(e.target.value)}
                        placeholder="Apt 4B"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        required
                        placeholder="New York"
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>State</label>
                        <input
                          type="text"
                          value={state}
                          onChange={e => setState(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2))}
                          required
                          placeholder="NY"
                          maxLength={2}
                          style={{ ...inputStyle, textTransform: 'uppercase' }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>ZIP Code</label>
                        <input
                          type="text"
                          value={zip}
                          onChange={e => setZip(e.target.value.replace(/[^0-9-]/g, '').slice(0, 10))}
                          required
                          placeholder="10001"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                minLength={8}
                style={inputStyle}
              />
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
              {loading ? '...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          By continuing you agree to our{' '}
          <Link href="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
