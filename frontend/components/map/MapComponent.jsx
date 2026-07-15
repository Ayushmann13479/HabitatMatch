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

const CATEGORY_EMOJIS = {
  hospital: '🏥',
  school: '🏫',
  park: '🌳',
  gas_station: '⛽',
  railway_station: '🚉',
  pharmacy: '💊',
  college: '🎓',
  mall: '🛍️',
  atm: '🏦',
  bank: '🏛️'
}

export default function MapComponent({
  onLocationSelect,
  places = [],
  activeCategories = [],
  center = { lat: 20, lng: 0 },
  zoom = 3,
}) {
  const mapRef         = useRef(null)
  const mapInstanceRef = useRef(null)
  const activePinRef   = useRef(null)
  const placesLayerRef = useRef(null)

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

      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data    = await res.json()
        const address = data.display_name || 'Unknown Location'

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
      } catch (err) {
        console.error('Reverse geocoding failed:', err)
        marker.setPopupContent('<p style="font-size:12px;color:#EF4444">Could not fetch address.</p>')
      }
    })

    mapInstanceRef.current = map

    // ── Geolocation: fly to user's position if permission granted ──────
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          map.flyTo([coords.latitude, coords.longitude], 13, { animate: true, duration: 1.2 })
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

  // ── Re-render emoji markers when places or activeCategories changes ──
  useEffect(() => {
    if (!mapInstanceRef.current || !placesLayerRef.current) return

    placesLayerRef.current.clearLayers()

    places.forEach(place => {
      if (!activeCategories.includes(place.category)) return

      const emoji = CATEGORY_EMOJIS[place.category] || '📍'

      const icon = L.divIcon({
        html: `<span style="
          font-size: 26px;
          cursor: pointer;
          line-height: 1;
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25));
          user-select: none;
        ">${emoji}</span>`,
        className: '',
        iconSize:   [32, 32],
        iconAnchor: [16, 16],
      })

      let popup = `<b style="font-size:13px">${place.name}</b><br>
        <span style="font-size:12px;color:#6B7280">${place.distance_metres}m away</span>`
      if (place.rating > 0) {
        popup += `<span style="font-size:12px;color:#6B7280"> &nbsp;·&nbsp; ⭐ ${place.rating}</span>`
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
