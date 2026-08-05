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

  const fetchProperties = useCallback(async () => {
    if (!isLoaded) return
    if (!isSignedIn) {
      setSavedProperties([])
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('No auth token available')
      
      const response = await getSavedProperties(token)
      if (response.data && response.data.success) {
        setSavedProperties(response.data.data?.properties || [])
      } else {
        throw new Error(response.data?.error || 'Failed to fetch saved properties')
      }
    } catch (error) {
      console.error('[SavedPropertiesContext] Fetch failed:', error)
      toast.error('Could not load saved properties')
    } finally {
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
