'use client'
import { Icons, CATEGORY_ICONS } from '@/lib/icons'

const CATEGORY_LABELS = {
  hospital:        'Hospitals',
  school:          'Schools',
  park:            'Parks',
  gas_station:     'Petrol',
  railway_station: 'Railway',
  pharmacy:        'Pharmacy',
  college:         'College',
  mall:            'Mall',
  atm:             'ATM',
  bank:            'Bank',
}

function SkeletonCard({ tall }) {
  return (
    <div className={`bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-5 shadow-sm ${tall ? 'h-72' : 'h-64'}`}>
      <div className="skeleton-shimmer h-5 w-32 rounded mb-4" />
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-shimmer h-14 rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton-shimmer h-4 rounded" style={{ width: `${85 - i * 10}%` }} />
        ))}
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
        <button
          onClick={onRetry}
          className="text-xs font-semibold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export default function NearbyCard({ data, loading, error, onRetry }) {
  if (loading) return <SkeletonCard />
  if (error)   return <ErrorCard message={error} onRetry={onRetry} />
  if (!data)   return null

  const counts  = data.counts || {}
  const places  = data.places || []
  const closest = places.slice(0, 3)

  const getCountColor = (count) => {
    if (count >= 2) return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    if (count === 1) return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
    return 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[var(--hm-primary)]"><Icons.Pin size={20} /></span>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">What's Nearby</h3>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {Object.entries(CATEGORY_ICONS).map(([key, CatIcon]) => {
          const count = counts[key] ?? 0
          return (
            <div
              key={key}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl border text-center ${getCountColor(count)}`}
            >
              <CatIcon size={18} strokeWidth={1.75} />
              <span className="text-[10px] font-medium leading-tight">{CATEGORY_LABELS[key]}</span>
              <span className="text-sm font-bold">{count}</span>
            </div>
          )
        })}
      </div>

      {/* Closest 3 */}
      {closest.length > 0 && (
        <>
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            Closest
          </p>
          <div className="space-y-1.5">
            {closest.map((p, i) => {
              const CatIcon = CATEGORY_ICONS[p.category] || Icons.Pin
              return (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--hm-border)] last:border-0"
                >
                  <span className="text-[var(--text-primary)] truncate max-w-[70%] flex items-center gap-1.5">
                    <CatIcon size={14} className="shrink-0 text-[var(--text-secondary)]" /> {p.name}
                  </span>
                  <span className="text-[var(--text-secondary)] font-mono text-xs shrink-0 ml-2">
                    {p.distance_metres}m
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
