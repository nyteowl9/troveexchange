'use client'
import { useState, useRef, useEffect } from 'react'
import { SETS_BY_GAME } from '@/lib/sets'

// Searchable set selector — shows a filtered dropdown from the canonical set list for the
// selected game, but still accepts free text for unlisted sets.
export default function SetCombobox({ game, value, onChange, inputStyle = {} }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const ref = useRef(null)

  const sets = SETS_BY_GAME[game] || []
  const filtered = query.trim()
    ? sets.filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : sets

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(set) {
    setQuery(set)
    onChange(set)
    setOpen(false)
  }

  function handleChange(e) {
    setQuery(e.target.value)
    onChange(e.target.value)
    setOpen(true)
  }

  const hasOptions = filtered.length > 0

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => sets.length > 0 && setOpen(true)}
        placeholder={sets.length ? 'Search or type set name…' : 'e.g. Base Set Shadowless'}
        style={inputStyle}
        autoComplete="off"
      />
      {sets.length > 0 && (
        <div
          style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '10px',
          }}
        >
          ▾
        </div>
      )}
      {open && hasOptions && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-2)', border: '1.5px solid var(--border)',
          borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          maxHeight: '220px', overflowY: 'auto',
        }}>
          {filtered.map(s => (
            <div
              key={s}
              onMouseDown={() => select(s)}
              style={{
                padding: '9px 14px',
                fontSize: '13px',
                fontFamily: 'DM Sans, sans-serif',
                color: s === value ? 'var(--teal)' : 'var(--text-secondary)',
                background: s === value ? 'rgba(13,110,110,0.12)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = s === value ? 'rgba(13,110,110,0.12)' : 'transparent' }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
      {open && !hasOptions && query.trim() && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-2)', border: '1.5px solid var(--border)',
          borderRadius: '8px', padding: '10px 14px',
          fontSize: '12px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-muted)',
        }}>
          No match — your entry will be saved as typed
        </div>
      )}
    </div>
  )
}
