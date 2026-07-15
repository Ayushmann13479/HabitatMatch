'use client'

function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-5 shadow-sm h-64">
      <div className="skeleton-shimmer h-5 w-28 rounded mb-4" />
      <div className="flex justify-center mb-4">
        <div className="skeleton-shimmer h-10 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="skeleton-shimmer h-16 rounded-lg" />
        <div className="skeleton-shimmer h-16 rounded-lg" />
      </div>
      <div className="skeleton-shimmer h-4 w-full rounded" />
      <div className="skeleton-shimmer h-4 w-3/4 rounded mt-2" />
    </div>
  )
}

function ErrorCard({ message, onRetry }) {
  return (
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3">
      <span className="text-2xl">⚠️</span>
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

const RISK_CONFIG = {
  Low:    { badge: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800', icon: '✅', bar: 'bg-emerald-500' },
  Medium: { badge: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800',   icon: '⚠️',  bar: 'bg-amber-500'   },
  High:   { badge: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800',               icon: '🔴',  bar: 'bg-red-500'     },
}

export default function DisasterCard({ data, loading, error, onRetry }) {
  if (loading) return <SkeletonCard />
  if (error)   return <ErrorCard message={error} onRetry={onRetry} />
  if (!data)   return null

  const config = RISK_CONFIG[data.overall_risk] || RISK_CONFIG.Medium

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🌊</span>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Disaster Risk</h3>
      </div>

      {/* Risk badge */}
      <div className="flex justify-center">
        <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border ${config.badge}`}>
          {config.icon} {data.overall_risk} Risk
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-[var(--bg-subtle)] rounded-xl">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Elevation</p>
          <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">{data.elevation_metres}<span className="text-sm font-normal ml-0.5">m</span></p>
        </div>
        <div className="text-center p-3 bg-[var(--bg-subtle)] rounded-xl">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Coast</p>
          <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">{data.distance_to_coast_km}<span className="text-sm font-normal ml-0.5">km</span></p>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed text-center">
        {data.risk_summary}
      </p>

      {/* Flood zone warning */}
      {data.in_flood_zone && (
        <div className="flex items-center justify-center gap-2 p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-xs font-semibold">
          ⚠️ This location is in a flood risk zone
        </div>
      )}
    </div>
  )
}
