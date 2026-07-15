'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSavedProperties, deleteSavedProperty } from '@/lib/api'

/* ── Grade colour helper ─────────────────────────────────────────────────── */
function gradeConfig(score) {
  if (score >= 70) return { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500' }
  if (score >= 50) return { bg: 'bg-amber-100 dark:bg-amber-950/40',    text: 'text-amber-700 dark:text-amber-400',    bar: 'bg-amber-500'   }
  return           { bg: 'bg-red-100 dark:bg-red-950/40',               text: 'text-red-700 dark:text-red-400',         bar: 'bg-red-500'     }
}

/* ── Mini dimension bar row ──────────────────────────────────────────────── */
function DimensionRow({ snapshot }) {
  if (!snapshot?.dimensions) return null
  const dims = snapshot.dimensions
  const items = [
    { label: 'Safety',    ...dims.safety       },
    { label: 'Connect.',  ...dims.connectivity },
    { label: 'Amenity',   ...dims.amenities    },
    { label: 'Air',       ...dims.air_quality  },
    { label: 'Vibe',      ...dims.vibe         },
    { label: 'Green',     ...dims.green_cover  },
  ]
  const score = snapshot.total_score ?? 0
  const cfg = gradeConfig(score)
  return (
    <div className="grid grid-cols-6 gap-1.5 mt-3">
      {items.map((d, i) => {
        const pct = d.max ? Math.round((d.score / d.max) * 100) : 0
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-full bg-[var(--bg-subtle)] rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${cfg.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[9px] text-[var(--text-tertiary)] font-medium leading-none">{d.label}</span>
            <span className="text-[9px] font-mono text-[var(--text-secondary)]">{d.score ?? 0}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Saved property card ─────────────────────────────────────────────────── */
function SavedCard({ property, onDelete }) {
  const { address, lat, lng, score_snapshot, saved_at, id } = property
  const [deleting, setDeleting] = useState(false)

  const score  = score_snapshot?.total_score ?? score_snapshot?.total ?? null
  const grade  = score_snapshot?.grade ?? null
  const cfg    = score !== null ? gradeConfig(score) : null

  const savedDate = new Date(saved_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })

  const mapUrl = `/map?lat=${lat}&lng=${lng}&address=${encodeURIComponent(address)}&autoload=true`
  const askUrl = `/ask?lat=${lat}&lng=${lng}&address=${encodeURIComponent(address)}`

  const handleDelete = async () => {
    if (!window.confirm(`Remove "${address.slice(0, 60)}…" from saved properties?`)) return
    setDeleting(true)
    try {
      await onDelete(id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">

      {/* Top row: address + delete */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-snug">
            {address}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Saved {savedDate}</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Remove from saved"
          className="shrink-0 p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-40"
        >
          {deleting
            ? <span className="block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            : <span className="text-base">🗑️</span>
          }
        </button>
      </div>

      {/* Score badge */}
      {score !== null && cfg && (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-3xl font-mono font-bold text-[var(--text-primary)]">{score}</span>
          <span className={`px-2.5 py-1 rounded-lg text-sm font-bold border ${cfg.bg} ${cfg.text}`}>
            {grade ?? '—'}
          </span>
          <span className="text-xs text-[var(--text-tertiary)] ml-1">/ 100</span>
        </div>
      )}

      {/* Dimension mini bars */}
      <DimensionRow snapshot={score_snapshot} />

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <Link
          href={mapUrl}
          className="flex-1 text-center text-xs font-semibold px-3 py-2 rounded-lg
                     bg-[var(--hm-primary)] text-white hover:opacity-90 transition-opacity"
        >
          View Full Analysis →
        </Link>
        <Link
          href={askUrl}
          className="flex-1 text-center text-xs font-semibold px-3 py-2 rounded-lg
                     border border-[var(--hm-border)] text-[var(--text-secondary)]
                     hover:border-[var(--hm-primary)] hover:text-[var(--hm-primary)] transition-colors"
        >
          Ask AI about this
        </Link>
      </div>
    </div>
  )
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <span className="text-6xl mb-4">🔖</span>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        No saved properties yet
      </h2>
      <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
        Analyse a location on the Map and save it to see it here.
        Your saved properties will instantly show their HabitatScore.
      </p>
      <Link
        href="/map"
        className="px-6 py-2.5 bg-[var(--hm-primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Go to Map →
      </Link>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function SavedPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    if (!isLoaded) return          // wait for Clerk session
    if (!isSignedIn) {
      setError('Not signed in')
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error('Could not get auth token')
        const res   = await getSavedProperties(token)
        setProperties(res.data.data?.properties ?? [])
      } catch (err) {
        setError(err.message?.includes('Network Error') ? 'Check your internet connection' : 'Could not load saved properties')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isLoaded, isSignedIn, getToken])

  const handleDelete = async (id) => {
    const token = await getToken()
    await deleteSavedProperty(id, token)
    setProperties(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] page-enter">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>🔖</span> Saved Properties
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {properties.length > 0
              ? `${properties.length} saved location${properties.length !== 1 ? 's' : ''} — scores from time of analysis`
              : 'Your bookmarked properties will appear here'}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton-shimmer h-56 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-6 text-center">
            <span className="text-2xl mb-2 block">⚠️</span>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-xs font-semibold text-red-600 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && properties.length === 0 && <EmptyState />}

        {/* Cards grid */}
        {!loading && !error && properties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.map(p => (
              <SavedCard
                key={p.id}
                property={p}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
