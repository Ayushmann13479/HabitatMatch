'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { sendChat, getChatHistory } from '@/lib/api'

const STARTER_QUESTIONS = [
  "Is this safe for a family with kids?",
  "How is the connectivity here?",
  "What are the biggest risks of this location?",
  "Is this good for a working professional?",
  "How bad is the monsoon risk here?",
  "Are there good schools nearby?",
  "Is this a good area to invest in property?",
  "How does this compare to other areas nearby?"
]

export function useChat({ lat, lng, address, initialSessionId }) {
  const { getToken } = useAuth()
  const router = useRouter()

  const [messages,             setMessages]             = useState([])
  const [conversationHistory,  setConversationHistory]  = useState([])
  const [input,                setInput]                = useState('')
  const [loading,              setLoading]              = useState(false)
  const [sessionId,            setSessionId]            = useState(initialSessionId || null)
  const messagesEndRef = useRef(null)

  /* ── Load existing session history on mount ── */
  useEffect(() => {
    if (!initialSessionId) return
    getToken().then(async (token) => {
      try {
        const res = await getChatHistory(initialSessionId, token)
        const history = res.data?.data?.messages || []
        if (history.length > 0) {
          setMessages(history.map(m => ({
            role:      m.role,
            content:   m.content,
            timestamp: m.created_at ? new Date(m.created_at) : new Date(),
          })))
          setConversationHistory(history.map(m => ({
            role:    m.role,
            content: m.content,
          })))
        }
      } catch {
        // Silent fail — just start fresh
      }
    })
  }, [initialSessionId])

  /* ── Auto-scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /* ── Core send handler ── */
  const handleSend = useCallback(async (messageText) => {
    const text = messageText?.trim()
    if (!text || loading) return

    if (!lat || !lng) {
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'No property selected. Please go to the Map and analyse a location first.',
        timestamp: new Date(),
      }])
      return
    }

    // Optimistic UI: show user bubble immediately
    const userMsg = { role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const nextHistory = [...conversationHistory, { role: 'user', content: text }]

    try {
      const token = await getToken()
      const res = await sendChat(
        {
          lat:                    parseFloat(lat),
          lng:                    parseFloat(lng),
          address:                address || '',
          message:                text,
          conversation_history:   conversationHistory,
          session_id:             sessionId,
        },
        token
      )

      const { reply, conversation_history: updatedHistory, session_id: newSessionId } =
        res.data.data

      const aiMsg = { role: 'model', content: reply, timestamp: new Date() }
      setMessages(prev => [...prev, aiMsg])
      setConversationHistory(updatedHistory || nextHistory)

      // Save session ID and update URL without reload
      if (newSessionId && newSessionId !== sessionId) {
        setSessionId(newSessionId)
        const params = new URLSearchParams({
          lat,
          lng,
          address: address || '',
          session_id: newSessionId,
        })
        router.replace(`/ask?${params.toString()}`)
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'model',
        content: "Sorry, I couldn't get a response. Please try again.",
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }, [lat, lng, address, loading, sessionId, conversationHistory, getToken, router])

  const handleStarterClick = useCallback((question) => {
    handleSend(question)
  }, [handleSend])

  return {
    messages,
    loading,
    sessionId,
    input,
    setInput,
    handleSend,
    handleStarterClick,
    messagesEndRef,
    starterQuestions: STARTER_QUESTIONS,
  }
}
