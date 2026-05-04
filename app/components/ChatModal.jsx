'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// Props:
//   orderId      — order-based thread
//   listingId    — pre-sale listing-based thread
//   recipientId  — needed when seller initiates a listing thread reply
//   contextLabel — display label (card name / order id snippet)
//   onClose
export default function ChatModal({ orderId, listingId, recipientId, contextLabel, onClose }) {
  const [messages, setMessages]   = useState([])
  const [myId, setMyId]           = useState(null)
  const [otherName, setOtherName] = useState('')
  const [threadTitle, setThreadTitle] = useState(contextLabel || '')
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [imageFile, setImageFile] = useState(null)   // { file, preview }
  const [imageUploading, setImageUploading] = useState(false)
  const [lightbox, setLightbox]   = useState(null)   // URL of image to show fullscreen
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const fileRef    = useRef(null)

  const apiBase = listingId ? `/api/messages/listing/${listingId}` : `/api/messages/${orderId}`

  const loadMessages = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(apiBase, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      if (!res.ok) throw new Error('Failed to load messages')
      const data = await res.json()
      setMessages(data.messages)
      setMyId(data.myId)
      setOtherName(data.otherUsername)
      if (data.listingTitle && !contextLabel) setThreadTitle(data.listingTitle)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [apiBase, contextLabel])

  useEffect(() => {
    loadMessages()
    inputRef.current?.focus()

    // Realtime subscription
    const channelKey = listingId ? `messages:listing:${listingId}` : `messages:${orderId}`
    const filterExpr = listingId ? `listing_id=eq.${listingId}` : `order_id=eq.${orderId}`
    const channel = supabase
      .channel(channelKey)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: filterExpr,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          const withoutOptimistic = prev.filter(m =>
            !(m.id?.startsWith('temp-') && m.sender_id === payload.new.sender_id &&
              m.body === payload.new.body && m.image_url === payload.new.image_url)
          )
          return [...withoutOptimistic, payload.new]
        })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [orderId, listingId, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleImagePick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setImageFile({ file, preview })
    e.target.value = ''
  }

  const removeImage = () => {
    if (imageFile?.preview) URL.revokeObjectURL(imageFile.preview)
    setImageFile(null)
  }

  async function sendMessage(e) {
    e?.preventDefault()
    if ((!input.trim() && !imageFile) || sending) return
    setSending(true)
    setImageUploading(!!imageFile)
    const body = input.trim()
    setInput('')

    // Upload image first if attached
    let uploadedImageUrl = null
    if (imageFile) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const fd = new FormData()
        fd.append('file', imageFile.file)
        const upRes = await fetch('/api/messages/upload', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: fd,
        })
        const upData = await upRes.json()
        if (!upRes.ok) throw new Error(upData.error || 'Image upload failed')
        uploadedImageUrl = upData.url
      } catch (err) {
        setError(err.message)
        setSending(false)
        setImageUploading(false)
        setInput(body)
        return
      }
      setImageUploading(false)
      removeImage()
    }

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      sender_id: myId,
      body: body || null,
      image_url: uploadedImageUrl,
      created_at: new Date().toISOString(),
      read_at: null,
    }])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const payload = { body: body || null, image_url: uploadedImageUrl }
      if (recipientId) payload.recipient_id = recipientId
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload),
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

  const canSend = (input.trim() || imageFile) && !sending

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: '20px' }}>
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} />
        </div>
      )}

      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>

        <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>
                Message <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>@{otherName || '…'}</em>
              </div>
              {threadTitle && (
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {listingId ? '📋 Pre-sale · ' : '🧾 Order · '}{threadTitle}
                </div>
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
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', color: 'var(--text-muted)', marginBottom: '8px' }}>No messages yet</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {listingId ? 'Ask the seller a question before buying.' : 'Use this to work things out before filing a dispute.'}<br />
                  All messages are private between you and @{otherName}.
                </div>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.sender_id === myId
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '78%', background: isMe ? 'var(--teal-bg)' : 'var(--bg-3)', border: `1.5px solid ${isMe ? 'var(--teal-border)' : 'var(--border)'}`, borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: msg.image_url && !msg.body ? '6px' : '10px 14px', overflow: 'hidden' }}>
                      {msg.image_url && (
                        <img
                          src={msg.image_url}
                          alt="attachment"
                          onClick={() => setLightbox(msg.image_url)}
                          style={{ display: 'block', maxWidth: '100%', maxHeight: '260px', borderRadius: '8px', objectFit: 'cover', cursor: 'zoom-in', marginBottom: msg.body ? '8px' : 0 }}
                        />
                      )}
                      {msg.body && (
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.body}</div>
                      )}
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

          {/* Image preview strip */}
          {imageFile && (
            <div style={{ padding: '8px 16px 0', borderTop: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={imageFile.preview} alt="preview" style={{ height: '56px', width: '56px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid var(--border)' }} />
                <button onClick={removeImage} style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--accent-red)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
              </div>
              {imageUploading && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>Uploading…</span>}
            </div>
          )}

          {/* Input */}
          <form onSubmit={sendMessage} style={{ padding: '12px 16px', borderTop: imageFile ? 'none' : '0.5px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
            {/* Image attach button */}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImagePick} style={{ display: 'none' }} />
            <button type="button" onClick={() => fileRef.current?.click()}
              title="Attach image"
              style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', color: imageFile ? 'var(--teal)' : 'var(--text-muted)', fontSize: '16px', flexShrink: 0, lineHeight: 1 }}>
              📎
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); setError(null) }}
              placeholder="Type a message…"
              maxLength={2000}
              rows={1}
              style={{ flex: 1, background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'none', maxHeight: '120px', overflowY: 'auto', lineHeight: 1.5 }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
            />

            <button type="submit" disabled={!canSend}
              style={{ background: 'var(--teal)', border: 'none', borderRadius: '10px', padding: '10px 18px', fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 600, color: '#fff', cursor: canSend ? 'pointer' : 'not-allowed', opacity: canSend ? 1 : 0.45, flexShrink: 0 }}>
              {sending ? '…' : 'Send'}
            </button>
          </form>

        </div>
      </div>
    </>
  )
}
