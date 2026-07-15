'use client'
import dynamic from 'next/dynamic'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import FilterBar from '@/components/map/FilterBar'
import SearchBar from '@/components/map/SearchBar'
import NearbyCard from '@/components/cards/NearbyCard'
import DisasterCard from '@/components/cards/DisasterCard'
import AirQualityCard from '@/components/cards/AirQualityCard'
import VibeCard from '@/components/cards/VibeCard'
import ScoreCard from '@/components/cards/ScoreCard'
import { getNearby, getDisaster, getAirQuality, getVibe, getScore, saveProperty } from '@/lib/api'

const MapComponent = dynamic(
  () => import('@/components/map/MapComponent'),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full skeleton-shimmer"
        style={{ height: '60vh' }}
      />
    )
  }
)

/* ── Inner component that uses useSearchParams ─────────────────────────── */
function MapContent() {
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const analysisSectionRef = useRef(null)

  const [selectedLocation, setSelectedLocation] = useState(null)
  const [autoloadDone, setAutoloadDone] = useState(false)
  const [activeCategories, setActiveCategories] = useState([
    'hospital', 'school', 'park', 'gas_station', 'railway_station',
    'pharmacy', 'college', 'mall', 'atm', 'bank'
  ])
  const [places, setPlaces] = useState([])

  const [nearbyData,    setNearbyData]    = useState(null)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError,   setNearbyError]   = useState(null)

  const [disasterData,    setDisasterData]    = useState(null)
  const [disasterLoading, setDisasterLoading] = useState(false)
  const [disasterError,   setDisasterError]   = useState(null)

  const [airqualityData,    setAirqualityData]    = useState(null)
  const [airqualityLoading, setAirqualityLoading] = useState(false)
  const [airqualityError,   setAirqualityError]   = useState(null)

  const [vibeData,    setVibeData]    = useState(null)
  const [vibeLoading, setVibeLoading] = useState(false)
  const [vibeError,   setVibeError]   = useState(null)

  const [scoreData,    setScoreData]    = useState(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreError,   setScoreError]   = useState(null)

  const [compactInput,       setCompactInput]       = useState('')
  const [compactMessages,    setCompactMessages]    = useState([])
  const [compactChatLoading, setCompactChatLoading] = useState(false)

  // Save button state
  const [saveState,   setSaveState]   = useState('idle') // 'idle' | 'saving' | 'saved'
  const [saveToast,   setSaveToast]   = useState(false)

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)

  /* ── Autoload from URL params ──────────────────────────────────────── */
  useEffect(() => {
    const autoload = searchParams.get('autoload')
    const urlLat   = parseFloat(searchParams.get('lat'))
    const urlLng   = parseFloat(searchParams.get('lng'))
    const urlAddr  = searchParams.get('address') || ''

    if (autoload === 'true' && !isNaN(urlLat) && !isNaN(urlLng) && urlAddr && !autoloadDone) {
      setAutoloadDone(true)
      handleAnalyse(urlLat, urlLng, urlAddr)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  /* ── helper: re-run a single API call ─────────────────────────────── */
  const refetchOne = async (apiFunc, setData, setLoading, setError, extraArgs = []) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await apiFunc(
        selectedLocation.lat,
        selectedLocation.lng,
        ...extraArgs,
        token
      )
      setData(res.data)
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  /* ── main: analyse a location ──────────────────────────────────────── */
  const handleAnalyse = async (lat, lng, address) => {
    setSelectedLocation({ lat, lng, address })
    setSaveState('idle')
    setSaveToast(false)

    // Reset previous analysis
    setNearbyData(null);    setNearbyError(null)
    setDisasterData(null);  setDisasterError(null)
    setAirqualityData(null);setAirqualityError(null)
    setVibeData(null);      setVibeError(null)
    setScoreData(null);     setScoreError(null)
    setCompactMessages([])

    // Set all loading states
    setNearbyLoading(true);    setDisasterLoading(true)
    setAirqualityLoading(true);setVibeLoading(true)
    setScoreLoading(true)

    // Scroll to analysis section
    setTimeout(() => {
      analysisSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 200)

    const token = await getToken()

    Promise.allSettled([
      getNearby(lat, lng, token)
        .then(res => { setNearbyData(res.data.data); setPlaces(res.data.data?.places || []) })
        .catch(err => setNearbyError(err.message?.includes('Network Error') ? 'Check your internet connection' : 'Could not load nearby places'))
        .finally(() => setNearbyLoading(false)),

      getDisaster(lat, lng, token)
        .then(res => setDisasterData(res.data.data))
        .catch(err => setDisasterError(err.message?.includes('Network Error') ? 'Check your internet connection' : 'Could not load risk data'))
        .finally(() => setDisasterLoading(false)),

      getAirQuality(lat, lng, token)
        .then(res => setAirqualityData(res.data.data))
        .catch(err => setAirqualityError(err.message?.includes('Network Error') ? 'Check your internet connection' : 'Could not load air quality data'))
        .finally(() => setAirqualityLoading(false)),

      getVibe(lat, lng, address, token)
        .then(res => setVibeData(res.data.data))
        .catch(err => setVibeError(err.message?.includes('Network Error') ? 'Check your internet connection' : 'Could not generate neighbourhood vibe'))
        .finally(() => setVibeLoading(false)),

      getScore(lat, lng, address, token)
        .then(res => setScoreData(res.data.data))
        .catch(err => setScoreError(err.message?.includes('Network Error') ? 'Check your internet connection' : 'Could not calculate HabitatScore'))
        .finally(() => setScoreLoading(false)),
    ])
  }

  /* ── Refresh cache and re-analyse ──────────────────────────────────── */
  const handleRefresh = async () => {
    if (!selectedLocation || isRefreshing) return
    setIsRefreshing(true)
    try {
      const token = await getToken()
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/cache`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ lat: selectedLocation.lat, lng: selectedLocation.lng })
      })
      // re-trigger the full analysis
      await handleAnalyse(selectedLocation.lat, selectedLocation.lng, selectedLocation.address)
    } catch (err) {
      console.error('Failed to clear cache', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleToggleCategory = (cat) => {
    setActiveCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  /* ── Save property ─────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!selectedLocation || !scoreData || saveState !== 'idle') return
    setSaveState('saving')
    try {
      const token = await getToken()
      await saveProperty({
        address:        selectedLocation.address,
        lat:            selectedLocation.lat,
        lng:            selectedLocation.lng,
        score_snapshot: scoreData,
      }, token)
      setSaveState('saved')
      setSaveToast(true)
      setTimeout(() => setSaveToast(false), 2000)
    } catch {
      setSaveState('idle')
    }
  }

  /* ── compact chat ──────────────────────────────────────────────────── */
  const handleCompactChat = async (question) => {
    const q = question || compactInput
    if (!q.trim()) return

    setCompactMessages(prev => [...prev, { role: 'user', content: q }])
    if (!question) setCompactInput('')
    setCompactChatLoading(true)

    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            message: q,
            lat: selectedLocation?.lat,
            lng: selectedLocation?.lng,
            address: selectedLocation?.address,
          })
        }
      )
      const data = await res.json()
      setCompactMessages(prev => [
        ...prev,
        { role: 'assistant', content: data?.data?.reply || 'Sorry, I could not answer that.' }
      ])
    } catch {
      setCompactMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Could not get a response. Try again.' }
      ])
    } finally {
      setCompactChatLoading(false)
    }
  }

  /* ── layout ────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col min-h-screen page-enter">

      {/* Filter bar */}
      <FilterBar
        activeCategories={activeCategories}
        onToggle={handleToggleCategory}
        counts={nearbyData?.counts}
      />

      {/* Map container */}
      <div className="relative w-full" style={{ height: '60vh' }}>
        <SearchBar onLocationSelect={handleAnalyse} />
        <MapComponent
          onLocationSelect={handleAnalyse}
          places={places}
          activeCategories={activeCategories}
          autoloadLat={searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : null}
          autoloadLng={searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : null}
        />
      </div>

      {/* Analysis section — only shown after pin drop */}
      {selectedLocation && (
        <div
          className="px-4 md:px-8 py-6 space-y-4 max-w-7xl mx-auto w-full"
          ref={analysisSectionRef}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--hm-primary)] animate-pulse shrink-0" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Analysing
              </h2>
            </div>
            <div className="flex items-center gap-3 text-right">
              {scoreData && !nearbyLoading && !disasterLoading && !airqualityLoading && !vibeLoading && !scoreLoading && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefresh} 
                  disabled={isRefreshing}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {isRefreshing ? 'Refreshing...' : '🔄 Refresh'}
                </Button>
              )}
              <p className="text-sm text-[var(--text-secondary)] truncate max-w-xs md:max-w-lg">
                {selectedLocation.address}
              </p>
            </div>
          </div>

          {/* 2×2 cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NearbyCard
              data={nearbyData} loading={nearbyLoading} error={nearbyError}
              onRetry={() => refetchOne(getNearby, (d) => { setNearbyData(d); setPlaces(d.places || []) }, setNearbyLoading, setNearbyError)}
            />
            <DisasterCard
              data={disasterData} loading={disasterLoading} error={disasterError}
              onRetry={() => refetchOne(getDisaster, setDisasterData, setDisasterLoading, setDisasterError)}
            />
            <AirQualityCard
              data={airqualityData} loading={airqualityLoading} error={airqualityError}
              onRetry={() => refetchOne(getAirQuality, setAirqualityData, setAirqualityLoading, setAirqualityError)}
            />
            <VibeCard
              data={vibeData} loading={vibeLoading} error={vibeError}
              onRetry={() => refetchOne(getVibe, setVibeData, setVibeLoading, setVibeError, [selectedLocation.address])}
            />
          </div>

          {/* Score card — full width */}
          <ScoreCard
            data={scoreData} loading={scoreLoading} error={scoreError}
            onRetry={() => refetchOne(getScore, setScoreData, setScoreLoading, setScoreError, [selectedLocation.address])}
          />

          {/* Save Property button — only shown when score is loaded */}
          {scoreData && !scoreError && (
            <div className="flex items-center gap-3 relative">
              <button
                onClick={handleSave}
                disabled={saveState !== 'idle'}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  saveState === 'saved'
                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 cursor-default'
                    : saveState === 'saving'
                    ? 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--hm-border)] cursor-wait opacity-70'
                    : 'bg-[var(--hm-primary)] text-white hover:opacity-90 shadow-sm hover:shadow-md'
                }`}
              >
                {saveState === 'saved'  && <span>🔖</span>}
                {saveState === 'saving' && (
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                )}
                {saveState === 'idle'   && <span>🔖</span>}
                {saveState === 'saved'  ? 'Saved ✓'       : ''}
                {saveState === 'saving' ? 'Saving…'       : ''}
                {saveState === 'idle'   ? 'Save Property' : ''}
              </button>

              {/* Inline toast */}
              {saveToast && (
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 animate-fade-in">
                  ✓ Property saved!
                </span>
              )}

              <Link
                href="/saved"
                className="text-xs text-[var(--hm-primary)] hover:underline ml-auto"
              >
                View saved →
              </Link>
            </div>
          )}

          {/* Compact AI chat */}
          <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">
                  Ask HabitatMatch AI
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate max-w-xs">
                  About: {selectedLocation.address}
                </p>
              </div>
              <Link
                href={`/ask?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}&address=${encodeURIComponent(selectedLocation.address)}`}
                className="text-xs text-[var(--hm-primary)] hover:underline shrink-0 ml-4"
              >
                Open full chat →
              </Link>
            </div>

            {/* Starter chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {[
                "Is this safe for a family?",
                "How is connectivity here?",
                "What is the monsoon risk?",
                "Good for a working professional?"
              ].map(q => (
                <button
                  key={q}
                  onClick={() => handleCompactChat(q)}
                  disabled={compactChatLoading}
                  className="text-xs text-left px-3 py-2 border border-[var(--hm-border)] rounded-lg
                             hover:border-[var(--hm-primary)] hover:text-[var(--hm-primary)]
                             transition-colors disabled:opacity-50 text-[var(--text-secondary)]"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Messages */}
            {compactMessages.length > 0 && (
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {compactMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-sm px-3 py-2 rounded-lg leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[var(--hm-primary)] text-white ml-8'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] mr-8'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
                {compactChatLoading && (
                  <div className="bg-[var(--bg-subtle)] rounded-lg px-3 py-2 mr-8">
                    <span className="text-[var(--text-tertiary)] text-sm">
                      Thinking
                      <span className="inline-block animate-bounce ml-0.5">.</span>
                      <span className="inline-block animate-bounce ml-0.5" style={{ animationDelay: '0.15s' }}>.</span>
                      <span className="inline-block animate-bounce ml-0.5" style={{ animationDelay: '0.3s' }}>.</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Input row */}
            <div className="flex gap-2">
              <input
                value={compactInput}
                onChange={e => setCompactInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCompactChat()}
                placeholder="Ask about this location..."
                className="flex-1 text-sm px-3 py-2 border border-[var(--hm-border)] rounded-lg
                           bg-[var(--bg-base)] text-[var(--text-primary)]
                           focus:outline-none focus:border-[var(--hm-primary)]
                           placeholder:text-[var(--text-tertiary)]"
              />
              <button
                onClick={() => handleCompactChat()}
                disabled={!compactInput.trim() || compactChatLoading}
                className="px-4 py-2 bg-[var(--hm-primary)] text-white text-sm rounded-lg
                           hover:bg-[var(--hm-primary-hover)] transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Page shell with Suspense for useSearchParams ──────────────────────── */
export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <span className="w-6 h-6 border-2 border-[var(--hm-primary)]/30 border-t-[var(--hm-primary)] rounded-full animate-spin" />
      </div>
    }>
      <MapContent />
    </Suspense>
  )
}
