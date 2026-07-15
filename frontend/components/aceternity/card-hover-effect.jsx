'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function HoverEffect({ items, className }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 py-2', className)}>
      {items.map((item, idx) => (
        <Link
          href={item?.link || '#'}
          key={`${item?.link}-${idx}`}
          className="relative group block p-2 h-full w-full"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-accent rounded-xl block"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
              />
            )}
          </AnimatePresence>
          <HoverCard>
            <HoverCardTitle>{item.title}</HoverCardTitle>
            <HoverCardDescription>{item.description}</HoverCardDescription>
          </HoverCard>
        </Link>
      ))}
    </div>
  )
}

function HoverCard({ className, children }) {
  return (
    <div
      className={cn(
        'rounded-xl h-full w-full p-4 overflow-hidden bg-card border border-border relative z-20 transition-shadow duration-200 group-hover:shadow-md',
        className
      )}
    >
      <div className="relative z-50 p-2">{children}</div>
    </div>
  )
}

function HoverCardTitle({ className, children }) {
  return (
    <h4 className={cn('text-foreground font-semibold text-sm tracking-wide', className)}>
      {children}
    </h4>
  )
}

function HoverCardDescription({ className, children }) {
  return (
    <p
      className={cn(
        'mt-2 text-muted-foreground text-sm leading-relaxed',
        className
      )}
    >
      {children}
    </p>
  )
}
