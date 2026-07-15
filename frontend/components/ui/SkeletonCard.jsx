'use client'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function SkeletonCard({ lines = 3 }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-4 ${
              i === 0 ? 'w-3/4' : i === 1 ? 'w-1/2' : 'w-2/3'
            }`}
          />
        ))}
      </CardContent>
    </Card>
  )
}
