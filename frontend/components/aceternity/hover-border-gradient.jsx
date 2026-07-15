'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = 'button',
  duration = 1,
  clockwise = true,
  ...props
}) {
  const [hovered, setHovered] = useState(false)
  const [direction, setDirection] = useState('TOP')

  const rotateDirection = (current) => {
    const dirs = ['TOP', 'LEFT', 'BOTTOM', 'RIGHT']
    const idx = dirs.indexOf(current)
    return clockwise
      ? dirs[(idx - 1 + dirs.length) % dirs.length]
      : dirs[(idx + 1) % dirs.length]
  }

  const movingMap = {
    TOP: 'radial-gradient(20% 50% at 50% 0%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
    LEFT: 'radial-gradient(16% 43% at 0% 50%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
    BOTTOM: 'radial-gradient(20% 50% at 50% 100%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
    RIGHT: 'radial-gradient(16% 41% at 100% 50%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
  }

  const highlight =
    'radial-gradient(75% 181% at 50% 50%, #16a34a 0%, rgba(255,255,255,0) 100%)'

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative flex rounded-lg border border-white/20 content-center transition duration-500 items-center flex-col justify-center overflow-hidden p-px w-fit',
        containerClassName
      )}
      {...props}
    >
      {/* Inner content */}
      <div className={cn('w-auto z-10 rounded-[inherit]', className)}>
        {children}
      </div>

      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0 z-0 rounded-[inherit]"
        style={{ filter: 'blur(1px)' }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: hovered
            ? [movingMap[direction], highlight]
            : movingMap[direction],
        }}
        transition={{ ease: 'linear', duration }}
        onAnimationComplete={() => setDirection(rotateDirection(direction))}
      />

      {/* Dark overlay so gradient shows as border only */}
      <div className="absolute inset-[1px] z-1 rounded-[inherit] bg-primary" />
    </Tag>
  )
}
