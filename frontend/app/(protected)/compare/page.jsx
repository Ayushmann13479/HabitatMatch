'use client'
import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  RadarChart, Radar, PolarGrid,
  PolarAngleAxis, Legend, ResponsiveContainer, Tooltip
} from 'recharts'
import { getScore } from '@/lib/api'
import api from '@/lib/api'
import SavedPropertiesPanel from '@/components/saved/SavedPropertiesPanel'
import { Icons } from '@/lib/icons'

const DIMENSIONS = [
  { key: 'safety',       label: 'Safety',      Icon: Icons.Safety, max: 20 },
  { key: 'connectivity', label: 'Connectivity', Icon: Icons.Transit, max: 20 },
  { key: 'amenities',    label: 'Amenities',    Icon: Icons.Amenities, max: 20 },
  { key: 'air_quality',  label: 'Air Quality',  Icon: Icons.AirQuality, max: 20 },
  { key: 'vibe',         label: 'Vibe',         Icon: Icons.AI, max: 10 },
  { key: 'green_cover',  label: 'Green Cover',  Icon: Icons.Trees, max: 10 },
]

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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${colors[grade] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {grade}
    </span>
  )
}

/* ── Nominatim search input ── */
function LocationSearch({ label, placeholder, value, onSelect }) {
  const [query,   setQuery]   = useState(value || '')
  const [results, setResults] = useState([])
  const [open,    setOpen]    = useState(false)
  const [timer,   setTimer]   = useState(null)

  const search = (q) => {
    if (!q.trim()) { setResults([]); return }
    clearTimeout(timer)
    setTimer(setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        )
        setResults(await res.json())
        setOpen(true)
      } catch {
        setResults([])
      }
    }, 350))
  }

  const pick = (r) => {
    setQuery(r.display_name)
    setOpen(false)
    setResults([])
    onSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), address: r.display_name })
  }

  return (
    <div className="relative flex-1">
      <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); search(e.target.value) }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-[var(--hm-border)] rounded-xl bg-[var(--bg-base)]
                   text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
                   focus:outline-none focus:border-[var(--hm-primary)] transition-colors"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-xl shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onMouseDown={() => pick(r)}
              className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors truncate"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Filled location chip ── */
