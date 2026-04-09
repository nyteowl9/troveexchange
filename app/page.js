'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('ch-theme', next)
  }

  return (
    <main>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--nav-bg, rgba(10,10,11,0.94))',
        backdropFilter: 'blur(24px)',
        borderBottom: '0.5px solid var(--border)',
        padding: '0 2.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '64px'
      }}>
        <a href="/" style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '20px', fontWeight: 600,
          letterSpacing: '0.1em', color: 'var(--gold)',
          display: 'flex', alignItems: 'center', gap: '10px',
          textDecoration: 'none'
        }}>
          <div style={{
            width: '24px', height: '24px',
            background: 'var(--gold)',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
          }} />
          CHASE HOLLOW
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={toggleTheme} style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: '1.5px solid var(--border)', background: 'transparent',
            cursor: 'pointer', fontSize: '15px',
            color: 'var(--text-secondary)'
          }}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          <button style={{
            background: 'transparent',
            border: '1.5px solid var(--border)',
            color: 'var(--text-secondary)',
            padding: '8px 18px', fontSize: '12px',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            cursor: 'pointer', borderRadius: '8px'
          }}>
            Sign In
          </button>
          <button style={{
            background: 'var(--teal)',
            border: 'none',
            color: theme === 'dark' ? '#0A0A0B' : '#fff',
            padding: '8px 20px', fontSize: '12px',
            fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer', borderRadius: '8px'
          }}>
            List a Card
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: 'auto',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 2rem 48px',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          opacity: 0.28, pointerEvents: 'none'
        }} />

        {/* Glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 55% at 50% 40%, rgba(201,168,76,0.06) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Eyebrow */}
        <div style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: '11px', letterSpacing: '0.2em',
          textTransform: 'uppercase', color: 'var(--gold)',
          marginBottom: '1.2rem',
          display: 'flex', alignItems: 'center', gap: '12px',
          position: 'relative'
        }}>
          <span style={{ width: '28px', height: '0.5px', background: 'var(--gold)', opacity: 0.6, display: 'block' }} />
          Blockchain-Secured TCG Marketplace
          <span style={{ width: '28px', height: '0.5px', background: 'var(--gold)', opacity: 0.6, display: 'block' }} />
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(44px, 7.5vw, 90px)',
          fontWeight: 300, lineHeight: 1.02,
          marginBottom: '1.2rem',
          maxWidth: '860px',
          position: 'relative'
        }}>
          Where <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Rare Cards</em><br />
          Meet Trustless Trade
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '17px', fontWeight: 400,
          color: 'var(--text-secondary)',
          maxWidth: '520px', lineHeight: 1.75,
          marginBottom: '2.2rem',
          position: 'relative'
        }}>
         Every card authenticated. Every USDC in escrow. Every transaction on-chain — no middlemen.
        </p>

        {/* Buttons */}
        <div style={{
          display: 'flex', gap: '12px',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.5rem', position: 'relative'
        }}>
          <button style={{
            background: 'var(--teal)', border: 'none',
            color: theme === 'dark' ? '#0A0A0B' : '#fff',
            padding: '13px 32px', fontSize: '14px', fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer', borderRadius: '10px'
          }}>
            Explore Listings
          </button>
          <button style={{
            background: 'transparent',
            border: '1.5px solid var(--border)',
            color: 'var(--text-secondary)',
            padding: '13px 32px', fontSize: '14px', fontWeight: 500,
            fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer', borderRadius: '10px'
          }}>
            How It Works
          </button>
        </div>

        {/* 3% hook */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          position: 'relative'
        }}>
          <div style={{ height: '0.5px', width: '40px', background: 'var(--border)' }} />
          <div style={{
            background: 'var(--teal-bg)',
            border: '1.5px solid var(--teal-border)',
            borderRadius: '10px', padding: '10px 22px',
            textAlign: 'center', cursor: 'pointer'
          }}>
            <div style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '22px', fontWeight: 600,
              color: 'var(--gold)', lineHeight: 1
            }}>
              Home of the 3% Fee
            </div>
            <div style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '10px', color: 'var(--teal)',
              letterSpacing: '0.1em', marginTop: '3px', fontWeight: 500
            }}>
              SELLERS KEEP MORE · PERIOD
            </div>
          </div>
          <div style={{ height: '0.5px', width: '40px', background: 'var(--border)' }} />
        </div>

      </section>

      {/* TRUST STRIP */}
      <div style={{
        background: 'var(--bg-2)',
        borderTop: '0.5px solid var(--border)',
        borderBottom: '0.5px solid var(--border)',
        padding: '26px 2.5rem'
      }}>
        <div style={{
          maxWidth: '1300px', margin: '0 auto',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '24px'
        }}>
          {[
            { icon: '🔒', title: 'Dual Escrow Protection', sub: 'USDC locked until auto-release' },
            { icon: '✓', title: 'Human Authentication', sub: 'Every card verified by experts' },
            { icon: '→', title: 'Tracked Shipping', sub: 'Dual label, full visibility' },
            { icon: '◎', title: 'On-Chain Reputation', sub: 'Immutable seller & buyer history' },
            { icon: '⬡', title: 'Built on Base', sub: 'Ethereum L2 · pennies per tx' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px', height: '38px',
                border: '1.5px solid var(--teal-border)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', color: 'var(--teal)'
              }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{
        background: 'var(--bg-2)',
        borderTop: '0.5px solid var(--border)',
        padding: '32px 2.5rem',
        textAlign: 'center'
      }}>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '20px', color: 'var(--gold)',
          letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 600
        }}>
          CHASE HOLLOW
        </div>
        <div style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: '11px', color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--accent-green)', display: 'inline-block'
          }} />
          Live on Base · Ethereum L2
        </div>
      </footer>

    </main>
  )
}