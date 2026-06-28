import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDuckDB } from '../db/useDuckDB'
import type { Rate } from '../types'

const TOOLS = [
  {
    to: '/dcf-builder',
    title: 'DCF Builder',
    description: 'Pick any Indian company, adjust WACC and terminal growth, see enterprise value change in real time.',
    color: 'blue',
  },
  {
    to: '/wacc-lab',
    title: 'WACC Lab',
    description: 'Slide the risk-free rate and equity risk premium — watch all sector costs of equity recalculate.',
    color: 'indigo',
  },
  {
    to: '/fcf-waterfall',
    title: 'FCF Waterfall',
    description: 'See exactly why free cash flow ≠ PAT ≠ EBITDA for any company, step by step.',
    color: 'emerald',
  },
  {
    to: '/sensitivity',
    title: 'Sensitivity Matrix',
    description: 'The WACC × terminal growth grid from the blog — interactive, with any company\'s FCF.',
    color: 'amber',
  },
  {
    to: '/rates',
    title: 'Rate Tracker',
    description: 'RBI\'s full rate cycle 2015–2026: G-Sec 10Y + repo rate with every policy event annotated.',
    color: 'rose',
  },
  {
    to: '/screener',
    title: 'Screener',
    description: 'Run DuckDB SQL over 500+ companies. Pre-built: FCF yield > 5%, ROCE > WACC, ROE > 15%.',
    color: 'violet',
  },
]

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  indigo: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
  emerald: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  amber: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
  rose: 'bg-rose-50 border-rose-200 hover:bg-rose-100',
  violet: 'bg-violet-50 border-violet-200 hover:bg-violet-100',
}
const TITLE_MAP: Record<string, string> = {
  blue: 'text-blue-800', indigo: 'text-indigo-800', emerald: 'text-emerald-800',
  amber: 'text-amber-800', rose: 'text-rose-800', violet: 'text-violet-800',
}

export default function Home() {
  const navigate = useNavigate()
  const { query, ready } = useDuckDB()
  const [latest, setLatest] = useState<Rate | null>(null)

  useEffect(() => {
    if (!ready) return
    query<Rate>(
      `SELECT date, gsec_10y, repo_rate, cpi_inflation
       FROM parquet_scan('rates.parquet') ORDER BY date DESC LIMIT 1`,
      ['rates.parquet'],
    ).then((rows) => rows[0] && setLatest(rows[0])).catch(() => {})
  }, [ready, query])

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 px-8 py-12 text-white">
        <h1 className="text-3xl font-bold mb-3">India DCF Explorer</h1>
        <p className="text-blue-100 text-lg max-w-2xl">
          Discounted Cash Flow concepts made interactive — real Indian company data, queried in your browser with DuckDB, visualised with eCharts.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="https://ganesh47.github.io/blog/discounted-cash-flows-the-math-part-1/"
            target="_blank" rel="noopener noreferrer"
            className="inline-block rounded-lg bg-white text-blue-800 px-5 py-2 text-sm font-semibold hover:bg-blue-50 transition-colors"
          >
            Read Part 1: The Math →
          </a>
          <a
            href="https://ganesh47.github.io/blog/discounted-cash-flows-india-lending-and-growth-part-2/"
            target="_blank" rel="noopener noreferrer"
            className="inline-block rounded-lg bg-blue-600 text-white border border-blue-400 px-5 py-2 text-sm font-semibold hover:bg-blue-500 transition-colors"
          >
            Read Part 2: Lending & Growth →
          </a>
        </div>
      </div>

      {/* Live market params */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Current Indian Market Parameters</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'G-Sec 10Y (Rf)', value: latest ? `${latest.gsec_10y.toFixed(2)}%` : '6.84%', sub: 'June 2026' },
            { label: 'RBI Repo Rate', value: latest ? `${latest.repo_rate.toFixed(2)}%` : '5.25%', sub: 'Post 125bps easing' },
            { label: 'India ERP', value: '7.08%', sub: 'Damodaran Jan 2026' },
            { label: 'CPI Inflation', value: latest ? `${latest.cpi_inflation.toFixed(1)}%` : '~4%', sub: 'Approx.' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div className="text-2xl font-bold text-blue-700">{value}</div>
              <div className="text-sm font-medium text-slate-700 mt-1">{label}</div>
              <div className="text-xs text-slate-400">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tool cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Explore the Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map(({ to, title, description, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`rounded-xl border p-5 text-left transition-colors cursor-pointer ${COLOR_MAP[color]}`}
            >
              <div className={`font-bold text-base mb-1 ${TITLE_MAP[color]}`}>{title}</div>
              <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Dataset note */}
      <div className="rounded-lg bg-slate-100 border border-slate-200 px-5 py-4 text-sm text-slate-600">
        <strong>Dataset:</strong> 500+ NSE-listed companies · Annual financials FY2021–FY2025 · 12 sector WACC benchmarks · Monthly G-Sec + repo rates 2015–2026 · 15 banks &amp; NBFCs.
        Sources: NSE/BSE filings, Damodaran (NYU Stern), RBI DBIE. All data for educational use.
      </div>
    </div>
  )
}
