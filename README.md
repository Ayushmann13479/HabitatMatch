# 🏡 HabitatMatch — AI Property Intelligence

AI-powered neighbourhood intelligence for property buyers and renters. Drop a pin anywhere in the world to get a complete analysis including nearby amenities, disaster risk, air quality, an AI-generated vibe report, and a conversational property assistant.


## ✨ Features

- 🗺️ **Interactive Map** — Drop a pin anywhere to analyse a neighbourhood
- 🏥 **Nearby Amenities** — Hospitals, schools, parks, pharmacies, airports, banks, ATMs, colleges and more with emoji markers
- 🌊 **Disaster Risk** — Flood risk assessment using elevation and coastal distance data
- 🌬️ **Air Quality** — AQI with annual averages and monthly trends from OpenAQ
- ✨ **AI Vibe Analysis** — AI-generated neighbourhood vibe with pros, cons, and best-for rating
- 📊 **HabitatScore** — 100-point score across 6 dimensions: Safety, Connectivity, Amenities, Air Quality, Vibe, Green Cover
- 💬 **Property Chat** — Conversational AI that answers any question about a property using real data
- 🔖 **Save Properties** — Bookmark locations with score snapshots
- ⚖️ **Compare** — Side-by-side comparison with overlaid radar charts
- 🔄 **Cache Refresh** — Force fresh analysis of any location

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui, Aceternity UI, Recharts, Leaflet |
| Backend | Flask, Flask-Compress, Gunicorn |
| AI | Groq Llama 3.1 70B |
| Database | Neon PostgreSQL |
| Cache | Upstash Redis |
| Auth | Clerk |
| Data | OpenStreetMap/Overpass, Nominatim, Open Elevation, OpenAQ |
| Hosting | Vercel (frontend), Render (backend) |

## 🚀 Deployment Guide

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "HabitatMatch final build"
git push origin main
```

### Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect GitHub → Select HabitatMatch repo
3. **Name:** `habitatmatch-backend`
4. **Root directory:** `backend`
5. **Runtime:** Python 3
6. **Build command:** `pip install -r requirements.txt`
7. **Start command:**
   ```
   gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 app:app
   ```
8. **Environment variables:**
   ```
   GROQ_API_KEY = your_groq_key
   OPENAQ_API_KEY = your_openaq_key
   UPSTASH_REDIS_REST_URL = your_upstash_url
   UPSTASH_REDIS_REST_TOKEN = your_upstash_token
   DATABASE_URL = your_neon_postgresql_url
   CLERK_SECRET_KEY = your_clerk_secret_key
   FLASK_ENV = production
   FRONTEND_URL = https://habitatmatch.vercel.app
   ```
9. Deploy and copy your Render backend URL

### Step 3 — Set up UptimeRobot (Prevent Cold Starts)

1. Go to [uptimerobot.com](https://uptimerobot.com) → Add New Monitor
2. **Monitor type:** HTTP(s)
3. **URL:** `https://your-render-url.onrender.com/api/health`
4. **Monitoring interval:** Every 5 minutes
5. Save — this keeps Render awake 24/7

### Step 4 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import HabitatMatch from GitHub
3. **Root directory:** `frontend`
4. **Framework:** Next.js (auto-detected)
5. **Environment variables:**
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = your_clerk_pub_key
   CLERK_SECRET_KEY = your_clerk_secret_key
   NEXT_PUBLIC_API_URL = https://your-render-url.onrender.com
   NEXT_PUBLIC_APP_URL = https://habitatmatch.vercel.app
   ```
6. Deploy — live at `habitatmatch.vercel.app`

### Step 5 — Configure Clerk Production Domain

1. Clerk dashboard → Settings → Domains
2. Add: `habitatmatch.vercel.app`
3. Save

### Step 6 — Update CORS After Deploy

In `backend/app.py`, the Vercel URL `https://habitatmatch.vercel.app` is already added to CORS origins. If your Vercel URL is different, update it and push — Render auto-redeploys.

## 🧪 Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

## 🔗 Links

- [GitHub](https://github.com/Ayushmann13479/HabitatMatch)
