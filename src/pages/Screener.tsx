import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ELI5Box from '../components/ELI5Box'
import { useDuckDB } from '../db/useDuckDB'

const QUERIES: { label: string; sql: string }[] = [
  {
    label: 'FCF Yield > 5% (Large Cap)',
    sql: `SELECT c.ticker, c.name, c.sector,
       ROUND(c.market_cap_cr) AS market_cap_cr,
       ROUND(f.fcf_cr) AS fcf_cr,
       ROUND(f.fcf_cr / c.market_cap_cr * 100, 2) AS fcf_yield_pct
FROM parquet_scan('companies.parquet') c
JOIN parquet_scan('financials.parquet') f ON c.ticker = f.ticker
WHERE f.year = 2025
  AND c.market_cap_cr > 10000
  AND f.fcf_cr / c.market_cap_cr > 0.05
ORDER BY fcf_yield_pct DESC
LIMIT 50`,
  },
  {
    label: 'ROCE > WACC (Value Creators)',
    sql: `SELECT c.ticker, c.name, c.sector,
       ROUND(f.roce, 2) AS roce,
       ROUND(s.wacc, 2) AS sector_wacc,
       ROUND(f.roce - s.wacc, 2) AS excess_return
FROM parquet_scan('companies.parquet') c
JOIN parquet_scan('financials.parquet') f ON c.ticker = f.ticker
JOIN parquet_scan('sector_wacc.parquet') s ON c.sector = s.sector
WHERE f.year = 2025 AND f.roce > s.wacc
ORDER BY excess_return DESC
LIMIT 50`,
  },
  {
    label: 'Banks & NBFCs ROE > 15%',
    sql: `SELECT c.ticker, c.name, c.sector,
       ROUND(f.roe, 2) AS roe,
       ROUND(f.pat_cr) AS pat_cr,
       ROUND(c.market_cap_cr) AS market_cap_cr
FROM parquet_scan('companies.parquet') c
JOIN parquet_scan('financials.parquet') f ON c.ticker = f.ticker
WHERE f.year = 2025
  AND c.sector IN ('Banking', 'NBFC')
  AND f.roe > 15
ORDER BY f.roe DESC`,
  },
  {
    label: 'Negative FCF (High Capex Growth)',
    sql: `SELECT c.ticker, c.name, c.sector,
       ROUND(f.ebitda_cr) AS ebitda_cr,
       ROUND(f.capex_cr) AS capex_cr,
       ROUND(f.fcf_cr) AS fcf_cr,
       ROUND(f.revenue_cr) AS revenue_cr
FROM parquet_scan('companies.parquet') c
JOIN parquet_scan('financials.parquet') f ON c.ticker = f.ticker
WHERE f.year = 2025 AND f.fcf_cr < 0 AND f.ebitda_cr > 0
ORDER BY f.fcf_cr ASC
LIMIT 40`,
  },
]

type Row = Record<string, unknown>

export default function Screener() {
  const navigate = useNavigate()
  const { query, ready, loading } = useDuckDB()
  const [sql, setSql] = useState(QUERIES[0].sql)
  const [results, setResults] = useState<Row[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ran, setRan] = useState(false)

  const runQuery = async () => {
    if (!ready) return
    setError(null)
    try {
      const rows = await query<Row>(sql, ['companies.parquet', 'financials.parquet', 'sector_wacc.parquet'])
      setResults(rows)
      setColumns(rows.length > 0 ? Object.keys(rows[0]) : [])
      setRan(true)
    } catch (e) {
      setError(String(e))
      setResults([])
    }
  }

  const exportCSV = () => {
    if (results.length === 0) return
    const header = columns.join(',')
    const rows = results.map((r) => columns.map((c) => JSON.stringify(r[c] ?? '')).join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'screener_results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRowClick = (row: Row) => {
    const ticker = row['ticker'] as string | undefined
    if (ticker) navigate(`/dcf-builder/${encodeURIComponent(ticker)}`)
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Screener</h1>
      <p className="text-sm text-slate-500">
        Filter 100+ Indian companies by any financial metric. Click any result to open it in the DCF Builder.
      </p>

      <ELI5Box>
        <p>Before you value a company in detail, you need to find the right ones to look at. A screener is a filter — you set rules like "FCF yield above 5%" or "earns more than its cost of capital" and it returns only the companies that pass.</p>
        <p>The pre-built filters below capture four classic value-investing questions: (1) Are you buying real cash flow cheaply? (2) Is the company actually creating value above its cost of capital? (3) Do the banks earn enough to justify their risk? (4) Which companies are investing heavily today and burning cash — potential growth stories or potential value traps?</p>
        <p>You can edit the query to write your own filter. All financial data is queried live from the dataset — no page reload needed. Click any row to open that company's full DCF model.</p>
      </ELI5Box>

      <div className="flex flex-wrap gap-2">
        {QUERIES.map((q) => (
          <button
            key={q.label}
            onClick={() => setSql(q.sql)}
            className="px-3 py-1.5 rounded-full border border-slate-300 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={10}
          spellCheck={false}
          className="w-full font-mono text-xs p-4 text-slate-800 bg-slate-50 border-b border-slate-200 focus:outline-none resize-y"
        />
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={runQuery}
            disabled={!ready || loading}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {loading ? 'Running…' : 'Run'}
          </button>
          {results.length > 0 && (
            <button onClick={exportCSV} className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50">
              Export CSV
            </button>
          )}
          {ran && !loading && (
            <span className="text-xs text-slate-500">{results.length} rows</span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-mono">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs border-collapse bg-white">
            <thead>
              <tr className="bg-slate-100">
                {columns.map((c) => (
                  <th key={c} className="px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => handleRowClick(row)}
                  className="hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                >
                  {columns.map((c) => (
                    <td key={c} className="px-3 py-1.5 text-slate-700 whitespace-nowrap">
                      {String(row[c] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!ran && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-5 py-8 text-center text-sm text-slate-400">
          Choose a pre-built filter above or write your own, then click Run.
        </div>
      )}
    </div>
  )
}
