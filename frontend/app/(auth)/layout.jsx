import Link from 'next/link'

export const metadata = {
  title: 'Sign In — HabitatMatch',
}

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 page-enter">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <span className="text-2xl font-semibold text-primary hover:opacity-80 transition-opacity">
              HabitatMatch
            </span>
          </Link>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered property intelligence
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