function LocChip({ label, loc, onClear }) {
  if (!loc) return null
  return (
    <div className="flex items-center gap-1.5 text-xs bg-[var(--bg-subtle)] border border-[var(--hm-border)] rounded-lg px-2.5 py-1.5">
      <span className="font-semibold text-[var(--hm-primary)]">{label}:</span>
      <span className="text-[var(--text-secondary)] truncate max-w-[180px]">{loc.address}</span>
      <button onClick={onClear} className="ml-1 text-[var(--text-tertiary)] hover:text-red-500 transition-colors flex items-center justify-center p-0.5"><Icons.Close size={14} strokeWidth={2.5} /></button>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function ComparePage() {
  const { getToken } = useAuth()

  const [locA, setLocA] = useState(null)
  const [locB, setLocB] = useState(null)

  const [scoreA,  setScoreA]  = useState(null)
  const [scoreB,  setScoreB]  = useState(null)
  const [verdict, setVerdict] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const canCompare = locA && locB

  /* ── Smart fill from saved panel ── */
  const handleSavedSelect = (property) => {
    const loc = { lat: property.lat, lng: property.lng, address: property.address }
    if (!locA) {
      setLocA(loc)
    } else if (!locB) {
      setLocB(loc)
    } else {
      setLocB(loc)
    }
    setScoreA(null); setScoreB(null); setVerdict(null); setError(null)
  }

  /* ── selectedIds: match current A/B coords against saved list ── */
  // Panel handles this internally via coords — we pass empty for simplicity
  // since we don't store saved IDs in locA/locB state
  const selectedIds = []

  const handleCompare = async () => {
    setLoading(true)
    setError(null)
    setScoreA(null)
    setScoreB(null)
    setVerdict(null)
    try {
      const token = await getToken()
      const [resA, resB] = await Promise.all([
        getScore(locA.lat, locA.lng, locA.address, token),
        getScore(locB.lat, locB.lng, locB.address, token),
      ])
      const sA = resA.data.data
      const sB = resB.data.data
      setScoreA(sA)
      setScoreB(sB)

      const cmpRes = await api.post('/api/compare', {
        location_a: { address: locA.address, scores: sA },
        location_b: { address: locB.address, scores: sB },
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      setVerdict(cmpRes.data.data)
    } catch (err) {
      setError(err.message || 'Comparison failed')
    } finally {
      setLoading(false)
    }
  }

  const radarData = DIMENSIONS.map(d => ({
    dimension: d.label,
    scoreA: scoreA?.dimensions?.[d.key]?.score ?? 0,
    scoreB: scoreB?.dimensions?.[d.key]?.score ?? 0,
    max: d.max,
  }))

  const totalA = scoreA?.total ?? 0
  const totalB = scoreB?.total ?? 0
  const tied = totalA === totalB
  const winnerIsA = totalA > totalB

  return (
    <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto w-full page-enter">
      <div className="flex gap-6 items-start">

        {/* ── Main content ────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Compare Locations</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Compare HabitatScores for two properties side by side</p>
          </div>

          {/* Mobile: saved panel collapsible */}
          <div className="lg:hidden">
            <SavedPropertiesPanel
              mode="compare"
              onSelect={handleSavedSelect}
              selectedIds={selectedIds}
            />
          </div>

          {/* Current selection chips */}
          {(locA || locB) && (
            <div className="flex flex-wrap gap-2">
              <LocChip label="A" loc={locA} onClear={() => { setLocA(null); setScoreA(null); setVerdict(null) }} />
              <LocChip label="B" loc={locB} onClear={() => { setLocB(null); setScoreB(null); setVerdict(null) }} />
            </div>
          )}

          {/* Search inputs */}
          <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <LocationSearch
                label="Location A"
                placeholder="Search location A..."
                onSelect={loc => { setLocA(loc); setScoreA(null); setVerdict(null) }}
              />
              <LocationSearch
                label="Location B"
                placeholder="Search location B..."
                onSelect={loc => { setLocB(loc); setScoreB(null); setVerdict(null) }}
              />
            </div>

            <button
              onClick={handleCompare}
              disabled={!canCompare || loading}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl
                         hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                         flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Comparing…
                </>
              ) : 'Compare →'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600 flex items-center gap-2"><Icons.Warning size={16} /> {error}</div>
          )}

          {/* Empty hint */}
          {!scoreA && !scoreB && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-[var(--hm-primary)] mb-3"><Icons.Chart size={48} strokeWidth={1.5} /></span>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm">
                Search two locations above or pick from your Saved Properties panel on the right.
              </p>
            </div>
          )}

          {/* Results */}
          {scoreA && scoreB && (
            <>
              {/* Score badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { loc: locA, score: scoreA, isWinner: !tied && winnerIsA,  label: 'A' },
                  { loc: locB, score: scoreB, isWinner: !tied && !winnerIsA, label: 'B' },
                ].map(({ loc, score, isWinner, label }) => (
                  <div
                    key={label}
                    className={`relative bg-[var(--bg-surface)] border-2 rounded-2xl p-5 shadow-sm transition-all ${
                      isWinner ? 'border-emerald-500' : 'border-[var(--hm-border)]'
                    }`}
                  >
                    {isWinner && (
                      <span className="absolute -top-3 left-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Icons.Check size={12} strokeWidth={3} /> Better choice
                      </span>
                    )}
                    <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                      Location {label}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">{loc?.address}</p>
                    <div className="flex items-center gap-3">
                      <span className={`text-4xl font-bold font-mono ${
                        (score.total ?? 0) >= 70 ? 'text-emerald-600' :
                        (score.total ?? 0) >= 50 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {score.total ?? 0}
                      </span>
                      <GradeTag grade={score.grade ?? 'C'} />
                      <span className="text-xs text-[var(--text-tertiary)]">/ 100</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Overlaid radar chart */}
              <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                  Score Comparison
                </h2>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="var(--hm-border)" />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    />
                    <Radar
                      name={locA?.address?.split(',')[0] || 'Location A'}
                      dataKey="scoreA"
                      stroke="#16A34A"
                      fill="#16A34A"
                      fillOpacity={0.15}
                    />
                    <Radar
                      name={locB?.address?.split(',')[0] || 'Location B'}
                      dataKey="scoreB"
                      stroke="#2563EB"
                      fill="#2563EB"
                      fillOpacity={0.15}
                    />
                    <Legend />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--hm-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Dimension comparison table */}
              <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-3 px-5 py-3 bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  <span>Dimension</span>
                  <span className="text-center text-emerald-600">Location A</span>
                  <span className="text-center text-blue-600">Location B</span>
                </div>
                {DIMENSIONS.map(d => {
                  const sA = scoreA?.dimensions?.[d.key]?.score ?? 0
                  const sB = scoreB?.dimensions?.[d.key]?.score ?? 0
                  const rowTied  = sA === sB
                  const aWinsRow = sA > sB
                  const clsA = rowTied ? 'text-amber-500' : aWinsRow ? 'text-emerald-600' : 'text-red-500'
                  const clsB = rowTied ? 'text-amber-500' : !aWinsRow ? 'text-emerald-600' : 'text-red-500'
                  return (
                    <div
                      key={d.key}
                      className="grid grid-cols-3 px-5 py-3 border-t border-[var(--hm-border)] items-center"
                    >
                      <span className="text-sm text-[var(--text-primary)] font-medium flex items-center gap-1.5">
                        <d.Icon size={16} className="text-[var(--text-secondary)]" /> {d.label}
                      </span>
                      <span className={`text-center text-sm font-bold font-mono ${clsA}`}>{sA}</span>
                      <span className={`text-center text-sm font-bold font-mono ${clsB}`}>{sB}</span>
                    </div>
                  )
                })}
              </div>

              {/* AI Verdict */}
              {verdict && (
                <div className="border-l-4 border-emerald-500 bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-r-2xl p-5 shadow-sm">
                  <p className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-1.5"><Icons.AI size={18} strokeWidth={2} /> AI Verdict</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{verdict.reason}</p>
                  {verdict.a_best && verdict.b_best && (
                    <div className="flex gap-4 mt-3 flex-wrap">
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                        A best at: {verdict.a_best}
                      </span>
                      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                        B best at: {verdict.b_best}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div> {/* end main content */}

        {/* ── Desktop: saved panel sidebar ─────────────────────── */}
        <SavedPropertiesPanel
          mode="compare"
          onSelect={handleSavedSelect}
          selectedIds={selectedIds}
        />

      </div>
    </div>
  )
}
