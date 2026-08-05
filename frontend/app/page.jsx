'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Spotlight } from '@/components/aceternity/spotlight'
import { TextGenerateEffect } from '@/components/aceternity/text-generate-effect'
import { HoverBorderGradient } from '@/components/aceternity/hover-border-gradient'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { Icons } from '@/lib/icons'

const features = [
  {
    Icon: Icons.MapIcon,
    title: 'Interactive Map',
    desc: 'Drop a pin anywhere in the world to get instant neighbourhood intelligence.',
  },
  {
    Icon: Icons.Hospital,
    title: 'Nearby Amenities',
    desc: 'Hospitals, schools, parks, pharmacies, transit — all within seconds.',
  },
  {
    Icon: Icons.Flood,
    title: 'Disaster Risk',
    desc: 'Flood zone classification and elevation data for every location.',
  },
  {
    Icon: Icons.AirQuality,
    title: 'Air Quality',
    desc: 'Real-time PM2.5, AQI and trend data from the closest monitoring station.',
  },
  {
    Icon: Icons.AI,
    title: 'AI Neighbourhood Analysis',
    desc: 'AI-generated vibe reports, pros, cons, and a best-for rating.',
  },
  {
    Icon: Icons.Chat,
    title: 'Property Chat',
    desc: 'Ask any question about a property and get honest, data-backed answers.',
  },
  {
    Icon: Icons.Saved,
    title: 'Save & Compare',
    desc: 'Save properties, compare them side by side with overlaid radar charts.',
  },
]

const featureStrip = [
  { Icon: Icons.MapIcon, title: 'Interactive map' },
  { Icon: Icons.Hospital, title: 'Nearby amenities' },
  { Icon: Icons.Flood, title: 'Disaster risk' },
  { Icon: Icons.AirQuality, title: 'Air quality index' },
  { Icon: Icons.AI, title: 'AI neighbourhood analysis' },
  { Icon: Icons.Chat, title: 'Property chat' },
  { Icon: Icons.Saved, title: 'Save and compare properties' },
]

const steps = [
  { n: '01', title: 'Search any address', desc: 'Type any location — city, neighbourhood, or landmark — anywhere in the world.' },
  { n: '02', title: 'Review the data', desc: 'Get scores, risk analysis, air quality, and nearby amenities instantly.' },
  { n: '03', title: 'Ask the AI', desc: 'Chat with HabitatMatch to dig deeper into any aspect of the neighbourhood.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden page-enter">

      {/* ─── TOP BAR ─── */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <span className="text-lg font-semibold text-primary">HabitatMatch</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-medium bg-primary text-primary-foreground px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-16 pb-24 min-h-[85vh]">

        <Spotlight
          className="absolute -top-20 left-1/2 -translate-x-1/2 opacity-60"
          fill="rgba(22,163,74,0.12)"
        />

        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="relative z-10 max-w-3xl"
        >
          {/* Label */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Global · Property Intelligence
            </span>
          </motion.div>

          {/* Animated headline */}
          <motion.div variants={fadeUp}>
            <TextGenerateEffect
              words="Know any neighbourhood before you move in."
              className="text-4xl md:text-6xl font-bold text-foreground leading-tight"
            />
          </motion.div>

          {/* Sub */}
          <motion.p
            variants={fadeUp}
            className="mt-6 text-base md:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed"
          >
            AI-powered analysis of safety, connectivity,
            air quality, and neighbourhood vibe —
            for any location, anywhere.
          </motion.p>

          {/* CTA */}
          <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center">
            <HoverBorderGradient
              containerClassName="rounded-xl"
              as={Link}
              href="/sign-up"
              className="bg-primary text-primary-foreground font-semibold px-8 py-3 text-sm"
            >
              Start analysing free →
            </HoverBorderGradient>
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Already have an account?
            </Link>
          </motion.div>

          {/* Trust */}
          <motion.p variants={fadeUp} className="mt-5 text-xs text-muted-foreground">
            Free · No credit card · Works anywhere in the world
          </motion.p>
        </motion.div>

        {/* Feature strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="relative z-10 mt-14 flex items-center gap-6 flex-wrap justify-center"
        >
          {featureStrip.map((f) => (
            <div key={f.title} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <f.Icon size={14} strokeWidth={2} />
              <span>{f.title}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Everything you need to know before buying or renting
            </h2>
            <p className="text-muted-foreground mt-3 text-sm max-w-md mx-auto">
              HabitatMatch pulls live data from multiple sources and distils it into one clear picture.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="text-primary mb-3"><f.Icon size={28} strokeWidth={1.75} /></div>
                <h3 className="font-semibold text-foreground text-sm">{f.title}</h3>
                <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12"
          >
            How it works
          </motion.h2>

          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex gap-5 items-start"
              >
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{step.n}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-20 px-6 bg-primary/5 border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Ready to find your perfect neighbourhood?
          </h2>
          <p className="text-muted-foreground mt-3 text-sm">
            Join home-buyers and renters already using HabitatMatch worldwide.
          </p>
          <div className="mt-8">
            <HoverBorderGradient
              containerClassName="rounded-xl mx-auto"
              as={Link}
              href="/sign-up"
              className="bg-primary text-primary-foreground font-semibold px-10 py-3 text-sm"
            >
              Create free account →
            </HoverBorderGradient>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 px-6 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          © 2025 HabitatMatch · AI Property Intelligence
        </p>
      </footer>
    </div>
  )
}
