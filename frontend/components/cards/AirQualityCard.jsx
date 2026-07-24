'use client'
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'

function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-5 shadow-sm h-64">
      <div className="skeleton-shimmer h-5 w-28 rounded mb-4" />
      <div className="flex justify-center mb-2">
        <div className="skeleton-shimmer h-36 w-36 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="skeleton-shimmer h-12 rounded-lg" />
        <div className="skeleton-shimmer h-12 rounded-lg" />
      </div>
    </div>
  )
}

function ErrorCard({ message, onRetry }) {
  return (
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3">
      <span className="text-2xl">⚠️</span>
      <p className="text-sm text-red-600 dark:text-red-400">{message || 'Failed to load data.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-semibold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}

function getAqiConfig(aqi) {
  if (aqi <= 50)  return { color: '#16A34A', label: 'Good',          bg: 'bg-emerald-100 text-emerald-700' }
  if (aqi <= 100) return { color: '#EAB308', label: 'Moderate',      bg: 'bg-amber-100 text-amber-700'     }
  if (aqi <= 150) return { color: '#F97316', label: 'Unhealthy',     bg: 'bg-orange-100 text-orange-700'   }
  if (aqi <= 200) return { color: '#EF4444', label: 'Very Unhealthy',bg: 'bg-red-100 text-red-700'         }
  return                 { color: '#7C3AED', label: 'Hazardous',     bg: 'bg-purple-100 text-purple-700'   }
}

export default function AirQualityCard({ data, loading, error, onRetry }) {
  if (loading) return <SkeletonCard />
  if (error)   return <ErrorCard message={error} onRetry={onRetry} />
  if (!data)   return null

  const aqi    = data.aqi_current ?? 0
  const config = getAqiConfig(aqi)
  const chartData = [{ name: 'AQI', value: Math.min(aqi, 200), fill: config.color }]

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--hm-border)] rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌬️</span>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Air Quality</h3>
        </div>
        {data.is_fallback && (
          <span className="px-2 py-0.5 bg-[var(--bg-subtle)] text-[var(--text-tertiary)] text-[10px] font-medium rounded-full border border-[var(--hm-border)]">
            Estimated
          </span>
        )}
      </div>

      {/* Gauge */}
      <div className="relative h-[160px] w-full flex items-end justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="90%"
            innerRadius="80%"
            outerRadius="100%"
            barSize={14}
            data={chartData}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[0, 200]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: 'var(--bg-subtle)' }}
              clockWise
              dataKey="value"
              cornerRadius={8}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* AQI number in centre of gauge */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-0 text-center pb-2">
          <span className="text-3xl font-bold font-mono" style={{ color: config.color }}>
            {aqi}
          </span>
        </div>
      </div>

      {/* Rating badge */}
      <div className="flex justify-center">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg}`}>
          {data.aqi_rating || config.label}
        </span>
      </div>

      {/* Pollutant breakdown */}
      {data.pollutants && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: 'pm2_5', label: 'PM2.5' },
            { key: 'pm10',  label: 'PM10'  },
            { key: 'no2',   label: 'NO₂'   },
            { key: 'o3',    label: 'O₃'    },
          ].map(({ key, label }) => (
            <div key={key} className="p-2 border border-[var(--hm-border)] rounded-xl text-center bg-[var(--bg-subtle)]">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{label}</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                {data.pollutants[key] != null ? data.pollutants[key] : '—'}
              </p>
              <p className="text-[9px] text-[var(--text-tertiary)]">µg/m³</p>
            </div>
          ))}
        </div>
      )}

      {/* Source */}
      <p className="text-[11px] text-[var(--text-tertiary)] text-center truncate">
        📡 {data.station_name || 'OpenWeatherMap'}
      </p>
    </div>
  )
}
