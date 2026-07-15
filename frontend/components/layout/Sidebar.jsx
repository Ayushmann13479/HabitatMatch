'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import ThemeToggle from './ThemeToggle'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/map',     emoji: '🗺️', label: 'Map' },
  { href: '/score',   emoji: '📊', label: 'Score' },
  { href: '/compare', emoji: '⚖️', label: 'Compare' },
  { href: '/ask',     emoji: '💬', label: 'Ask AI' },
  { href: '/about',   emoji: 'ℹ️', label: 'About' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut } = useClerk()

  return (
    <TooltipProvider>
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-60 bg-card border-r border-border z-40">

        {/* Logo */}
        <div className="px-6 py-5">
          <Link href="/" className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity">
            HabitatMatch
          </Link>
        </div>

        <Separator />

        {/* Nav — use Link with buttonVariants to avoid nested <button> */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      buttonVariants({ variant: isActive ? 'secondary' : 'ghost' }),
                      'w-full justify-start gap-3 h-10',
                      isActive && 'text-primary font-medium'
                    )}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        <Separator />

        {/* User footer */}
        <div className="px-3 py-4 space-y-3">
          {user && (
            <div className="flex items-center gap-3 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                  {user.firstName?.[0] ||
                    user.emailAddresses[0]?.emailAddress[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.emailAddresses[0]?.emailAddress}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-2">
            <ThemeToggle />
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Sign out
              </Button>
            ) : (
              <Link
                href="/sign-in"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs')}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
