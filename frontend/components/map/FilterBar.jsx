'use client'

const CATEGORIES = [
  { key: 'hospital',        emoji: '🏥', label: 'Hospitals' },
  { key: 'school',          emoji: '🏫', label: 'Schools'   },
  { key: 'park',            emoji: '🌳', label: 'Parks'     },
  { key: 'gas_station',     emoji: '⛽', label: 'Petrol'    },
  { key: 'railway_station', emoji: '🚉', label: 'Railway'   },
  { key: 'pharmacy',        emoji: '💊', label: 'Pharmacy'  },
  { key: 'college',         emoji: '🎓', label: 'College'   },
  { key: 'mall',            emoji: '🛍️', label: 'Mall'      },
  { key: 'atm',             emoji: '🏦', label: 'ATM'       },
  { key: 'bank',            emoji: '🏛️', label: 'Bank'      },
]

export default function FilterBar({ activeCategories = [], onToggle, counts = {} }) {
  return (
    <div className="w-full bg-[var(--bg-surface)] border-b border-[var(--hm-border)] shadow-sm">
      <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(cat => {
          const isActive = activeCategories.includes(cat.key)
          const count    = counts?.[cat.key]

          return (
            <button
              key={cat.key}
              onClick={() => onToggle(cat.key)}
              aria-pressed={isActive}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5
                rounded-full text-xs font-medium
                border transition-all duration-150 select-none
                ${isActive
                  ? 'bg-[var(--hm-primary)] text-white border-[var(--hm-primary)] shadow-sm'
                  : 'bg-transparent text-[var(--text-secondary)] border-[var(--hm-border)] hover:border-[var(--hm-primary)] hover:text-[var(--hm-primary)]'
                }
              `}
            >
              <span className="text-sm leading-none">{cat.emoji}</span>
              <span>{cat.label}</span>
              {count != null && (
                <span className={`
                  text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5
                  ${isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-tertiary)]'
                  }
                `}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
