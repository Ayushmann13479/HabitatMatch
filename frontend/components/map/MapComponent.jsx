'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix broken Leaflet default icons in webpack/Next.js builds
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom red drop-pin icon
const RED_MARKER = new L.Icon({
  iconUrl:       'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1,  -34],
  shadowSize:    [41, 41],
})

// SVG path data from Lucide icons for map markers (raw HTML, not React)
const CATEGORY_SVG = {
  hospital:        '<path d="M12 6v4" /><path d="M14 14h-4" /><path d="M14 18h-4" /><path d="M14 8h-4" /><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" /><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18" />',
  school:          '<path d="M14 22v-4a2 2 0 1 0-4 0v4" /><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2" /><path d="M18 5v17" /><path d="m4 6 8-4 8 4" /><path d="M6 5v17" /><circle cx="12" cy="9" r="2" />',
  park:            '<path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z" /><path d="M7 16v6" /><path d="M13 19v3" /><path d="M15.7 14.8A2 2 0 0 0 14 13V8a2 2 0 0 1 4 0v5a2 2 0 0 0 .5 1.3L21 17a1 1 0 0 1 0 1.5l-.7.7a1 1 0 0 1-1.4 0Z" />',
  gas_station:     '<path d="M3 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" /><path d="M15 22H3" /><path d="M15 10h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 4" /><path d="M7 10h4" />',
  railway_station: '<path d="M4 11V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /><path d="m9 21 3 3 3-3" /><path d="M12 12v3" /><path d="M4 11h16" /><path d="M4 15h16" />',
  pharmacy:        '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" />',
  college:         '<path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />',
  mall:            '<rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />',
  atm:             '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />',
  bank:            '<line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7" />',
}

const CATEGORY_COLORS = {
  hospital: '#EF4444', school: '#3B82F6', park: '#16A34A',
  gas_station: '#F97316', railway_station: '#8B5CF6', pharmacy: '#EC4899',
  college: '#6366F1', mall: '#A855F7', atm: '#0EA5E9', bank: '#0D9488',
}

export default function MapComponent({
  onLocationSelect,
  places = [],
  activeCategories = [],
  center = { lat: 20, lng: 0 },
  zoom = 3,
  selectedLocation = null,
}) {
  const mapRef         = useRef(null)
  const mapInstanceRef = useRef(null)
  const activePinRef   = useRef(null)
  const placesLayerRef = useRef(null)

  // ── Fly to selectedLocation when it changes (search-bar or autoload) ──
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLocation) return

    const { lat, lng, address } = selectedLocation
    if (typeof lat !== 'number' || typeof lng !== 'number') return

    mapInstanceRef.current.flyTo([lat, lng], 15, { animate: true, duration: 1 })

    // Remove previous pin
    if (activePinRef.current) {
      mapInstanceRef.current.removeLayer(activePinRef.current)
    }

    // Drop a new red pin at the selected location
    const marker = L.marker([lat, lng], { icon: RED_MARKER }).addTo(mapInstanceRef.current)
    if (address) {
      marker.bindPopup(`<p style="font-size:12px;color:#4B5563">${address}</p>`)
    }
    activePinRef.current = marker
  }, [selectedLocation])

  // ── Initialise map on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    if (mapInstanceRef.current) return   // already initialised

    const map = L.map(mapRef.current, {
      center:           [center.lat, center.lng],
      zoom,
      zoomControl:      true,
      scrollWheelZoom:  true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    // Layer group for emoji place-markers
    placesLayerRef.current = L.layerGroup().addTo(map)

    // Click → drop red pin → reverse geocode → popup
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng

      // Remove previous pin
      if (activePinRef.current) {
        map.removeLayer(activePinRef.current)
      }

      const marker = L.marker([lat, lng], { icon: RED_MARKER }).addTo(map)
      activePinRef.current = marker

      // Show a temporary loading popup
      marker.bindPopup('<p style="font-size:13px;color:#555">Fetching address…</p>').openPopup()

      let address = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`

      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
        const res = await fetch(`${backendUrl}/api/geocode/reverse?lat=${lat}&lng=${lng}`).catch(() => null)
        
        if (res && res.ok) {
          const body = await res.json().catch(() => null)
          if (body && body.success && body.data && body.data.address) {
            address = body.data.address
          }
        }

        // Direct Photon fallback if backend was unavailable or returned coordinates fallback
        if (address.startsWith('Location (')) {
          const photonRes = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`).catch(() => null)
          if (photonRes && photonRes.ok) {
            const pData = await photonRes.json().catch(() => null)
            const feature = pData?.features?.[0]?.properties
            if (feature) {
              const parts = [
                feature.name,
                feature.street,
                feature.district || feature.suburb,
                feature.city || feature.town || feature.county,
                feature.state,
                feature.country
              ].filter(Boolean)
              if (parts.length > 0) {
                address = parts.join(', ')
              }
            }
          }
        }
      } catch (err) {
        // Fallback address is already assigned
      }

      const popupHtml = `
        <div style="
          font-family: Inter, sans-serif;
          min-width: 210px;
          max-width: 260px;
          padding: 4px 0;
        ">
          <p style="
            margin: 0 0 10px 0;
            font-size: 12px;
            color: #4B5563;
            line-height: 1.5;
          ">${address}</p>
          <button
            id="analyse-btn"
            style="
              width: 100%;
              background: #16A34A;
              color: #fff;
              border: none;
              padding: 8px 14px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 13px;
              font-weight: 600;
              letter-spacing: 0.01em;
            "
            onmouseover="this.style.background='#15803D'"
            onmouseout="this.style.background='#16A34A'"
          >
            Analyse This Location →
          </button>
        </div>
      `

      marker.setPopupContent(popupHtml)
      marker.openPopup()

      // Bind button click after popup DOM renders
      setTimeout(() => {
        const btn = document.getElementById('analyse-btn')
        if (btn) {
          btn.onclick = () => onLocationSelect(lat, lng, address)
        }
      }, 0)
    })

    mapInstanceRef.current = map

    // ── Geolocation: fly to user's position if permission granted ──────
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (mapInstanceRef.current === map) {
            map.flyTo([coords.latitude, coords.longitude], 13, { animate: true, duration: 1.2 })
          }
        },
        () => { /* denied or unavailable — keep world view */ },
        { timeout: 8000 }
      )
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Re-render SVG markers when places or activeCategories changes ──
  useEffect(() => {
    if (!mapInstanceRef.current || !placesLayerRef.current) return

    placesLayerRef.current.clearLayers()

    places.forEach(place => {
      if (!activeCategories.includes(place.category)) return

      const svgPaths = CATEGORY_SVG[place.category] || '<circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z" />'
      const color = CATEGORY_COLORS[place.category] || '#16A34A'

      const icon = L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3)); background: white; border-radius: 50%; padding: 3px;">${svgPaths}</svg>`,
        className: '',
        iconSize:   [30, 30],
        iconAnchor: [15, 15],
      })

      let popup = `<b style="font-size:13px">${place.name}</b><br>
        <span style="font-size:12px;color:#6B7280">${place.distance_metres}m away</span>`
      if (place.rating > 0) {
        popup += `<span style="font-size:12px;color:#6B7280"> &nbsp;&middot;&nbsp; ★ ${place.rating}</span>`
      }

      L.marker([place.lat, place.lng], { icon })
        .bindPopup(popup)
        .addTo(placesLayerRef.current)
    })
  }, [places, activeCategories])

  return (
    <div
      ref={mapRef}
      className="w-full h-[45vh] md:h-[60vh] z-0"
    />
  )
}
