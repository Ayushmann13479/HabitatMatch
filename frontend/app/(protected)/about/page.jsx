import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'About — HabitatMatch' }

const dataSources = [
  { emoji: '📍', name: 'OpenStreetMap + Overpass API', desc: 'Nearby amenities globally (hospitals, schools, parks, pharmacies, airports, banks and more)' },
  { emoji: '🗺️', name: 'Nominatim', desc: 'Address search and reverse geocoding' },
  { emoji: '🏔️', name: 'Open Elevation API', desc: 'Terrain and flood risk assessment' },
  { emoji: '🌬️', name: 'OpenAQ (api.openaq.org)', desc: 'Real-time and historical air quality measurements' },
  { emoji: '🤖', name: 'Groq Llama 3.1 70B', desc: 'AI neighbourhood analysis, HabitatScore verdicts, and conversational property assistant' },
  { emoji: '🔐', name: 'Clerk', desc: 'Secure authentication' },
  { emoji: '💾', name: 'Neon PostgreSQL', desc: 'User data and chat history' },
  { emoji: '⚡', name: 'Upstash Redis', desc: 'API response caching for fast repeat searches' },
]

const techStack = [
  'Next.js 14', 'Flask', 'PostgreSQL', 'Redis',
  'Clerk', 'Leaflet', 'Recharts', 'shadcn/ui',
  'Groq', 'OSM/Overpass', 'Flask-Compress', 'NProgress',
]

const appFeatures = [
  { emoji: '🗺️', text: 'Drop a pin anywhere on an interactive map' },
  { emoji: '🏥', text: 'See nearby hospitals, schools, parks, pharmacies, airports, banks, ATMs, colleges and more with emoji markers' },
  { emoji: '🌊', text: 'Flood risk assessment using elevation and coastal distance data' },
  { emoji: '🌬️', text: 'Air quality index with annual averages and monthly trends' },
  { emoji: '✨', text: 'AI-generated neighbourhood vibe with pros and cons' },
  { emoji: '📊', text: 'HabitatScore across 6 dimensions: Safety, Connectivity, Amenities, Air Quality, Vibe, Green Cover' },
  { emoji: '💬', text: 'Conversational AI that answers any question about a property using real location data' },
  { emoji: '🔖', text: 'Save properties and view them later without re-analysing' },
  { emoji: '⚖️', text: 'Compare two locations side by side with overlaid radar charts' },
  { emoji: '🔄', text: 'Cache refresh to force fresh analysis of any location' },
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
            <span className="text-lg mt-0.5 shrink-0">{f.emoji}</span>
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
              <span className="text-xl mt-0.5">{src.emoji}</span>
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
      <Button variant="outline" asChild>
        <a
          href="https://github.com/Ayushmann13479/HabitatMatch"
          target="_blank"
          rel="noopener noreferrer"
        >
          🔗 View on GitHub
        </a>
      </Button>
    </div>
  )
}
