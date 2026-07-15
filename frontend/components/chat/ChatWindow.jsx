'use client'
import { useEffect, useRef } from 'react'
import ChatBubble from './ChatBubble'
import StarterChips from './StarterChips'

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="flex flex-col items-start">
        <span className="text-[10px] text-[var(--text-tertiary)] mb-1 ml-1">HabitatMatch AI</span>
        <div className="flex items-center gap-1 px-4 py-3 bg-[var(--bg-subtle)] rounded-xl rounded-bl-none w-16">
          <span
            className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  )
}

export default function ChatWindow({
  messages = [],
  onSendMessage,
  loading = false,
  placeholder = 'Ask anything about this property…',
  starterQuestions = [],
  compact = false,
}) {
  const endRef    = useRef(null)
  const inputRef  = useRef(null)

  // Auto-scroll to bottom on every new message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const val = e.target.value.trim()
      if (val && !loading) {
        onSendMessage(val)
        e.target.value = ''
        // reset textarea height
        e.target.style.height = 'auto'
      }
    }
  }

  const handleInput = (e) => {
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const handleSendClick = () => {
    const val = inputRef.current?.value?.trim()
    if (val && !loading) {
      onSendMessage(val)
      inputRef.current.value = ''
      inputRef.current.style.height = 'auto'
    }
  }

  const messagesHeight = compact ? 'max-h-[300px]' : 'flex-1'

  return (
    <div className={`flex flex-col ${compact ? '' : 'h-full'}`}>
      {/* Messages area */}
      <div className={`${messagesHeight} overflow-y-auto`}>
        {messages.length === 0 && starterQuestions.length > 0 && !loading ? (
          <StarterChips
            questions={starterQuestions}
            onSelect={(q) => onSendMessage(q)}
          />
        ) : (
          <div className="px-4 py-4 space-y-0">
            {messages.map((msg, i) => (
              <ChatBubble
                key={i}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            ))}
            {loading && <TypingIndicator />}
            <div ref={endRef} />
          </div>
        )}
        {/* Show typing indicator even when starters are visible but loading */}
        {messages.length === 0 && loading && (
          <div className="px-4">
            <TypingIndicator />
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input bar (only shown inside compact/embedded mode) */}
      {compact && (
        <div className="border-t border-[var(--hm-border)] px-3 py-2 flex items-end gap-2 bg-[var(--bg-surface)]">
          <textarea
            ref={inputRef}
            rows={1}
            onKeyDown={handleKey}
            onInput={handleInput}
            placeholder={placeholder}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-[var(--text-primary)]
                       placeholder:text-[var(--text-tertiary)] focus:outline-none leading-5
                       py-1 max-h-[80px] overflow-y-auto"
          />
          <button
            onClick={handleSendClick}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40
                       text-white flex items-center justify-center shrink-0 transition-colors"
          >
            {loading
              ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <span className="text-sm font-bold">↑</span>
            }
          </button>
        </div>
      )}
    </div>
  )
}
