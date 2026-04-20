'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function ChatModal({ orderId, orderLabel, onClose }) {
  const [messages, setMessages]     = useState([])
  const [myId, setMyId]             = useState(null)
  const [otherName, setOtherName]   = useState('')
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const bottomRef                   = useRef(null)
  const inputRef                    = useRef(null)

  useEffect(() => {
    loadMessages()
    inputRef.current?.focus()

    // Supabase Realtime — subscribe to new messages for this order
    const channel = supabase
      .channel(`messages:${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          // Replace optimistic message with real one
          const withoutOptimistic = prev.filter(m =>
            !(m.id?.startsWith('temp-') && m.sender_id === payload.new.sender_id && m.body === payload.new.body)
          )
          return [...withoutOptimistic, payload.new]
        })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [orderId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/messages/${orderId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      if (!res.ok) throw new Error('Failed to load messages')
      const data = await res.json()
      setMessages(data.messages)
      setMyId(data.myId)
      setOtherName(data.otherUsername)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    const body = input.trim()
    setInput('')

    // Optimistic update — show immediately, Realtime replaces with real record
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      order_id: orderId,
      sender_id: myId,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
    }])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/messages/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) {
        const d = await res.json()
        setInput(body)
        setMessages(prev => prev.filter(m => m.id !== tempId))
        setError(d.error || 'Failed to send')
      }
    } catch {
      setInput(body)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setError('Failed to send')
    }
    setSending(false)
    inputRef.current?.focus()
  }

  function formatTime(ts) {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) +
      ' · ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', maxHeight: '80vh', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>
              Message <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>@{otherName}</em>
            </div>
            {orderLabel && (
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Order #{orderId.slice(0, 8).toUpperCase()} · {orderLabel}</div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>Close</button>
        </div>

        {/* Message list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '32px' }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: '32px' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: 'var(--text-muted)', marginBottom: '8px' }}>No messages yet</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>Use this to work things out before filing a dispute.<br />All messages are private between you and @{otherName}.</div>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_id === myId
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '80%', background: isMe ? 'var(--teal-bg)' : 'var(--bg-3)', border: `1.5px solid ${isMe ? 'var(--teal-border)' : 'var(--border)'}`, borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '10px 14px' }}>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.body}</div>
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {formatTime(msg.created_at)}
                    {isMe && msg.read_at && <span style={{ color: 'var(--teal)' }}>✓ Read</span>}
                  </div>
                </div>
              )
            })
          )}
          {error && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-red)', textAlign: 'center' }}>{error}</div>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} style={{ padding: '12px 16px', borderTop: '0.5px solid var(--border)', display: 'flex', gap: '8px', flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); setError(null) }}
            placeholder="Type a message…"
            maxLength={2000}
            style={{ flex: 1, background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
          />
          <button type="submit" disabled={sending || !input.trim()}
            style={{ background: 'var(--teal)', border: 'none', borderRadius: '10px', padding: '10px 18px', fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 600, color: '#fff', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', opacity: sending || !input.trim() ? 0.5 : 1, flexShrink: 0 }}>
            {sending ? '…' : 'Send'}
          </button>
        </form>

      </div>
    </div>
  )
}
