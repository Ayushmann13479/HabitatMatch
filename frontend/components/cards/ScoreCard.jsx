'use client'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts'

function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div className="skeleton-shimmer h-6 w-32 rounded" />
        <div className="skeleton-shimmer h-10 w-28 rounded-xl" />
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="skeleton-shimmer h-64 w-full md:w-1/2 rounded-xl" />
        <div className="w-full md:w-1/2 flex flex-col gap-3 justify-center">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex justify-between">
                <div className="skeleton-shimmer h-4 w-24 rounded" />
                <div className="skeleton-shimmer h-4 w-10 rounded" />
              </div>
              <div className="skeleton-shimmer h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 pt-4 border-t border-[var(--hm-border)]">
        <div className="skeleton-shimmer h-4 w-full rounded mb-2" />
        <div className="skeleton-shimmer h-4 w-3/4 rounded" />
      </div>
    </div>
  )
}

function ErrorCard({ message, onRetry }) {
  return (
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3">
      <span className="text-2xl">⚠️</span>
      <p className="text-sm text-red-600 dark:text-red-400">{message || 'Failed to load score.'}</p>
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

function getGradeConfig(score) {
  if (score >= 70) return {
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    stroke: '#16A34A',
    fill: 'rgba(22, 163, 74, 0.15)',
  }
  if (score >= 50) return {
    bg: 'bg-amber-100 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    bar: 'bg-amber-500',
    stroke: '#D97706',
    fill: 'rgba(217, 119, 6, 0.15)',
  }
  return {
    bg: 'bg-red-100 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-400',
    bar: 'bg-red-500',
    stroke: '#DC2626',
    fill: 'rgba(220, 38, 38, 0.15)',
  }
}

export default function ScoreCard({ data, loading, error, onRetry }) {
  if (loading) return <SkeletonCard />
  if (error)   return <ErrorCard message={error} onRetry={onRetry} />
  if (!data)   return null

  const config = getGradeConfig(data.total_score)

  const dims = data.dimensions || {}
  const chartData = [
    { subject: 'Safety',       A: dims.safety?.score       ?? 0, fullMark: dims.safety?.max       ?? 20 },
    { subject: 'Connectivity', A: dims.connectivity?.score ?? 0, fullMark: dims.connectivity?.max ?? 20 },
    { subject: 'Amenities',    A: dims.amenities?.score    ?? 0, fullMark: dims.amenities?.max    ?? 20 },
    { subject: 'Air Quality',  A: dims.air_quality?.score  ?? 0, fullMark: dims.air_quality?.max  ?? 20 },
    { subject: 'Vibe',         A: dims.vibe?.score         ?? 0, fullMark: dims.vibe?.max         ?? 10 },
    { subject: 'Green Cover',  A: dims.green_cover?.score  ?? 0, fullMark: dims.green_cover?.max  ?? 10 },
  ]

  const dimensionList = [
    { name: 'Safety',       ...dims.safety       },
    { name: 'Connectivity', ...dims.connectivity },
    { name: 'Amenities',    ...dims.amenities    },
    { name: 'Air Quality',  ...dims.air_quality  },
    { name: 'Vibe',         ...dims.vibe         },
    { name: 'Green Cover',  ...dims.green_cover  },
  ]

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">HabitatScore</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-4xl font-mono font-bold text-[var(--text-primary)]">
            {data.total_score}
          </span>
          <span className={`px-3 py-1.5 rounded-xl font-bold text-base border ${config.bg} ${config.text}`}>
            {data.grade}
          </span>
        </div>
      </div>

      {/* Body: radar chart + dimension bars */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Radar */}
        <div className="w-full md:w-1/2 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              <PolarGrid stroke="var(--hm-border)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }}
              />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar
                name="Score"
                dataKey="A"
                stroke={config.stroke}
                fill={config.fill}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Dimension bars */}
        <div className="w-full md:w-1/2 flex flex-col justify-center gap-3">
          {dimensionList.map((dim, i) => {
            const pct = dim.max ? Math.round((dim.score / dim.max) * 100) : 0
            return (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{dim.name}</span>
                  <span className="font-mono text-xs text-[var(--text-secondary)]">
                    {dim.score ?? 0}/{dim.max ?? 20}
                  </span>
                </div>
                <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-700 ${config.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Verdict */}
      {data.verdict && (
        <div className="mt-5 pt-4 border-t border-[var(--hm-border)]">
          <p className="text-sm italic text-[var(--text-secondary)] text-center leading-relaxed">
            &ldquo;{data.verdict}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}
