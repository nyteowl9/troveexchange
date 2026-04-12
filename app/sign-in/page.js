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
        // Save username + full name to profile
        await supabase
          .from('users')
          .update({
            username: username.toLowerCase().trim(),
            full_name: fullName.trim(),
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
