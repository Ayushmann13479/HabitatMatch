'use client'
import { Icons } from '@/lib/icons'

function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-5 shadow-sm">
      <div className="skeleton-shimmer h-5 w-40 rounded mb-4" />
      <div className="skeleton-shimmer h-10 w-full rounded-xl mb-3" />
      <div className="flex justify-center mb-4">
        <div className="skeleton-shimmer h-14 w-28 rounded" />
      </div>
      <div className="skeleton-shimmer h-4 w-full rounded mb-2" />
      <div className="skeleton-shimmer h-4 w-5/6 rounded mb-2" />
      <div className="skeleton-shimmer h-4 w-4/6 rounded mb-4" />
      <div className="grid grid-cols-2 gap-2">
        <div className="skeleton-shimmer h-16 rounded-lg" />
        <div className="skeleton-shimmer h-16 rounded-lg" />
      </div>
    </div>
  )
}

function ErrorCard({ message, onRetry }) {
  return (
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3">
      <span className="text-red-500"><Icons.Warning size={28} /></span>
      <p className="text-sm text-red-600 dark:text-red-400">{message || 'Failed to load data.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-semibold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
          Retry
        </button>
      )}
    </div>
  )
}

function getTagStyle(tag) {
  const t = (tag || '').toLowerCase()
  if (t.includes('family'))              return { badge: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300', dot: 'bg-emerald-500' }
  if (t.includes('young') || t.includes('buzz')) return { badge: 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300', dot: 'bg-purple-500' }
  if (t.includes('peaceful') || t.includes('retreat')) return { badge: 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300', dot: 'bg-blue-500' }
  if (t.includes('up') || t.includes('coming'))  return { badge: 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-300', dot: 'bg-orange-500' }
  if (t.includes('avoid'))               return { badge: 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300', dot: 'bg-red-500' }
  return                                         { badge: 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--hm-border)]', dot: 'bg-gray-400' }
}

export default function VibeCard({ data, loading, error, onRetry }) {
  if (loading) return <SkeletonCard />
  if (error)   return <ErrorCard message={error} onRetry={onRetry} />
  if (!data)   return null

  const style = getTagStyle(data.vibe_tag)

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-[var(--hm-primary)]"><Icons.Sparkles size={20} /></span>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Neighbourhood Vibe</h3>
      </div>

      {/* Vibe tag */}
      <div className={`w-full py-2.5 px-4 rounded-xl border font-bold text-center text-sm ${style.badge}`}>
        {data.vibe_tag}
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-1 justify-center">
        <span className="text-5xl font-mono font-bold text-[var(--text-primary)]">
          {typeof data.vibe_score === 'number' ? data.vibe_score.toFixed(1) : data.vibe_score}
        </span>
        <span className="text-lg font-mono text-[var(--text-tertiary)]">/ 10</span>
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed text-center">
        {data.description}
      </p>

      {/* Best for chips */}
      {Array.isArray(data.best_for) && data.best_for.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          <span className="text-xs text-[var(--text-tertiary)] self-center">Best for:</span>
          {data.best_for.map((bf, i) => (
            <span key={i} className="px-2 py-0.5 bg-[var(--bg-subtle)] border border-[var(--hm-border)] text-xs rounded-full text-[var(--text-secondary)]">
              {bf}
            </span>
          ))}
        </div>
      )}

      {/* Pros / Cons */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--hm-border)]">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-2">Pros</h4>
          <ul className="space-y-1.5">
            {(data.pros || []).map((pro, i) => (
              <li key={i} className="text-xs text-[var(--text-secondary)] flex gap-1.5 items-start">
                <span className="shrink-0 mt-0.5 text-emerald-500"><Icons.CircleCheck size={14} /></span>
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-2">Cons</h4>
          <ul className="space-y-1.5">
            {(data.cons || []).map((con, i) => (
              <li key={i} className="text-xs text-[var(--text-secondary)] flex gap-1.5 items-start">
                <span className="shrink-0 mt-0.5 text-red-400"><Icons.CircleX size={14} /></span>
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
