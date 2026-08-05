'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Icons } from '@/lib/icons'

const navItems = [
  { href: '/map',     Icon: Icons.MapIcon, label: 'Map' },
  { href: '/compare', Icon: Icons.Scale,   label: 'Compare' },
  { href: '/saved',   Icon: Icons.Saved,   label: 'Saved' },
  { href: '/ask',     Icon: Icons.AI,      label: 'Ask' },
  { href: '/about',   Icon: Icons.Info,    label: 'About' },
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
            <span className="mb-0.5"><item.Icon size={20} strokeWidth={2} /></span>
            <span className="font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
