import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import CompanySelector from '../components/CompanySelector'
import FormulaBox from '../components/FormulaBox'
import ELI5Box from '../components/ELI5Box'
import { useDuckDB } from '../db/useDuckDB'
import type { Company, Financials } from '../types'

const TAX_RATE = 0.25168

export default function FCFWaterfall() {
  const { query, ready } = useDuckDB()
  const [selectedTicker, setSelectedTicker] = useState('RELIANCE.NS')
  const [financials, setFinancials] = useState<Financials[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  useEffect(() => {
    if (!ready) return
    query<Financials>(
      `SELECT * FROM parquet_scan('financials.parquet') WHERE ticker = '${selectedTicker}' ORDER BY year`,
      ['financials.parquet'],
    ).then((rows) => {
      setFinancials(rows)
      if (rows.length > 0) setSelectedYear(rows[rows.length - 1].year)
    }).catch(() => {})
  }, [ready, query, selectedTicker])

  const yearData = financials.find((f) => f.year === selectedYear)

  // Waterfall: EBITDA → -tax_on_ebit → =NOPAT → +DA → -Capex → -ΔNWC → =FCF
  const waterfallSteps = yearData
    ? [
        { name: 'EBITDA', value: yearData.ebitda_cr, type: 'start' },
        { name: '−Tax on EBIT', value: -(yearData.ebit_cr * TAX_RATE), type: 'sub' },
        { name: '+D&A addback', value: yearData.da_cr, type: 'add' },
        { name: '−Capex', value: -yearData.capex_cr, type: 'sub' },
        { name: '−ΔNWC', value: -yearData.delta_nwc_cr, type: 'sub' },
        { name: 'FCF', value: yearData.fcf_cr, type: 'end' },
      ]
    : []

  // Compute running base for waterfall (transparent offset bars)
  const bases: number[] = []
  let running = 0
  waterfallSteps.forEach((step, i) => {
    if (i === 0 || step.type === 'end') {
      bases.push(0)
    } else {
      bases.push(running)
    }
    if (step.type !== 'end') running += step.value
  })

  const COLORS: Record<string, string> = { start: '#1d4ed8', add: '#10b981', sub: '#ef4444', end: '#f59e0b' }

  const waterfallOption = {
    backgroundColor: '#fff',
    tooltip: {
      trigger: 'axis',
      formatter: (params: { name: string; value: number }[]) => {
        const real = params.find((p) => p.value !== 0)
        return `${real?.name}: ₹${Math.round(real?.value ?? 0).toLocaleString('en-IN')} cr`
      },
    },
    xAxis: { type: 'category', data: waterfallSteps.map((s) => s.name), axisLabel: { rotate: 15 } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `₹${v.toLocaleString('en-IN')}` } },
    grid: { left: 80, right: 20, top: 20, bottom: 60 },
    series: [
      {
        name: 'Base',
        type: 'bar',
        stack: 'wf',
        data: bases,
        itemStyle: { color: 'transparent', borderColor: 'transparent' },
        tooltip: { show: false },
      },
      {
        name: 'Value',
        type: 'bar',
        stack: 'wf',
        data: waterfallSteps.map((s) => ({
          value: Math.round(Math.abs(s.value)),
          itemStyle: { color: COLORS[s.type] },
          label: {
            show: true,
            position: s.value >= 0 ? 'top' : 'bottom',
            formatter: `₹${Math.round(Math.abs(s.value)).toLocaleString('en-IN')}`,
            fontSize: 10,
          },
        })),
      },
    ],
  }

  const multiLineOption = {
    backgroundColor: '#fff',
    tooltip: { trigger: 'axis' },
    legend: { data: ['FCF', 'PAT', 'EBITDA'], bottom: 0 },
    xAxis: { type: 'category', data: financials.map((f) => `FY${f.year}`) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `₹${v.toLocaleString('en-IN')}` } },
    grid: { left: 80, right: 20, top: 20, bottom: 60 },
    series: [
      { name: 'FCF', type: 'line', smooth: true, data: financials.map((f) => Math.round(f.fcf_cr)),
        lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } },
      { name: 'PAT', type: 'line', smooth: true, data: financials.map((f) => Math.round(f.pat_cr)),
        lineStyle: { color: '#1d4ed8', width: 2 }, itemStyle: { color: '#1d4ed8' } },
      { name: 'EBITDA', type: 'line', smooth: true, data: financials.map((f) => Math.round(f.ebitda_cr)),
        lineStyle: { color: '#10b981', width: 2 }, itemStyle: { color: '#10b981' } },
    ],
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">FCF Waterfall</h1>
      <p className="text-sm text-slate-500">
        Step by step: how operating profit becomes the cash a company actually generates.
      </p>

      <ELI5Box>
        <p>A company can report a large profit and still have no cash. Here is why: profit on paper (PAT) ignores the money a company must spend on new machines and factories (Capex), and the cash locked up in stock and unpaid bills (working capital). Free Cash Flow (FCF) is what is left after all of that — the money the owner can actually take out or reinvest.</p>
        <p>The waterfall chart below shows each step of the journey from EBITDA to FCF. Green bars add to your cash; red bars take it away. The total at the end is the number that goes into the DCF model. Pick a capital-heavy company like a metals firm and then an IT company — notice how Capex eats far more of the profit in one versus the other.</p>
        <p>The line chart on the right shows whether FCF tracks profit over time. A company where FCF is consistently below PAT should raise questions about earnings quality.</p>
      </ELI5Box>

      <FormulaBox
        formula="FCF = EBIT×(1−t) + D&A − ΔNWC − Capex"
        caption="Start from EBITDA: subtract tax on EBIT, D&A was already subtracted so add it back, then subtract real cash outflows."
      />

      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-48">
          <CompanySelector
            value={selectedTicker}
            onChange={(t: string, _c: Company) => setSelectedTicker(t)}
          />
        </div>
        {financials.length > 0 && (
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Year</label>
            <select
              value={selectedYear ?? ''}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {financials.map((f) => (
                <option key={f.year} value={f.year}>FY{f.year}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">
            EBITDA → FCF Bridge {selectedYear ? `FY${selectedYear}` : ''}
          </h2>
          <div className="flex gap-3 text-xs mb-2 flex-wrap">
            {[['#1d4ed8','Start (EBITDA)'],['#10b981','Adds to FCF'],['#ef4444','Reduces FCF'],['#f59e0b','Result (FCF)']].map(([c,l])=>(
              <span key={l} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm inline-block" style={{background:c}}/>
                {l}
              </span>
            ))}
          </div>
          {yearData ? (
            <ReactECharts option={waterfallOption} style={{ height: 300 }} />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Select a company to load data</div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">FCF vs PAT vs EBITDA over time</h2>
          {financials.length > 0 ? (
            <ReactECharts option={multiLineOption} style={{ height: 300 }} />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
          )}
        </div>
      </div>

      {yearData && (
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          {[
            { label: 'EBITDA', val: yearData.ebitda_cr, color: 'text-emerald-700' },
            { label: 'PAT', val: yearData.pat_cr, color: 'text-blue-700' },
            { label: 'FCF', val: yearData.fcf_cr, color: 'text-amber-700' },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white py-3">
              <div className={`text-xl font-bold ${color}`}>₹{Math.round(val).toLocaleString('en-IN')} cr</div>
              <div className="text-xs text-slate-500 mt-1">{label} — FY{selectedYear}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-5 py-4 text-sm text-amber-900">
        <strong>Key insight:</strong> The gap between EBITDA and FCF is the cost of growth — taxes paid, plus capital reinvested in the business (capex and working capital). Companies in high-growth phases often show strong EBITDA but negative or minimal FCF. Mature businesses with low capex needs may generate FCF above stated PAT.
        {' '}<a href="https://ganesh47.github.io/blog/discounted-cash-flows-the-math-part-1/#input-1--free-cash-flow" target="_blank" rel="noopener noreferrer" className="underline">FCF explained in Part 1 →</a>
      </div>
    </div>
  )
}
