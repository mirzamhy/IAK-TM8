'use client'

export function Segmented<T extends string | number>({ label, value, options, onChange, format }: {
  label: string; value: T; options: readonly T[]; onChange: (v: T) => void; format?: (v: T) => string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ink-3">{label}</span>
      <div role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-lg border border-line bg-surface">
        {options.map((o) => {
          const on = o === value
          return (
            <button
              key={String(o)}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o)}
              className={`border-l border-line px-3 py-1.5 text-[13px] font-medium transition-colors first:border-l-0 ${
                on ? 'bg-accent text-accent-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}
            >
              {format ? format(o) : String(o)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Select<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-ink-3">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="min-w-44 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}
