import { useEffect, useState } from 'react'
import { useDuckDB } from '../db/useDuckDB'
import type { Company } from '../types'

interface Props {
  value: string
  onChange: (ticker: string, company: Company) => void
}

export default function CompanySelector({ value, onChange }: Props) {
  const { query, ready } = useDuckDB()
  const [companies, setCompanies] = useState<Company[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!ready) return
    query<Company>(
      `SELECT ticker, name, sector, isin, market_cap_cr, exchange_listing
       FROM parquet_scan('companies.parquet')
       ORDER BY market_cap_cr DESC`,
      ['companies.parquet'],
    ).then(setCompanies).catch(() => {})
  }, [ready, query])

  const filtered = search
    ? companies.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.ticker.toLowerCase().includes(search.toLowerCase()),
      )
    : companies

  const selected = companies.find((c) => c.ticker === value)

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700">Company</label>
      <div className="relative">
        <input
          type="text"
          placeholder={selected ? selected.name : 'Search company or ticker…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {search && filtered.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg text-sm">
            {filtered.slice(0, 12).map((c) => (
              <li
                key={c.ticker}
                onClick={() => {
                  onChange(c.ticker, c)
                  setSearch('')
                }}
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-blue-50"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-slate-400 ml-2">{c.sector}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selected && !search && (
        <p className="text-xs text-slate-500">
          {selected.sector} · ₹{selected.market_cap_cr.toLocaleString('en-IN')} cr
        </p>
      )}
    </div>
  )
}
