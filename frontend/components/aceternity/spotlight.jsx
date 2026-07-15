'use client'
import { cn } from '@/lib/utils'

export function Spotlight({ className, fill = 'rgba(22,163,74,0.08)' }) {
  return (
    <svg
      className={cn(
        'pointer-events-none absolute z-[1] h-[80vh] w-[50vw] opacity-100',
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
    >
      <g filter="url(#spotlight-filter)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill}
          fillOpacity="0.8"
        />
      </g>
      <defs>
        <filter
          id="spotlight-filter"
          x="0.86"
          y="0.84"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="180" result="effect1_foregroundBlur" />
        </filter>
      </defs>
    </svg>
  )
}
