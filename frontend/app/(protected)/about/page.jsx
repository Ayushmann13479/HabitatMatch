'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/separator'
import { buttonVariants } from '@/components/ui/button'
import { Icons } from '@/lib/icons'
import {
  Database, Zap, Lock, Globe, Mountain
} from 'lucide-react'

const dataSources = [
  { Icon: Icons.Pin,       name: 'OpenStreetMap + Overpass API', desc: 'Nearby amenities globally (hospitals, schools, parks, pharmacies, airports, banks and more)' },
  { Icon: Icons.MapIcon,   name: 'Nominatim', desc: 'Address search and reverse geocoding' },
  { Icon: Mountain,        name: 'Open Elevation API', desc: 'Terrain and flood risk assessment' },
  { Icon: Icons.AirQuality,name: 'OpenAQ (api.openaq.org)', desc: 'Real-time and historical air quality measurements' },
  { Icon: Icons.AI,        name: 'Groq Llama 3.1 70B', desc: 'AI neighbourhood analysis, HabitatScore verdicts, and conversational property assistant' },
  { Icon: Lock,            name: 'Clerk', desc: 'Secure authentication' },
  { Icon: Database,        name: 'Neon PostgreSQL', desc: 'User data and chat history' },
  { Icon: Zap,             name: 'Upstash Redis', desc: 'API response caching for fast repeat searches' },
]

const techStack = [
  'Next.js 14', 'Flask', 'PostgreSQL', 'Redis',
  'Clerk', 'Leaflet', 'Recharts', 'shadcn/ui',
  'Groq', 'OSM/Overpass', 'Flask-Compress', 'NProgress',
]

const appFeatures = [
  { Icon: Icons.MapIcon,   text: 'Drop a pin anywhere on an interactive map' },
  { Icon: Icons.Hospital,  text: 'See nearby hospitals, schools, parks, pharmacies, airports, banks, ATMs, colleges and more' },
  { Icon: Icons.Flood,     text: 'Flood risk assessment using elevation and coastal distance data' },
  { Icon: Icons.AirQuality,text: 'Air quality index with annual averages and monthly trends' },
  { Icon: Icons.Sparkles,  text: 'AI-generated neighbourhood vibe with pros and cons' },
  { Icon: Icons.Chart,     text: 'HabitatScore across 6 dimensions: Safety, Connectivity, Amenities, Air Quality, Vibe, Green Cover' },
  { Icon: Icons.Chat,      text: 'Conversational AI that answers any question about a property using real location data' },
  { Icon: Icons.Saved,     text: 'Save properties and view them later without re-analysing' },
  { Icon: Icons.Scale,     text: 'Compare two locations side by side with overlaid radar charts' },
  { Icon: Globe,           text: 'Cache refresh to force fresh analysis of any location' },
]

export default function AboutPage() {
  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto page-enter">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
        About HabitatMatch
      </h1>
      <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
        HabitatMatch helps you make smarter property decisions
        by combining real location data with AI analysis. Drop
        a pin anywhere in the world to get a complete neighbourhood
        intelligence report including nearby amenities, disaster
        risk, air quality, an AI-generated vibe analysis, and a
        conversational property assistant — all in seconds.
      </p>

      {/* Coverage */}
      <h2 className="text-base font-semibold text-foreground mb-3">Coverage</h2>
      <Card className="mb-8">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Works globally. Drop a pin anywhere in the world.
            Data availability may vary by region. Best coverage
            in areas with dense OpenStreetMap data.
          </p>
        </CardContent>
      </Card>

      <Separator className="mb-8" />

      {/* Features */}
      <h2 className="text-base font-semibold text-foreground mb-3">What HabitatMatch Can Do</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {appFeatures.map((f) => (
          <div
            key={f.text}
            className="flex items-start gap-3 bg-card border border-border rounded-xl p-4"
          >
            <span className="text-primary mt-0.5 shrink-0"><f.Icon size={20} strokeWidth={1.75} /></span>
            <p className="text-sm text-muted-foreground leading-snug">{f.text}</p>
          </div>
        ))}
      </div>

      <Separator className="mb-8" />

      {/* Data sources */}
      <h2 className="text-base font-semibold text-foreground mb-3">Data Sources</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {dataSources.map((src) => (
          <Card key={src.name}>
            <CardContent className="flex items-start gap-3 py-4">
              <span className="text-primary mt-0.5"><src.Icon size={22} strokeWidth={1.75} /></span>
              <div>
                <p className="text-sm font-medium text-foreground">{src.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{src.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="mb-8" />

      {/* Tech stack */}
      <h2 className="text-base font-semibold text-foreground mb-3">Tech Stack</h2>
      <div className="flex flex-wrap gap-2 mb-8">
        {techStack.map((tech) => (
          <Badge key={tech} variant="secondary">{tech}</Badge>
        ))}
      </div>

      <Separator className="mb-8" />

      {/* Links */}
      <h2 className="text-base font-semibold text-foreground mb-3">Links</h2>
      <a
        href="https://github.com/Ayushmann13479/HabitatMatch"
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: 'outline' })}
      >
        <Icons.LinkIcon size={14} className="mr-1.5" /> View on GitHub
      </a>
    </div>
  )
}
