'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'

NProgress.configure({ showSpinner: false, speed: 300, minimum: 0.1 })

export default function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    NProgress.done()
  }, [pathname, searchParams])

  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target.closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (href && href.startsWith('/') && href !== pathname) {
        NProgress.start()
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname])

  return null
}
