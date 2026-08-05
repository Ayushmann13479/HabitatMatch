'use client'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { HoverEffect } from '@/components/aceternity/card-hover-effect'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Icons } from '@/lib/icons'

const features = [
  {
    Icon: Icons.MapIcon,
    title: 'Interactive Map',
    description: 'Drop a pin anywhere to instantly start your property analysis.',
    link: '/map',
  },
  {
    Icon: Icons.Hospital,
    title: 'Nearby Amenities',
    description: 'See hospitals, schools, parks, pharmacies, and transit on the map in real time.',
    link: '/map',
  },
  {
    Icon: Icons.Flood,
    title: 'Risk Analysis',
    description: 'Flood zones, elevation data, and air quality index for any location.',
    link: '/map',
  },
  {
    Icon: Icons.AI,
    title: 'AI Intelligence',
    description: 'Ask anything about a property. Get honest, data-backed answers.',
    link: '/ask',
  },
  {
    Icon: Icons.Chart,
    title: 'HabitatScore',
    description: 'A single score across 6 dimensions — safety, connectivity, vibe, and more. Shown automatically after analysing a property on the Map.',
    link: '/map',
  },
  {
    Icon: Icons.Scale,
    title: 'Compare Areas',
    description: 'Compare two locations side by side with overlaid radar charts.',
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
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          What would you like to analyse today?
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-10">
        <Link href="/map" className={buttonVariants({ className: 'bg-primary hover:bg-primary/90 text-primary-foreground' })}>
          Open Map →
        </Link>
        <Link href="/ask" className={buttonVariants({ variant: 'outline' })}>
          Ask AI
        </Link>
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
