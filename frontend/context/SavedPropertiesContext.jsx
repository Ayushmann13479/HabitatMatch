'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSavedProperties } from '@/lib/api'
import { toast } from 'sonner'

const SavedPropertiesContext = createContext(undefined)

export function SavedPropertiesProvider({ children }) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [savedProperties, setSavedProperties] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchProperties = useCallback(async (retryCount = 0) => {
    if (!isLoaded) return
    if (!isSignedIn) {
      setSavedProperties([])
      setIsLoading(false)
      return
    }

    if (retryCount === 0) setIsLoading(true)
    try {
      const token = await getToken()
      if (!token) {
        // Clerk might still be hydrating — retry once after a short delay
        if (retryCount < 1) {
          console.log('[SavedPropertiesContext] Token null, retrying in 1.5s...')
          setTimeout(() => fetchProperties(retryCount + 1), 1500)
          return
        }
        throw new Error('No auth token available')
      }

      const response = await getSavedProperties(token)
      if (response.data && response.data.success) {
        setSavedProperties(response.data.data?.properties || [])
        setIsLoading(false)
      } else {
        throw new Error(response.data?.error || 'Failed to fetch saved properties')
      }
    } catch (error) {
      console.error('[SavedPropertiesContext] Fetch failed:', error)
      // Retry up to 2 times on network/timeout errors (Render cold start)
      if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.response?.status >= 500)) {
        const delay = retryCount === 0 ? 1500 : 5000;
        console.log(`[SavedPropertiesContext] Retrying after cold start (attempt ${retryCount + 1})...`)
        setTimeout(() => fetchProperties(retryCount + 1), delay)
        return
      }
      toast.error('Could not load saved properties')
      setIsLoading(false)
    }
  }, [getToken, isLoaded, isSignedIn])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  // Optimistic updates
  const addProperty = useCallback((property) => {
    setSavedProperties((prev) => {
      // Prevent duplicates
      if (prev.some(p => p.id === property.id)) return prev
      return [property, ...prev]
    })
  }, [])

  const removeProperty = useCallback((id) => {
    setSavedProperties((prev) => prev.filter(p => p.id !== id))
  }, [])

  const value = {
    savedProperties,
    isLoading,
    addProperty,
    removeProperty,
    refreshProperties: fetchProperties
  }

  return (
    <SavedPropertiesContext.Provider value={value}>
      {children}
    </SavedPropertiesContext.Provider>
  )
}

export function useSavedProperties() {
  const context = useContext(SavedPropertiesContext)
  if (context === undefined) {
    throw new Error('useSavedProperties must be used within a SavedPropertiesProvider')
  }
  return context
}
