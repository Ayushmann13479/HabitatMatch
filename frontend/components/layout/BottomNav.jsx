'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/map',     emoji: '🗺️', label: 'Map' },
  { href: '/compare', emoji: '⚖️', label: 'Compare' },
  { href: '/saved',   emoji: '🔖', label: 'Saved' },
  { href: '/ask',     emoji: '💬', label: 'Ask' },
  { href: '/about',   emoji: 'ℹ️', label: 'About' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center h-16 z-40">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <span className="text-lg">{item.emoji}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
