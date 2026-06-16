# HabitatMatch 🏠

> AI-powered property intelligence web app for Navi Mumbai — make smarter housing decisions with real-time data.

## Overview

HabitatMatch analyses any location in Navi Mumbai and gives you:
- 📍 **Nearby amenities** — hospitals, schools, transit, parks (Foursquare)
- 🌬️ **Air quality** — real-time AQI & PM2.5 (OpenAQ)
- 🌊 **Disaster risk** — flood zones, elevation data
- 🏙️ **Neighbourhood vibe** — walkability, nightlife, green cover
- ⭐ **Liveability score** — composite AI-calculated score
- 🤖 **AI chat** — ask Gemini anything about the location

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + Tailwind CSS |
| Auth | Clerk |
| Backend | Flask + Flask-RESTful |
| Database | Neon PostgreSQL |
| Cache | Upstash Redis |
| AI | Gemini 1.5 Flash |
| Maps | Leaflet + react-leaflet |
| Places | Foursquare Places API |
| Air Quality | OpenAQ API |
| Geocoding | Nominatim |
| Elevation | Open Elevation API |
| Hosting | Vercel (frontend) + Render (backend) |

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in your API keys in .env
python -m pip install -r requirements.txt
python app.py
# Backend runs on http://localhost:5000
```

### Frontend Setup
```bash
cd frontend
cp .env.example .env.local
# Fill in your Clerk keys in .env.local
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

### Verify Setup
```bash
# Health check
curl http://localhost:5000/api/health
# Expected: {"success":true,"data":{"status":"ok","service":"HabitatMatch API"}}
```

## Deployment

### Backend → Render
1. Push to GitHub
2. Connect repo to Render
3. Render auto-detects `render.yaml` and deploys

### Frontend → Vercel
1. Push to GitHub
2. Import project in Vercel dashboard
3. Set environment variables from `.env.example`
4. Deploy

## Project Structure

```
HabitatMatch/
├── backend/          # Flask API
│   ├── routes/       # API blueprints (nearby, score, chat, etc.)
│   ├── utils/        # Helpers (cache, gemini, auth)
│   ├── app.py        # Flask app entry point
│   └── ...
└── frontend/         # Next.js 14 app
    ├── app/          # App Router pages
    ├── components/   # Reusable UI components
    ├── hooks/        # Custom React hooks
    └── lib/          # API client & utilities
```
