"""
config.py — Load and expose all environment variables for HabitatMatch backend.
"""

import os
from dotenv import load_dotenv

# Load .env file if present (development only)
load_dotenv()

# Foursquare Places API
FOURSQUARE_API_KEY = os.getenv("FOURSQUARE_API_KEY", "")

# Groq AI (Llama 3.1 70B)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# OpenWeatherMap Air Pollution
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

# Upstash Redis (serverless)
UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL", "")
UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")

# Neon PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "")

# Clerk Auth
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")

# Flask environment
FLASK_ENV = os.getenv("FLASK_ENV", "development")

# Frontend origin (for CORS)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
