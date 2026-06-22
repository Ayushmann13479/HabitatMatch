<div align="center">

# 🏠 HabitatMatch

### AI-powered property intelligence for Navi Mumbai

**Make smarter housing decisions with real-time neighbourhood data, AI analysis, and an interactive map — all in one place.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-blue?logo=flask)](https://flask.palletsprojects.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Gemini](https://img.shields.io/badge/Gemini-1.5_Flash-4285F4?logo=google)](https://deepmind.google/technologies/gemini)
[![Clerk](https://img.shields.io/badge/Clerk-v6-6C47FF?logo=clerk)](https://clerk.com)
[![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-008bb9?logo=postgresql)](https://neon.tech)

</div>

---

## ✨ What it does

Drop a pin anywhere on the Navi Mumbai map and get **instant, data-backed intelligence** about that neighbourhood:

| Feature | What you get |
|---------|-------------|
| 📍 **Interactive Map** | Click to pin any location. Emoji markers for nearby places, filterable by category |
| 🏥 **Nearby Amenities** | Hospitals, schools, police stations, parks, petrol stations, railway & bus stops — with exact distances |
| 🌊 **Disaster Risk** | Flood zone classification, elevation above sea level, coastal distance, monsoon risk summary |
| 🌬️ **Air Quality** | Real-time AQI via OpenAQ, PM2.5 levels, best/worst month, nearest monitoring station |
| ✨ **Neighbourhood Vibe** | AI-generated vibe tag (Family Friendly / Young and Buzzing / etc.), pros, cons, suitability |
| 📊 **HabitatScore** | Composite 0–100 score across 6 dimensions with radar chart and grade (A+ to D) |
| 🤖 **AI Chat** | Ask anything about the location — powered by Gemini 1.5 Flash with full property context |
| 💾 **Saved Properties** | Bookmark and revisit locations with their analysis |

---

## 🖥️ Screenshots

> Drop a pin → instantly see all 5 cards populate with live data

The app features a **premium light mode** with a blue-lavender gradient glow, white cards on a soft gray background, and a clean green primary accent.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **Next.js 16.2** (App Router) | Framework, SSR, routing |
| **Tailwind CSS v4** | Styling (CSS-native config, no `tailwind.config.js` for themes) |
| **Clerk v6** | Authentication (sign-in, sign-up, session management) |
| **Leaflet + react-leaflet** | Interactive map (OSM tiles, dynamic import with `ssr: false`) |
| **Recharts** | Radar chart (HabitatScore) + Radial gauge (Air Quality) |
| **Framer Motion** | Page transitions and micro-animations |
| **Axios** | HTTP client for Flask API calls |

### Backend
| Technology | Purpose |
|-----------|---------|
| **Flask 3.x** | REST API server |
| **Flask-CORS** | Cross-origin requests from Next.js |
| **Neon PostgreSQL** | User data, chat sessions, saved properties |
| **Upstash Redis** | Response caching (TTL per endpoint) |
| **Gemini 1.5 Flash** | AI vibe analysis, score verdict, property chat |
| **OpenAQ API** | Real-time air quality data |
| **Nominatim** | Reverse geocoding (click → address) |
| **Open Elevation API** | Elevation data for disaster risk |
| **OSM Overpass API** | Nearby amenities (free, no key needed) |

### Hosting
| | |
|---|---|
| **Vercel** | Frontend deployment |
| **Render** | Backend deployment (`render.yaml` included) |

---

## 🗂️ Project Structure

```
HabitatMatch/
├── backend/                    # Flask REST API
│   ├── routes/
│   │   ├── nearby.py           # GET /api/nearby    — OSM Overpass amenities
│   │   ├── disaster.py         # GET /api/disaster  — flood risk & elevation
│   │   ├── airquality.py       # GET /api/airquality — OpenAQ AQI data
│   │   ├── vibe.py             # GET /api/vibe      — Gemini neighbourhood analysis
│   │   ├── score.py            # GET /api/score     — composite 0–100 HabitatScore
│   │   ├── chat.py             # POST /api/chat     — Gemini property Q&A
│   │   └── saved.py            # GET/POST/DELETE /api/saved
│   ├── utils/
│   │   ├── gemini.py           # Gemini API wrappers (generate_text, generate_json, chat)
│   │   ├── cache.py            # Upstash Redis TTL caching
│   │   └── auth.py             # Clerk JWT verification
│   ├── models.py               # SQLAlchemy models (User, ChatSession, SearchHistory, Saved)
│   ├── config.py               # Environment variable loader
│   ├── app.py                  # Flask app entry point + blueprint registration
│   ├── requirements.txt
│   └── render.yaml             # Render deployment config
│
└── frontend/                   # Next.js 16 App Router
    ├── app/
    │   ├── page.jsx            # Landing page (public)
    │   ├── (auth)/
    │   │   ├── sign-in/        # Clerk embedded sign-in
    │   │   └── sign-up/        # Clerk embedded sign-up
    │   └── (protected)/        # Auth-gated pages (Navbar + BottomNav)
    │       ├── home/           # Dashboard with feature cards
    │       ├── map/            # Interactive map + analysis panel ← main feature
    │       ├── score/          # Standalone score lookup
    │       ├── compare/        # Side-by-side location comparison
    │       ├── ask/            # Full-page AI chat
    │       └── about/          # Data sources & tech info
    ├── components/
    │   ├── map/
    │   │   ├── MapComponent.jsx   # Leaflet map (dynamic import only)
    │   │   ├── FilterBar.jsx      # Category filter chips
    │   │   └── SearchBar.jsx      # Nominatim autocomplete search
    │   ├── cards/
    │   │   ├── NearbyCard.jsx     # Amenity count grid + closest list
    │   │   ├── DisasterCard.jsx   # Flood risk badge + elevation stats
    │   │   ├── AirQualityCard.jsx # AQI radial gauge
    │   │   ├── VibeCard.jsx       # Vibe tag + pros/cons
    │   │   └── ScoreCard.jsx      # Radar chart + dimension bars
    │   ├── layout/
    │   │   ├── Navbar.jsx         # Top navigation bar
    │   │   └── BottomNav.jsx      # Mobile bottom navigation
    │   └── ui/                    # shadcn/ui base components
    ├── lib/
    │   ├── api.js                 # Axios client + all API call exports
    │   └── utils.js               # Tailwind cn() helper
    ├── middleware.js              # Clerk auth + redirect logic
    └── app/globals.css            # Tailwind v4 theme (CSS vars as RGB triplets)
```

---

## ⚙️ Local Development

### Prerequisites
- **Python 3.11+**
- **Node.js 20+**
- **Git**

### 1. Clone the repo
```bash
git clone https://github.com/your-username/HabitatMatch.git
cd HabitatMatch
```

### 2. Backend setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your keys (see Environment Variables below)

# Run Flask
python app.py
# → http://localhost:5000
```

### 3. Frontend setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Clerk keys

# Run Next.js dev server
npm run dev
# → http://localhost:3000
```

### 4. Verify
```bash
# Backend health check
curl http://localhost:5000/api/health
# Expected: {"success":true,"data":{"status":"ok","service":"HabitatMatch API"}}

# Open http://localhost:3000 in your browser
# Sign up → you'll be redirected to /home
# Click "Open Map" → drop a pin → watch the cards populate
```

---

## 🔑 Environment Variables

### Backend — `backend/.env`

```env
# AI
GEMINI_API_KEY=your_gemini_api_key

# Air Quality
OPENAQ_API_KEY=your_openaq_api_key

# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Cache
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Auth
CLERK_SECRET_KEY=sk_test_...

# App
FLASK_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Frontend — `frontend/.env.local`

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Backend URL
NEXT_PUBLIC_API_URL=http://localhost:5000
```

> **Note:** Foursquare API key is configured in the backend but the app primarily uses the free OSM Overpass API for nearby places. OpenAQ requires a free API key from [openaq.org](https://openaq.org).

---

## 📡 API Reference

All endpoints return `{ "success": true, "data": { ... } }` on success.

| Method | Endpoint | Params | Description |
|--------|---------|--------|-------------|
| `GET` | `/api/health` | — | Health check |
| `GET` | `/api/nearby` | `lat`, `lng`, `radius?` | Nearby amenities from OSM |
| `GET` | `/api/disaster` | `lat`, `lng` | Flood risk, elevation, coastal distance |
| `GET` | `/api/airquality` | `lat`, `lng` | AQI, PM2.5, best/worst month |
| `GET` | `/api/vibe` | `lat`, `lng`, `address` | AI neighbourhood vibe analysis |
| `GET` | `/api/score` | `lat`, `lng`, `address` | Composite HabitatScore (0–100) |
| `POST` | `/api/chat` | body: `{message, lat, lng, address}` | AI property chat (Gemini) |
| `GET` | `/api/saved` | — | List saved properties (auth required) |
| `POST` | `/api/saved` | body: `{address, lat, lng, ...}` | Save a property (auth required) |
| `DELETE` | `/api/saved/:id` | — | Delete saved property (auth required) |

### Example response — `/api/score`
```json
{
  "success": true,
  "data": {
    "total_score": 67,
    "grade": "B+",
    "dimensions": {
      "safety":       { "score": 14, "max": 20 },
      "connectivity": { "score": 15, "max": 20 },
      "amenities":    { "score": 15, "max": 20 },
      "air_quality":  { "score": 15, "max": 20 },
      "vibe":         { "score": 5,  "max": 10 },
      "green_cover":  { "score": 3,  "max": 10 }
    },
    "verdict": "Strong connectivity and good amenity access make this a practical choice; air quality during winter months is the primary concern."
  }
}
```

---

## 🚀 Deployment

### Frontend → Vercel

1. Push to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Set environment variables (all `NEXT_PUBLIC_*` and `CLERK_SECRET_KEY`)
4. Set `NEXT_PUBLIC_API_URL` to your Render backend URL
5. Deploy — Vercel auto-detects Next.js

### Backend → Render

1. Push to GitHub
2. Create a new **Web Service** at [render.com](https://render.com)
3. Connect your repo — Render detects `render.yaml` automatically
4. Add all environment variables from `backend/.env`
5. Deploy

---

## 🏗️ HabitatScore Methodology

The score is a **0–100 composite** across 6 weighted dimensions:

| Dimension | Max | Measured by |
|-----------|-----|------------|
| **Safety** | 20 | Distance to police station, fire station, flood risk level |
| **Connectivity** | 20 | Distance & count of railway + bus stops |
| **Amenities** | 20 | Hospital, school, park, petrol station proximity |
| **Air Quality** | 20 | OpenAQ AQI rating (Good=20, Moderate=15, Unhealthy=5, Hazardous=0) |
| **Vibe** | 10 | Gemini AI vibe score (1–10) |
| **Green Cover** | 10 | Parks within 1km radius count |

Grades: `A+` ≥ 90 · `A` ≥ 80 · `B+` ≥ 70 · `B` ≥ 60 · `C` ≥ 50 · `D` < 50

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built with ❤️ for Navi Mumbai · Powered by Gemini AI
</div>
