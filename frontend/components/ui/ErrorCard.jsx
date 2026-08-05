'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icons } from '@/lib/icons'

export default function ErrorCard({ message, onRetry, featureName }) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-destructive mb-3">
          <Icons.Warning size={16} />
          <span className="text-sm font-medium">
            Could not load {featureName}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
