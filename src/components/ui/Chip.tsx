import React from 'react'

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
  className?: string
}

export function Chip({ tone = 'neutral', children, className = '', ...rest }: ChipProps) {
  const base = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold shadow-sm ' + className
  const toneCls =
    tone === 'success'
      ? 'bg-emerald-500 text-white'
      : tone === 'warning'
      ? 'bg-amber-400 text-amber-950'
      : tone === 'danger'
      ? 'bg-rose-500 text-white'
      : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'

  return <span className={base + ' ' + toneCls} {...rest}>{children}</span>
}


