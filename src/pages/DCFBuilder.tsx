import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import CompanySelector from '../components/CompanySelector'
import SliderControl from '../components/SliderControl'
import FormulaBox from '../components/FormulaBox'
import { useDuckDB } from '../db/useDuckDB'
import type { Company, Financials } from '../types'

interface ProjectedYear {
  label: string
  fcf: number
  type: 'historical' | 'projected' | 'tv'
}

function projectFCF(historicalFCFs: number[], years: number, growthRate: number): number[] {
  const base = historicalFCFs[historicalFCFs.length - 1] ?? 0
  return Array.from({ length: years }, (_, i) => base * Math.pow(1 + growthRate, i + 1))
}

function pvSum(fcfs: number[], wacc: number): number {
  return fcfs.reduce((sum, cf, i) => sum + cf / Math.pow(1 + wacc, i + 1), 0)
}

export default function DCFBuilder() {
  const { ticker: urlTicker } = useParams<{ ticker: string }>()
  const { query, ready } = useDuckDB()

  const [selectedTicker, setSelectedTicker] = useState(urlTicker ?? 'RELIANCE.NS')
  const [company, setCompany] = useState<Company | null>(null)
  const [financials, setFinancials] = useState<Financials[]>([])
  const [wacc, setWacc] = useState(10)
  const [termGrowth, setTermGrowth] = useState(4.4)
  const [forecastYears, setForecastYears] = useState(10)
  const [fcfGrowth, setFcfGrowth] = useState(12)

  const loadData = useCallback(
    (ticker: string) => {
      if (!ready) return
      Promise.all([
        query<Company>(
          `SELECT ticker, name, sector, isin, market_cap_cr, exchange_listing
           FROM parquet_scan('companies.parquet') WHERE ticker = '${ticker}'`,
          ['companies.parquet'],
        ),
        query<Financials>(
          `SELECT * FROM parquet_scan('financials.parquet')
           WHERE ticker = '${ticker}' ORDER BY year`,
          ['financials.parquet'],
        ),
      ]).then(([cos, fins]) => {
        setCompany(cos[0] ?? null)
        setFinancials(fins)
      }).catch(() => {})
    },
    [ready, query],
  )

  useEffect(() => { loadData(selectedTicker) }, [selectedTicker, loadData])

  const historicalFCFs = financials.map((f) => f.fcf_cr)
  const projectedFCFs = projectFCF(historicalFCFs, forecastYears, fcfGrowth / 100)
  const lastProjected = projectedFCFs[projectedFCFs.length - 1] ?? 0
  const terminalValue = (lastProjected * (1 + termGrowth / 100)) / (wacc / 100 - termGrowth / 100)
  const pvFCFs = pvSum(projectedFCFs, wacc / 100)
  const pvTV = terminalValue / Math.pow(1 + wacc / 100, forecastYears)
  const enterpriseValue = pvFCFs + pvTV
  const marketCap = company?.market_cap_cr ?? 0

  const allBars: ProjectedYear[] = [
    ...financials.map((f) => ({ label: `FY${f.year}`, fcf: f.fcf_cr, type: 'historical' as const })),
    ...projectedFCFs.map((fcf, i) => ({ label: `Y+${i + 1}`, fcf, type: 'projected' as const })),
    { label: 'TV', fcf: pvTV, type: 'tv' as const },
  ]

  const colors = allBars.map((b) =>
    b.type === 'historical' ? '#1d4ed8' : b.type === 'projected' ? '#10b981' : '#f59e0b',
  )

  const barOption = {
    backgroundColor: '#fff',
    tooltip: {
      trigger: 'axis',
      formatter: (p: { name: string; value: number }[]) =>
        `${p[0].name}: ₹${Math.round(p[0].value).toLocaleString('en-IN')} cr`,
    },
    xAxis: { type: 'category', data: allBars.map((b) => b.label), axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `₹${v.toLocaleString('en-IN')}` } },
    series: [{
      type: 'bar',
      data: allBars.map((b, i) => ({ value: Math.round(b.fcf), itemStyle: { color: colors[i] } })),
    }],
    grid: { left: 80, right: 20, top: 20, bottom: 60 },
  }

  const tvPct = enterpriseValue > 0 ? (pvTV / enterpriseValue * 100).toFixed(0) : '–'
  const upside = marketCap > 0 ? ((enterpriseValue / marketCap - 1) * 100).toFixed(1) : null

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">DCF Builder</h1>

      <FormulaBox
        formula="PV = Σ FCFt/(1+WACC)^t + TV/(1+WACC)^n"
        caption="Enterprise value = present value of projected free cash flows + discounted terminal value"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-5 lg:col-span-1">
          <CompanySelector
            value={selectedTicker}
            onChange={(t, c) => { setSelectedTicker(t); setCompany(c) }}
          />
          <SliderControl label="WACC" value={wacc} min={7} max={18} step={0.1}
            format={(v) => `${v.toFixed(1)}%`} onChange={setWacc}
            description="Weighted Average Cost of Capital — 9–11% typical for large Indian companies"
          />
          <SliderControl label="Terminal Growth Rate" value={termGrowth} min={1} max={6} step={0.1}
            format={(v) => `${v.toFixed(1)}%`} onChange={setTermGrowth}
            description="EY-NSE survey average: 4.4% for Indian companies"
          />
          <SliderControl label="FCF Growth (projected)" value={fcfGrowth} min={-5} max={30} step={0.5}
            format={(v) => `${v.toFixed(1)}%`} onChange={setFcfGrowth}
            description="Annual FCF growth assumed for the forecast period"
          />
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Forecast Period</p>
            <div className="flex gap-2">
              {[5, 7, 10].map((y) => (
                <button key={y} onClick={() => setForecastYears(y)}
                  className={`flex-1 py-1.5 rounded-lg text-sm border transition-colors ${
                    forecastYears === y ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {y}yr
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart + stats */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex gap-4 text-xs mb-2">
              {[['#1d4ed8', 'Historical FCF'], ['#10b981', 'Projected FCF'], ['#f59e0b', 'PV of Terminal Value']].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c }} />
                  {l}
                </span>
              ))}
            </div>
            <ReactECharts option={barOption} style={{ height: 300 }} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Enterprise Value', val: `₹${Math.round(enterpriseValue).toLocaleString('en-IN')} cr`, color: 'text-blue-700' },
              { label: 'PV of FCFs', val: `₹${Math.round(pvFCFs).toLocaleString('en-IN')} cr`, color: 'text-emerald-700' },
              { label: 'PV of TV', val: `₹${Math.round(pvTV).toLocaleString('en-IN')} cr (${tvPct}%)`, color: 'text-amber-700' },
              { label: 'vs Market Cap', val: upside !== null ? `${Number(upside) > 0 ? '+' : ''}${upside}%` : '—', color: Number(upside) > 0 ? 'text-emerald-700' : 'text-red-600' },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                <div className={`text-base font-bold ${color}`}>{val}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
            TV is {tvPct}% of enterprise value. Indian practice uses Rf 6.84% + sector beta × ERP 7.08%.
            {' '}<a href="https://ganesh47.github.io/blog/discounted-cash-flows-the-math-part-1/" target="_blank" rel="noopener noreferrer" className="underline">Learn the math →</a>
          </div>
        </div>
      </div>

      {financials.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                {['Year', 'Revenue', 'EBIT', 'D&A', 'Capex', 'ΔNWC', 'FCF', 'PAT', 'EBITDA'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 border border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {financials.map((f) => (
                <tr key={f.year} className="hover:bg-slate-50">
                  {[`FY${f.year}`, f.revenue_cr, f.ebit_cr, f.da_cr, f.capex_cr, f.delta_nwc_cr, f.fcf_cr, f.pat_cr, f.ebitda_cr].map((v, i) => (
                    <td key={i} className="px-3 py-1.5 border border-slate-200 text-slate-700">
                      {i === 0 ? v : `₹${Math.round(Number(v)).toLocaleString('en-IN')}`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
