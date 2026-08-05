import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from 'next-themes'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import NavigationProgress from '@/components/layout/NavigationProgress'
import { Toaster } from 'sonner'
import './globals.css'
import 'nprogress/nprogress.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'HabitatMatch — AI Property Intelligence',
  description:
    'Discover the perfect neighbourhood anywhere in the world with AI-powered liveability scores, real-time air quality, disaster risk analysis, and nearby amenities.',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className={inter.className}>
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange={false}
          >
            <Suspense fallback={null}>
              <NavigationProgress />
            </Suspense>
            {children}
            <Toaster position="top-center" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
