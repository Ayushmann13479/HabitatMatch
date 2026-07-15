import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

const authHeaders = (token) =>
  token ? { Authorization: `Bearer ${token}` } : {}

export const getNearby = (lat, lng, token) =>
  api.get('/api/nearby', { params: { lat, lng }, headers: authHeaders(token), timeout: 30000 })

export const getDisaster = (lat, lng, token) =>
  api.get('/api/disaster', { params: { lat, lng }, headers: authHeaders(token), timeout: 20000 })

export const getAirQuality = (lat, lng, token) =>
  api.get('/api/airquality', { params: { lat, lng }, headers: authHeaders(token), timeout: 20000 })

export const getVibe = (lat, lng, address, token) =>
  api.get('/api/vibe', { params: { lat, lng, address }, headers: authHeaders(token), timeout: 60000 })

export const getScore = (lat, lng, address, token) =>
  api.get('/api/score', { params: { lat, lng, address }, headers: authHeaders(token), timeout: 60000 })

export const sendChat = (payload, token) =>
  api.post('/api/chat', payload, { headers: authHeaders(token), timeout: 60000 })

export const getChatHistory = (session_id, token) =>
  api.get('/api/chat/history', { params: { session_id }, headers: authHeaders(token) })

export const getSavedProperties = (token) =>
  api.get('/api/saved', { headers: authHeaders(token) })

export const saveProperty = (payload, token) =>
  api.post('/api/saved', payload, { headers: authHeaders(token) })

export const deleteSavedProperty = (id, token) =>
  api.delete(`/api/saved/${id}`, { headers: authHeaders(token) })

export const compareScore = (payload, token) =>
  api.post('/api/compare', payload, { headers: authHeaders(token) })

export const clearCache = (payload, token) =>
  api.delete('/api/cache', { data: payload, headers: authHeaders(token) })

export default api
