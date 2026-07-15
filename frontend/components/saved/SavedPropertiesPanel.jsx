'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { getSavedProperties } from '@/lib/api'

/* ── Grade badge ─────────────────────────────────────────────────────────── */
function GradeBadge({ score, grade }) {
  const cfg =
    score >= 70 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' :
    score >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' :
                  'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
  return (
    <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${cfg}`}>
      {grade ?? '—'}
    </span>
  )
}

/* ── Skeleton row ────────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <div className="skeleton-shimmer flex-1 h-4 rounded" />
      <div className="skeleton-shimmer w-7 h-5 rounded-md" />
    </div>
  )
}

/* ── Panel body (shared by both mobile and desktop) ─────────────────────── */
function PanelBody({ loading, properties, onSelect, selectedIds, mode }) {
  if (loading) {
    return (
      <div className="divide-y divide-[var(--hm-border)]">
        {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="px-3 py-6 text-center">
        <p className="text-xs text-[var(--text-tertiary)] mb-2">No saved properties yet</p>
        <Link
          href="/map"
          className="text-xs text-[var(--hm-primary)] hover:underline"
        >
          Analyse a location →
        </Link>
      </div>
    )
  }

  const headerText =
    mode === 'compare' ? 'Click to fill Location A or B' :
    mode === 'ask'     ? 'Click to switch chat context'  :
                         'Your saved properties'

  return (
    <div>
      <p className="px-3 pb-1 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">
        {headerText}
      </p>
      <div className="divide-y divide-[var(--hm-border)] max-h-[420px] overflow-y-auto">
        {properties.map(p => {
          const score   = p.score_snapshot?.total_score ?? p.score_snapshot?.total ?? null
          const grade   = p.score_snapshot?.grade ?? null
          const isActive = selectedIds?.includes(p.id)

          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--bg-subtle)] transition-colors ${
                isActive ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''
              }`}
            >
              {/* Active checkmark */}
              <span className={`shrink-0 text-xs ${isActive ? 'text-emerald-600' : 'opacity-0'}`}>✓</span>

              {/* Address */}
              <span className="flex-1 text-xs text-[var(--text-primary)] leading-snug line-clamp-2 text-left">
                {p.address}
              </span>

              {/* Grade badge */}
              {score !== null && (
                <GradeBadge score={score} grade={grade} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function SavedPropertiesPanel({ onSelect, mode = 'compare', selectedIds = [] }) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    const load = async () => {
      try {
        const token = await getToken()
        if (!token) return
        const res   = await getSavedProperties(token)
        setProperties(res.data.data?.properties ?? [])
      } catch {
        setProperties([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isLoaded, isSignedIn, getToken])

  const panelContent = (
    <PanelBody
      loading={loading}
      properties={properties}
      onSelect={onSelect}
      selectedIds={selectedIds}
      mode={mode}
    />
  )

  return (
    <>
      {/* ── Desktop: fixed sidebar (hidden on mobile) ────────────────── */}
      <aside className="hidden lg:flex flex-col w-[272px] shrink-0">
        <div className="sticky top-20 bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-3 pt-3.5 pb-2 border-b border-[var(--hm-border)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <span>🔖</span> Saved Properties
            </h3>
          </div>
          {panelContent}
        </div>
      </aside>

      {/* ── Mobile: collapsible toggle (visible only below lg) ────────── */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--bg-surface)]
                     border border-[var(--hm-border)] rounded-xl text-sm font-semibold
                     text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span>🔖</span> Saved Properties
            {!loading && properties.length > 0 && (
              <span className="ml-1 text-xs font-normal text-[var(--text-tertiary)]">
                ({properties.length})
              </span>
            )}
          </span>
          <span className={`text-xs transition-transform duration-200 ${mobileOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {mobileOpen && (
          <div className="mt-1 bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-xl overflow-hidden">
            {panelContent}
          </div>
        )}
      </div>
    </>
  )
}
