import { useEffect, useRef, useState, useCallback } from 'react'
import { useDuckDB } from '../db/useDuckDB'
import type { Company } from '../types'

interface Props {
  value: string
  onChange: (ticker: string, company: Company) => void
}

export default function CompanySelector({ value, onChange }: Props) {
  const { query, ready } = useDuckDB()
  const [companies, setCompanies] = useState<Company[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [cursor, setCursor] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!ready) return
    query<Company>(
      `SELECT ticker, name, sector, isin, market_cap_cr, exchange_listing
       FROM parquet_scan('companies.parquet')
       ORDER BY market_cap_cr DESC`,
      ['companies.parquet'],
    ).then(setCompanies).catch(() => {})
  }, [ready, query])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
        setCursor(0)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const filtered = search.trim()
    ? companies.filter((c) => {
        const q = search.toLowerCase()
        return c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q)
      })
    : companies

  const visible = filtered.slice(0, 20)
  const selected = companies.find((c) => c.ticker === value)

  const commit = useCallback((c: Company) => {
    onChange(c.ticker, c)
    setOpen(false)
    setSearch('')
    setCursor(0)
    inputRef.current?.blur()
  }, [onChange])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault() }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setCursor((p) => {
          const next = Math.min(p + 1, visible.length - 1)
          scrollToItem(next)
          return next
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setCursor((p) => {
          const next = Math.max(p - 1, 0)
          scrollToItem(next)
          return next
        })
        break
      case 'Enter':
        e.preventDefault()
        if (visible[cursor]) commit(visible[cursor])
        break
      case 'Escape':
        setOpen(false)
        setSearch('')
        setCursor(0)
        inputRef.current?.blur()
        break
      case 'Tab':
        if (visible[cursor]) commit(visible[cursor])
        setOpen(false)
        break
    }
  }

  function scrollToItem(idx: number) {
    const list = listRef.current
    if (!list) return
    const item = list.children[idx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }

  // Reset cursor when filtered list changes
  useEffect(() => { setCursor(0) }, [search])

  const displayValue = open ? search : (selected?.name ?? '')

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="text-sm font-medium text-slate-700">Company</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          placeholder="Search name, ticker or sector…"
          value={displayValue}
          onFocus={() => { setOpen(true); setSearch('') }}
          onChange={(e) => { setSearch(e.target.value); setCursor(0) }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {/* Chevron */}
        <span
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
          </svg>
        </span>

        {open && (
          <ul
            ref={listRef}
            className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl text-sm"
          >
            {visible.length === 0 ? (
              <li className="px-3 py-3 text-slate-400 text-center">No companies found</li>
            ) : (
              visible.map((c, i) => (
                <li
                  key={c.ticker}
                  onMouseDown={(e) => { e.preventDefault(); commit(c) }}
                  onMouseEnter={() => setCursor(i)}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer ${
                    i === cursor ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-slate-800 truncate">{c.name}</span>
                    {c.ticker === value && (
                      <span className="shrink-0 text-blue-600">
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" clipRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-slate-400">{c.sector}</span>
                    <span className="text-xs font-mono text-slate-300">
                      {c.ticker.replace('.NS', '')}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {selected && !open && (
        <p className="text-xs text-slate-400">
          {selected.sector} · ₹{selected.market_cap_cr.toLocaleString('en-IN')} cr · {selected.ticker.replace('.NS', '')}
        </p>
      )}
    </div>
  )
}
