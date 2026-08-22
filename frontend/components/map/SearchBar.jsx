'use client'
import { useState, useEffect, useRef } from 'react'
import { Icons } from '@/lib/icons'

export default function SearchBar({ onLocationSelect }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [isOpen,  setIsOpen]  = useState(false)
  const [focused, setFocused] = useState(false)
  const wrapperRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Escape key clears
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setQuery('')
        setIsOpen(false)
        setResults([])
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Debounced Nominatim search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 3) {
        setResults([])
        setIsOpen(false)
        return
      }
      try {
        const url =
          `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&accept-language=en`
        const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } }).catch(() => null)
        if (res && res.ok) {
          const data = await res.json().catch(() => [])
          setResults(Array.isArray(data) ? data : [])
          setIsOpen(Array.isArray(data) && data.length > 0)
        } else {
          setResults([])
          setIsOpen(false)
        }
      } catch {
        setResults([])
        setIsOpen(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (result) => {
    onLocationSelect(parseFloat(result.lat), parseFloat(result.lon), result.display_name)
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  return (
    <div
      ref={wrapperRef}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-32px)] md:w-[400px]"
    >
      {/* Input */}
      <div className={`
        relative bg-white rounded-xl shadow-lg border transition-all duration-200
        ${focused
          ? 'border-[var(--hm-primary)] ring-2 ring-[var(--hm-primary)]/20'
          : 'border-[var(--hm-border)]'
        }
      `}>
        {/* Search icon */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); if (results.length > 0) setIsOpen(true) }}
          onBlur={() => setFocused(false)}
          placeholder="Search any location…"
          className="w-full bg-transparent pl-9 pr-10 py-2.5 text-sm text-gray-800
                     placeholder:text-gray-400 focus:outline-none rounded-xl"
        />

        {/* Clear button */}
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Clear"
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1.5 w-full bg-white border border-[var(--hm-border)] rounded-xl shadow-xl max-h-[240px] overflow-y-auto z-[1000]">
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(result)}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[var(--bg-subtle)]
                         border-b border-gray-100 last:border-0 transition-colors"
              title={result.display_name}
            >
              <span className="mr-2 text-[var(--hm-primary)] inline-flex"><Icons.Pin size={16} /></span>
              {result.display_name.length > 62
                ? result.display_name.substring(0, 62) + '…'
                : result.display_name
              }
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
