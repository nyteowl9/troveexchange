'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Creators() {
  const [theme, setTheme] = useState('dark')
  const [activeTab, setActiveTab] = useState('program')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [refCode, setRefCode] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [form, setForm] = useState({
    name: '', handle: '', platform: '', audience: '',
    contentType: '', channelUrl: '', wallet: '', why: ''
  })

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user ?? null))
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('ch-theme', next)
  }

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async () => {
    if (!currentUser) {
      setSubmitError('You must be logged in to apply. Please sign in and try again.')
      return
    }
    if (!form.name || !form.handle || !form.platform || !form.audience || !form.contentType || !form.channelUrl || !form.wallet) {
      setSubmitError('Please fill in all required fields.')
      return
    }
    setSubmitting(true)
    setSubmitError('')

    const raw = form.handle.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
    const code = raw || 'creator' + Date.now().toString(36)

    const { error } = await supabase.from('creators').insert({
      user_id: currentUser.id,
      handle: form.handle,
      platform: form.platform,
      channel_url: form.channelUrl,
      wallet_address: form.wallet,
      ref_code: code,
      status: 'approved',
      approved_at: new Date().toISOString(),
    })

    setSubmitting(false)
    if (error) {
      setSubmitError(error.code === '23505' ? 'That handle or ref code is already registered.' : 'Something went wrong. Please try again.')
      return
    }
    setRefCode(code)
    setSubmitted(true)
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)',
    borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px', color: 'var(--text-primary)', outline: 'none',
  }

  const Label = ({ text, required }) => (
    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      {text} {required && <span style={{ color: 'var(--accent-red)' }}>*</span>}
    </div>
  )

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '8px 18px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra
  })

  const examples = [
    { label: 'Small Creator', platform: 'YouTube · TikTok · Instagram', audience: '~5k followers', niche: 'Pack openings, reviews, grading tips', earning: '$50–$150/mo' },
    { label: 'Mid-Tier Creator', platform: 'Any platform', audience: '~25k followers', niche: 'Grading, investing, set breakdowns', earning: '$150–$500/mo' },
    { label: 'Large Creator', platform: 'Any platform', audience: '100k+ followers', niche: 'High-value cards, big pulls, finance', earning: '$500–$2,000/mo' },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--nav-bg, rgba(10,10,11,0.94))', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <a href="/" style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ width: '24px', height: '24px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
          CHASE HOLLOW
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={toggleTheme} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '15px', color: 'var(--text-secondary)' }}>{theme === 'dark' ? '🌙' : '☀️'}</button>
          <button style={btn()}>Sign In</button>
          <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Browse Marketplace</button>
        </div>
      </nav>

      <div style={{ paddingTop: '64px' }}>

        {/* HERO */}
        <div style={{ background: 'var(--bg-2)', borderBottom: '0.5px solid var(--border)', padding: '60px 2.5rem' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '14px', fontWeight: 500 }}>Creator Program</div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 300, lineHeight: 1.05, marginBottom: '16px', color: 'var(--text-primary)' }}>
              Get Paid in <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>USDC</em><br />for Every Sale You Drive
            </h1>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto 28px', lineHeight: 1.75 }}>
              Share your unique link. When your audience buys on Chase Hollow, you earn 0.5% of every sale — paid monthly in USDC directly to your wallet. No minimums. No invoices. Just code.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '28px' }}>
              <button onClick={() => setActiveTab('apply')} style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '14px 32px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Apply to Join</button>
              <button onClick={() => setActiveTab('program')} style={btn({ padding: '14px 32px', fontSize: '14px' })}>How It Works</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
              {[
                { val: '0.5%', label: 'Of every referred sale' },
                { val: '30 days', label: 'Cookie attribution window' },
                { val: 'Monthly', label: 'USDC payouts to your wallet' },
                { val: '$50', label: 'Minimum payout threshold' },
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--gold)' }}>{stat.val}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: '2px' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-2)' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2.5rem', display: 'flex', gap: '0' }}>
            {[
              { id: 'program', label: 'How It Works' },
              { id: 'earnings', label: 'Earnings Calculator' },
              { id: 'apply', label: 'Apply Now' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '14px 22px', border: 'none', background: 'transparent', color: activeTab === tab.id ? 'var(--teal)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, letterSpacing: '0.06em', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--teal)' : 'transparent'}` }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 2.5rem 80px' }}>

          {/* HOW IT WORKS */}
          {activeTab === 'program' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }}>
                {[
                  { num: '01', title: 'Apply & Get Instant Access', desc: 'Fill out the application with your channel info and audience details. Once submitted, you\'re instantly approved and get your unique referral link right away.' },
                  { num: '02', title: 'Get Your Link', desc: 'Once approved, you get a unique referral link — chasehollow.com/?ref=YOURNAME — and access to your creator dashboard with real-time stats.' },
                  { num: '03', title: 'Earn on Every Sale', desc: 'Anyone who clicks your link and buys within 30 days earns you 0.5% of the sale. A $10,000 card = $50 USDC to you. Paid monthly, automatically.' },
                ].map((step, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '10px', right: '14px', fontFamily: 'Playfair Display, serif', fontSize: '60px', fontWeight: 300, color: 'var(--border)', lineHeight: 1, userSelect: 'none' }}>{step.num}</div>
                    <div style={{ width: '36px', height: '36px', border: '1.5px solid var(--teal-border)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--teal)', position: 'relative', zIndex: 1 }}>{step.num}</div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 400, marginBottom: '8px', color: 'var(--text-primary)', position: 'relative', zIndex: 1 }}>{step.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65, position: 'relative', zIndex: 1 }}>{step.desc}</div>
                  </div>
                ))}
              </div>

              {/* Rules */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '40px' }}>
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '14px', fontWeight: 500 }}>Attribution Rules</div>
                  {[
                    { title: '30-day cookie window', desc: 'If someone clicks your link and buys within 30 days, you get credit — even if they browse other cards.' },
                    { title: 'Last click wins', desc: 'If a buyer clicks two creator links, the most recent one gets credit.' },
                    { title: 'Self-referral blocked', desc: 'You cannot earn commission on your own purchases. Detected by wallet address.' },
                    { title: 'No credit on refunds', desc: 'If an order results in a buyer refund, commission is not earned on that transaction.' },
                  ].map((rule, i) => (
                    <div key={i} style={{ marginBottom: i < 3 ? '12px' : '0', paddingBottom: i < 3 ? '12px' : '0', borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>{rule.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{rule.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '14px', fontWeight: 500 }}>Payout Details</div>
                  {[
                    { title: 'Monthly USDC payouts', desc: 'Earnings calculated on the 1st of each month. Paid to your wallet by the 7th.' },
                    { title: '$50 minimum threshold', desc: 'If your balance is under $50, it rolls over to the next month.' },
                    { title: 'No invoices needed', desc: 'Payouts are automatic. Your wallet address is all we need.' },
                    { title: 'Full transparency', desc: 'Every payout is a public on-chain transaction. You can verify it on Basescan.' },
                  ].map((rule, i) => (
                    <div key={i} style={{ marginBottom: i < 3 ? '12px' : '0', paddingBottom: i < 3 ? '12px' : '0', borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>{rule.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{rule.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example creators */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '16px' }}>
                  What Creators <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Earn</em>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {examples.map((ex, i) => (
                    <div key={i} style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '18px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', fontWeight: 600, color: 'var(--teal)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{ex.label}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{ex.audience} · {ex.platform}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.4 }}>{ex.niche}</div>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--gold)' }}>{ex.earning}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Illustrative estimate · actual results vary</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => setActiveTab('apply')} style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '14px 36px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                Apply to Join the Program →
              </button>
            </div>
          )}

          {/* EARNINGS CALCULATOR */}
          {activeTab === 'earnings' && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Earnings <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Calculator</em></div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px' }}>Estimate your monthly earnings based on your audience size and content type.</div>

              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '24px', marginBottom: '16px' }}>
                {[
                  { label: 'Monthly link clicks', key: 'clicks', placeholder: 'e.g. 5000', default: 5000 },
                  { label: 'Conversion rate (%)', key: 'cvr', placeholder: 'Typical: 0.5–2%', default: 1 },
                  { label: 'Average order value ($)', key: 'aov', placeholder: 'e.g. 500', default: 500 },
                ].map((field, i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    <Label text={field.label} />
                    <input type="number" placeholder={field.placeholder} defaultValue={field.default} style={inputStyle} />
                  </div>
                ))}
              </div>

              {/* Result */}
              <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '14px', padding: '24px', textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 500 }}>Estimated Monthly Earnings</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '64px', fontWeight: 300, color: 'var(--gold)', lineHeight: 1, marginBottom: '4px' }}>$125</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>5,000 clicks · 1% CVR · $500 avg order · 0.5% commission</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)', marginTop: '8px' }}>= 50 sales × $500 avg × 0.5% = $125 USDC/month</div>
              </div>

              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', fontWeight: 500 }}>High Value Card Scenario</div>
                {[
                  { label: 'Someone buys a $36,000 Charizard PSA 10', val: '$180 USDC' },
                  { label: 'Someone buys a $9,200 Ancestral Recall', val: '$46 USDC' },
                  { label: 'Someone buys a $487 Charizard Holo PSA 9', val: '$2.44 USDC' },
                  { label: '10 purchases averaging $2,000 in a month', val: '$100 USDC' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0', borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--gold)', fontWeight: 500 }}>{row.val}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => setActiveTab('apply')} style={{ width: '100%', background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '14px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                Apply Now →
              </button>
            </div>
          )}

          {/* APPLICATION FORM */}
          {activeTab === 'apply' && !submitted && (
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Creator <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Application</em></div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: 1.6 }}>Fill out the form below and you'll get instant access — your unique referral link is generated immediately on submit.</div>

              {/* Personal info */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 500 }}>Your Info</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <Label text="Full Name" required />
                    <input type="text" placeholder="Your real name" value={form.name} onChange={e => updateForm('name', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <Label text="Creator Handle / Username" required />
                    <input type="text" placeholder="@yourchannel" value={form.handle} onChange={e => updateForm('handle', e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <Label text="Primary Platform" required />
                    <select value={form.platform} onChange={e => updateForm('platform', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="">Select platform...</option>
                      <option>YouTube</option>
                      <option>TikTok</option>
                      <option>Twitter / X</option>
                      <option>Instagram</option>
                      <option>Twitch</option>
                      <option>Podcast</option>
                      <option>Newsletter / Blog</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <Label text="Audience Size" required />
                    <select value={form.audience} onChange={e => updateForm('audience', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="">Select range...</option>
                      <option>Under 1,000</option>
                      <option>1,000 – 5,000</option>
                      <option>5,000 – 25,000</option>
                      <option>25,000 – 100,000</option>
                      <option>100,000 – 500,000</option>
                      <option>500,000+</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Content info */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 500 }}>Your Content</div>
                <div style={{ marginBottom: '12px' }}>
                  <Label text="Content Type / Niche" required />
                  <select value={form.contentType} onChange={e => updateForm('contentType', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Select type...</option>
                    <option>Pokémon TCG — openings & collecting</option>
                    <option>Magic: The Gathering — gameplay & finance</option>
                    <option>One Piece TCG</option>
                    <option>Sports cards & grading</option>
                    <option>Card grading & PSA/BGS analysis</option>
                    <option>Card investing & market analysis</option>
                    <option>General TCG / multi-game</option>
                    <option>Other collectibles</option>
                  </select>
                </div>
                <div>
                  <Label text="Channel / Profile URL" required />
                  <input type="url" placeholder="https://youtube.com/c/yourchannel" value={form.channelUrl} onChange={e => updateForm('channelUrl', e.target.value)} style={inputStyle} />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>Link to your main channel, profile, or website. We'll review your content before approving.</div>
                </div>
              </div>

              {/* Wallet */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 500 }}>USDC Payout Wallet</div>
                <div>
                  <Label text="Base Network Wallet Address" required />
                  <input type="text" placeholder="0x... (Base network only)" value={form.wallet} onChange={e => updateForm('wallet', e.target.value)} style={{ ...inputStyle, fontFamily: 'DM Mono, monospace', fontSize: '12px' }} />
                  <div style={{ background: 'rgba(232,168,56,0.08)', border: '1px solid rgba(232,168,56,0.25)', borderRadius: '8px', padding: '10px 12px', marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    ⚠ Payouts are sent in USDC on the <strong style={{ color: 'var(--accent-amber)' }}>Base network</strong>. Make sure your wallet supports Base. MetaMask, Phantom, and most EVM wallets work. Need help? <a href="/#wallets" style={{ color: 'var(--teal)', textDecoration: 'none' }}>See our Base guide →</a>
                  </div>
                </div>
              </div>

              {/* Why */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 500 }}>Tell Us More</div>
                <div>
                  <Label text="Why do you want to partner with Chase Hollow?" required />
                  <textarea value={form.why} onChange={e => updateForm('why', e.target.value)} placeholder="Tell us about your audience, the kind of content you make, why Chase Hollow is a good fit, and any other relevant info. The more detail the better." style={{ ...inputStyle, resize: 'vertical', minHeight: '100px', lineHeight: 1.65 }} />
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                By applying you agree to Chase Hollow's creator terms. We reserve the right to revoke creator status if terms are violated (spam, fake traffic, self-referral abuse).
              </div>

              {submitError && (
                <div style={{ background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.35)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#C84B3C', marginBottom: '14px' }}>
                  {submitError}
                </div>
              )}

              <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', background: submitting ? 'var(--border)' : 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '16px', fontSize: '15px', fontWeight: 700, borderRadius: '10px', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {submitting ? 'Setting up your account...' : 'Submit Application →'}
              </button>
            </div>
          )}

          {/* SUCCESS STATE */}
          {activeTab === 'apply' && submitted && (
            <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(76,175,124,0.12)', border: '2px solid rgba(76,175,124,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 20px' }}>✓</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '40px', fontWeight: 300, marginBottom: '10px', color: 'var(--text-primary)' }}>You're <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Approved</em></div>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: '28px' }}>
                Welcome to the Chase Hollow Creator Program. Your referral link is live — start sharing and earn 0.5% USDC on every sale you drive.
              </p>

              {/* Ref link */}
              <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'left' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', fontWeight: 500 }}>Your Referral Link</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '14px', color: 'var(--text-primary)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', wordBreak: 'break-all' }}>
                  https://chasehollow.com/?ref={refCode}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Share this link anywhere. 30-day cookie window — you earn on any purchase made within 30 days of a click.</div>
              </div>

              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '24px', textAlign: 'left' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontWeight: 500 }}>Next Steps</div>
                {['Visit your creator dashboard to see clicks, conversions, and earnings', 'Share your link in videos, posts, and your bio', 'Earnings are calculated on the 1st — paid to your wallet by the 7th', '$50 minimum threshold to receive payout (balance rolls over if under)'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: i < 3 ? '8px' : '0' }}>
                    <span style={{ color: 'var(--teal)', flexShrink: 0 }}>→</span>{step}
                  </div>
                ))}
              </div>
              <a href="/creator-dashboard" style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '13px 28px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textDecoration: 'none', display: 'inline-block' }}>Go to Creator Dashboard →</a>
            </div>
          )}

        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ background: 'var(--bg-2)', borderTop: '0.5px solid var(--border)', padding: '32px 2.5rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--gold)', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 600 }}>CHASE HOLLOW</div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>© 2025 Chase Hollow · chasehollow.com</div>
      </footer>

    </div>
  )
}