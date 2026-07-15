'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import ThemeToggle from './ThemeToggle'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/map',     label: 'Map' },
  { href: '/compare', label: 'Compare' },
  { href: '/saved',   label: 'Saved' },
  { href: '/ask',     label: 'Ask AI' },
  { href: '/about',   label: 'About' },
]

export default function Navbar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut } = useClerk()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center h-14 gap-4">

        {/* Logo */}
        <Link
          href="/home"
          className="text-base font-semibold text-primary shrink-0 hover:opacity-80 transition-opacity"
        >
          HabitatMatch
        </Link>

        <Separator orientation="vertical" className="h-5 hidden md:block" />

        {/* Nav links — desktop only */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'h-8 text-sm',
                  isActive
                    ? 'text-primary font-medium bg-accent'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Spacer for mobile */}
        <div className="flex-1 md:hidden" />

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle />
          {user ? (
            <>
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-medium">
                  {user.firstName?.[0] ||
                    user.emailAddresses[0]?.emailAddress[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ redirectUrl: '/' })}
                className="hidden sm:flex text-xs text-muted-foreground hover:text-destructive h-7 px-2"
              >
                Sign out
              </Button>
            </>
          ) : (
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'h-7 text-xs'
              )}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
