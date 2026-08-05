'use client'

import { Icons } from '@/lib/icons'

const CATEGORIES = [
  { key: 'hospital',        Icon: Icons.Hospital, label: 'Hospitals' },
  { key: 'school',          Icon: Icons.School,   label: 'Schools'   },
  { key: 'park',            Icon: Icons.Trees,    label: 'Parks'     },
  { key: 'gas_station',     Icon: Icons.Fuel,     label: 'Petrol'    },
  { key: 'railway_station', Icon: Icons.Train,    label: 'Railway'   },
  { key: 'pharmacy',        Icon: Icons.Pharmacy, label: 'Pharmacy'  },
  { key: 'college',         Icon: Icons.College,  label: 'College'   },
  { key: 'mall',            Icon: Icons.Mall,     label: 'Mall'      },
  { key: 'atm',             Icon: Icons.Bank,     label: 'ATM'       },
  { key: 'bank',            Icon: Icons.Bank,     label: 'Bank'      },
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
              <span className="flex items-center"><cat.Icon size={14} strokeWidth={2} /></span>
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
