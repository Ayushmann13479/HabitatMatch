'use client'
import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  RadarChart, Radar, PolarGrid,
  PolarAngleAxis, ResponsiveContainer, Tooltip
} from 'recharts'
import { getScore } from '@/lib/api'
import Link from 'next/link'

const DIMENSIONS = [
  { key: 'safety',       label: 'Safety',       emoji: '🛡️', max: 20 },
  { key: 'connectivity', label: 'Connectivity',  emoji: '🚇', max: 20 },
  { key: 'amenities',    label: 'Amenities',     emoji: '🏥', max: 20 },
  { key: 'air_quality',  label: 'Air Quality',   emoji: '🌬️', max: 20 },
  { key: 'vibe',         label: 'Vibe',          emoji: '✨', max: 10 },
  { key: 'green_cover',  label: 'Green Cover',   emoji: '🌳', max: 10 },
]

function scoreColor(total) {
  if (total >= 70) return '#16A34A'
  if (total >= 50) return '#D97706'
  return '#DC2626'
}

function GradeTag({ grade }) {
  const colors = {
    'A+': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'A':  'bg-emerald-100 text-emerald-700 border-emerald-200',
    'B+': 'bg-blue-100 text-blue-700 border-blue-200',
    'B':  'bg-blue-100 text-blue-700 border-blue-200',
    'C':  'bg-amber-100 text-amber-700 border-amber-200',
    'D':  'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${colors[grade] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {grade}
    </span>
  )
}

function ScoreContent() {
  const searchParams = useSearchParams()
  const { getToken }  = useAuth()
  const router        = useRouter()

  const lat     = searchParams.get('lat')
  const lng     = searchParams.get('lng')
  const address = searchParams.get('address')

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!lat || !lng || !address) return
    setLoading(true)
    setError(null)
    getToken().then(token =>
      getScore(parseFloat(lat), parseFloat(lng), address, token)
        .then(res => setData(res.data.data))
        .catch(err => setError(err.message || 'Failed to load score'))
        .finally(() => setLoading(false))
    )
  }, [lat, lng, address])

  /* ── Empty state ── */
  if (!lat || !lng || !address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <span className="text-5xl">🏡</span>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">No property selected yet.</h2>
        <p className="text-[var(--text-secondary)]">Analyse a location on the Map first, then the score will appear here.</p>
        <Link
          href="/map"
          className="mt-2 px-5 py-2.5 bg-[var(--hm-primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Go to Map →
        </Link>
      </div>
    )
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="px-4 md:px-8 py-8 max-w-4xl mx-auto w-full space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-shimmer h-32 rounded-2xl" />
        ))}
      </div>
    )
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <span className="text-4xl">⚠️</span>
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <Link href="/map" className="text-sm text-[var(--hm-primary)] hover:underline">← Back to Map</Link>
      </div>
    )
  }

  if (!data) return null

  const dims     = data.dimensions || {}
  const total    = data.total ?? 0
  const grade    = data.grade ?? 'C'
  const verdict  = data.verdict ?? ''

  const radarData = DIMENSIONS.map(d => ({
    dimension: d.label,
    score: dims[d.key]?.score ?? 0,
    max:   d.max,
  }))

  const askUrl = `/ask?lat=${lat}&lng=${lng}&address=${encodeURIComponent(address)}`

  return (
    <div className="px-4 md:px-8 py-8 max-w-4xl mx-auto w-full space-y-6 page-enter">

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors -mb-2"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">HabitatScore</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5 max-w-md">{address}</p>

        </div>
        <Link
          href={askUrl}
          className="text-sm font-semibold text-[var(--hm-primary)] hover:underline shrink-0"
        >
          Ask AI →
        </Link>
      </div>

      {/* Score display */}
      <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-end gap-4 flex-wrap">
          <span
            className="font-mono font-bold leading-none"
            style={{ fontSize: 80, color: scoreColor(total) }}
          >
            {total}
          </span>
          <div className="flex flex-col gap-2 pb-2">
            <GradeTag grade={grade} />
            <span className="text-sm text-[var(--text-tertiary)]">out of 100</span>
          </div>
        </div>
        {verdict && (
          <p className="mt-4 text-sm italic text-[var(--text-secondary)] leading-relaxed border-t border-[var(--hm-border)] pt-4">
            {verdict}
          </p>
        )}
      </div>

      {/* Radar chart */}
      <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Score Breakdown
        </h2>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData} outerRadius="75%">
            <PolarGrid stroke="var(--hm-border)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            <Radar
              dataKey="score"
              stroke="var(--hm-primary)"
              fill="var(--hm-primary)"
              fillOpacity={0.15}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--hm-border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value, name, props) => [
                `${value} / ${props.payload.max}`,
                props.payload.dimension
              ]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Dimension cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {DIMENSIONS.map(d => {
          const score = dims[d.key]?.score ?? 0
          const pct   = d.max > 0 ? (score / d.max) * 100 : 0
          return (
            <div
              key={d.key}
              className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {d.emoji} {d.label}
                </span>
                <span className="text-sm font-mono font-bold text-[var(--text-primary)]">
                  {score} / {d.max}
                </span>
              </div>
              <div className="h-1.5 bg-[var(--bg-subtle)] rounded-full mt-2">
                <div
                  className="h-1.5 rounded-full bg-[var(--hm-primary)] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Link to compare */}
      <div className="text-center">
        <Link
          href="/compare"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--hm-primary)] transition-colors"
        >
          ⚖️ Compare with another location →
        </Link>
      </div>
    </div>
  )
}

export default function ScorePage() {
  return (
    <Suspense fallback={
      <div className="px-4 py-8 max-w-4xl mx-auto space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton-shimmer h-32 rounded-2xl" />
        ))}
      </div>
    }>
      <ScoreContent />
    </Suspense>
  )
}
