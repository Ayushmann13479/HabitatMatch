'use client'

function formatTime(ts) {
  if (!ts) return ''
  const d = ts instanceof Date ? ts : new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatBubble({ role, content, timestamp }) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>

        {/* "HabitatMatch AI" label above AI bubbles */}
        {!isUser && (
          <span className="text-[10px] text-[var(--text-tertiary)] mb-1 ml-1">
            HabitatMatch AI
          </span>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-[var(--hm-primary)] text-white rounded-xl rounded-br-none max-w-[75%]'
              : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] rounded-xl rounded-bl-none'
          }`}
        >
          {content}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="text-[10px] text-[var(--text-tertiary)] mt-1 mx-1">
            {formatTime(timestamp)}
          </span>
        )}
      </div>
    </div>
  )
}
