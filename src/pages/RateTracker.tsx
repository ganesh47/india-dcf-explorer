import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import ELI5Box from '../components/ELI5Box'
import { useDuckDB } from '../db/useDuckDB'
import type { Rate } from '../types'

const EVENTS = [
  { date: '2020-03', label: 'COVID cuts begin\n4.40%' },
  { date: '2020-05', label: 'Historic low\n4.00%' },
  { date: '2022-05', label: 'Hike cycle\n+40bps' },
  { date: '2023-02', label: 'Peak\n6.50%' },
  { date: '2025-02', label: 'Easing begins\n6.25%' },
  { date: '2026-06', label: 'Current\n5.25%' },
]

export default function RateTracker() {
  const { query, ready, loading } = useDuckDB()
  const [rates, setRates] = useState<Rate[]>([])

  useEffect(() => {
    if (!ready) return
    query<Rate>(
      `SELECT date, gsec_10y, repo_rate, cpi_inflation
       FROM parquet_scan('rates.parquet') ORDER BY date`,
      ['rates.parquet'],
    ).then(setRates).catch(() => {})
  }, [ready, query])

  if (loading && rates.length === 0) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading rate data…</div>
  }

  const dates = rates.map((r) => r.date)
  const gsec = rates.map((r) => r.gsec_10y)
  const repo = rates.map((r) => r.repo_rate)
  const bandHigh = rates.map((r) => +(r.repo_rate + 2.0).toFixed(2))
  const bandLow = rates.map((r) => +(r.repo_rate + 1.5).toFixed(2))

  const option = {
    backgroundColor: '#fff',
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['G-Sec 10Y', 'Repo Rate', 'Corporate Band'], bottom: 0 },
    grid: { left: 56, right: 56, top: 40, bottom: 64 },
    xAxis: { type: 'category', data: dates, axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: [
      { type: 'value', name: 'G-Sec 10Y %', min: 3, max: 9, axisLabel: { formatter: '{value}%' } },
      { type: 'value', name: 'Repo Rate %', min: 3, max: 9, axisLabel: { formatter: '{value}%' } },
    ],
    series: [
      {
        name: 'Corporate Band',
        type: 'line',
        data: bandHigh,
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(100,116,139,0.08)' },
        symbol: 'none',
        stack: 'band',
        legend: { show: false },
      },
      {
        name: 'Corporate Band Low',
        type: 'line',
        data: bandLow,
        lineStyle: { opacity: 0 },
        areaStyle: { color: '#fff' },
        symbol: 'none',
        stack: 'band',
        legend: { show: false },
      },
      {
        name: 'G-Sec 10Y',
        type: 'line',
        data: gsec,
        smooth: true,
        lineStyle: { color: '#1d4ed8', width: 2 },
        itemStyle: { color: '#1d4ed8' },
        symbol: 'none',
        markLine: {
          symbol: ['none', 'none'],
          lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
          label: { fontSize: 9, color: '#475569' },
          data: EVENTS.map(({ date, label }) => ({
            xAxis: date,
            label: { formatter: label, position: 'insideEndBottom' },
          })),
        },
      },
      {
        name: 'Repo Rate',
        type: 'line',
        yAxisIndex: 1,
        data: repo,
        step: 'end',
        lineStyle: { color: '#10b981', width: 2 },
        itemStyle: { color: '#10b981' },
        symbol: 'none',
      },
    ],
  }

  const latest = rates[rates.length - 1]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Rate Tracker</h1>
        <p className="text-sm text-slate-500 mt-1">
          The interest rate backdrop for every valuation — from the COVID lows to the 2022–23 hike cycle to the 2025 easing.
        </p>
      </div>

      <ELI5Box>
        <p>The 10-year government bond yield (G-Sec 10Y) is the starting point of every WACC calculation in India. It represents the return you can earn with zero risk — lending to the Indian government for 10 years. Everything else in finance is priced as a premium on top of this.</p>
        <p>When the RBI raises the repo rate (the rate at which banks borrow from RBI overnight), it flows through to G-Sec yields, then to corporate borrowing costs. Higher rates mean: companies pay more to borrow, WACC rises, and future cash flows are worth less today — so share prices tend to fall even if earnings are unchanged.</p>
        <p>The grey band on the chart shows the approximate range at which an AAA-rated Indian company can borrow. Notice how it tracks the repo rate with a roughly 150–200 basis point spread. Any company borrowing above this band is either perceived as risky or has weaker credit.</p>
      </ELI5Box>

      <div className="grid grid-cols-3 gap-4 text-center">
        {latest && [
          { label: 'G-Sec 10Y', val: `${latest.gsec_10y.toFixed(2)}%`, color: 'text-blue-700' },
          { label: 'Repo Rate', val: `${latest.repo_rate.toFixed(2)}%`, color: 'text-emerald-700' },
          { label: 'AAA Corporate', val: `${(latest.repo_rate + 1.75).toFixed(2)}%`, color: 'text-slate-700' },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white py-4">
            <div className={`text-2xl font-bold ${color}`}>{val}</div>
            <div className="text-xs text-slate-500 mt-1">{label} — Jun 2026</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <ReactECharts option={option} style={{ height: 420 }} />
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 px-5 py-4 text-sm text-blue-900">
        <strong>Why this matters for DCF:</strong> The G-Sec 10Y yield (currently {latest?.gsec_10y.toFixed(2) ?? '6.84'}%) is the risk-free rate (Rf) that anchors every WACC calculation in India. Each 100bps move in Rf shifts cost of equity by 100bps and can change a company's DCF valuation by 15–25%.
      </div>
    </div>
  )
}
