'use client'
import { Suspense, useRef, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ChatBubble from '@/components/chat/ChatBubble'
import StarterChips from '@/components/chat/StarterChips'
import SavedPropertiesPanel from '@/components/saved/SavedPropertiesPanel'
import { Icons } from '@/lib/icons'
import { useChat } from '@/hooks/useChat'

/* ─── Typing indicator ─────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3 px-4">
      <div className="flex flex-col items-start">
        <span className="text-[10px] text-[var(--text-tertiary)] mb-1 ml-1">HabitatMatch AI</span>
        <div className="flex items-center gap-1 px-4 py-3 bg-[var(--bg-subtle)] rounded-xl rounded-bl-none w-16">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Main chat content (needs searchParams) ───────────────────── */
function AskContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  // Active property — can be changed by SavedPropertiesPanel
  const [activeLat,     setActiveLat]     = useState(searchParams.get('lat') || '')
  const [activeLng,     setActiveLng]     = useState(searchParams.get('lng') || '')
  const [activeAddress, setActiveAddress] = useState(searchParams.get('address') || '')
  const [chatKey,       setChatKey]       = useState(0)  // increment to reset useChat

  const sessionIdParam = searchParams.get('session_id')

  const {
    messages,
    loading,
    input,
    setInput,
    handleSend,
    handleStarterClick,
    messagesEndRef,
    starterQuestions,
  } = useChat({
    lat: activeLat,
    lng: activeLng,
    address: activeAddress,
    initialSessionId: chatKey === 0 ? sessionIdParam : null,
    // chatKey forces remount via key prop on parent
  })

  const textareaRef     = useRef(null)
  const messagesAreaRef = useRef(null)

  /* ── Switch property from saved panel ── */
  const handleSavedSelect = useCallback((property) => {
    setActiveLat(String(property.lat))
    setActiveLng(String(property.lng))
    setActiveAddress(property.address)
    setChatKey(k => k + 1) // triggers re-render with new key → fresh chat

    // Update URL without session_id so a fresh session is created on next send
    const params = new URLSearchParams({
      lat:     String(property.lat),
      lng:     String(property.lng),
      address: property.address,
    })
    router.replace(`/ask?${params.toString()}`)
  }, [router])

  /* ── Auto-resize textarea ── */
  const handleInput = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const val = e.target.value.trim()
      if (val && !loading) {
        handleSend(val)
        e.target.value = ''
        e.target.style.height = 'auto'
        setInput('')
      }
    }
  }

  const handleSendClick = () => {
    const val = textareaRef.current?.value?.trim()
    if (val && !loading) {
      handleSend(val)
      textareaRef.current.value = ''
      textareaRef.current.style.height = 'auto'
      setInput('')
    }
  }

  const truncatedAddress = activeAddress.length > 35
    ? activeAddress.slice(0, 35) + '…'
    : activeAddress

  const hasProperty = activeLat && activeLng

  /* ── No property: show prompt ── */
  if (!hasProperty) {
    return (
      <div className="flex gap-6 items-start h-full px-4 md:px-6 py-4">
        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 py-20">
          <span className="text-5xl text-[var(--hm-primary)]"><Icons.AI size={64} strokeWidth={1.5} /></span>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">No property selected</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-xs">
            Pick a saved property from the panel, or go to the Map and analyse a location first.
          </p>
          <Link
            href="/map"
            className="mt-2 px-5 py-2.5 bg-[var(--hm-primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Map →
          </Link>
        </div>
        {/* Still show panel so user can pick a saved location */}
        <SavedPropertiesPanel
          mode="ask"
          onSelect={handleSavedSelect}
        />
      </div>
    )
  }

  return (
    <div className="flex gap-0 lg:gap-4 h-full">

      {/* ── Chat panel ────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-full" key={chatKey}>

        {/* Chat header */}
        <div className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-[var(--hm-border)] bg-[var(--bg-surface)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/score?lat=${activeLat}&lng=${activeLng}&address=${encodeURIComponent(activeAddress)}`}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              title="Back to Score"
            >
              ←
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                Ask HabitatMatch AI
              </h1>
              {activeAddress && (
                <p className="text-xs text-[var(--text-tertiary)] truncate">{truncatedAddress}</p>
              )}
            </div>
          </div>
          <Link
            href={`/score?lat=${activeLat}&lng=${activeLng}&address=${encodeURIComponent(activeAddress)}`}
            className="text-xs text-[var(--hm-primary)] hover:underline shrink-0 ml-2"
          >
            View Score →
          </Link>
        </div>

        {/* Messages area */}
        <div
          ref={messagesAreaRef}
          className="flex-1 overflow-y-auto py-2"
        >
          {messages.length === 0 && !loading ? (
            <StarterChips
              questions={starterQuestions}
              onSelect={handleStarterClick}
            />
          ) : (
            <div className="px-4 pt-2 pb-2">
              {messages.map((msg, i) => (
                <ChatBubble
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />
              ))}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
          {messages.length === 0 && loading && (
            <div className="px-4">
              <TypingIndicator />
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="shrink-0 border-t border-[var(--hm-border)] bg-[var(--bg-surface)] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              onInput={handleInput}
              placeholder="Ask anything about this property…"
              disabled={loading}
              className="flex-1 resize-none bg-[var(--bg-subtle)] border border-[var(--hm-border)] rounded-2xl
                         px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
                         focus:outline-none focus:border-[var(--hm-primary)] transition-colors
                         leading-5 max-h-[120px] overflow-y-auto"
            />
            <button
              onClick={handleSendClick}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40
                         text-white flex items-center justify-center shrink-0 transition-colors"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <span className="text-base font-bold">↑</span>
              }
            </button>
          </div>
        </div>

      </div> {/* end chat panel */}

      {/* ── Desktop: saved properties sidebar ─────────────────── */}
      <div className="hidden lg:block shrink-0 w-[272px] py-3 pr-4">
        <SavedPropertiesPanel
          mode="ask"
          onSelect={handleSavedSelect}
        />
      </div>

    </div>
  )
}

/* ─── Page shell ───────────────────────────────────────────────── */
export default function AskPage() {
  return (
    <div
      style={{ height: 'calc(100dvh - 56px)' }}
      className="flex flex-col bg-[var(--bg-base)] overflow-hidden page-enter"
    >
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <span className="w-6 h-6 border-2 border-[var(--hm-primary)]/30 border-t-[var(--hm-primary)] rounded-full animate-spin" />
          <span className="text-sm text-[var(--text-tertiary)]">Loading chat…</span>
        </div>
      }>
        {/* Mobile: saved panel toggle above chat — rendered inside Suspense */}
        <MobileAskWrapper />
      </Suspense>
    </div>
  )
}

/* ── Wrapper to expose mobile panel above the Suspense content ── */
function MobileAskWrapper() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeLat,     setActiveLat]     = useState(searchParams.get('lat') || '')
  const [activeLng,     setActiveLng]     = useState(searchParams.get('lng') || '')
  const [activeAddress, setActiveAddress] = useState(searchParams.get('address') || '')

  const handleSavedSelect = useCallback((property) => {
    setActiveLat(String(property.lat))
    setActiveLng(String(property.lng))
    setActiveAddress(property.address)
    const params = new URLSearchParams({
      lat:     String(property.lat),
      lng:     String(property.lng),
      address: property.address,
    })
    router.replace(`/ask?${params.toString()}`)
  }, [router])

  return (
    <>
      {/* Mobile: collapsible saved panel above chat */}
      <div className="lg:hidden px-4 pt-3 pb-1 shrink-0">
        <SavedPropertiesPanel
          mode="ask"
          onSelect={handleSavedSelect}
        />
      </div>
      <div className="flex-1 min-h-0">
        <AskContent />
      </div>
    </>
  )
}
