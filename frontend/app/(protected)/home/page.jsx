'use client'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { HoverEffect } from '@/components/aceternity/card-hover-effect'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const features = [
  {
    title: '🗺️ Interactive Map',
    description:
      'Drop a pin anywhere to instantly start your property analysis.',
    link: '/map',
  },
  {
    title: '🏥 Nearby Amenities',
    description:
      'See hospitals, schools, parks, pharmacies, and transit on the map in real time.',
    link: '/map',
  },
  {
    title: '🌊 Risk Analysis',
    description:
      'Flood zones, elevation data, and air quality index for any location.',
    link: '/map',
  },
  {
    title: '🤖 AI Intelligence',
    description:
      'Ask anything about a property. Get honest, data-backed answers.',
    link: '/ask',
  },
  {
    title: '📊 HabitatScore',
    description:
      'A single score across 6 dimensions — safety, connectivity, vibe, and more. Shown automatically after analysing a property on the Map.',
    link: '/map',
  },
  {
    title: '⚖️ Compare Areas',
    description:
      'Compare two locations side by side with overlaid radar charts.',
    link: '/compare',
  },
]

export default function HomePage() {
  const { user } = useUser()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="px-6 md:px-10 py-8 max-w-5xl mx-auto page-enter"
    >
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          What would you like to analyse today?
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-10">
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/map">Open Map →</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/ask">Ask AI</Link>
        </Button>
      </div>

      <Separator className="mb-10" />

      {/* Features */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Everything you need before moving in
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Hover over each feature to explore
        </p>
      </div>

      <HoverEffect items={features} />
    </motion.div>
  )
}
