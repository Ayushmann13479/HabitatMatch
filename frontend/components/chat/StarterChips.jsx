'use client'

export default function StarterChips({ onSelect, questions }) {
  if (!questions?.length) return null
  return (
    <div className="px-4 py-4">
      <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-3 font-semibold">
        Suggested questions
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="text-sm text-left border border-[var(--hm-border)] rounded-xl px-4 py-3
                       text-[var(--text-secondary)] hover:border-[var(--hm-primary)]
                       hover:text-[var(--hm-primary)] hover:bg-[var(--bg-subtle)]
                       transition-all duration-150 w-full"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
